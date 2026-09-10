'use strict';

const { forbidden, unauthorized } = require('../helpers/errors.js');

/**
 * Batasi akses ke role tertentu. Dipakai setelah `authentication`.
 *
 * Catatan: hak akses per menu (`role_menu_access`) hidup di db_rbac dan tidak
 * bisa dibaca dari sini — databasenya terpisah. Selama Gateway belum ada,
 * service ini menjaga dengan role saja.
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
