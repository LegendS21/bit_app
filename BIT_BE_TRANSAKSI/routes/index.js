'use strict';

const express = require('express');
const permohonanRouter = require('./permohonanRouter.js');
const SeleksiController = require('../controllers/seleksiController.js');
const authentication = require('../middlewares/authentication.js');
const { isInternal } = require('../middlewares/authorization.js');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'bit_be_transaksi', waktu: new Date().toISOString() });
});

router.use('/permohonan', permohonanRouter);

router.get('/dashboard/statistik', authentication, isInternal, SeleksiController.statistik);

router.use((req, res) => {
  res.status(404).json({
    message: `Route ${req.method} ${req.originalUrl} tidak ditemukan`,
    code: 'NOT_FOUND'
  });
});

module.exports = router;
