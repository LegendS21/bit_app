'use strict';

const UserService = require('../services/userService.js');
const { user } = require('../models');
const { ambilMeta } = require('../helpers/request.js');
const { unauthorized } = require('../helpers/errors.js');
const {
  buatUserSchema,
  ubahUserSchema,
  daftarUserQuerySchema,
} = require('../validators/userValidator.js');

/**
 * Access token cuma membawa uuid. Beberapa aturan (tidak boleh menghapus /
 * menonaktifkan akun sendiri) perlu id baris aslinya, jadi diambil sekali di sini.
 */
async function pelakuDari(req) {
  const pelaku = await user.findOne({
    where: { uuid: req.user.uuid },
    attributes: ['id', 'email'],
  });
  if (!pelaku) throw unauthorized('Akun Anda tidak ditemukan', 'USER_NOT_FOUND');
  return pelaku;
}

class UsersController {
  static async daftar(req, res, next) {
    try {
      const filter = daftarUserQuerySchema.parse(req.query);
      res.status(200).json(await UserService.daftar(filter));
    } catch (error) {
      next(error);
    }
  }

  static async detail(req, res, next) {
    try {
      res.status(200).json({ data: await UserService.detail(req.params.uuid) });
    } catch (error) {
      next(error);
    }
  }

  static async buat(req, res, next) {
    try {
      const data = buatUserSchema.parse(req.body ?? {});
      const hasil = await UserService.buat(data, await pelakuDari(req), ambilMeta(req));
      res.status(201).json({ message: 'User berhasil dibuat', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  static async ubah(req, res, next) {
    try {
      const data = ubahUserSchema.parse(req.body ?? {});
      const hasil = await UserService.ubah(
        req.params.uuid,
        data,
        await pelakuDari(req),
        ambilMeta(req)
      );
      res.status(200).json({ message: 'User berhasil diperbarui', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  static async hapus(req, res, next) {
    try {
      const hasil = await UserService.hapus(
        req.params.uuid,
        await pelakuDari(req),
        ambilMeta(req)
      );
      res.status(200).json({ message: 'User berhasil dihapus', data: hasil });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UsersController;
