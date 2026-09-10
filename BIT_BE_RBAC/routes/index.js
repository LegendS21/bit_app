'use strict';

const express = require('express');
const authRouter = require('./authRouter.js');
const userRouter = require('./userRouter.js');
const roleRouter = require('./roleRouter.js');
const menuRouter = require('./menuRouter.js');
const { jwks } = require('../config/jwtKeys.js');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'bit_be_rbac', waktu: new Date().toISOString() });
});

/**
 * Public key dalam format JWKS. API Gateway mengambil ini (dan meng-cache-nya)
 * supaya bisa memverifikasi access token secara lokal tanpa memanggil RBAC
 * di setiap request.
 */
router.get('/.well-known/jwks.json', (req, res) => {
  res.set('Cache-Control', 'public, max-age=600');
  res.json(jwks());
});

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/roles', roleRouter);
router.use('/menus', menuRouter);

router.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} tidak ditemukan`, code: 'NOT_FOUND' });
});

module.exports = router;
