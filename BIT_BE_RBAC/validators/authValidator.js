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
 * Validasi body request. ZodError yang dilempar ditangani middlewares/err.js
 * dan diubah jadi 400 beserta daftar field yang salah.
 */
function validasi(schema, data) {
  return schema.parse(data ?? {});
}

module.exports = { loginSchema, validasi };
