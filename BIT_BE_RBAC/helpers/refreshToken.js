'use strict';

const crypto = require('crypto');

const COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'refresh_token';
const TTL_HARI = Number(process.env.REFRESH_TOKEN_TTL_HARI || 7);
const COOKIE_PATH = process.env.REFRESH_COOKIE_PATH || '/';
// Di produksi wajib true (cookie hanya dikirim lewat HTTPS). Di dev lokal
// yang masih http, `secure: true` bikin cookie-nya tidak pernah tersimpan.
const COOKIE_SECURE = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === 'true'
  : process.env.NODE_ENV === 'production';

const TTL_MS = TTL_HARI * 24 * 60 * 60 * 1000;

/**
 * Refresh token = 48 byte acak dari CSPRNG, bukan JWT.
 * Alasannya: refresh token harus bisa di-revoke seketika, dan itu cuma bisa
 * kalau statusnya disimpan di DB. JWT yang stateless tidak bisa dicabut.
 */
function buatRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

/**
 * Yang disimpan di DB cuma SHA-256-nya (CHAR(64) hex). Kalau isi tabel
 * refresh_tokens bocor, penyerang tetap tidak punya token yang bisa dipakai.
 * SHA-256 polos (tanpa argon2/bcrypt) sudah cukup di sini karena inputnya
 * 48 byte acak — tidak bisa ditebak lewat brute force seperti password.
 */
function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function tanggalKedaluwarsa() {
  return new Date(Date.now() + TTL_MS);
}

function opsiCookie() {
  return {
    httpOnly: true,      // tidak bisa dibaca JavaScript → aman dari pencurian lewat XSS
    secure: COOKIE_SECURE,
    sameSite: 'strict',  // tidak ikut terkirim dari situs lain → proteksi CSRF
    path: COOKIE_PATH
  };
}

function setRefreshCookie(res, raw) {
  res.cookie(COOKIE_NAME, raw, { ...opsiCookie(), maxAge: TTL_MS });
}

function clearRefreshCookie(res) {
  // Opsi harus sama persis dengan waktu di-set, kalau tidak cookie-nya tidak terhapus.
  res.clearCookie(COOKIE_NAME, opsiCookie());
}

/**
 * Ambil refresh token dari cookie. Fallback ke body disediakan untuk
 * klien non-browser (Postman, mobile) yang tidak punya cookie jar.
 */
function ambilRefreshToken(req) {
  return (req.cookies && req.cookies[COOKIE_NAME]) || (req.body && req.body.refresh_token) || null;
}

module.exports = {
  buatRefreshToken,
  hashToken,
  tanggalKedaluwarsa,
  setRefreshCookie,
  clearRefreshCookie,
  ambilRefreshToken,
  COOKIE_NAME,
  TTL_HARI
};
