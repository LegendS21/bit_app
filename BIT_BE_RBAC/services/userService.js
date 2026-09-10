'use strict';

const argon2 = require('argon2');
const { Op } = require('sequelize');
const { sequelize, user, role, user_role, refresh_token, audit_log } = require('../models');
const { badRequest, conflict, forbidden, notFound } = require('../helpers/errors.js');

const ROLE_INTERNAL = ['ADMIN', 'VERIFIKATOR', 'LEMBAGA_SELEKSI'];

const includeRoles = {
  model: role,
  as: 'roles',
  attributes: ['id', 'kode', 'nama'],
  through: { attributes: [] },
};

/** Audit tidak boleh menggagalkan operasi utama — kegagalannya cukup di-log. */
async function catatAudit(data) {
  try {
    await audit_log.create({
      user_id: data.user_id || null,
      aksi: data.aksi,
      keterangan: data.keterangan ? String(data.keterangan).slice(0, 255) : null,
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
    });
  } catch (error) {
    console.error('Gagal menulis audit_log:', error.message);
  }
}

/** Bentuk data yang dikirim ke client — password_hash tidak pernah ikut. */
function bentukUser(baris) {
  return {
    uuid: baris.uuid,
    nama: baris.nama,
    email: baris.email,
    no_hp: baris.no_hp,
    tipe_user: baris.tipe_user,
    is_active: baris.is_active,
    email_verified_at: baris.email_verified_at,
    last_login_at: baris.last_login_at,
    roles: (baris.roles || []).map((r) => ({ id: r.id, kode: r.kode, nama: r.nama })),
    created_at: baris.created_at,
  };
}

/** tipe_user tidak diminta dari client — diturunkan dari role supaya tidak bisa bentrok. */
function tipeDariRole(kodeRole) {
  return kodeRole.some((k) => ROLE_INTERNAL.includes(k)) ? 'INTERNAL' : 'APPLICANT';
}

async function cariRole(kodeRole) {
  const daftar = await role.findAll({ where: { kode: { [Op.in]: kodeRole } } });

  const ditemukan = daftar.map((r) => r.kode);
  const hilang = kodeRole.filter((k) => !ditemukan.includes(k));
  if (hilang.length) {
    throw badRequest(`Role tidak ditemukan: ${hilang.join(', ')}`, 'ROLE_NOT_FOUND');
  }

  // Mencampur role internal dengan APPLICANT bikin tipe_user ambigu dan
  // membuat satu akun bisa masuk lewat dua portal sekaligus.
  const adaInternal = kodeRole.some((k) => ROLE_INTERNAL.includes(k));
  if (adaInternal && kodeRole.includes('APPLICANT')) {
    throw badRequest(
      'Role internal tidak boleh digabung dengan Calon Peserta',
      'ROLE_CONFLICT'
    );
  }

  return daftar;
}

/** Cari user berdasarkan uuid, termasuk role-nya. */
async function ambilUser(uuid, options = {}) {
  const baris = await user.findOne({
    where: { uuid },
    include: [includeRoles],
    ...options,
  });
  if (!baris) throw notFound('User tidak ditemukan', 'USER_NOT_FOUND');
  return baris;
}

/**
 * Email unik lintas user, termasuk yang sudah di-soft delete (kolomnya UNIQUE
 * di level DB). Dicek manual supaya pesannya jelas, bukan error constraint.
 */
async function pastikanEmailBebas(email, kecualiId = null) {
  const where = { email };
  if (kecualiId) where.id = { [Op.ne]: kecualiId };

  const ada = await user.findOne({ where, paranoid: false });
  if (!ada) return;

  throw conflict(
    ada.deleted_at
      ? 'Email ini pernah dipakai user yang sudah dihapus. Gunakan email lain.'
      : 'Email sudah terdaftar'
  );
}

/** Cegah sistem kehilangan admin terakhir yang masih aktif. */
async function pastikanBukanAdminTerakhir(userId, alasan) {
  const adminAktif = await user.findAll({
    attributes: ['id'],
    where: { is_active: true },
    include: [{ ...includeRoles, where: { kode: 'ADMIN' }, required: true }],
  });

  const tersisa = adminAktif.filter((a) => a.id !== userId);
  if (tersisa.length === 0) {
    throw badRequest(
      `Tidak bisa ${alasan}: ini satu-satunya Administrator yang masih aktif.`,
      'LAST_ADMIN'
    );
  }
}

