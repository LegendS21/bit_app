'use strict';

const { z } = require('zod');

/** Sanitasi teks bebas — sama seperti di userValidator/roleValidator. */
const teks = (maks) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().replace(/[<>]/g, '') : v),
    z.string().min(1, 'Wajib diisi').max(maks, `Maksimal ${maks} karakter`)
  );

/** Kode menu dipakai guard `izinMenu` di backend, jadi bentuknya dikunci. */
const kode = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim().toUpperCase().replace(/\s+/g, '_') : v),
  z
    .string()
    .min(3, 'Kode minimal 3 karakter')
    .max(80, 'Kode terlalu panjang')
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Kode hanya boleh huruf kapital, angka, dan garis bawah')
);

/**
 * Path harus route internal frontend. Boleh kosong untuk menu yang cuma jadi
 * grup pembungkus di sidebar.
 */
const path = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim() : v),
  z
    .string()
    .max(150, 'Route terlalu panjang')
    .regex(/^\/[A-Za-z0-9\-_/:]*$/, 'Route harus diawali "/" tanpa spasi')
    .nullish()
    .or(z.literal(''))
);

/** Nama komponen ikon lucide-react, mis. FileSpreadsheet. */
const icon = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim() : v),
  z
    .string()
    .max(50, 'Nama ikon terlalu panjang')
    .regex(/^[A-Za-z0-9]*$/, 'Nama ikon hanya boleh huruf dan angka')
    .nullish()
    .or(z.literal(''))
);

const parentId = z.preprocess(
  (v) => (v === '' || v === null ? null : v),
  z.coerce.number().int().positive().nullable().optional()
);

const urutan = z.coerce.number().int().min(0).max(9999).optional();

const buatMenuSchema = z.object({
  kode,
  nama: teks(100),
  path,
  icon,
  parent_id: parentId,
  urutan,
  is_active: z.boolean().optional().default(true),
});

const ubahMenuSchema = z
  .object({
    kode: kode.optional(),
    nama: teks(100).optional(),
    path,
    icon,
    parent_id: parentId,
    urutan,
    is_active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).some((k) => v[k] !== undefined), {
    message: 'Tidak ada data yang diubah',
  });

const idParamSchema = z.coerce.number().int().positive();

module.exports = { buatMenuSchema, ubahMenuSchema, idParamSchema };
