'use strict';

const express = require('express');
const AuthController = require('../controllers/authController.js');
const authentication = require('../middlewares/authentication.js');
const { loginLimiter, refreshLimiter } = require('../middlewares/rateLimit.js');

const router = express.Router();

// --- Rute publik (tidak butuh access token) ---
router.post('/login', loginLimiter, AuthController.login);
// /refresh & /logout diautentikasi lewat cookie refresh token, bukan Bearer token,
// justru karena dipanggil saat access token-nya sudah kedaluwarsa.
router.post('/refresh', refreshLimiter, AuthController.refresh);
router.post('/logout', AuthController.logout);

// --- Rute yang butuh access token ---
router.get('/me', authentication, AuthController.me);
router.post('/logout-all', authentication, AuthController.logoutAll);

module.exports = router;
