'use strict';

const { Op } = require('sequelize');
const { sequelize, beasiswa } = require('../models');
const { badRequest, notFound } = require('../helpers/errors.js');
const { nomorBerikutnya, rakitKode } = require('../helpers/nomorUrut.js');

/** Kode program: BEA-{tahun}-{urut 3 digit}, mis. BEA-2026-001. */
const PREFIX_KODE = 'BEA';
const NAMA_URUTAN = 'beasiswa';

/** Hanya ADMIN yang boleh melihat program yang belum/tidak lagi dibuka. */
const STATUS_PUBLIK = ['AKTIF'];

function bolehLihatSemua(user) {
  return (user?.roles || []).includes('ADMIN');
}

function bentukBeasiswa(baris) {
  return {
    id: baris.id,
    kode: baris.kode,
    nama: baris.nama,
    deskripsi: baris.deskripsi,
    penyelenggara: baris.penyelenggara,
    kuota: baris.kuota,
    tgl_buka: baris.tgl_buka,
    tgl_tutup: baris.tgl_tutup,
    status: baris.status,
    created_by: baris.created_by,
    created_at: baris.created_at,
    updated_at: baris.updated_at
  };
}

/**
 * Masa pendaftaran diperiksa terhadap nilai gabungan (yang lama + yang diubah),
 * bukan cuma yang dikirim — kalau tidak, mengubah satu tanggal saja bisa
 * menghasilkan periode terbalik tanpa ketahuan.
 */
function pastikanPeriodeSah(tglBuka, tglTutup) {
  if (tglBuka && tglTutup && tglBuka > tglTutup) {
    throw badRequest(
      'Tanggal tutup tidak boleh lebih awal dari tanggal buka',
      'PERIODE_TIDAK_VALID'
    );
  }
}

async function ambilBeasiswa(id) {
  const baris = await beasiswa.findByPk(id);
  if (!baris) throw notFound('Data beasiswa tidak ditemukan', 'BEASISWA_NOT_FOUND');
  return baris;
}

class BeasiswaService {
  /** GET /beasiswa */
  static async daftar(filter, user) {
    const where = {};

    if (filter.q) {
      where[Op.or] = [
        { nama: { [Op.like]: `%${filter.q}%` } },
        { kode: { [Op.like]: `%${filter.q}%` } },
        { penyelenggara: { [Op.like]: `%${filter.q}%` } }
      ];
    }

    if (bolehLihatSemua(user)) {
      if (filter.status) where.status = filter.status;
    } else {
      // Filter status dari non-admin diiriskan dengan yang boleh dilihat.
      // Kalau ia meminta status yang bukan haknya, hasilnya kosong — bukan
      // diam-diam diganti jadi status lain yang tidak ia minta.
      const diizinkan = filter.status
        ? STATUS_PUBLIK.filter((s) => s === filter.status)
        : STATUS_PUBLIK;
      where.status = { [Op.in]: diizinkan };
    }

    const { rows, count } = await beasiswa.findAndCountAll({
      where,
      order: [
        ['tgl_buka', 'DESC'],
        ['id', 'DESC']
      ],
      limit: filter.limit,
      offset: (filter.page - 1) * filter.limit
    });

    return {
      data: rows.map(bentukBeasiswa),
      meta: {
        total: count,
        page: filter.page,
        limit: filter.limit,
        total_halaman: Math.max(1, Math.ceil(count / filter.limit))
      }
    };
  }

  /** GET /beasiswa/:id */
  static async detail(id, user) {
    const baris = await ambilBeasiswa(id);

    // Program yang belum dibuka jangan bocor ke non-admin lewat tebak id.
    if (!bolehLihatSemua(user) && !STATUS_PUBLIK.includes(baris.status)) {
      throw notFound('Data beasiswa tidak ditemukan', 'BEASISWA_NOT_FOUND');
    }

    return bentukBeasiswa(baris);
  }

  /**
   * POST /beasiswa
   *
   * `kode` tidak diterima dari client — dirakit sendiri sebagai
   * `BEA-{tahun sekarang}-{urut 3 digit}`. Pengambilan nomor dan penyimpanan
   * baris ada di satu transaksi, jadi nomor tidak pernah terpakai kalau
   * penyimpanannya gagal.
   */
  static async buat(data, pelaku) {
    pastikanPeriodeSah(data.tgl_buka, data.tgl_tutup);

    const tahun = new Date().getFullYear();

    const baru = await sequelize.transaction(async (t) => {
      const nomor = await nomorBerikutnya(NAMA_URUTAN, tahun, t);

      return beasiswa.create(
        {
          kode: rakitKode(PREFIX_KODE, tahun, nomor),
          nama: data.nama,
          deskripsi: data.deskripsi || null,
          penyelenggara: data.penyelenggara || null,
          kuota: data.kuota ?? 0,
          tgl_buka: data.tgl_buka,
          tgl_tutup: data.tgl_tutup,
          status: data.status ?? 'DRAFT',
          // Logical reference ke db_rbac.users.id, dari klaim `uid` token.
          created_by: pelaku?.id ?? null
        },
        { transaction: t }
      );
    });

    return bentukBeasiswa(baru);
  }

  /**
   * PUT /beasiswa/:id
   * `kode` tidak ikut diubah: nomornya melekat pada program itu dan sudah
   * beredar di dokumen maupun permohonan peserta.
   */
  static async ubah(id, data) {
    const baris = await ambilBeasiswa(id);

    pastikanPeriodeSah(
      data.tgl_buka ?? baris.tgl_buka,
      data.tgl_tutup ?? baris.tgl_tutup
    );

    const perubahan = {};
    if (data.nama !== undefined) perubahan.nama = data.nama;
    if (data.deskripsi !== undefined) perubahan.deskripsi = data.deskripsi || null;
    if (data.penyelenggara !== undefined) {
      perubahan.penyelenggara = data.penyelenggara || null;
    }
    if (data.kuota !== undefined) perubahan.kuota = data.kuota;
    if (data.tgl_buka !== undefined) perubahan.tgl_buka = data.tgl_buka;
    if (data.tgl_tutup !== undefined) perubahan.tgl_tutup = data.tgl_tutup;
    if (data.status !== undefined) perubahan.status = data.status;

    await baris.update(perubahan);
    return bentukBeasiswa(baris);
  }

  /**
   * DELETE /beasiswa/:id — soft delete (kolom deleted_at).
   *
   * Sengaja tidak permanen: permohonan di service Transaksi menyimpan
   * `beasiswa_id` sebagai logical reference, jadi barisnya harus tetap bisa
   * ditelusuri walau programnya sudah tidak dipakai.
   */
  static async hapus(id) {
    const baris = await ambilBeasiswa(id);
    await baris.destroy();
    return { id: baris.id, kode: baris.kode };
  }
}

module.exports = BeasiswaService;
