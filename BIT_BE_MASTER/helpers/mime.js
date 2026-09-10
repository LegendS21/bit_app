'use strict';

/**
 * Di DB `persyaratan.allowed_mime` disimpan sebagai string dipisah koma
 * (sesuai DDL), tapi di API selalu dikirim/diterima sebagai array — frontend
 * tidak perlu memecah string sendiri.
 */

function pisahMime(nilai) {
  return String(nilai || '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
}

function gabungMime(daftar) {
  return (daftar || []).join(',');
}

module.exports = { pisahMime, gabungMime };
