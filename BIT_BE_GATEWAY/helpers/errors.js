'use strict';

/**
 * Error yang memang disengaja (bukan bug) dan aman dikirim ke client.
 * Bentuknya sama persis dengan service lain supaya response error seragam
 * di seluruh sistem — client tidak perlu tahu error datang dari gateway
 * atau dari service di belakangnya.
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

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound };
