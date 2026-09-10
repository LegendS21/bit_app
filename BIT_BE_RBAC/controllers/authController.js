'use strict';

const AuthService = require('../services/authService.js');
const { ambilMeta } = require('../helpers/request.js');
const {
  setRefreshCookie,
  clearRefreshCookie,
  ambilRefreshToken
} = require('../helpers/refreshToken.js');
const { loginSchema, registerSchema, validasi } = require('../validators/authValidator.js');

class AuthController {
  static async register(req, res, next) {
    try {
      const data = validasi(registerSchema, req.body);
      const akun = await AuthService.register(data, ambilMeta(req));

      // 201 + profil saja. Tidak ada token dan tidak ada cookie: pendaftaran
      // bukan login, pengguna diarahkan ke halaman login setelah ini.
      res.status(201).json({
        message: 'Pendaftaran berhasil. Silakan login dengan email dan password Anda.',
        data: akun
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const kredensial = validasi(loginSchema, req.body);
      const { refreshToken, ...hasil } = await AuthService.login(kredensial, ambilMeta(req));

      // Refresh token tidak pernah masuk body response — hanya HttpOnly cookie,
      // supaya tidak bisa dibaca/disimpan JavaScript di frontend.
      setRefreshCookie(res, refreshToken);
      res.status(200).json({ message: 'Login berhasil', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req, res, next) {
    try {
      const rawToken = ambilRefreshToken(req);
      const { refreshToken, ...hasil } = await AuthService.refresh(rawToken, ambilMeta(req));

      setRefreshCookie(res, refreshToken);
      res.status(200).json({ message: 'Token diperbarui', data: hasil });
    } catch (error) {
      // Refresh gagal artinya cookie yang dipegang klien sudah tidak berguna.
      clearRefreshCookie(res);
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      await AuthService.logout(ambilRefreshToken(req), ambilMeta(req));
      clearRefreshCookie(res);
      res.status(200).json({ message: 'Logout berhasil' });
    } catch (error) {
      next(error);
    }
  }

  static async logoutAll(req, res, next) {
    try {
      const hasil = await AuthService.logoutSemua(req.user.uuid, ambilMeta(req));
      clearRefreshCookie(res);
      res.status(200).json({ message: 'Semua sesi dicabut', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  static async me(req, res, next) {
    try {
      const profil = await AuthService.me(req.user.uuid);
      res.status(200).json({ data: profil });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
