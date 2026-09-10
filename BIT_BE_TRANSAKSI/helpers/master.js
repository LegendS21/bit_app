'use strict';

const axios = require('axios');
const { badRequest, notFound } = require('./errors.js');

/**
 * Pemanggilan ke service Master. Databasenya terpisah, jadi data program dan
 * persyaratan hanya bisa diambil lewat HTTP.
 *
 * **Token pemanggil diteruskan apa adanya**, bukan memakai kredensial khusus
 * service ini. Efeknya penting: aturan siapa boleh melihat program apa tetap
 * ditegakkan Master. Applicant hanya bisa membaca program `AKTIF`, jadi ia
 * otomatis tidak bisa membuat permohonan untuk program `DRAFT` — tanpa perlu
 * pemeriksaan tambahan di sini.
 */

const BASE_URL = process.env.MASTER_BASE_URL || 'http://localhost:3002';
const TIMEOUT_MS = Number(process.env.MASTER_TIMEOUT_MS || 5000);

async function panggil(path, token) {
  try {
    const { data } = await axios.get(`${BASE_URL}${path}`, {
      headers: { Authorization: token },
      timeout: TIMEOUT_MS
    });
    return data;
  } catch (error) {
    const status = error.response?.status;

    // 404 dari Master berarti programnya tidak ada ATAU tidak boleh dilihat
    // pemanggil ini. Keduanya dijawab sama supaya keberadaan program yang
    // belum dibuka tidak bocor lewat tebak id.
    if (status === 404) {
      throw notFound('Program beasiswa tidak ditemukan atau belum dibuka', 'BEASISWA_NOT_FOUND');
    }
    if (status === 401 || status === 403) {
      throw badRequest('Tidak berhak membaca data program tersebut', 'MASTER_FORBIDDEN');
    }

    console.error('Gagal memanggil service Master:', error.message);
    throw badRequest(
      'Data program sedang tidak bisa diambil. Coba lagi sebentar lagi.',
      'MASTER_UNAVAILABLE'
    );
  }
}

/** GET /beasiswa/:id — dipakai untuk snapshot nama & cek masa pendaftaran. */
async function ambilBeasiswa(id, token) {
  const hasil = await panggil(`/beasiswa/${id}`, token);
  return hasil.data;
}

/** GET /beasiswa/:id/persyaratan — dokumen yang diminta program itu. */
async function ambilSyaratProgram(id, token) {
  const hasil = await panggil(`/beasiswa/${id}/persyaratan`, token);
  return hasil.data.persyaratan || [];
}

/**
 * Masa pendaftaran diperiksa di sini, bukan di Master: Master hanya menyatakan
 * programnya `AKTIF`, sedangkan "hari ini masih di dalam rentangnya" baru
 * relevan saat ada yang mendaftar.
 */
function pastikanMasihDibuka(beasiswa) {
  const hariIni = new Date().toISOString().slice(0, 10);

  if (beasiswa.tgl_buka && hariIni < beasiswa.tgl_buka) {
    throw badRequest(
      `Pendaftaran program ini baru dibuka ${beasiswa.tgl_buka}`,
      'PENDAFTARAN_BELUM_DIBUKA'
    );
  }
  if (beasiswa.tgl_tutup && hariIni > beasiswa.tgl_tutup) {
    throw badRequest(
      `Pendaftaran program ini sudah ditutup ${beasiswa.tgl_tutup}`,
      'PENDAFTARAN_DITUTUP'
    );
  }
}

module.exports = { ambilBeasiswa, ambilSyaratProgram, pastikanMasihDibuka };
