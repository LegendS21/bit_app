'use strict';

const { Op } = require('sequelize');
const { sequelize, beasiswa, persyaratan, beasiswa_persyaratan } = require('../models');
const { badRequest, conflict, notFound } = require('../helpers/errors.js');
const { pisahMime } = require('../helpers/mime.js');

/** Hanya ADMIN yang boleh melihat program yang belum/tidak lagi dibuka. */
const STATUS_PUBLIK = ['AKTIF'];

/**
 * Program yang masa pendaftarannya sudah lewat tidak boleh diubah daftar
 * syaratnya: permohonan yang sudah masuk dinilai memakai daftar yang berlaku
 * saat itu, jadi menambah syarat baru akan membuat berkas peserta terlihat
 * kurang tanpa mereka bisa memperbaikinya.
 */
const STATUS_TERKUNCI = ['DITUTUP', 'ARSIP'];

function bolehLihatSemua(user) {
  return (user?.roles || []).includes('ADMIN');
}

function bentukSyarat(baris) {
  const syarat = baris.persyaratan;

  return {
    persyaratan_id: Number(baris.persyaratan_id),
    kode: syarat?.kode ?? null,
    nama: syarat?.nama ?? null,
    deskripsi: syarat?.deskripsi ?? null,
    allowed_mime: pisahMime(syarat?.allowed_mime),
    max_size_kb: syarat?.max_size_kb ?? null,
    is_active: syarat?.is_active ?? null,
    is_wajib: baris.is_wajib,
    urutan: baris.urutan
  };
}

async function ambilProgram(id, user) {
  const baris = await beasiswa.findByPk(id);
  if (!baris) throw notFound('Data beasiswa tidak ditemukan', 'BEASISWA_NOT_FOUND');

  // Program yang belum dibuka jangan bocor ke non-admin lewat tebak id —
  // aturannya sama dengan GET /beasiswa/:id.
  if (!bolehLihatSemua(user) && !STATUS_PUBLIK.includes(baris.status)) {
    throw notFound('Data beasiswa tidak ditemukan', 'BEASISWA_NOT_FOUND');
  }

  return baris;
}

function pastikanBisaDiubah(program) {
  if (STATUS_TERKUNCI.includes(program.status)) {
    throw conflict(
      `Program berstatus ${program.status} tidak bisa diubah daftar persyaratannya. ` +
        'Permohonan yang sudah masuk dinilai memakai daftar yang berlaku saat itu.',
      'PROGRAM_TERKUNCI'
    );
  }
}

async function baca(beasiswaId) {
  const baris = await beasiswa_persyaratan.findAll({
    where: { beasiswa_id: beasiswaId },
    include: [{ model: persyaratan, as: 'persyaratan' }],
    order: [
      ['urutan', 'ASC'],
      ['persyaratan_id', 'ASC']
    ]
  });

  return baris.map(bentukSyarat);
}

function bentukJawaban(program, daftar) {
  return {
    data: {
      beasiswa: {
        id: program.id,
        kode: program.kode,
        nama: program.nama,
        status: program.status
      },
      persyaratan: daftar
    }
  };
}

class BeasiswaPersyaratanService {
  /** GET /beasiswa/:id/persyaratan */
  static async daftar(beasiswaId, user) {
    const program = await ambilProgram(beasiswaId, user);
    return bentukJawaban(program, await baca(program.id));
  }

