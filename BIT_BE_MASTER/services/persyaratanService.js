'use strict';

const { Op, fn, col } = require('sequelize');
const { persyaratan, beasiswa_persyaratan } = require('../models');
const { conflict, notFound } = require('../helpers/errors.js');
const { pisahMime, gabungMime } = require('../helpers/mime.js');

function bentukPersyaratan(baris, jumlahProgram = 0) {
  return {
    id: baris.id,
    kode: baris.kode,
    nama: baris.nama,
    deskripsi: baris.deskripsi,
    allowed_mime: pisahMime(baris.allowed_mime),
    max_size_kb: baris.max_size_kb,
    is_active: baris.is_active,
    jumlah_program: jumlahProgram,
    created_at: baris.created_at,
    updated_at: baris.updated_at
  };
}

async function ambilPersyaratan(id) {
  const baris = await persyaratan.findByPk(id);
  if (!baris) throw notFound('Data persyaratan tidak ditemukan', 'PERSYARATAN_NOT_FOUND');
  return baris;
}

async function pastikanKodeBebas(kode, kecualiId = null) {
  const where = { kode };
  if (kecualiId) where.id = { [Op.ne]: kecualiId };

  const ada = await persyaratan.findOne({ where });
  if (ada) throw conflict(`Kode "${kode}" sudah dipakai`);
}

/** Berapa program yang memakai tiap persyaratan, dihitung sekali untuk daftar. */
async function hitungPemakaian(idPersyaratan = null) {
  const where = idPersyaratan ? { persyaratan_id: { [Op.in]: idPersyaratan } } : {};

  const baris = await beasiswa_persyaratan.findAll({
    attributes: ['persyaratan_id', [fn('COUNT', col('beasiswa_id')), 'jumlah']],
    where,
    group: ['persyaratan_id'],
    raw: true
  });

  return Object.fromEntries(baris.map((b) => [b.persyaratan_id, Number(b.jumlah)]));
}

class PersyaratanService {
  /** GET /persyaratan */
  static async daftar(filter) {
    const where = {};

    if (filter.q) {
      where[Op.or] = [
        { nama: { [Op.like]: `%${filter.q}%` } },
        { kode: { [Op.like]: `%${filter.q}%` } }
      ];
    }
    if (filter.status) where.is_active = filter.status === 'aktif';

    const { rows, count } = await persyaratan.findAndCountAll({
      where,
      order: [['kode', 'ASC']],
      limit: filter.limit,
      offset: (filter.page - 1) * filter.limit
    });

    const pemakaian = await hitungPemakaian(rows.map((r) => r.id));

    return {
      data: rows.map((r) => bentukPersyaratan(r, pemakaian[r.id] || 0)),
      meta: {
        total: count,
        page: filter.page,
        limit: filter.limit,
        total_halaman: Math.max(1, Math.ceil(count / filter.limit))
      }
    };
  }

  /** GET /persyaratan/:id */
  static async detail(id) {
    const baris = await ambilPersyaratan(id);
    const jumlah = await beasiswa_persyaratan.count({ where: { persyaratan_id: baris.id } });
    return bentukPersyaratan(baris, jumlah);
  }

  /** POST /persyaratan */
  static async buat(data) {
    await pastikanKodeBebas(data.kode);

    const baru = await persyaratan.create({
      kode: data.kode,
      nama: data.nama,
      deskripsi: data.deskripsi || null,
      // Kolom default DB dipakai kalau tidak dikirim.
      ...(data.allowed_mime ? { allowed_mime: gabungMime(data.allowed_mime) } : {}),
      ...(data.max_size_kb !== undefined ? { max_size_kb: data.max_size_kb } : {}),
      is_active: data.is_active ?? true
    });

    return bentukPersyaratan(baru);
  }

  /** PUT /persyaratan/:id */
  static async ubah(id, data) {
    const baris = await ambilPersyaratan(id);

    if (data.kode !== undefined && data.kode !== baris.kode) {
      await pastikanKodeBebas(data.kode, baris.id);
    }

    const perubahan = {};
    if (data.kode !== undefined) perubahan.kode = data.kode;
    if (data.nama !== undefined) perubahan.nama = data.nama;
    if (data.deskripsi !== undefined) perubahan.deskripsi = data.deskripsi || null;
    if (data.allowed_mime !== undefined) {
      perubahan.allowed_mime = gabungMime(data.allowed_mime);
    }
    if (data.max_size_kb !== undefined) perubahan.max_size_kb = data.max_size_kb;
    if (data.is_active !== undefined) perubahan.is_active = data.is_active;

    await baris.update(perubahan);
    return PersyaratanService.detail(baris.id);
  }

  /**
   * DELETE /persyaratan/:id
   *
   * Tabel ini tidak punya `deleted_at`, jadi penghapusannya permanen.
   * Foreign key dari `beasiswa_persyaratan` memang RESTRICT, tapi dicek
   * lebih dulu supaya pesannya jelas — bukan error constraint mentah.
   */
  static async hapus(id) {
    const baris = await ambilPersyaratan(id);

    const dipakai = await beasiswa_persyaratan.count({ where: { persyaratan_id: baris.id } });
    if (dipakai > 0) {
      throw conflict(
        `Persyaratan ini masih dipakai ${dipakai} program beasiswa. ` +
          'Lepaskan dari programnya dulu, atau nonaktifkan saja.',
        'PERSYARATAN_DIPAKAI'
      );
    }

    await baris.destroy();
    return { id: baris.id, kode: baris.kode };
  }
}

module.exports = PersyaratanService;
