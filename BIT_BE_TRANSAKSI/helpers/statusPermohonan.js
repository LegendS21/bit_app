'use strict';

/**
 * State machine status permohonan — bagian 0.1 desain-database.
 *
 *   DRAFT ──submit──> DIAJUKAN ──ambil──> DALAM_VERIFIKASI
 *                                              │
 *                    ┌─────────────────────────┼─────────────────────┐
 *                    ▼                         ▼                     ▼
 *                 REVISI                 DITOLAK_ADMIN          LULUS_ADMIN
 *                    │                     (final)                   │
 *              user perbaiki                                 DALAM_WAWANCARA
 *                    │                                               │
 *                    └──submit──> DIAJUKAN            ┌──────────────┴─────────┐
 *                                                     ▼                        ▼
 *                                              LULUS_WAWANCARA         TIDAK_LULUS_WAWANCARA
 *                                                     │                     (final)
 *                                              ┌──────┴──────┐
 *                                              ▼             ▼
 *                                          DITERIMA     TIDAK_DITERIMA
 *
 * Dipakai model `permohonan` dan (nanti) service. Migration sengaja menyimpan
 * salinan daftarnya sendiri: migration yang sudah jalan tidak boleh berubah
 * isinya hanya karena file ini disunting.
 */

const STATUS_PERMOHONAN = [
  'DRAFT',
  'DIAJUKAN',
  'DALAM_VERIFIKASI',
  'REVISI',
  'DITOLAK_ADMIN',
  'LULUS_ADMIN',
  'DALAM_WAWANCARA',
  'LULUS_WAWANCARA',
  'TIDAK_LULUS_WAWANCARA',
  'DITERIMA',
  'TIDAK_DITERIMA'
];

/** Perpindahan yang sah. Status yang memetakan ke array kosong = final. */
const TRANSISI = {
  DRAFT: ['DIAJUKAN'],
  DIAJUKAN: ['DALAM_VERIFIKASI'],
  DALAM_VERIFIKASI: ['REVISI', 'DITOLAK_ADMIN', 'LULUS_ADMIN'],
  REVISI: ['DIAJUKAN'],
  DITOLAK_ADMIN: [],
  LULUS_ADMIN: ['DALAM_WAWANCARA'],
  DALAM_WAWANCARA: ['LULUS_WAWANCARA', 'TIDAK_LULUS_WAWANCARA'],
  LULUS_WAWANCARA: ['DITERIMA', 'TIDAK_DITERIMA'],
  TIDAK_LULUS_WAWANCARA: [],
  DITERIMA: [],
  TIDAK_DITERIMA: []
};

/** Hanya di dua status ini applicant boleh mengubah isian wizard-nya. */
const STATUS_BISA_DIUBAH = ['DRAFT', 'REVISI'];

const bolehPindah = (dari, ke) => (TRANSISI[dari] || []).includes(ke);

const statusFinal = (status) => (TRANSISI[status] || []).length === 0;

/** `is_locked` selalu turunan dari status, jangan diisi manual. */
const terkunci = (status) => !STATUS_BISA_DIUBAH.includes(status);

module.exports = {
  STATUS_PERMOHONAN,
  TRANSISI,
  STATUS_BISA_DIUBAH,
  bolehPindah,
  statusFinal,
  terkunci
};
