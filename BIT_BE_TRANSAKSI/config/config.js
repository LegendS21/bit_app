'use strict';

require('dotenv').config();

/**
 * Kredensial database dibaca dari environment, bukan ditulis mati.
 *
 * Alasannya container: di dalam docker-compose, database tidak lagi berada di
 * 127.0.0.1 melainkan di container tetangga yang alamatnya adalah nama service
 * ("mysql"). Nilai default di bawah menjaga `npm run dev` di laptop tetap jalan
 * apa adanya tanpa perlu mengisi .env.
 *
 * `??` dipakai, bukan `||`, supaya password yang memang sengaja dikosongkan
 * tidak diam-diam tertimpa nilai default.
 */

const dasar = {
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? 'mysql',
  database: process.env.DB_DATABASE ?? 'db_transaksi',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  dialect: 'mysql',
  logging: false,
};

module.exports = {
  development: { ...dasar },
  test: { ...dasar, database: process.env.DB_DATABASE_TEST ?? 'db_transaksi_test' },
  production: { ...dasar },
};
