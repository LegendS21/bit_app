'use strict';

const argon2 = require('argon2');
const { Op } = require('sequelize');
const { sequelize, user, role, user_role, refresh_token, audit_log } = require('../models');
const { signAccessToken, ACCESS_TOKEN_TTL } = require('../helpers/jwt.js');
const {
  buatRefreshToken,
  hashToken,
  tanggalKedaluwarsa
} = require('../helpers/refreshToken.js');
const { unauthorized, forbidden, locked, conflict, badRequest } = require('../helpers/errors.js');

/**
 * Pendaftaran mandiri HANYA menerbitkan role ini. Ditulis sebagai konstanta,
 * bukan dibaca dari request — inilah satu-satunya hal yang memisahkan
 * "calon peserta mendaftar sendiri" dari "siapa pun bisa jadi admin".
 */
const ROLE_PENDAFTAR = 'APPLICANT';

const MAX_GAGAL_LOGIN = Number(process.env.MAX_GAGAL_LOGIN || 5);
const LAMA_KUNCI_MENIT = Number(process.env.LAMA_KUNCI_MENIT || 15);
// Lihat penjelasan di AuthService.refresh().
const GRACE_ROTASI_MS = Number(process.env.REFRESH_GRACE_DETIK || 10) * 1000;

// Pesan yang sama untuk email tidak ada maupun password salah, supaya
// penyerang tidak bisa memakai endpoint login untuk memetakan email terdaftar.
const PESAN_KREDENSIAL_SALAH = 'Email atau password salah';

const includeRoles = {
  model: role,
  as: 'roles',
  attributes: ['id', 'kode', 'nama'],
  through: { attributes: [] },
  where: { is_active: true },
  required: false
};

/** Audit tidak boleh menggagalkan proses auth — kegagalannya cukup di-log. */
async function catatAudit(data, options = {}) {
  try {
    await audit_log.create(
      {
        user_id: data.user_id || null,
        aksi: data.aksi,
        keterangan: data.keterangan ? String(data.keterangan).slice(0, 255) : null,
        ip_address: data.ip_address || null,
        user_agent: data.user_agent || null
      },
      options
    );
  } catch (error) {
    console.error('Gagal menulis audit_log:', error.message);
  }
}

function bentukProfil(akun) {
  return {
    uuid: akun.uuid,
    nama: akun.nama,
    email: akun.email,
    no_hp: akun.no_hp,
    tipe_user: akun.tipe_user,
    roles: (akun.roles || []).map((r) => r.kode)
  };
}

class AuthService {
  /**
   * Simpan refresh token baru. Yang masuk DB hash-nya, yang dikembalikan
   * ke pemanggil token mentahnya (untuk dipasang di cookie).
   */
  static async terbitkanRefreshToken(userId, meta, options = {}) {
    const raw = buatRefreshToken();

    await refresh_token.create(
      {
        user_id: userId,
        token_hash: hashToken(raw),
        expires_at: tanggalKedaluwarsa(),
        user_agent: meta.user_agent,
        ip_address: meta.ip_address
      },
      options
    );

    return raw;
  }

