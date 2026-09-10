'use strict';

const BeasiswaService = require('../services/beasiswaService.js');
const {
  buatBeasiswaSchema,
  ubahBeasiswaSchema,
  daftarBeasiswaQuerySchema,
  idParamSchema
} = require('../validators/beasiswaValidator.js');

class BeasiswaController {
  /** GET /beasiswa */
  static async daftar(req, res, next) {
    try {
      const filter = daftarBeasiswaQuerySchema.parse(req.query);
      res.status(200).json(await BeasiswaService.daftar(filter, req.user));
    } catch (error) {
      next(error);
    }
  }

  /** GET /beasiswa/:id */
  static async detail(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      res.status(200).json({ data: await BeasiswaService.detail(id, req.user) });
    } catch (error) {
      next(error);
    }
  }

  /** POST /beasiswa */
  static async buat(req, res, next) {
    try {
      const data = buatBeasiswaSchema.parse(req.body ?? {});
      const hasil = await BeasiswaService.buat(data, req.user);
      res.status(201).json({ message: 'Data beasiswa berhasil dibuat', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  /** PUT /beasiswa/:id */
  static async ubah(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      const data = ubahBeasiswaSchema.parse(req.body ?? {});
      const hasil = await BeasiswaService.ubah(id, data);
      res.status(200).json({ message: 'Data beasiswa berhasil diperbarui', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /beasiswa/:id */
  static async hapus(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      const hasil = await BeasiswaService.hapus(id);
      res.status(200).json({ message: 'Data beasiswa berhasil dihapus', data: hasil });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BeasiswaController;
