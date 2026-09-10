'use strict';

const PersyaratanService = require('../services/persyaratanService.js');
const {
  buatPersyaratanSchema,
  ubahPersyaratanSchema,
  daftarPersyaratanQuerySchema,
  idParamSchema
} = require('../validators/persyaratanValidator.js');

class PersyaratanController {
  /** GET /persyaratan */
  static async daftar(req, res, next) {
    try {
      const filter = daftarPersyaratanQuerySchema.parse(req.query);
      res.status(200).json(await PersyaratanService.daftar(filter));
    } catch (error) {
      next(error);
    }
  }

  /** GET /persyaratan/:id */
  static async detail(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      res.status(200).json({ data: await PersyaratanService.detail(id) });
    } catch (error) {
      next(error);
    }
  }

  /** POST /persyaratan */
  static async buat(req, res, next) {
    try {
      const data = buatPersyaratanSchema.parse(req.body ?? {});
      const hasil = await PersyaratanService.buat(data);
      res.status(201).json({ message: 'Data persyaratan berhasil dibuat', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  /** PUT /persyaratan/:id */
  static async ubah(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      const data = ubahPersyaratanSchema.parse(req.body ?? {});
      const hasil = await PersyaratanService.ubah(id, data);
      res.status(200).json({ message: 'Data persyaratan berhasil diperbarui', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /persyaratan/:id */
  static async hapus(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      const hasil = await PersyaratanService.hapus(id);
      res.status(200).json({ message: 'Data persyaratan berhasil dihapus', data: hasil });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PersyaratanController;
