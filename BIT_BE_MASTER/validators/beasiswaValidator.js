'use strict';

const { z } = require('zod');

const STATUS = ['DRAFT', 'AKTIF', 'DITUTUP', 'ARSIP'];

/** Sanitasi teks bebas: rapikan spasi, buang karakter `< >`. */
const teks = (maks, wajib = true) => {
  const dasar = z.string().max(maks, `Maksimal ${maks} karakter`);
  return z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().replace(/[<>]/g, '') : v),
    wajib ? dasar.min(1, 'Wajib diisi') : dasar.optional().or(z.literal(''))
  );
};

const tanggal = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Tanggal tidak valid');

const kuota = z.coerce
  .number()
  .int('Kuota harus bilangan bulat')
  .min(0, 'Kuota tidak boleh negatif')
  .max(1000000, 'Kuota terlalu besar');

const status = z.enum(STATUS, { message: 'Status tidak dikenali' });

/** Masa pendaftaran harus masuk akal: tutup tidak boleh mendahului buka. */
const periodeSah = (v) =>
  !v.tgl_buka || !v.tgl_tutup || v.tgl_buka <= v.tgl_tutup;

const pesanPeriode = {
  message: 'Tanggal tutup tidak boleh lebih awal dari tanggal buka',
  path: ['tgl_tutup']
};

/**
 * `kode` sengaja tidak ada di skema mana pun: dirakit backend sebagai
 * `BEA-{tahun}-{urut}` dan tidak bisa diubah setelah terbit. Kalau client
 * tetap mengirimnya, nilainya diabaikan.
 */
const buatBeasiswaSchema = z
  .object({
    nama: teks(200),
    deskripsi: teks(5000, false),
    penyelenggara: teks(150, false),
    kuota: kuota.optional().default(0),
    tgl_buka: tanggal,
    tgl_tutup: tanggal,
    status: status.optional().default('DRAFT')
  })
  .refine(periodeSah, pesanPeriode);

const ubahBeasiswaSchema = z
  .object({
    nama: teks(200).optional(),
    deskripsi: teks(5000, false),
    penyelenggara: teks(150, false),
    kuota: kuota.optional(),
    tgl_buka: tanggal.optional(),
    tgl_tutup: tanggal.optional(),
    status: status.optional()
  })
  .refine((v) => Object.keys(v).some((k) => v[k] !== undefined), {
    message: 'Tidak ada data yang diubah'
  });

const angka = (bawaan, min, maks) =>
  z.preprocess(
    (v) => (v === undefined || v === '' ? bawaan : Number(v)),
    z.number().int().min(min).max(maks)
  );

const daftarBeasiswaQuerySchema = z.object({
  q: z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().max(100).optional()),
  status: status.optional(),
  page: angka(1, 1, 100000),
  limit: angka(10, 1, 100)
});

const idParamSchema = z.coerce.number().int().positive();

module.exports = {
  STATUS,
  buatBeasiswaSchema,
  ubahBeasiswaSchema,
  daftarBeasiswaQuerySchema,
  idParamSchema
};
