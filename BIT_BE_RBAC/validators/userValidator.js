'use strict';

const { z } = require('zod');

const KODE_ROLE = ['ADMIN', 'VERIFIKATOR', 'LEMBAGA_SELEKSI', 'APPLICANT'];

/**
 * Sanitasi teks bebas: rapikan spasi dan buang karakter `< >`.
 * React sudah auto-escape saat render, ini lapisan kedua supaya markup
 * tidak pernah ikut tersimpan di database sejak awal.
 */
const teks = (maks) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().replace(/[<>]/g, '') : v),
    z.string().min(1, 'Wajib diisi').max(maks, `Maksimal ${maks} karakter`)
  );

const email = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
  z.string().max(150, 'Email terlalu panjang').email('Format email tidak valid')
);

const password = z
  .string()
  .min(8, 'Password minimal 8 karakter')
  .max(128, 'Password terlalu panjang');

const noHp = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim() : v),
  z
    .string()
    .max(20, 'Nomor HP terlalu panjang')
    .regex(/^[0-9+\-\s]*$/, 'Nomor HP hanya boleh angka, spasi, + dan -')
    .optional()
    .or(z.literal(''))
);

const daftarRole = z
  .array(z.enum(KODE_ROLE, { message: 'Kode role tidak dikenali' }))
  .min(1, 'Pilih minimal satu role')
  .max(4)
  // Buang duplikat supaya tidak bentrok dengan primary key user_roles.
  .transform((v) => [...new Set(v)]);

const buatUserSchema = z.object({
  nama: teks(150),
  email,
  password,
  no_hp: noHp,
  roles: daftarRole,
  is_active: z.boolean().optional().default(true),
});

/**
 * Semua kolom opsional — tapi minimal satu harus dikirim, supaya PUT kosong
 * tidak lolos diam-diam sebagai "berhasil" padahal tak ada yang berubah.
 */
const ubahUserSchema = z
  .object({
    nama: teks(150).optional(),
    email: email.optional(),
    password: password.optional(),
    // Wajib saat user mengganti password akunnya sendiri; tidak dipakai kalau
    // admin mengganti password orang lain. Tidak dibatasi panjang minimum —
    // yang dinilai kecocokannya, bukan kekuatannya.
    password_lama: z.string().max(128).optional(),
    no_hp: noHp,
    roles: daftarRole.optional(),
    is_active: z.boolean().optional(),
  })
  // password_lama tidak dihitung: sendirian ia tidak mengubah apa pun.
  .refine((v) => Object.keys(v).some((k) => k !== 'password_lama' && v[k] !== undefined), {
    message: 'Tidak ada data yang diubah',
  });

const angka = (bawaan, min, maks) =>
  z.preprocess(
    (v) => (v === undefined || v === '' ? bawaan : Number(v)),
    z.number().int().min(min).max(maks)
  );

const daftarUserQuerySchema = z.object({
  q: z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().max(100).optional()),
  role: z.enum(KODE_ROLE).optional(),
  tipe: z.enum(['INTERNAL', 'APPLICANT']).optional(),
  status: z.enum(['aktif', 'nonaktif']).optional(),
  page: angka(1, 1, 100000),
  limit: angka(10, 1, 100),
});

module.exports = {
  KODE_ROLE,
  buatUserSchema,
  ubahUserSchema,
  daftarUserQuerySchema,
};
