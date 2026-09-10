'use strict';

const SeleksiService = require('../services/seleksiService.js');
const {
  verifikasiSchema,
  wawancaraSchema,
  hasilAkhirSchema
} = require('../validators/seleksiValidator.js');
const { idParamSchema, daftarQuerySchema } = require('../validators/permohonanValidator.js');

class SeleksiController {
  /** POST /permohonan/:id/verifikasi */
  static async verifikasi(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      const data = verifikasiSchema.parse(req.body ?? {});
      const hasil = await SeleksiService.verifikasi(id, data, req.user);
      res.status(200).json({ message: 'Putusan seleksi administrasi tersimpan', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  /** POST /permohonan/:id/wawancara */
  static async wawancara(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      const data = wawancaraSchema.parse(req.body ?? {});
      const hasil = await SeleksiService.wawancara(id, data, req.user);
      res.status(200).json({ message: 'Penilaian wawancara tersimpan', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  /** POST /permohonan/:id/hasil-akhir */
  static async hasilAkhir(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      const data = hasilAkhirSchema.parse(req.body ?? {});
      const hasil = await SeleksiService.hasilAkhir(id, data, req.user);
      res.status(200).json({ message: 'Hasil akhir ditetapkan', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  /** GET /dashboard/statistik */
  static async statistik(req, res, next) {
    try {
      // Hanya `beasiswa_id` yang berarti di sini; sisanya diabaikan.
      const { beasiswa_id } = daftarQuerySchema.parse(req.query);
      res.status(200).json(await SeleksiService.statistik({ beasiswa_id }));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SeleksiController;
