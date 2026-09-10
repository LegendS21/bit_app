'use strict';

const { Op } = require('sequelize');
const {
  sequelize,
  permohonan,
  permohonan_biodata,
  permohonan_pendidikan,
  permohonan_dokumen,
  permohonan_persetujuan,
  permohonan_status_history
} = require('../models');

const { badRequest, conflict, forbidden, notFound } = require('../helpers/errors.js');
const { nomorBerikutnya, rakitKode } = require('../helpers/nomorUrut.js');
const { pindahStatus } = require('../helpers/pindahStatus.js');
const { terkunci } = require('../helpers/statusPermohonan.js');
const {
  ambilBeasiswa,
  ambilSyaratProgram,
  pastikanMasihDibuka
} = require("../helpers/master.js");
const { TAHAP } = require("../validators/permohonanValidator.js");

const PREFIX_KODE = 'PRM';
const NAMA_URUTAN = 'permohonan';

const ROLE_INTERNAL = ['ADMIN', 'VERIFIKATOR', 'LEMBAGA_SELEKSI'];

const punyaRoleInternal = (user) =>
  (user?.roles || []).some((r) => ROLE_INTERNAL.includes(r));

/* ------------------------------------------------------------------ *
 * Pemeriksaan akses
 * ------------------------------------------------------------------ */

/**
 * Klaim `uid` wajib ada. Tanpa itu tidak ada cara memastikan permohonan ini
 * milik siapa — dan seluruh proteksi IDOR di bawah jadi tidak ada artinya.
 */
function idPelaku(user) {
  if (!user?.id) {
    throw forbidden(
      'Token tidak memuat identitas pengguna (klaim uid). Silakan login ulang.',
      'IDENTITAS_TIDAK_LENGKAP'
    );
  }
  return user.id;
}

/**
 * Proteksi IDOR. Permohonan milik orang lain dibalas **404, bukan 403** —
 * membedakan keduanya memberi tahu penebak id bahwa permohonan itu memang ada.
 */
function pastikanBolehLihat(baris, user) {
  if (punyaRoleInternal(user)) return;
  if (Number(baris.user_id) !== Number(idPelaku(user))) {
    throw notFound('Permohonan tidak ditemukan', 'PERMOHONAN_NOT_FOUND');
  }
}

/** Isian wizard hanya boleh disentuh pemiliknya — internal pun tidak boleh. */
function pastikanPemilik(baris, user) {
  if (Number(baris.user_id) !== Number(idPelaku(user))) {
    throw notFound('Permohonan tidak ditemukan', 'PERMOHONAN_NOT_FOUND');
  }
}

/** Data hanya boleh diubah saat DRAFT atau REVISI (`is_locked`). */
function pastikanBisaDiubah(baris) {
  if (terkunci(baris.status)) {
    throw conflict(
      `Permohonan berstatus ${baris.status} sudah terkunci dan tidak bisa diubah`,
      'PERMOHONAN_TERKUNCI'
    );
  }
}

async function ambilPermohonan(id) {
  const baris = await permohonan.findByPk(id);
  if (!baris) throw notFound('Permohonan tidak ditemukan', 'PERMOHONAN_NOT_FOUND');
  return baris;
}

/* ------------------------------------------------------------------ *
 * Bentuk response
 * ------------------------------------------------------------------ */

function bentukRingkas(baris) {
  return {
    id: baris.id,
    kode_permohonan: baris.kode_permohonan,
    beasiswa_id: baris.beasiswa_id,
    beasiswa_nama: baris.beasiswa_nama,
    status: baris.status,
    current_step: baris.current_step,
    is_locked: baris.is_locked,
    submitted_at: baris.submitted_at,
    created_at: baris.created_at,
    updated_at: baris.updated_at,
    // Ikut kalau query-nya menyertakan biodata — dipakai tabel verifikator.
    ...(baris.biodata
      ? { pendaftar: { nama_lengkap: baris.biodata.nama_lengkap, nik: baris.biodata.nik } }
      : {})
  };
}

