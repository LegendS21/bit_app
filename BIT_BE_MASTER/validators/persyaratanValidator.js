'use strict';

const { z } = require('zod');

/** Sanitasi teks bebas: rapikan spasi, buang karakter `< >`. */
const teks = (maks, wajib = true) => {
  const dasar = z.string().max(maks, `Maksimal ${maks} karakter`);
  return z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().replace(/[<>]/g, '') : v),
    wajib ? dasar.min(1, 'Wajib diisi') : dasar.optional().or(z.literal(''))
  );
};

/**
 * Kode dokumen dipakai service Dokumen & Transaksi sebagai acuan
 * (KTP, KK, IJAZAH, SURAT_REKOMENDASI), jadi bentuknya dikunci.
 * Berbeda dengan kode beasiswa yang dibuat otomatis — kode ini bermakna
 * dan ditentukan admin.
 */
const kode = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim().toUpperCase().replace(/\s+/g, '_') : v),
  z
    .string()
    .min(2, 'Kode minimal 2 karakter')
    .max(50, 'Kode terlalu panjang')
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Kode hanya boleh huruf kapital, angka, dan garis bawah')
);

const POLA_MIME = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/;

/**
 * Diterima sebagai array maupun string dipisah koma; keduanya dinormalkan jadi
 * array. Di DB disimpan sebagai string koma sesuai DDL, tapi bentuk array jauh
 * lebih enak dipakai frontend daripada memecah string sendiri.
 */
const allowedMime = z.preprocess(
  (v) => {
    const daftar = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : v;
    if (!Array.isArray(daftar)) return v;
    return [...new Set(daftar.map((m) => String(m).trim().toLowerCase()).filter(Boolean))];
  },
  z
    .array(z.string().regex(POLA_MIME, 'Format MIME tidak valid, contoh: application/pdf'))
    .min(1, 'Pilih minimal satu format berkas')
    .max(20, 'Terlalu banyak format')
    .refine((v) => v.join(',').length <= 255, {
      message: 'Daftar format terlalu panjang (maksimal 255 karakter)'
    })
);

// 1 KB s/d 100 MB. Batas atasnya menahan salah ketik yang bikin server
// menerima berkas raksasa.
const maxSizeKb = z.coerce
  .number()
  .int('Ukuran maksimal harus bilangan bulat')
  .min(1, 'Ukuran maksimal minimal 1 KB')
  .max(102400, 'Ukuran maksimal tidak boleh lebih dari 100 MB');

const buatPersyaratanSchema = z.object({
  kode,
  nama: teks(150),
  deskripsi: teks(5000, false),
  allowed_mime: allowedMime.optional(),
  max_size_kb: maxSizeKb.optional(),
  is_active: z.boolean().optional().default(true)
});

const ubahPersyaratanSchema = z
  .object({
    kode: kode.optional(),
    nama: teks(150).optional(),
    deskripsi: teks(5000, false),
    allowed_mime: allowedMime.optional(),
    max_size_kb: maxSizeKb.optional(),
    is_active: z.boolean().optional()
  })
  .refine((v) => Object.keys(v).some((k) => v[k] !== undefined), {
    message: 'Tidak ada data yang diubah'
  });

const angka = (bawaan, min, maks) =>
  z.preprocess(
    (v) => (v === undefined || v === '' ? bawaan : Number(v)),
    z.number().int().min(min).max(maks)
  );

const daftarPersyaratanQuerySchema = z.object({
  q: z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().max(100).optional()),
  status: z.enum(['aktif', 'nonaktif']).optional(),
  page: angka(1, 1, 100000),
  limit: angka(10, 1, 100)
});

const idParamSchema = z.coerce.number().int().positive();

module.exports = {
  buatPersyaratanSchema,
  ubahPersyaratanSchema,
  daftarPersyaratanQuerySchema,
  idParamSchema
};
