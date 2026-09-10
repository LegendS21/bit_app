'use strict';

const { permohonan_status_history } = require('../models');
const { conflict } = require('./errors.js');
const { bolehPindah, terkunci } = require('./statusPermohonan.js');

/**
 * Satu-satunya pintu untuk mengubah status permohonan.
 *
 * Tiga hal dijamin sekaligus di sini, supaya tidak mungkin terlewat di salah
 * satu endpoint:
 *   1. transisinya sah menurut state machine (kalau tidak → HTTP 409);
 *   2. `is_locked` selalu turunan status, bukan isian bebas;
 *   3. perpindahannya tercatat di `permohonan_status_history` **dalam
 *      transaksi yang sama**, jadi tidak ada perpindahan tanpa jejak.
 *
 * Wajib dipanggil di dalam transaksi.
 */
async function pindahStatus(baris, ke, { actorId, actorRole, catatan }, transaction) {
  if (!transaction) {
    throw new Error('pindahStatus wajib dijalankan di dalam transaksi');
  }

  const dari = baris.status;

  if (!bolehPindah(dari, ke)) {
    throw conflict(
      `Permohonan berstatus ${dari} tidak bisa dipindahkan ke ${ke}`,
      'TRANSISI_TIDAK_SAH'
    );
  }

  const perubahan = { status: ke, is_locked: terkunci(ke) };
  // Dicatat sekali saat pertama dikirim; pengiriman ulang setelah revisi
  // memperbarui waktunya, karena itulah pengiriman yang dinilai.
  if (ke === 'DIAJUKAN') perubahan.submitted_at = new Date();

  await baris.update(perubahan, { transaction });

  await permohonan_status_history.create(
    {
      permohonan_id: baris.id,
      status_dari: dari,
      status_ke: ke,
      actor_id: actorId ?? null,
      actor_role: actorRole ?? null,
      catatan: catatan || null
    },
    { transaction }
  );
}

module.exports = { pindahStatus };
