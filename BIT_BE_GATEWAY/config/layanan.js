'use strict';

/**
 * Peta rute: segmen pertama setelah `/api` menentukan service tujuannya.
 *
 * Keempat service kebetulan sudah memakai prefix yang tidak saling bertabrakan
 * (`/auth`, `/beasiswa`, `/permohonan`, `/dokumen`, ...), jadi gateway cukup
 * melihat satu segmen untuk tahu ke mana request diteruskan — tidak perlu
 * mengubah satu pun rute di service.
 *
 * Alamatnya nama service Docker, bukan localhost: di dalam container,
 * `localhost` menunjuk ke container itu sendiri.
 */

const RBAC = process.env.RBAC_URL || 'http://localhost:3001';
const MASTER = process.env.MASTER_URL || 'http://localhost:3002';
const TRANSAKSI = process.env.TRANSAKSI_URL || 'http://localhost:3003';
const DOKUMEN = process.env.DOKUMEN_URL || 'http://localhost:3004';

const PETA_LAYANAN = {
  // --- RBAC ---
  'auth': RBAC,
  'users': RBAC,
  'roles': RBAC,
  'menus': RBAC,
  '.well-known': RBAC,

  // --- Master ---
  'beasiswa': MASTER,
  'persyaratan': MASTER,

  // --- Transaksi ---
  'permohonan': TRANSAKSI,
  'dashboard': TRANSAKSI,

  // --- Dokumen ---
  'dokumen': DOKUMEN,
};

/**
 * Jalur yang boleh dilewati TANPA access token. Dicocokkan terhadap path
 * setelah `/api` dibuang.
 *
 * Daftarnya sengaja pendek dan berupa regex yang terikat awal-akhir (`^...$`),
 * bukan pencocokan "diawali dengan" — supaya `/auth/login/../users` atau
 * `/dokumen/publicXYZ` tidak ikut lolos.
 */
const JALUR_PUBLIK = [
  // Pendaftaran mandiri calon peserta. RBAC yang memaksa role APPLICANT —
  // tidak ada jalan dari sini menuju akun internal.
  /^\/auth\/register$/,
  // Login: belum punya token, memang itu tujuannya.
  /^\/auth\/login$/,
  // Refresh & logout diautentikasi lewat cookie HttpOnly, justru dipanggil
  // ketika access token-nya sudah kedaluwarsa.
  /^\/auth\/refresh$/,
  /^\/auth\/logout$/,
  // Public key untuk verifikasi token. Memang harus bisa diambil siapa saja.
  /^\/\.well-known\/jwks\.json$/,
  // Katalog program di landing page: dibuka pengunjung yang belum punya akun.
  // Master hanya mengembalikan program AKTIF yang belum lewat tenggatnya, dan
  // tanpa kolom internal seperti created_by.
  /^\/beasiswa\/publik$/,
  // Tautan presigned: otorisasinya melekat pada token di URL-nya sendiri
  // (sekali pakai, berbatas waktu, terikat satu user), bukan pada header.
  /^\/dokumen\/public\/[^/]+$/,
];

const jalurPublik = (path) => JALUR_PUBLIK.some((pola) => pola.test(path));

module.exports = { PETA_LAYANAN, JALUR_PUBLIK, jalurPublik, RBAC, MASTER, TRANSAKSI, DOKUMEN };
