'use strict';

const express = require('express');
const PermohonanController = require('../controllers/permohonanController.js');
const SeleksiController = require('../controllers/seleksiController.js');
const authentication = require('../middlewares/authentication.js');
const {
  isAdmin,
  isApplicant,
  isInternal,
  isVerifikator,
  isLembagaSeleksi
} = require('../middlewares/authorization.js');

const router = express.Router();

router.use(authentication);

// `/saya` didaftarkan sebelum `/:id` supaya tidak tertangkap sebagai id.
router.get('/saya', isApplicant, PermohonanController.daftarSaya);

// Daftar untuk pengguna internal. Applicant memakai `/saya` — kalau ia
// memanggil ini, jawabannya 403, bukan daftar orang lain.
router.get('/', isInternal, PermohonanController.daftar);

router.post('/', isApplicant, PermohonanController.buat);

// Detail boleh dibaca pemiliknya maupun internal; kepemilikannya diperiksa
// di service, karena role saja tidak cukup untuk menahan IDOR.
router.get('/:id', PermohonanController.detail);

/* ---------------- Wizard: hanya pemiliknya, hanya saat belum terkunci ---------------- */

router.put('/:id/step-1', isApplicant, PermohonanController.step1);
router.put('/:id/step-2', isApplicant, PermohonanController.step2);
router.post('/:id/step-3', isApplicant, PermohonanController.step3);
router.delete('/:id/step-3/:persyaratanId', isApplicant, PermohonanController.hapusDokumen);
router.put('/:id/step-4', isApplicant, PermohonanController.step4);
router.post('/:id/submit', isApplicant, PermohonanController.submit);

/* ---------------- Tahap seleksi ---------------- */

router.post('/:id/verifikasi', isVerifikator, SeleksiController.verifikasi);
router.post('/:id/wawancara', isLembagaSeleksi, SeleksiController.wawancara);
router.post('/:id/hasil-akhir', isAdmin, SeleksiController.hasilAkhir);

module.exports = router;
