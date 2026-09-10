'use strict';

const RoleService = require('../services/roleService.js');
const { user } = require('../models');
const { ambilMeta } = require('../helpers/request.js');
const { unauthorized } = require('../helpers/errors.js');
const {
  buatRoleSchema,
  ubahRoleSchema,
  aksesMenuSchema,
  idParamSchema,
} = require('../validators/roleValidator.js');

/** Sama seperti di usersController: token cuma membawa uuid. */
async function pelakuDari(req) {
  const pelaku = await user.findOne({
    where: { uuid: req.user.uuid },
    attributes: ['id', 'email'],
  });
  if (!pelaku) throw unauthorized('Akun Anda tidak ditemukan', 'USER_NOT_FOUND');
  return pelaku;
}

/** Modul Role & Akses Menu. */
class RoleAksesController {
  /** GET /roles */
  static async daftar(req, res, next) {
    try {
      res.status(200).json({ data: await RoleService.daftar() });
    } catch (error) {
      next(error);
    }
  }

  /** GET /roles/:id */
  static async detail(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      res.status(200).json({ data: await RoleService.detail(id) });
    } catch (error) {
      next(error);
    }
  }

  /** POST /roles */
  static async buat(req, res, next) {
    try {
      const data = buatRoleSchema.parse(req.body ?? {});
      const hasil = await RoleService.buat(data, await pelakuDari(req), ambilMeta(req));
      res.status(201).json({ message: 'Role berhasil dibuat', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  /** PUT /roles/:id */
  static async ubah(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      const data = ubahRoleSchema.parse(req.body ?? {});
      const hasil = await RoleService.ubah(id, data, await pelakuDari(req), ambilMeta(req));
      res.status(200).json({ message: 'Role berhasil diperbarui', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /roles/:id */
  static async hapus(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      const hasil = await RoleService.hapus(id, await pelakuDari(req), ambilMeta(req));
      res.status(200).json({ message: 'Role berhasil dihapus', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  /** GET /roles/:id/akses-menu */
  static async aksesMenu(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      res.status(200).json({ data: await RoleService.aksesMenu(id) });
    } catch (error) {
      next(error);
    }
  }

  /** PUT /roles/:id/akses-menu */
  static async simpanAksesMenu(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      const { akses } = aksesMenuSchema.parse(req.body ?? {});
      const hasil = await RoleService.simpanAksesMenu(
        id,
        akses,
        await pelakuDari(req),
        ambilMeta(req)
      );
      res.status(200).json({ message: 'Hak akses menu berhasil disimpan', data: hasil });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RoleAksesController;
