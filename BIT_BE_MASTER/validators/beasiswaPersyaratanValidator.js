'use strict';

const { z } = require('zod');

/**
 * Daftar persyaratan sebuah program dikirim **utuh** — apa yang dikirim itulah
 * isinya setelah disimpan. Yang tidak ikut terkirim dianggap dilepas.
 *
 * Urutan tampil diambil dari urutan array, bukan dari kolom `urutan` yang
 * dikirim client. Dengan begitu tidak mungkin ada dua syarat berebut nomor
 * urut yang sama, dan frontend cukup menyusun ulang arraynya.
 */

const idPersyaratan = z.coerce
  .number()
  .int('ID persyaratan harus bilangan bulat')
  .positive('ID persyaratan tidak valid');

// Satu item boleh ditulis ringkas sebagai id saja (`[1, 2, 3]`) kalau semuanya
// wajib — bentuk objek dipakai saat perlu menandai yang opsional.
const itemSyarat = z.preprocess(
  (v) => (typeof v === 'number' || typeof v === 'string' ? { persyaratan_id: v } : v),
  z.object({
    persyaratan_id: idPersyaratan,
    is_wajib: z.boolean().optional().default(true)
  })
);

const simpanSyaratSchema = z.preprocess(
  // Terima body berupa array telanjang maupun `{ items: [...] }`.
  (v) => (Array.isArray(v) ? { items: v } : v),
  z
    .object({
      // Array kosong sah: artinya program itu tidak menuntut dokumen apa pun.
      items: z.array(itemSyarat).max(50, 'Maksimal 50 persyaratan per program')
    })
    .refine(
      (v) => {
        const id = v.items.map((i) => i.persyaratan_id);
        return new Set(id).size === id.length;
      },
      { message: 'Ada persyaratan yang terdaftar lebih dari sekali', path: ['items'] }
    )
);

const idParamSchema = z.coerce.number().int().positive();

module.exports = { simpanSyaratSchema, idParamSchema };
