'use strict';

const jwt = require('jsonwebtoken');
const { privateKey, publicKey, kid } = require('../config/jwtKeys.js');
const { unauthorized } = require('./errors.js');

const ISSUER = process.env.JWT_ISSUER || 'bit-be-rbac';
const AUDIENCE = process.env.JWT_AUDIENCE || 'bit-beasiswa';
// 900 detik = 15 menit, sesuai ketentuan di petunjuk.
const ACCESS_TOKEN_TTL = Number(process.env.ACCESS_TOKEN_TTL_DETIK || 900);

/**
 * Terbitkan access token.
 * Payload sengaja minim — cuma yang dibutuhkan Gateway untuk otorisasi.
 * Jangan pernah menaruh data sensitif di sini: isi JWT bisa dibaca siapa pun
 * yang memegang tokennya, yang dijamin JWT itu keasliannya, bukan kerahasiaannya.
 */
function signAccessToken({ uuid, email, roles, id }) {
  const payload = {
    sub: uuid,
    email,
    roles,
    typ: 'access',
    // Id numerik user. Service lain menyimpannya sebagai logical reference
    // (mis. db_master.beasiswa.created_by) dan tidak punya akses ke db_rbac
    // untuk menerjemahkan uuid. Nantinya API Gateway meneruskan nilai yang
    // sama lewat header X-User-Id.
    uid: id
  };

  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: ACCESS_TOKEN_TTL,
    issuer: ISSUER,
    audience: AUDIENCE,
    keyid: kid
  });
}

/**
 * Verifikasi access token. Selalu kunci `algorithms` ke RS256 —
 * kalau tidak, token bisa dipalsukan lewat serangan `alg: none` / algorithm confusion.
 */
function verifyAccessToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, publicKey, {
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

  // Refresh token tidak pernah berbentuk JWT, tapi pengecekan ini menjaga
  // supaya token jenis lain (mis. token verifikasi email) tidak bisa dipakai
  // sebagai access token.
  if (payload.typ !== 'access') {
    throw unauthorized('Jenis token tidak sesuai', 'TOKEN_INVALID');
  }

  return payload;
}

module.exports = { signAccessToken, verifyAccessToken, ACCESS_TOKEN_TTL, ISSUER, AUDIENCE };
