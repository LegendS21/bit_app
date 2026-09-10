'use strict';

const { z } = require('zod');
const { STATUS_PERMOHONAN } = require('../helpers/statusPermohonan.js');

/** Sanitasi teks bebas: rapikan spasi, buang karakter `< >`. */
const teks = (maks, wajib = true) => {
  const dasar = z.string().max(maks, `Maksimal ${maks} karakter`);
  return z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().replace(/[<>]/g, '') : v),
    wajib ? dasar.min(1, 'Wajib diisi') : dasar.optional().or(z.literal(''))
  );
};

const idAngka = z.coerce.number().int().positive();

/* ------------------------------------------------------------------ *
 * Membuat permohonan
 * ------------------------------------------------------------------ */

// `user_id` TIDAK diterima dari body — diambil dari klaim `uid` token.
// Kalau boleh dikirim client, siapa pun bisa mendaftar atas nama orang lain.
const buatPermohonanSchema = z.object({
  beasiswa_id: idAngka
});

/* ------------------------------------------------------------------ *
 * Langkah 1 — Data Diri & Kontak
 * ------------------------------------------------------------------ */

const nik = z.preprocess(
  (v) => (typeof v === 'string' ? v.replace(/\s/g, '') : v),
  z.string().regex(/^\d{16}$/, 'NIK harus tepat 16 digit angka')
);

// Nomor Indonesia: 08xx, 62xx, atau +62xx. Disimpan apa adanya setelah
// spasi/tanda hubungnya dibuang, supaya tetap bisa dihubungi lewat WhatsApp.
const noHp = (wajib = true) => {
  const pola = z
    .string()
    .regex(/^(\+?62|0)8\d{7,12}$/, 'Nomor HP tidak valid, contoh: 081234567890');
  return z.preprocess(
    (v) => (typeof v === 'string' ? v.replace(/[\s-]/g, '') : v),
    wajib ? pola : pola.optional().or(z.literal(''))
  );
};

/**
 * Tanggal lahir dibatasi masuk akal: tidak di masa depan dan usianya
 * 15–100 tahun. Batas bawah 15 tahun karena pelatihan ini menyasar lulusan
 * SMA ke atas.
 */
const tglLahir = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00`).getTime()), {
    message: 'Tanggal lahir tidak valid'
  })
  .refine(
    (v) => {
      const lahir = new Date(`${v}T00:00:00`);
      const sekarang = new Date();
      const usia = (sekarang - lahir) / (365.25 * 24 * 60 * 60 * 1000);
      return usia >= 15 && usia <= 100;
    },
    { message: 'Usia pendaftar harus antara 15 dan 100 tahun' }
  );

const step1Schema = z.object({
  nik,
  nama_lengkap: teks(150),
  tempat_lahir: teks(100, false),
  tgl_lahir: tglLahir,
  jenis_kelamin: z.enum(['L', 'P']).optional(),
  alamat: teks(2000),
  no_hp: noHp(),
  no_hp_alt: noHp(false),
  email: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
    z.string().email('Format email tidak valid').max(150)
  )
});

/* ------------------------------------------------------------------ *
 * Langkah 2 — Pendidikan & Pekerjaan
 * ------------------------------------------------------------------ */

const kodeAcuan = (maks) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toUpperCase().replace(/\s+/g, '_') : v),
    z
      .string()
      .min(1, 'Wajib diisi')
      .max(maks)
      .regex(/^[A-Z0-9_]+$/, 'Kode hanya boleh huruf kapital, angka, dan garis bawah')
  );

const step2Schema = z.object({
  // Logical reference ke db_master.ref_pendidikan.kode (SD…S3).
  pendidikan_kode: kodeAcuan(20),
  instansi: teks(200),
  jurusan: teks(150, false),
  // Batas atas tahun depan: ada yang mendaftar sambil menunggu kelulusan.
  tahun_lulus: z.coerce
    .number()
    .int('Tahun lulus harus bilangan bulat')
    .min(1950, 'Tahun lulus tidak masuk akal')
    .max(new Date().getFullYear() + 1, 'Tahun lulus tidak boleh terlalu jauh di depan')
    .optional(),
  // Boleh kosong: pelamar yang belum bekerja tetap sah.
  pekerjaan_kode: kodeAcuan(30).optional().or(z.literal('')),
  nama_tempat_kerja: teks(200, false)
});

/* ------------------------------------------------------------------ *
 * Langkah 3 — Dokumen
 * ------------------------------------------------------------------ */

/**
 * Yang dicatat di sini hanya **penunjuk** ke berkas yang sudah diunggah ke
 * service Dokumen; filenya sendiri tidak lewat sini. `dokumen_uuid` diterbitkan
 * service Dokumen setelah magic bytes-nya diperiksa dan lolos pindai virus.
 */
const uuidBerkas = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'dokumen_uuid harus berformat UUID'
  );

const step3Schema = z.object({
  persyaratan_id: idAngka,
  dokumen_uuid: uuidBerkas,
  nama_file_asli: teks(255),
  ukuran_byte: z.coerce
    .number()
    .int()
    .positive('Ukuran berkas harus lebih dari 0')
    // 100 MB — batas atas kasar; batas sebenarnya per jenis dokumen
    // ditentukan `max_size_kb` di service Master.
    .max(104857600, 'Ukuran berkas terlalu besar')
});

/* ------------------------------------------------------------------ *
 * Langkah 4 — Persetujuan
 * ------------------------------------------------------------------ */

const step4Schema = z.object({
  // Tidak diberi nilai bawaan: mencentang harus tindakan sadar,
  // dan mencabutnya (false) juga sah selama masih draft.
  is_setuju: z.boolean({ message: 'Pernyataan keabsahan data wajib diisi' })
});

/* ------------------------------------------------------------------ *
 * Query daftar
 * ------------------------------------------------------------------ */

const angka = (bawaan, min, maks) =>
  z.preprocess(
    (v) => (v === undefined || v === '' ? bawaan : Number(v)),
    z.number().int().min(min).max(maks)
  );

/**
 * Pintasan antrean per peran. Tiap halaman internal punya kumpulan status yang
 * relevan, jadi frontend tidak perlu menghafal dan mengirimnya satu per satu.
 */
const TAHAP = {
  verifikasi: ["DIAJUKAN", "DALAM_VERIFIKASI", "REVISI"],
  wawancara: ["LULUS_ADMIN", "DALAM_WAWANCARA", "LULUS_WAWANCARA", "TIDAK_LULUS_WAWANCARA"],
  hasil: ["LULUS_WAWANCARA", "DITERIMA", "TIDAK_DITERIMA"]
};

const daftarQuerySchema = z.object({
  tahap: z.enum(Object.keys(TAHAP)).optional(),
  q: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim() : v),
    z.string().max(100).optional()
  ),
  status: z.enum(STATUS_PERMOHONAN).optional(),
  beasiswa_id: idAngka.optional(),
  page: angka(1, 1, 100000),
  limit: angka(10, 1, 100)
});

const idParamSchema = idAngka;

module.exports = {
  TAHAP,
  buatPermohonanSchema,
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  daftarQuerySchema,
  idParamSchema
};
