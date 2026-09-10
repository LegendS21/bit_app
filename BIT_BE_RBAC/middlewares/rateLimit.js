'use strict';

const { rateLimit } = require('express-rate-limit');

function balasanLimit(pesan, code) {
  return (req, res) => res.status(429).json({ message: pesan, code });
}

/** Batas umum ~100 request/menit per IP, sesuai ketentuan di petunjuk. */
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_PER_MENIT || 100),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: balasanLimit('Terlalu banyak request, coba lagi sebentar lagi', 'RATE_LIMITED')
});

/**
 * Login dibatasi jauh lebih ketat: 5 percobaan per 15 menit per IP.
 * `skipSuccessfulRequests` supaya user yang berhasil login tidak ikut
 * kena hitungan — yang dibatasi percobaan gagalnya.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_LOGIN || 5),
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: balasanLimit('Terlalu banyak percobaan login. Coba lagi dalam 15 menit.', 'LOGIN_RATE_LIMITED')
});

/**
 * Pendaftaran dibatasi ketat: endpoint publik yang menulis ke database adalah
 * sasaran empuk pembuatan akun massal. Satu IP wajar butuh sekali-dua kali,
 * bukan puluhan.
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_REGISTER || 5),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: balasanLimit(
    'Terlalu banyak pendaftaran dari jaringan ini. Coba lagi satu jam lagi.',
    'REGISTER_RATE_LIMITED'
  )
});

/** Refresh dipanggil rutin tiap ~15 menit, jadi batasnya lebih longgar. */
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_REFRESH || 30),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: balasanLimit('Terlalu banyak permintaan refresh token', 'RATE_LIMITED')
});

module.exports = { globalLimiter, loginLimiter, registerLimiter, refreshLimiter };