function bentukLengkap(baris) {
  return {
    ...bentukRingkas(baris),
    user_id: baris.user_id,
    biodata: baris.biodata ?? null,
    pendidikan: baris.pendidikan ?? null,
    dokumen: baris.dokumen ?? [],
    persetujuan: baris.persetujuan ?? null,
    verifikasi: baris.verifikasi ?? [],
    wawancara: baris.wawancara ?? [],
    hasil: baris.hasil ?? null,
    riwayat_status: baris.riwayat_status ?? []
  };
}

/** Satu tempat untuk menyusun relasi detail, dipakai beberapa endpoint. */
const RELASI_DETAIL = [
  { association: 'biodata' },
  { association: 'pendidikan' },
  { association: 'dokumen' },
  { association: 'persetujuan' },
  {
    association: 'verifikasi',
    include: [{ association: 'checklist' }]
  },
  {
    association: 'wawancara',
    include: [{ association: 'detail' }]
  },
  { association: 'hasil' },
  { association: 'riwayat_status' }
];

/* ------------------------------------------------------------------ *
 * Service
 * ------------------------------------------------------------------ */

class PermohonanService {
  /**
   * POST /permohonan — buat draft.
   *
   * `beasiswa_nama` disalin dari service Master sebagai snapshot. Programnya
   * diambil memakai token pemanggil, jadi applicant hanya bisa mendaftar ke
   * program yang memang boleh ia lihat (`AKTIF`).
   */
  static async buat(data, user, tokenHeader) {
    const userId = idPelaku(user);

    const beasiswa = await ambilBeasiswa(data.beasiswa_id, tokenHeader);
    pastikanMasihDibuka(beasiswa);

    // Diperiksa lebih dulu supaya pesannya jelas; unique key di DB tetap jadi
    // penjaga terakhir kalau ada dua request bersamaan.
    const sudahAda = await permohonan.findOne({
      where: { user_id: userId, beasiswa_id: data.beasiswa_id }
    });
    if (sudahAda) {
      throw conflict(
        `Anda sudah punya permohonan untuk program ini (${sudahAda.kode_permohonan})`,
        'PERMOHONAN_SUDAH_ADA'
      );
    }

    const tahun = new Date().getFullYear();

    const baru = await sequelize.transaction(async (t) => {
      const nomor = await nomorBerikutnya(NAMA_URUTAN, tahun, t);

      const baris = await permohonan.create(
        {
          kode_permohonan: rakitKode(PREFIX_KODE, tahun, nomor),
          user_id: userId,
          user_uuid: user.uuid,
          beasiswa_id: beasiswa.id,
          beasiswa_nama: beasiswa.nama,
          status: 'DRAFT',
          current_step: 1,
          is_locked: false
        },
        { transaction: t }
      );

      // Baris riwayat pertama: status_dari kosong = permohonan baru dibuat.
      await permohonan_status_history.create(
        {
          permohonan_id: baris.id,
          status_dari: null,
          status_ke: 'DRAFT',
          actor_id: userId,
          actor_role: 'APPLICANT',
          catatan: 'Permohonan dibuat'
        },
        { transaction: t }
      );

      return baris;
    });

    return bentukRingkas(baru);
  }

  /** GET /permohonan/saya — monitoring status milik sendiri. */
  static async daftarSaya(filter, user) {
    const where = { user_id: idPelaku(user) };
    if (filter.status) where.status = filter.status;
    if (filter.beasiswa_id) where.beasiswa_id = filter.beasiswa_id;

    const { rows, count } = await permohonan.findAndCountAll({
      where,
      order: [['id', 'DESC']],
      limit: filter.limit,
      offset: (filter.page - 1) * filter.limit
    });

    return {
      data: rows.map(bentukRingkas),
      meta: {
        total: count,
        page: filter.page,
        limit: filter.limit,
        total_halaman: Math.max(1, Math.ceil(count / filter.limit))
      }
    };
  }

