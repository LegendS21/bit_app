'use strict';

const express = require('express');
const BeasiswaController = require('../controllers/beasiswaController.js');
const BeasiswaPersyaratanController = require('../controllers/beasiswaPersyaratanController.js');
const authentication = require('../middlewares/authentication.js');
const { isAdmin } = require('../middlewares/authorization.js');

const router = express.Router();

/**
 * Katalog terbuka untuk landing page — SATU-SATUNYA endpoint Master yang
 * boleh diakses tanpa token, karena halaman depan memang dibuka orang yang
 * belum punya akun.
 *
 * Urutannya penting dua kali: harus di atas `router.use(authentication)`
 * supaya tidak diminta token, DAN di atas `/:id` supaya kata "publik" tidak
 * tertelan sebagai id program.
 */
router.get('/publik', BeasiswaController.katalogPublik);

// Selain itu, semua endpoint butuh token yang sah. Membaca boleh siapa saja
// yang login — calon peserta perlu melihat katalog program — tapi isinya
// disaring per role di service: non-admin hanya melihat program AKTIF.
router.use(authentication);

router.get('/', BeasiswaController.daftar);
router.get('/:id', BeasiswaController.detail);

router.post('/', isAdmin, BeasiswaController.buat);
router.put('/:id', isAdmin, BeasiswaController.ubah);
router.delete('/:id', isAdmin, BeasiswaController.hapus);

// Persyaratan yang berlaku untuk satu program. Calon peserta perlu membacanya
// untuk tahu dokumen apa yang harus diunggah, jadi GET-nya tidak dibatasi role.
router.get('/:id/persyaratan', BeasiswaPersyaratanController.daftar);
router.put('/:id/persyaratan', isAdmin, BeasiswaPersyaratanController.simpan);
router.delete(
  '/:id/persyaratan/:persyaratanId',
  isAdmin,
  BeasiswaPersyaratanController.lepas
);

module.exports = router;
