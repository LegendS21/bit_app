'use strict';

const { verifyAccessToken } = require('../helpers/jwt.js');
const { unauthorized } = require('../helpers/errors.js');

/**
 * Verifikasi access token dari header `Authorization: Bearer <token>`.
 *
 * Sengaja tidak menyentuh database: isi token sudah cukup untuk otorisasi dan
 * umurnya cuma 15 menit. Endpoint yang butuh data terbaru (mis. /auth/me)
 * yang membaca DB sendiri.
 */
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

    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.uid,
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