  /**
   * POST /auth/register — pendaftaran mandiri calon peserta.
   *
   * Hanya menerbitkan akun APPLICANT. Akun internal (Admin, Verifikator,
   * Lembaga Seleksi) tetap **wajib** dibuat Admin lewat `POST /users`; tidak
   * ada jalan dari endpoint publik ini menuju role internal, karena role dan
   * `tipe_user` dipaksa konstanta di sini dan tidak pernah dibaca dari body.
   *
   * Tidak langsung login: yang dikembalikan cuma profil, bukan token. Alurnya
   * sesuai dokumen — daftar akun → login.
   */
  static async register(data, meta) {
    // Dicek manual supaya pesannya jelas, bukan error constraint UNIQUE.
    // `paranoid: false` ikut memeriksa akun yang sudah di-soft delete, karena
    // kolom email tetap UNIQUE di level database.
    const sudahAda = await user.findOne({
      where: { email: data.email },
      paranoid: false
    });

    if (sudahAda) {
      await catatAudit({
        aksi: 'REGISTER_FAILED',
        keterangan: `Email sudah dipakai: ${data.email}`,
        ...meta
      });
      throw conflict(
        sudahAda.deleted_at
          ? 'Email ini pernah dipakai akun yang sudah dihapus. Gunakan email lain.'
          : 'Email sudah terdaftar. Silakan login atau pakai email lain.',
        'EMAIL_TERDAFTAR'
      );
    }

    const rolePendaftar = await role.findOne({ where: { kode: ROLE_PENDAFTAR } });
    if (!rolePendaftar) {
      // Bukan salah pengguna — seeder role belum dijalankan.
      console.error(`Role ${ROLE_PENDAFTAR} tidak ada di database; jalankan db:seed.`);
      throw badRequest(
        'Pendaftaran belum bisa diproses. Hubungi administrator.',
        'ROLE_PENDAFTAR_HILANG'
      );
    }

    const akun = await sequelize.transaction(async (t) => {
      const baru = await user.create(
        {
          nama: data.nama,
          email: data.email,
          password_hash: await argon2.hash(data.password, { type: argon2.argon2id }),
          no_hp: data.no_hp || null,
          tipe_user: 'APPLICANT',
          is_active: true
          // email_verified_at sengaja dibiarkan null: verifikasi email belum ada.
        },
        { transaction: t }
      );

      await user_role.create(
        { user_id: baru.id, role_id: rolePendaftar.id, assigned_at: new Date() },
        { transaction: t }
      );

      return baru;
    });

    await catatAudit({
      user_id: akun.id,
      aksi: 'REGISTER',
      keterangan: `Pendaftaran mandiri calon peserta ${data.email}`,
      ...meta
    });

    return {
      uuid: akun.uuid,
      nama: akun.nama,
      email: akun.email,
      no_hp: akun.no_hp,
      tipe_user: akun.tipe_user,
      roles: [ROLE_PENDAFTAR]
    };
  }