  /**
   * GET /permohonan — daftar untuk pengguna internal.
   *
   * Permohonan berstatus DRAFT sengaja **tidak ditampilkan**: itu isian yang
   * belum dikirim pemiliknya, jadi belum layak dibaca verifikator.
   */
  static async daftar(filter) {
    // DRAFT selalu di luar jangkauan internal, apa pun filternya.
    const dasar = filter.tahap ? TAHAP[filter.tahap] : null;
    const where = {};

    if (filter.status) {
      // Filter status diiriskan dengan tahapnya. Meminta status di luar tahap
      // yang sedang dibuka menghasilkan kosong, bukan diam-diam diabaikan.
      if (filter.status === "DRAFT" || (dasar && !dasar.includes(filter.status))) {
        return kosong(filter);
      }
      where.status = filter.status;
    } else {
      where.status = dasar ? { [Op.in]: dasar } : { [Op.ne]: "DRAFT" };
    }
    if (filter.beasiswa_id) where.beasiswa_id = filter.beasiswa_id;

    if (filter.q) {
      // Cari di kode permohonan ATAU nama/NIK pendaftar. Karena namanya ada di
      // tabel lain, pencocokannya digabung lewat kondisi di level atas.
      where[Op.or] = [
        { kode_permohonan: { [Op.like]: `%${filter.q}%` } },
        { beasiswa_nama: { [Op.like]: `%${filter.q}%` } },
        { '$biodata.nama_lengkap$': { [Op.like]: `%${filter.q}%` } },
        { '$biodata.nik$': { [Op.like]: `%${filter.q}%` } }
      ];
    }

    const { rows, count } = await permohonan.findAndCountAll({
      where,
      include: [{ association: 'biodata', required: false }],
      order: [
        ['submitted_at', 'ASC'],
        ['id', 'ASC']
      ],
      limit: filter.limit,
      offset: (filter.page - 1) * filter.limit,
      // Include one-to-one + limit bisa menghasilkan hitungan ganda; subQuery
      // dimatikan supaya LIMIT diterapkan ke baris permohonan, bukan hasil join.
      subQuery: false,
      distinct: true
    });

    return {
      data: rows.map(bentukRingkas),
      meta: {
        total: count,
        page: filter.page,
        limit: filter.limit,
        total_halaman: Math.max(1, Math.ceil(count / filter.limit))
      }
    };
  }

  /** GET /permohonan/:id — detail lengkap. */
  static async detail(id, user) {
    const baris = await permohonan.findByPk(id, { include: RELASI_DETAIL });
    if (!baris) throw notFound('Permohonan tidak ditemukan', 'PERMOHONAN_NOT_FOUND');

    pastikanBolehLihat(baris, user);
    return bentukLengkap(baris);
  }

  /* ---------------- Bagian wizard ---------------- */

  /**
   * Semua step memakai jalur yang sama: pastikan pemiliknya, pastikan belum
   * terkunci, simpan (buat kalau belum ada), lalu majukan posisi wizard.
   *
   * `current_step` hanya boleh maju — kalau pelamar kembali menyunting
   * langkah 1, posisinya tidak turun lagi ke 1.
   */
  static async simpanBagian(id, langkah, isi, user) {
    const baris = await ambilPermohonan(id);
    pastikanPemilik(baris, user);
    pastikanBisaDiubah(baris);

    await sequelize.transaction(async (t) => {
      await isi(baris, t);

      // `updated_at` ikut ditulis walau posisinya tidak maju, supaya FE bisa
      // menampilkan "tersimpan pukul …" tiap kali draft disimpan ulang.
      const berikutnya = Math.max(baris.current_step, Math.min(langkah + 1, 4));
      await baris.update(
        { current_step: berikutnya, updated_at: new Date() },
        { transaction: t }
      );
    });

    return PermohonanService.detail(id, user);
  }

