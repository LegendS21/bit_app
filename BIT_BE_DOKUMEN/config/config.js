'use strict';

require('dotenv').config();

/**
 * Kredensial database dibaca dari environment, bukan ditulis mati.
 *
 * Service ini memakai PostgreSQL, berbeda dari RBAC/Master/Transaksi yang
 * memakai MySQL — karena itu default port-nya 5432 dan dialect-nya postgres.
 *
 * Di docker-compose, host-nya adalah nama service ("postgres"), bukan
 * 127.0.0.1. Nilai default di bawah menjaga `npm run dev` di laptop tetap
 * jalan apa adanya tanpa perlu mengisi .env.
 */

const dasar = {
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'db_dokumen',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 5432),
  dialect: 'postgres',
  logging: false,
};

module.exports = {
  development: { ...dasar },
  test: { ...dasar, database: process.env.DB_DATABASE_TEST ?? 'db_dokumen_test' },
  production: { ...dasar },
};
