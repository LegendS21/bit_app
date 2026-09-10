'use strict';

const MenuService = require('../services/menuService.js');
const { user } = require('../models');
const { ambilMeta } = require('../helpers/request.js');
const { unauthorized } = require('../helpers/errors.js');
const {
  buatMenuSchema,
  ubahMenuSchema,
  idParamSchema,
} = require('../validators/menuValidator.js');

/** Sama seperti controller lain: token cuma membawa uuid. */
async function pelakuDari(req) {
  const pelaku = await user.findOne({
    where: { uuid: req.user.uuid },
    attributes: ['id', 'email'],
  });
  if (!pelaku) throw unauthorized('Akun Anda tidak ditemukan', 'USER_NOT_FOUND');
  return pelaku;
}

class MenuController {
  /** GET /menus */
  static async daftar(req, res, next) {
    try {
      res.status(200).json({ data: await MenuService.daftar() });
    } catch (error) {
      next(error);
    }
  }

  /** GET /menus/:id */
  static async detail(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      res.status(200).json({ data: await MenuService.detail(id) });
    } catch (error) {
      next(error);
    }
  }

  /** POST /menus */
  static async buat(req, res, next) {
    try {
      const data = buatMenuSchema.parse(req.body ?? {});
      const hasil = await MenuService.buat(data, await pelakuDari(req), ambilMeta(req));
      res.status(201).json({ message: 'Menu berhasil dibuat', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  /** PUT /menus/:id */
  static async ubah(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      const data = ubahMenuSchema.parse(req.body ?? {});
      const hasil = await MenuService.ubah(id, data, await pelakuDari(req), ambilMeta(req));
      res.status(200).json({ message: 'Menu berhasil diperbarui', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /menus/:id */
  static async hapus(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      const hasil = await MenuService.hapus(id, await pelakuDari(req), ambilMeta(req));
      res.status(200).json({ message: 'Menu berhasil dihapus', data: hasil });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MenuController;
