'use strict';

const { z } = require('zod');

/** Sanitasi teks bebas — sama seperti di userValidator. */
const teks = (maks) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().replace(/[<>]/g, '') : v),
    z.string().min(1, 'Wajib diisi').max(maks, `Maksimal ${maks} karakter`)
  );

/**
 * Kode role dipakai di JWT dan guard route frontend, jadi bentuknya dikunci:
 * huruf kapital, angka, dan garis bawah.
 */
const kode = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim().toUpperCase().replace(/\s+/g, '_') : v),
  z
    .string()
    .min(3, 'Kode minimal 3 karakter')
    .max(50, 'Kode terlalu panjang')
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Kode hanya boleh huruf kapital, angka, dan garis bawah')
);

const deskripsi = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim().replace(/[<>]/g, '') : v),
  z.string().max(255, 'Keterangan terlalu panjang').optional().or(z.literal(''))
);

const buatRoleSchema = z.object({
  kode,
  nama: teks(100),
  deskripsi,
  is_active: z.boolean().optional().default(true),
});

const ubahRoleSchema = z
  .object({
    kode: kode.optional(),
    nama: teks(100).optional(),
    deskripsi,
    is_active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).some((k) => v[k] !== undefined), {
    message: 'Tidak ada data yang diubah',
  });

const barisAkses = z.object({
  menu_id: z.coerce.number().int().positive(),
  can_view: z.boolean().optional().default(false),
  can_create: z.boolean().optional().default(false),
  can_update: z.boolean().optional().default(false),
  can_delete: z.boolean().optional().default(false),
});

const aksesMenuSchema = z.object({
  akses: z.array(barisAkses).max(200),
});

const idParamSchema = z.coerce.number().int().positive();

module.exports = {
  buatRoleSchema,
  ubahRoleSchema,
  aksesMenuSchema,
  idParamSchema,
};
