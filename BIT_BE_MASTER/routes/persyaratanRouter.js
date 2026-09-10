'use strict';

const express = require('express');
const PersyaratanController = require('../controllers/persyaratanController.js');
const authentication = require('../middlewares/authentication.js');
const { isAdmin } = require('../middlewares/authorization.js');

const router = express.Router();

// Membaca boleh siapa saja yang login — calon peserta perlu tahu dokumen apa
// yang harus disiapkan. Berbeda dengan beasiswa, isinya tidak perlu disaring:
// daftar jenis dokumen bukan informasi yang perlu disembunyikan.
router.use(authentication);

router.get('/', PersyaratanController.daftar);
router.get('/:id', PersyaratanController.detail);

router.post('/', isAdmin, PersyaratanController.buat);
router.put('/:id', isAdmin, PersyaratanController.ubah);
router.delete('/:id', isAdmin, PersyaratanController.hapus);

module.exports = router;
