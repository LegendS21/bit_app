'use strict';

const { sequence_counter } = require('../models');

/**
 * Ambil nomor urut berikutnya untuk satu (nama, tahun).
 *
 * Wajib dipanggil di dalam transaksi. Barisnya dikunci dengan
 * `SELECT ... FOR UPDATE`, jadi dua request yang datang bersamaan mengantre
 * dan tidak mungkin mendapat nomor yang sama — cara ini yang ditetapkan di
 * bagian 0.4 desain-database.
 *
 * Nomor tidak dipakai ulang: kalau transaksinya batal, nomor itu hangus.
 * Itu memang konsekuensinya — lebih baik ada lompatan nomor daripada dua
 * baris berebut kode yang sama.
 */
async function nomorBerikutnya(nama, tahun, transaction) {
  if (!transaction) {
    throw new Error('nomorBerikutnya wajib dijalankan di dalam transaksi');
  }

  // findOrCreate + lock: baris tahun baru dibuat sekali, sesudahnya dikunci.
  await sequence_counter.findOrCreate({
    where: { nama, tahun },
    defaults: { nama, tahun, last_value: 0 },
    transaction
  });

  const baris = await sequence_counter.findOne({
    where: { nama, tahun },
    lock: transaction.LOCK.UPDATE,
    transaction
  });

  const berikutnya = Number(baris.last_value) + 1;
  await baris.update({ last_value: berikutnya }, { transaction });

  return berikutnya;
}

/**
 * Rakit kode berformat `{PREFIX}-{TAHUN}-{urut}`.
 * `digit` adalah lebar minimum — nomor yang melewatinya tetap ditulis utuh
 * (001 … 999 → 1000), supaya urutan tidak pernah mentok.
 */
function rakitKode(prefix, tahun, nomor, digit = 3) {
  return `${prefix}-${tahun}-${String(nomor).padStart(digit, '0')}`;
}

module.exports = { nomorBerikutnya, rakitKode };
