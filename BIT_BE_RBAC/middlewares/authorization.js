'use strict';

const { forbidden, unauthorized } = require('../helpers/errors.js');

/**
 * Batasi akses ke role tertentu. Dipakai setelah `authentication`.
 * Contoh: router.get('/users', authentication, authorize('ADMIN'), ...)
 *
 * Catatan: cek role saja belum cukup untuk mencegah IDOR. Endpoint yang
 * mengembalikan data milik user tertentu tetap wajib memfilter berdasarkan
 * user dari token, bukan id dari URL.
 */
const authorize = (...kodeRole) => (req, res, next) => {
  try {
    if (!req.user) {
      throw unauthorized('Belum terautentikasi', 'TOKEN_MISSING');
    }

    const punyaAkses = (req.user.roles || []).some((r) => kodeRole.includes(r));
    if (!punyaAkses) {
      throw forbidden('Anda tidak punya akses ke resource ini', 'ROLE_NOT_ALLOWED');
    }

    next();
  } catch (error) {
    next(error);
  }
};

const isAdmin = authorize('ADMIN');

module.exports = { authorize, isAdmin };