  /**
   * PUT /beasiswa/:id/persyaratan — ganti seluruh daftar sekaligus.
   *
   * Disimpan sebagai selisih (yang hilang dihapus, yang tetap diperbarui,
   * yang baru ditambah), bukan hapus-semua-lalu-buat-ulang, supaya baris yang
   * tidak berubah tidak ikut tersentuh.
   */
  static async simpan(beasiswaId, items) {
    const program = await ambilProgram(beasiswaId, { roles: ['ADMIN'] });
    pastikanBisaDiubah(program);

    const idDiminta = items.map((i) => i.persyaratan_id);

    const tersedia = await persyaratan.findAll({ where: { id: { [Op.in]: idDiminta } } });
    const petaSyarat = new Map(tersedia.map((p) => [Number(p.id), p]));

    const tidakDikenal = idDiminta.filter((id) => !petaSyarat.has(id));
    if (tidakDikenal.length) {
      throw badRequest(
        `Persyaratan tidak ditemukan: ${tidakDikenal.join(', ')}`,
        'PERSYARATAN_NOT_FOUND'
      );
    }

    const lama = await beasiswa_persyaratan.findAll({ where: { beasiswa_id: program.id } });
    const petaLama = new Map(lama.map((b) => [Number(b.persyaratan_id), b]));

    // Persyaratan yang sudah dinonaktifkan tidak boleh dipasang lagi, tapi yang
    // terlanjur terpasang tetap boleh dipertahankan — kalau tidak, admin jadi
    // tidak bisa menyimpan perubahan apa pun pada program lamanya.
    const nonaktifBaru = idDiminta.filter(
      (id) => !petaLama.has(id) && !petaSyarat.get(id).is_active
    );
    if (nonaktifBaru.length) {
      const nama = nonaktifBaru.map((id) => petaSyarat.get(id).kode).join(', ');
      throw badRequest(
        `Persyaratan berikut sudah nonaktif dan tidak bisa dipasang: ${nama}`,
        'PERSYARATAN_NONAKTIF'
      );
    }

    await sequelize.transaction(async (t) => {
      const dilepas = lama
        .map((b) => Number(b.persyaratan_id))
        .filter((id) => !idDiminta.includes(id));

      if (dilepas.length) {
        // Dihapus lewat pasangan (beasiswa_id, persyaratan_id), bukan kolom
        // `id`: model penghubung ini tidak memaparkan `id` — `belongsToMany`
        // menjadikan pasangan FK sebagai primary key-nya.
        await beasiswa_persyaratan.destroy({
          where: { beasiswa_id: program.id, persyaratan_id: { [Op.in]: dilepas } },
          transaction: t
        });
      }

      // Urutan diambil dari posisi array, jadi nomornya selalu rapat 1..n.
      for (const [indeks, item] of items.entries()) {
        const urutan = indeks + 1;
        const baris = petaLama.get(item.persyaratan_id);

        if (!baris) {
          await beasiswa_persyaratan.create(
            {
              beasiswa_id: program.id,
              persyaratan_id: item.persyaratan_id,
              is_wajib: item.is_wajib,
              urutan
            },
            { transaction: t }
          );
          continue;
        }

        if (baris.is_wajib !== item.is_wajib || baris.urutan !== urutan) {
          await baris.update({ is_wajib: item.is_wajib, urutan }, { transaction: t });
        }
      }
    });

    return bentukJawaban(program, await baca(program.id));
  }

  /**
   * DELETE /beasiswa/:id/persyaratan/:persyaratanId — lepas satu syarat.
   * Yang dihapus cuma kaitannya; data persyaratannya sendiri tetap ada.
   */
  static async lepas(beasiswaId, persyaratanId) {
    const program = await ambilProgram(beasiswaId, { roles: ['ADMIN'] });
    pastikanBisaDiubah(program);

    const baris = await beasiswa_persyaratan.findOne({
      where: { beasiswa_id: program.id, persyaratan_id: persyaratanId }
    });
    if (!baris) {
      throw notFound('Persyaratan ini tidak terpasang pada program tersebut', 'SYARAT_NOT_FOUND');
    }

    await sequelize.transaction(async (t) => {
      await baris.destroy({ transaction: t });

      // Rapatkan kembali nomor urutnya supaya tidak berlubang.
      const sisa = await beasiswa_persyaratan.findAll({
        where: { beasiswa_id: program.id },
        order: [
          ['urutan', 'ASC'],
          ['persyaratan_id', 'ASC']
        ],
        transaction: t
      });

      for (const [indeks, b] of sisa.entries()) {
        if (b.urutan !== indeks + 1) {
          await b.update({ urutan: indeks + 1 }, { transaction: t });
        }
      }
    });

    return bentukJawaban(program, await baca(program.id));
  }
}

module.exports = BeasiswaPersyaratanService;