/** Cabut seluruh sesi user — dipakai saat akun dinonaktifkan atau dihapus. */
async function cabutSesi(userId, options = {}) {
  await refresh_token.update(
    { revoked_at: new Date() },
    { where: { user_id: userId, revoked_at: null }, ...options }
  );
}

class UserService {
  /** GET /users — daftar user dengan pencarian, filter, dan halaman. */
  static async daftar(filter) {
    const where = {};

    if (filter.q) {
      where[Op.or] = [
        { nama: { [Op.like]: `%${filter.q}%` } },
        { email: { [Op.like]: `%${filter.q}%` } },
      ];
    }
    if (filter.tipe) where.tipe_user = filter.tipe;
    if (filter.status) where.is_active = filter.status === 'aktif';

    // Filter role dikerjakan lewat query terpisah supaya include utamanya tetap
    // mengembalikan SELURUH role milik user, bukan cuma yang cocok filter.
    if (filter.role) {
      const pemilik = await user_role.findAll({
        attributes: ['user_id'],
        include: [{ model: role, as: 'role', attributes: [], where: { kode: filter.role } }],
      });
      where.id = { [Op.in]: pemilik.map((p) => p.user_id) };
    }

    const { rows, count } = await user.findAndCountAll({
      where,
      include: [includeRoles],
      order: [['created_at', 'DESC']],
      limit: filter.limit,
      offset: (filter.page - 1) * filter.limit,
      // Tanpa ini, jumlahnya ikut terkali banyaknya baris role.
      distinct: true,
    });

    return {
      data: rows.map(bentukUser),
      meta: {
        total: count,
        page: filter.page,
        limit: filter.limit,
        total_halaman: Math.max(1, Math.ceil(count / filter.limit)),
      },
    };
  }

  /** GET /users/:uuid */
  static async detail(uuid) {
    return bentukUser(await ambilUser(uuid));
  }

  /** POST /users */
  static async buat(data, pelaku, meta) {
    await pastikanEmailBebas(data.email);
    const daftarRole = await cariRole(data.roles);

    const baris = await sequelize.transaction(async (t) => {
      const baru = await user.create(
        {
          nama: data.nama,
          email: data.email,
          password_hash: await argon2.hash(data.password, { type: argon2.argon2id }),
          no_hp: data.no_hp || null,
          tipe_user: tipeDariRole(data.roles),
          is_active: data.is_active ?? true,
        },
        { transaction: t }
      );

      await user_role.bulkCreate(
        daftarRole.map((r) => ({ user_id: baru.id, role_id: r.id, assigned_at: new Date() })),
        { transaction: t }
      );

      return baru;
    });

    await catatAudit({
      user_id: pelaku.id,
      aksi: 'CREATE_USER',
      keterangan: `Membuat user ${data.email} (${data.roles.join(', ')})`,
      ...meta,
    });

    return bentukUser(await ambilUser(baris.uuid));
  }

