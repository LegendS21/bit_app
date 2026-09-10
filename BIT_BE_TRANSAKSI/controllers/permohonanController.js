'use strict';

const PermohonanService = require('../services/permohonanService.js');
const {
  buatPermohonanSchema,
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  daftarQuerySchema,
  idParamSchema
} = require('../validators/permohonanValidator.js');

/** Token diteruskan apa adanya ke service Master saat perlu. */
const tokenDari = (req) => req.headers.authorization;

class PermohonanController {
  /** POST /permohonan */
  static async buat(req, res, next) {
    try {
      const data = buatPermohonanSchema.parse(req.body ?? {});
      const hasil = await PermohonanService.buat(data, req.user, tokenDari(req));
      res.status(201).json({ message: 'Draft permohonan berhasil dibuat', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  /** GET /permohonan/saya */
  static async daftarSaya(req, res, next) {
    try {
      const filter = daftarQuerySchema.parse(req.query);
      res.status(200).json(await PermohonanService.daftarSaya(filter, req.user));
    } catch (error) {
      next(error);
    }
  }

  /** GET /permohonan */
  static async daftar(req, res, next) {
    try {
      const filter = daftarQuerySchema.parse(req.query);
      res.status(200).json(await PermohonanService.daftar(filter));
    } catch (error) {
      next(error);
    }
  }

  /** GET /permohonan/:id */
  static async detail(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      res.status(200).json({ data: await PermohonanService.detail(id, req.user) });
    } catch (error) {
      next(error);
    }
  }

  /** PUT /permohonan/:id/step-1 */
  static async step1(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      const data = step1Schema.parse(req.body ?? {});
      const hasil = await PermohonanService.simpanStep1(id, data, req.user);
      res.status(200).json({ message: 'Data diri & kontak tersimpan', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  /** PUT /permohonan/:id/step-2 */
  static async step2(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      const data = step2Schema.parse(req.body ?? {});
      const hasil = await PermohonanService.simpanStep2(id, data, req.user);
      res.status(200).json({ message: 'Latar belakang pendidikan & pekerjaan tersimpan', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  /** POST /permohonan/:id/step-3 */
  static async step3(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      const data = step3Schema.parse(req.body ?? {});
      const hasil = await PermohonanService.simpanStep3(id, data, req.user, tokenDari(req));
      res.status(200).json({ message: 'Dokumen tercatat', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /permohonan/:id/step-3/:persyaratanId */
  static async hapusDokumen(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      const persyaratanId = idParamSchema.parse(req.params.persyaratanId);
      const hasil = await PermohonanService.hapusDokumen(id, persyaratanId, req.user);
      res.status(200).json({ message: 'Dokumen dilepas dari permohonan', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  /** PUT /permohonan/:id/step-4 */
  static async step4(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      const data = step4Schema.parse(req.body ?? {});
      // `req` ikut dikirim untuk mencatat IP penyetuju sebagai bukti.
      const hasil = await PermohonanService.simpanStep4(id, data, req.user, req);
      res.status(200).json({ message: 'Lembar persetujuan tersimpan', data: hasil });
    } catch (error) {
      next(error);
    }
  }

  /** POST /permohonan/:id/submit */
  static async submit(req, res, next) {
    try {
      const id = idParamSchema.parse(req.params.id);
      const hasil = await PermohonanService.submit(id, req.user, tokenDari(req));
      res.status(200).json({ message: 'Permohonan berhasil dikirim', data: hasil });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PermohonanController;
