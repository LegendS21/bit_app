'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { unauthorized } = require('../helpers/errors.js');

/**
 * Verifikasi access token terbitan RBAC — inilah tugas utama gateway menurut
 * petunjuk: *"Gateway memverifikasi token sebelum meneruskan request ke
 * service"*.
 *
 * Kuncinya diambil dari endpoint JWKS milik RBAC lalu di-cache, jadi gateway
 * tidak memanggil RBAC di tiap request dan tidak pernah memegang kunci
 * rahasia — cukup public key. Pola ini sama persis dengan yang sudah dipakai
 * middleware `authentication.js` di Master/Transaksi/Dokumen; sengaja
 * disalin, bukan di-share, karena tiap service adalah repo terpisah.
 *
 * Service di belakang gateway TETAP memverifikasi token sendiri. Gateway
 * bukan satu-satunya lapisan — kalau ada yang berhasil masuk ke jaringan
 * internal, ia masih tetap harus membawa token yang sah.
 */

const JWKS_URL =
  process.env.RBAC_JWKS_URL || 'http://localhost:3001/.well-known/jwks.json';
const ISSUER = process.env.JWT_ISSUER || 'bit-be-rbac';
const AUDIENCE = process.env.JWT_AUDIENCE || 'bit-beasiswa';
const CACHE_MS = Number(process.env.JWKS_CACHE_DETIK || 600) * 1000;

let cacheKunci = new Map();
let cacheKedaluwarsa = 0;

async function muatKunci(paksa = false) {
  if (!paksa && cacheKunci.size > 0 && Date.now() < cacheKedaluwarsa) {
    return cacheKunci;
  }

  const { data } = await axios.get(JWKS_URL, { timeout: 5000 });
  const kunci = new Map();

  for (const jwk of data.keys || []) {
    // Node bisa membaca JWK langsung, jadi tidak perlu library konversi.
    kunci.set(jwk.kid, crypto.createPublicKey({ key: jwk, format: 'jwk' }));
  }

  if (kunci.size === 0) throw new Error('JWKS tidak berisi kunci apa pun');

  cacheKunci = kunci;
  cacheKedaluwarsa = Date.now() + CACHE_MS;
  return cacheKunci;
}

/** Ambil kunci sesuai `kid` di header token; muat ulang kalau belum dikenal. */
async function kunciUntuk(kid) {
  let kunci = await muatKunci();
  if (kid && !kunci.has(kid)) {
    // Kemungkinan RBAC baru merotasi kuncinya — coba ambil ulang sekali.
    kunci = await muatKunci(true);
  }
  return kid ? kunci.get(kid) : [...kunci.values()][0];
}

const authentication = async (req, res, next) => {
  try {
    const { authorization } = req.headers;
    if (!authorization) {
      throw unauthorized('Header Authorization wajib diisi', 'TOKEN_MISSING');
    }

    const [skema, token] = authorization.split(' ');
    if (skema !== 'Bearer' || !token) {
      throw unauthorized('Format Authorization harus "Bearer <token>"', 'TOKEN_MALFORMED');
    }

    const bagian = jwt.decode(token, { complete: true });
    if (!bagian) throw unauthorized('Access token tidak valid', 'TOKEN_INVALID');

    let kunci;
    try {
      kunci = await kunciUntuk(bagian.header.kid);
    } catch (error) {
      console.error('Gagal mengambil JWKS dari RBAC:', error.message);
      throw unauthorized('Tidak bisa memverifikasi token saat ini', 'JWKS_UNAVAILABLE');
    }
    if (!kunci) throw unauthorized('Kunci penanda token tidak dikenali', 'TOKEN_INVALID');

    let payload;
    try {
      payload = jwt.verify(token, kunci, {
        // Dikunci ke RS256 — tanpa ini token bisa dipalsukan lewat
        // serangan `alg: none` / algorithm confusion.
        algorithms: ['RS256'],
        issuer: ISSUER,
        audience: AUDIENCE
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw unauthorized('Access token sudah kedaluwarsa', 'TOKEN_EXPIRED');
      }
      throw unauthorized('Access token tidak valid', 'TOKEN_INVALID');
    }

    if (payload.typ !== 'access') {
      throw unauthorized('Jenis token tidak sesuai', 'TOKEN_INVALID');
    }

    req.user = {
      id: payload.uid ?? null,
      uuid: payload.sub,
      email: payload.email,
      roles: payload.roles || []
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authentication;
