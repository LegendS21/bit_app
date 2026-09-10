'use strict';

const express = require('express');
const beasiswaRouter = require('./beasiswaRouter.js');
const persyaratanRouter = require('./persyaratanRouter.js');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'bit_be_master', waktu: new Date().toISOString() });
});

router.use('/beasiswa', beasiswaRouter);
router.use('/persyaratan', persyaratanRouter);

router.use((req, res) => {
  res.status(404).json({
    message: `Route ${req.method} ${req.originalUrl} tidak ditemukan`,
    code: 'NOT_FOUND'
  });
});

module.exports = router;