  /** PUT /permohonan/:id/step-1 — Data Diri & Kontak. */
  static async simpanStep1(id, data, user) {
    return PermohonanService.simpanBagian(id, 1, async (baris, t) => {
      const nilai = { ...data, permohonan_id: baris.id };
      const ada = await permohonan_biodata.findByPk(baris.id, { transaction: t });
      if (ada) await ada.update(nilai, { transaction: t });
      else await permohonan_biodata.create(nilai, { transaction: t });
    }, user);
  }

  /** PUT /permohonan/:id/step-2 — Pendidikan & Pekerjaan. */
  static async simpanStep2(id, data, user) {
    return PermohonanService.simpanBagian(id, 2, async (baris, t) => {
      const nilai = {
        ...data,
        pekerjaan_kode: data.pekerjaan_kode || null,
        permohonan_id: baris.id
      };
      const ada = await permohonan_pendidikan.findByPk(baris.id, { transaction: t });
      if (ada) await ada.update(nilai, { transaction: t });
      else await permohonan_pendidikan.create(nilai, { transaction: t });
    }, user);
  }

  /**
   * POST /permohonan/:id/step-3 — daftarkan berkas yang sudah diunggah.
   *
   * Filenya tidak lewat sini; yang dicatat hanya `dokumen_uuid` dari service
   * Dokumen. Jenis dokumennya harus memang diminta program ini, dan namanya
   * disalin sebagai snapshot.
   */
  static async simpanStep3(id, data, user, tokenHeader) {
    const baris = await ambilPermohonan(id);
    pastikanPemilik(baris, user);
    pastikanBisaDiubah(baris);

    const syarat = await ambilSyaratProgram(baris.beasiswa_id, tokenHeader);
    const cocok = syarat.find((s) => Number(s.persyaratan_id) === Number(data.persyaratan_id));
    if (!cocok) {
      throw badRequest(
        'Jenis dokumen ini tidak diminta oleh program yang Anda daftar',
        'PERSYARATAN_TIDAK_DIMINTA'
      );
    }

    const batasByte = Number(cocok.max_size_kb) * 1024;
    if (batasByte > 0 && Number(data.ukuran_byte) > batasByte) {
      throw badRequest(
        `Ukuran berkas melebihi batas ${cocok.max_size_kb} KB untuk ${cocok.nama}`,
        'BERKAS_TERLALU_BESAR'
      );
    }

    return PermohonanService.simpanBagian(id, 3, async (induk, t) => {
      const nilai = {
        permohonan_id: induk.id,
        persyaratan_id: data.persyaratan_id,
        persyaratan_nama: cocok.nama,
        dokumen_uuid: data.dokumen_uuid,
        nama_file_asli: data.nama_file_asli,
        ukuran_byte: data.ukuran_byte,
        // Unggah ulang mengembalikan status pemeriksaannya ke awal — berkas
        // baru belum pernah dilihat verifikator.
        status_verifikasi: 'BELUM_DIPERIKSA',
        catatan: null,
        uploaded_at: new Date()
      };

      const ada = await permohonan_dokumen.findOne({
        where: { permohonan_id: induk.id, persyaratan_id: data.persyaratan_id },
        transaction: t
      });

      if (ada) await ada.update(nilai, { transaction: t });
      else await permohonan_dokumen.create(nilai, { transaction: t });
    }, user);
  }

  /** DELETE /permohonan/:id/step-3/:persyaratanId — batalkan satu berkas. */
  static async hapusDokumen(id, persyaratanId, user) {
    const baris = await ambilPermohonan(id);
    pastikanPemilik(baris, user);
    pastikanBisaDiubah(baris);

    const berkas = await permohonan_dokumen.findOne({
      where: { permohonan_id: baris.id, persyaratan_id: persyaratanId }
    });
    if (!berkas) {
      throw notFound('Berkas itu belum pernah diunggah', 'DOKUMEN_NOT_FOUND');
    }

    await berkas.destroy();
    return PermohonanService.detail(id, user);
  }

