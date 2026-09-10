'use strict';

const express = require('express');
const MenuController = require('../controllers/menuController.js');
const authentication = require('../middlewares/authentication.js');
const { isAdmin } = require('../middlewares/authorization.js');
const izinMenu = require('../middlewares/izinMenu.js');

const router = express.Router();

router.use(authentication, isAdmin);

// Halaman Role & Akses Menu tidak memakai endpoint ini — matriks centangnya
// diisi dari /roles/:id/akses-menu — jadi cukup dijaga menunya sendiri.
const MENU = 'SETTING_MENU';

router.get('/', izinMenu(MENU, 'view'), MenuController.daftar);
router.post('/', izinMenu(MENU, 'create'), MenuController.buat);
router.get('/:id', izinMenu(MENU, 'view'), MenuController.detail);
router.put('/:id', izinMenu(MENU, 'update'), MenuController.ubah);
router.delete('/:id', izinMenu(MENU, 'delete'), MenuController.hapus);

module.exports = router;