  /** PUT /users/:uuid */
  static async ubah(uuid, data, pelaku, meta) {
    const baris = await ambilUser(uuid);
    const dirinyaSendiri = baris.id === pelaku.id;

    if (data.email && data.email !== baris.email) {
      await pastikanEmailBebas(data.email, baris.id);
    }

    // Mengganti password sendiri wajib menyertakan password lama. Ini yang
    // membedakan "pemilik akun" dari "orang yang menemukan layar tidak terkunci".
    // Admin yang mengganti password orang lain tidak diminta ini — ia memang
    // tidak tahu password orang tersebut.
    if (data.password && dirinyaSendiri) {
      if (!data.password_lama) {
        throw badRequest(
          'Masukkan password lama untuk mengganti password akun sendiri.',
          'PASSWORD_LAMA_WAJIB'
        );
      }

      let cocok = false;
      try {
        cocok = await argon2.verify(baris.password_hash, data.password_lama);
      } catch (error) {
        console.error('Gagal memverifikasi password lama:', error.message);
      }
      if (!cocok) {
        throw badRequest('Password lama tidak cocok.', 'PASSWORD_LAMA_SALAH');
      }
    }

    let daftarRole = null;
    // Dibandingkan dengan role yang sekarang: form selalu mengirim daftar role,
    // jadi tanpa perbandingan ini setiap penyimpanan akan terbaca sebagai
    // "role berubah" dan sesi user ikut dicabut walau tidak ada yang berubah.
    const roleSekarang = baris.roles.map((r) => r.kode).sort();
    const roleBerubah =
      data.roles !== undefined &&
      JSON.stringify([...data.roles].sort()) !== JSON.stringify(roleSekarang);

    if (data.roles) {
      daftarRole = await cariRole(data.roles);

      // Hanya diperiksa kalau susunan role memang berubah. Form selalu
      // mengirim daftar role apa adanya, jadi menyimpan perubahan nama pun
      // akan tertahan di sini kalau tidak dibatasi.
      if (roleBerubah) {
        const punyaAdmin = baris.roles.some((r) => r.kode === 'ADMIN');
        const kehilanganAdmin = punyaAdmin && !data.roles.includes('ADMIN');

        // Admin yang mencabut role ADMIN-nya sendiri akan langsung terkunci
        // keluar dari halaman ini.
        if (dirinyaSendiri && kehilanganAdmin) {
          throw forbidden(
            'Anda tidak bisa mencabut role Administrator milik akun sendiri.',
            'SELF_ROLE_CHANGE'
          );
        }
        if (kehilanganAdmin) {
          await pastikanBukanAdminTerakhir(baris.id, 'mencabut role Administrator');
        }
      }
    }

    const nonaktifkan = data.is_active === false && baris.is_active;
    if (nonaktifkan) {
      if (dirinyaSendiri) {
        throw forbidden('Anda tidak bisa menonaktifkan akun sendiri.', 'SELF_DEACTIVATE');
      }
      if (baris.roles.some((r) => r.kode === 'ADMIN')) {
        await pastikanBukanAdminTerakhir(baris.id, 'menonaktifkan akun ini');
      }
    }

    await sequelize.transaction(async (t) => {
      const perubahan = {};
      if (data.nama !== undefined) perubahan.nama = data.nama;
      if (data.email !== undefined) perubahan.email = data.email;
      if (data.no_hp !== undefined) perubahan.no_hp = data.no_hp || null;
      if (data.is_active !== undefined) perubahan.is_active = data.is_active;
      if (data.password) {
        perubahan.password_hash = await argon2.hash(data.password, { type: argon2.argon2id });
        // Password berganti → hitungan gagal login dan kuncian ikut direset.
        perubahan.failed_attempt = 0;
        perubahan.locked_until = null;
      }
      if (roleBerubah) perubahan.tipe_user = tipeDariRole(data.roles);

      await baris.update(perubahan, { transaction: t });

      // Hanya ditulis ulang kalau susunannya memang berbeda.
      if (roleBerubah && daftarRole) {
        await user_role.destroy({ where: { user_id: baris.id }, transaction: t });
        await user_role.bulkCreate(
          daftarRole.map((r) => ({ user_id: baris.id, role_id: r.id, assigned_at: new Date() })),
          { transaction: t }
        );
      }

      /**
       * Sesi dicabut sehemat mungkin — pencabutan berarti user terlempar ke
       * halaman login, jadi hanya dilakukan kalau memang perlu:
       * - ganti password: sesi lama harus mati, itu inti dari ganti password;
       * - akun dinonaktifkan: tidak boleh ada sesi hidup;
       * - role orang lain berubah: haknya tidak boleh tertinggal di token lama.
       *
       * Perubahan role pada akun sendiri tidak mencabut sesi: admin masih
       * memegang ADMIN (dijaga SELF_ROLE_CHANGE), dan token barunya terbit
       * sendiri pada refresh berikutnya (paling lama 15 menit).
       */
      if (data.password || nonaktifkan || (roleBerubah && !dirinyaSendiri)) {
        await cabutSesi(baris.id, { transaction: t });
      }
    });

    await catatAudit({
      user_id: pelaku.id,
      aksi: 'UPDATE_USER',
      keterangan: `Mengubah user ${baris.email} (${Object.keys(data)
        .filter((k) => k !== 'password_lama')
        .join(', ')})`,
      ...meta,
    });

    return bentukUser(await ambilUser(uuid));
  }

  /** DELETE /users/:uuid — soft delete (kolom deleted_at). */
  static async hapus(uuid, pelaku, meta) {
    const baris = await ambilUser(uuid);

    if (baris.id === pelaku.id) {
      throw forbidden('Anda tidak bisa menghapus akun sendiri.', 'SELF_DELETE');
    }
    if (baris.roles.some((r) => r.kode === 'ADMIN')) {
      await pastikanBukanAdminTerakhir(baris.id, 'menghapus akun ini');
    }

    await sequelize.transaction(async (t) => {
      await cabutSesi(baris.id, { transaction: t });
      await baris.destroy({ transaction: t });
    });

    await catatAudit({
      user_id: pelaku.id,
      aksi: 'DELETE_USER',
      keterangan: `Menghapus user ${baris.email}`,
      ...meta,
    });

    return { uuid };
  }
}

module.exports = UserService;