  /** PUT /permohonan/:id/step-4 — Lembar Persetujuan. */
  static async simpanStep4(id, data, user, req) {
    return PermohonanService.simpanBagian(id, 4, async (baris, t) => {
      const nilai = {
        permohonan_id: baris.id,
        is_setuju: data.is_setuju,
        // Dicatat hanya saat benar-benar menyetujui; mencabut centang
        // mengosongkannya lagi.
        disetujui_at: data.is_setuju ? new Date() : null,
        ip_address: data.is_setuju ? (req?.ip || null) : null
      };

      const ada = await permohonan_persetujuan.findByPk(baris.id, { transaction: t });
      if (ada) await ada.update(nilai, { transaction: t });
      else await permohonan_persetujuan.create(nilai, { transaction: t });
    }, user);
  }

  /**
   * POST /permohonan/:id/submit — DRAFT/REVISI → DIAJUKAN.
   *
   * Kelengkapannya diperiksa di sini, bukan per step: pelamar boleh menyimpan
   * satu bagian saja lalu berhenti (itu gunanya draft), tapi tidak boleh
   * mengirim yang belum lengkap.
   */
  static async submit(id, user, tokenHeader) {
    const baris = await ambilPermohonan(id);
    pastikanPemilik(baris, user);
    pastikanBisaDiubah(baris);

    const kurang = [];

    const biodata = await permohonan_biodata.findByPk(baris.id);
    if (!biodata) kurang.push('Bagian 1: Data Diri & Kontak belum diisi');

    const pendidikan = await permohonan_pendidikan.findByPk(baris.id);
    if (!pendidikan) kurang.push('Bagian 2: Pendidikan & Pekerjaan belum diisi');

    const syarat = await ambilSyaratProgram(baris.beasiswa_id, tokenHeader);
    const wajib = syarat.filter((s) => s.is_wajib);

    if (wajib.length) {
      const terunggah = await permohonan_dokumen.findAll({
        where: { permohonan_id: baris.id },
        attributes: ['persyaratan_id']
      });
      const punya = new Set(terunggah.map((d) => Number(d.persyaratan_id)));

      for (const s of wajib) {
        if (!punya.has(Number(s.persyaratan_id))) {
          kurang.push(`Bagian 3: dokumen ${s.nama} belum diunggah`);
        }
      }
    }

    const persetujuan = await permohonan_persetujuan.findByPk(baris.id);
    if (!persetujuan?.is_setuju) {
      kurang.push('Bagian 4: pernyataan keabsahan data belum disetujui');
    }

    if (kurang.length) {
      throw badRequest(
        `Permohonan belum lengkap: ${kurang.join('; ')}`,
        'PERMOHONAN_BELUM_LENGKAP'
      );
    }

    await sequelize.transaction(async (t) => {
      await pindahStatus(
        baris,
        'DIAJUKAN',
        {
          actorId: idPelaku(user),
          actorRole: 'APPLICANT',
          catatan: baris.status === 'REVISI' ? 'Dikirim ulang setelah revisi' : 'Permohonan dikirim'
        },
        t
      );
      await baris.update({ current_step: 4 }, { transaction: t });
    });

    return PermohonanService.detail(id, user);
  }
}

/** Hasil kosong berbentuk sama dengan hasil biasa. */
function kosong(filter) {
  return {
    data: [],
    meta: { total: 0, page: filter.page, limit: filter.limit, total_halaman: 1 }
  };
}

module.exports = PermohonanService;

// Dipakai bersama oleh service seleksi supaya aturan aksesnya cuma ada
// satu salinan.
module.exports.internal = {
  ambilPermohonan,
  pastikanBolehLihat,
  idPelaku,
  bentukRingkas,
  RELASI_DETAIL
};
