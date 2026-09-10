'use strict';

const { AppError } = require('../helpers/errors.js');

/**
 * Satu bentuk response error untuk seluruh sistem: `{ message, code }`.
 * Error tak terduga tidak pernah membocorkan stack trace ke client — itu
 * hanya masuk ke log server.
 */
function handleError(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof AppError) {
    return res.status(error.status).json({ message: error.message, code: error.code });
  }

  console.error('Error tak tertangani di gateway:', error);
  return res.status(500).json({
    message: 'Terjadi kesalahan pada sistem',
    code: 'INTERNAL_ERROR'
  });
}

module.exports = handleError;