  /**
   * POST /auth/login
   * Mengembalikan access token (dipakai di header Authorization) dan
   * refresh token mentah (dipasang controller sebagai HttpOnly cookie).
   */
  static async login({ email, password }, meta) {
    const akun = await user.findOne({ where: { email }, include: [includeRoles] });

    if (!akun) {
      await catatAudit({ aksi: 'LOGIN_FAILED', keterangan: `Email tidak terdaftar: ${email}`, ...meta });
      // argon2.verify pada user yang ada butuh waktu; tanpa delay tiruan di sini
      // selisih waktu respons bisa membocorkan email mana yang terdaftar.
      await argon2.hash(password);
      throw unauthorized(PESAN_KREDENSIAL_SALAH, 'INVALID_CREDENTIALS');
    }

    if (akun.locked_until && akun.locked_until > new Date()) {
      await catatAudit({ user_id: akun.id, aksi: 'LOGIN_BLOCKED', keterangan: 'Akun sedang terkunci', ...meta });
      throw locked(
        `Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi setelah ${akun.locked_until.toISOString()}`
      );
    }

    if (!akun.is_active) {
      await catatAudit({ user_id: akun.id, aksi: 'LOGIN_BLOCKED', keterangan: 'Akun nonaktif', ...meta });
      throw forbidden('Akun Anda nonaktif. Hubungi administrator.', 'ACCOUNT_INACTIVE');
    }

    let cocok = false;
    try {
      cocok = await argon2.verify(akun.password_hash, password);
    } catch (error) {
      // Hash rusak / bukan format argon2 — perlakukan sebagai gagal login.
      console.error('Gagal memverifikasi password:', error.message);
    }

    if (!cocok) {
      const gagal = akun.failed_attempt + 1;
      const perluDikunci = gagal >= MAX_GAGAL_LOGIN;

      await akun.update({
        failed_attempt: perluDikunci ? 0 : gagal,
        locked_until: perluDikunci ? new Date(Date.now() + LAMA_KUNCI_MENIT * 60 * 1000) : null
      });

      await catatAudit({
        user_id: akun.id,
        aksi: 'LOGIN_FAILED',
        keterangan: perluDikunci ? `Password salah, akun dikunci ${LAMA_KUNCI_MENIT} menit` : `Password salah (percobaan ke-${gagal})`,
        ...meta
      });

      if (perluDikunci) {
        throw locked(`Terlalu banyak percobaan gagal. Akun dikunci ${LAMA_KUNCI_MENIT} menit.`);
      }
      throw unauthorized(PESAN_KREDENSIAL_SALAH, 'INVALID_CREDENTIALS');
    }

    await akun.update({ failed_attempt: 0, locked_until: null, last_login_at: new Date() });

    const profil = bentukProfil(akun);
    const accessToken = signAccessToken({ ...profil, id: akun.id });
    const refreshToken = await AuthService.terbitkanRefreshToken(akun.id, meta);

    await catatAudit({ user_id: akun.id, aksi: 'LOGIN_SUCCESS', ...meta });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_TTL,
      user: profil,
      refreshToken
    };
  }

  /**
   * POST /auth/refresh — rotasi refresh token.
   *
   * Satu refresh token hanya boleh dipakai sekali: begitu ditukar, token lama
   * langsung di-revoke dan diarahkan ke penggantinya lewat `replaced_by`.
   * Kalau ada token yang sudah revoked dipakai lagi, itu tanda token bocor —
   * seluruh sesi user dicabut (reuse detection).
   */
  static async refresh(rawToken, meta) {
    if (!rawToken) {
      throw unauthorized('Refresh token tidak ditemukan', 'REFRESH_TOKEN_MISSING');
    }

    const tokenHash = hashToken(rawToken);

    const hasil = await sequelize.transaction(async (t) => {
      // Row lock supaya dua request refresh yang datang bersamaan dengan token
      // yang sama tidak sama-sama lolos.
      const baris = await refresh_token.findOne({
        where: { token_hash: tokenHash },
        lock: t.LOCK.UPDATE,
        transaction: t
      });

      if (!baris) return { status: 'TIDAK_DIKENALI' };

      if (baris.revoked_at) {
        const jedaSejakRotasi = Date.now() - new Date(baris.revoked_at).getTime();

        // Kalau token ini baru saja dirotasi (beberapa detik lalu), kemungkinan
        // besar ini bukan serangan melainkan tab kedua yang me-refresh dengan
        // cookie yang belum sempat diperbarui. Tolak requestnya saja, jangan
        // cabut satu keluarga sesi. Klien tinggal mengulang — cookie-nya sudah
        // berisi token baru hasil rotasi tab pertama.
        if (baris.replaced_by && jedaSejakRotasi <= GRACE_ROTASI_MS) {
          return { status: 'ROTASI_BARUSAN', userId: baris.user_id };
        }

        // Di luar jeda itu, token bekas yang dipakai lagi = tanda token bocor →
        // cabut semua sesi aktif milik user ini.
        await refresh_token.update(
          { revoked_at: new Date() },
          { where: { user_id: baris.user_id, revoked_at: null }, transaction: t }
        );
        return { status: 'DIPAKAI_ULANG', userId: baris.user_id };
      }

      if (baris.expires_at <= new Date()) {
        return { status: 'KEDALUWARSA', userId: baris.user_id };
      }

      const akun = await user.findByPk(baris.user_id, { include: [includeRoles], transaction: t });
      if (!akun || !akun.is_active) {
        await baris.update({ revoked_at: new Date() }, { transaction: t });
        return { status: 'AKUN_TIDAK_AKTIF', userId: baris.user_id };
      }

      const refreshTokenBaru = await AuthService.terbitkanRefreshToken(akun.id, meta, { transaction: t });

      await baris.update(
        { revoked_at: new Date(), replaced_by: hashToken(refreshTokenBaru) },
        { transaction: t }
      );

      return { status: 'OK', akun, refreshToken: refreshTokenBaru };
    });

    // Audit & throw sengaja di luar transaksi: kalau di dalam, pencabutan sesi
    // pada kasus DIPAKAI_ULANG ikut ter-rollback saat error dilempar.
    if (hasil.status === 'DIPAKAI_ULANG') {
      await catatAudit({
        user_id: hasil.userId,
        aksi: 'REFRESH_REUSE_DETECTED',
        keterangan: 'Refresh token bekas dipakai ulang, semua sesi dicabut',
        ...meta
      });
      throw unauthorized('Sesi tidak valid, silakan login ulang', 'REFRESH_TOKEN_REUSED');
    }

    if (hasil.status === 'ROTASI_BARUSAN') {
      throw unauthorized('Token baru saja dirotasi, ulangi permintaan', 'REFRESH_RETRY');
    }

    if (hasil.status !== 'OK') {
      await catatAudit({
        user_id: hasil.userId || null,
        aksi: 'REFRESH_FAILED',
        keterangan: hasil.status,
        ...meta
      });
      throw unauthorized('Refresh token tidak valid, silakan login ulang', 'REFRESH_TOKEN_INVALID');
    }

    const profil = bentukProfil(hasil.akun);

    await catatAudit({ user_id: hasil.akun.id, aksi: 'REFRESH_SUCCESS', ...meta });

    return {
      access_token: signAccessToken({ ...profil, id: hasil.akun.id }),
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_TTL,
      user: profil,
      refreshToken: hasil.refreshToken
    };
  }

  /**
   * POST /auth/logout — cabut refresh token yang sedang dipakai.
   * Sengaja idempoten: token yang sudah tidak valid tetap dibalas sukses,
   * yang penting cookie di sisi klien dibersihkan.
   */
  static async logout(rawToken, meta) {
    if (!rawToken) return;

    const baris = await refresh_token.findOne({ where: { token_hash: hashToken(rawToken) } });
    if (!baris || baris.revoked_at) return;

    await baris.update({ revoked_at: new Date() });
    await catatAudit({ user_id: baris.user_id, aksi: 'LOGOUT', ...meta });
  }

  /** POST /auth/logout-all — cabut seluruh sesi aktif user (semua perangkat). */
  static async logoutSemua(userUuid, meta) {
    const akun = await user.findOne({ where: { uuid: userUuid } });
    if (!akun) throw unauthorized('User tidak ditemukan', 'USER_NOT_FOUND');

    const jumlah = await refresh_token.update(
      { revoked_at: new Date() },
      { where: { user_id: akun.id, revoked_at: null } }
    );

    await catatAudit({ user_id: akun.id, aksi: 'LOGOUT_ALL', keterangan: 'Semua sesi dicabut', ...meta });
    return { sesi_dicabut: Array.isArray(jumlah) ? jumlah[0] : 0 };
  }

  /** GET /auth/me — profil pemilik access token. */
  static async me(userUuid) {
    const akun = await user.findOne({ where: { uuid: userUuid }, include: [includeRoles] });
    if (!akun) throw unauthorized('User tidak ditemukan', 'USER_NOT_FOUND');
    if (!akun.is_active) throw forbidden('Akun Anda nonaktif', 'ACCOUNT_INACTIVE');

    return bentukProfil(akun);
  }

  /**
   * Housekeeping: hapus refresh token yang sudah kedaluwarsa atau dicabut
   * lebih dari 30 hari lalu. Dipanggil manual/cron, bukan dari request.
   */
  static async bersihkanTokenLama(hari = 30) {
    const batas = new Date(Date.now() - hari * 24 * 60 * 60 * 1000);
    return refresh_token.destroy({
      where: {
        [Op.or]: [{ expires_at: { [Op.lt]: batas } }, { revoked_at: { [Op.lt]: batas } }]
      }
    });
  }
}

module.exports = AuthService;
