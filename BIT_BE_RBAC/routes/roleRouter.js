'use strict';

const express = require('express');
const RoleAksesController = require('../controllers/role_aksesController.js');
const authentication = require('../middlewares/authentication.js');
const { isAdmin } = require('../middlewares/authorization.js');
const izinMenu = require('../middlewares/izinMenu.js');

const router = express.Router();

router.use(authentication, isAdmin);

const MENU = 'SETTING_ROLE';
// Daftar role juga dipakai mengisi dropdown "Role System" di halaman user,
// jadi hak lihat dari salah satu menu itu sudah cukup.
const BOLEH_LIHAT = [MENU, 'SETTING_USERS'];

router.get('/', izinMenu(BOLEH_LIHAT, 'view'), RoleAksesController.daftar);
router.post('/', izinMenu(MENU, 'create'), RoleAksesController.buat);
router.get('/:id', izinMenu(BOLEH_LIHAT, 'view'), RoleAksesController.detail);
router.put('/:id', izinMenu(MENU, 'update'), RoleAksesController.ubah);
router.delete('/:id', izinMenu(MENU, 'delete'), RoleAksesController.hapus);

router.get('/:id/akses-menu', izinMenu(MENU, 'view'), RoleAksesController.aksesMenu);
router.put('/:id/akses-menu', izinMenu(MENU, 'update'), RoleAksesController.simpanAksesMenu);

module.exports = router;
