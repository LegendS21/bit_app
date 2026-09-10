'use strict';

/**
 * Error yang memang disengaja (bukan bug) dan aman dikirim ke client.
 * Dipakai supaya controller/service tinggal `throw` dan middlewares/err.js
 * yang menerjemahkannya jadi HTTP status + body yang seragam.
 */
class AppError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code || 'ERROR';
  }
}

const badRequest = (message, code = 'BAD_REQUEST') => new AppError(400, message, code);
const unauthorized = (message, code = 'UNAUTHORIZED') => new AppError(401, message, code);
const forbidden = (message, code = 'FORBIDDEN') => new AppError(403, message, code);
const notFound = (message, code = 'NOT_FOUND') => new AppError(404, message, code);
const conflict = (message, code = 'DUPLICATE') => new AppError(409, message, code);
const locked = (message, code = 'ACCOUNT_LOCKED') => new AppError(423, message, code);

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict, locked };
