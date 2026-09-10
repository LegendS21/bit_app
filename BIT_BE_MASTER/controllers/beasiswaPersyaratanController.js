'use strict';

const BeasiswaPersyaratanService = require('../services/beasiswaPersyaratanService.js');
const {
  simpanSyaratSchema,
  idParamSchema
} = require('../validators/beasiswaPersyaratanValidator.js');

class BeasiswaPersyaratanController {
  /** GET /beasiswa/:id/persyaratan */
  static async daftar(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      res.status(200).json(await BeasiswaPersyaratanService.daftar(id, req.user));
    } catch (error) {
      next(error);
    }
  }

  /** PUT /beasiswa/:id/persyaratan */
  static async simpan(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      const { items } = simpanSyaratSchema.parse(req.body ?? {});
      const hasil = await BeasiswaPersyaratanService.simpan(id, items);
      res.status(200).json({ message: 'Persyaratan program berhasil disimpan', ...hasil });
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /beasiswa/:id/persyaratan/:persyaratanId */
  static async lepas(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      const persyaratanId = idParamSchema.parse(req.params.persyaratanId);
      const hasil = await BeasiswaPersyaratanService.lepas(id, persyaratanId);
      res.status(200).json({ message: 'Persyaratan berhasil dilepas dari program', ...hasil });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BeasiswaPersyaratanController;
