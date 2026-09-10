'use strict';

const express = require('express');
const UsersController = require('../controllers/usersController.js');
const authentication = require('../middlewares/authentication.js');
const { isAdmin } = require('../middlewares/authorization.js');
const izinMenu = require('../middlewares/izinMenu.js');

const router = express.Router();

// Dipasang di level router supaya tidak ada endpoint yang lolos karena lupa
// dipasangi guard satu per satu. Hak per aksi ditambahkan di tiap rute.
router.use(authentication, isAdmin);

const MENU = 'SETTING_USERS';

router.get('/', izinMenu(MENU, 'view'), UsersController.daftar);
router.post('/', izinMenu(MENU, 'create'), UsersController.buat);
router.get('/:uuid', izinMenu(MENU, 'view'), UsersController.detail);
router.put('/:uuid', izinMenu(MENU, 'update'), UsersController.ubah);
router.delete('/:uuid', izinMenu(MENU, 'delete'), UsersController.hapus);

module.exports = router;
