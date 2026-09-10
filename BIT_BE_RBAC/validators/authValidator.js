'use strict';

const { z } = require('zod');

// Trim + lowercase email sebelum divalidasi, sekaligus jadi sanitasi ringan
// supaya spasi/kapitalisasi tidak bikin user gagal login.
const email = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
  z.string().max(150, 'Email terlalu panjang').email('Format email tidak valid')
);

const loginSchema = z.object({
  email,
  // Password tidak di-trim: spasi bisa jadi bagian sah dari password.
  password: z.string().min(1, 'Password wajib diisi').max(128, 'Password terlalu panjang')
});

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

const noHp = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim() : v),
  z
    .string()
    .max(20, 'Nomor HP terlalu panjang')
    .regex(/^[0-9+\-\s]*$/, 'Nomor HP hanya boleh angka, spasi, + dan -')
    .optional()
    .or(z.literal(''))
);

/**
 * Password pendaftaran mandiri dibuat sendiri oleh calon peserta, jadi
 * syaratnya lebih ketat daripada password yang dibuatkan admin lewat
 * `POST /users`.
 */
const passwordBaru = z
  .string()
  .min(8, 'Password minimal 8 karakter')
  .max(128, 'Password terlalu panjang')
  .regex(/[a-z]/, 'Password harus memuat huruf kecil')
  .regex(/[A-Z]/, 'Password harus memuat huruf besar')
  .regex(/[0-9]/, 'Password harus memuat angka');

/**
 * POST /auth/register — pendaftaran mandiri calon peserta.
 *
 * `roles`, `tipe_user`, dan `is_active` **sengaja tidak ada di skema ini**.
 * Ketiganya dipaksa di service, tidak pernah dibaca dari body — kalau
 * diterima dari client, siapa pun bisa mendaftar sebagai ADMIN.
 *
 * `.strict()` menolak field asing alih-alih membuangnya diam-diam, supaya
 * percobaan menyelundupkan `roles` terbaca sebagai error, bukan terabaikan.
 */
const registerSchema = z
  .object({
    nama: teks(150),
    email,
    password: passwordBaru,
    konfirmasi_password: z.string().max(128),
    no_hp: noHp
  })
  .strict('Ada data yang tidak dikenali pada formulir pendaftaran')
  .refine((v) => v.password === v.konfirmasi_password, {
    message: 'Konfirmasi password tidak sama dengan password',
    path: ['konfirmasi_password']
  });

/**
 * Validasi body request. ZodError yang dilempar ditangani middlewares/err.js
 * dan diubah jadi 400 beserta daftar field yang salah.
 */
function validasi(schema, data) {
  return schema.parse(data ?? {});
}

module.exports = { loginSchema, registerSchema, validasi };
