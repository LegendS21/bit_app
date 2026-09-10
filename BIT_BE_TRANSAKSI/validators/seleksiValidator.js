'use strict';

const { z } = require('zod');

const teks = (maks, wajib = false) => {
  const dasar = z.string().max(maks, `Maksimal ${maks} karakter`);
  return z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().replace(/[<>]/g, '') : v),
    wajib ? dasar.min(1, 'Wajib diisi') : dasar.optional().or(z.literal(''))
  );
};

const idAngka = z.coerce.number().int().positive();

/* ------------------------------------------------------------------ *
 * Seleksi administrasi (VERIFIKATOR)
 * ------------------------------------------------------------------ */

const verifikasiSchema = z
  .object({
    keputusan: z.enum(['DISETUJUI', 'DITOLAK', 'REVISI'], {
      message: 'Keputusan harus DISETUJUI, DITOLAK, atau REVISI'
    }),
    catatan: teks(5000),
    // Checklist per dokumen. Boleh kosong kalau verifikator hanya memberi
    // catatan umum tanpa menandai berkas satu per satu.
    checklist: z
      .array(
        z.object({
          permohonan_dokumen_id: idAngka,
          is_sesuai: z.boolean(),
          catatan: teks(500)
        })
      )
      .max(50, 'Terlalu banyak baris checklist')
      .optional()
      .default([])
  })
  .refine(
    // Menolak atau meminta revisi tanpa alasan membuat pelamar tidak tahu
    // apa yang harus diperbaiki.
    (v) => v.keputusan === 'DISETUJUI' || (v.catatan && v.catatan.length > 0),
    { message: 'Catatan wajib diisi kalau keputusannya Ditolak atau Revisi', path: ['catatan'] }
  )
  .refine(
    (v) => {
      const id = (v.checklist || []).map((c) => c.permohonan_dokumen_id);
      return new Set(id).size === id.length;
    },
    { message: 'Ada dokumen yang dinilai lebih dari sekali', path: ['checklist'] }
  );

/* ------------------------------------------------------------------ *
 * Seleksi wawancara (LEMBAGA_SELEKSI)
 * ------------------------------------------------------------------ */

const nilai = (label) =>
  z.coerce
    .number()
    .min(0, `${label} tidak boleh negatif`)
    .max(100, `${label} maksimal 100`);

const wawancaraSchema = z
  .object({
    tgl_wawancara: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
      .optional(),
    hasil: z.enum(['LULUS', 'TIDAK_LULUS'], {
      message: 'Hasil harus LULUS atau TIDAK_LULUS'
    }),
    catatan: teks(5000),
    // `nilai_total` sengaja tidak diterima dari client — dihitung dari
    // detail aspeknya supaya angkanya selalu cocok dengan rinciannya.
    detail: z
      .array(
        z.object({
          aspek: teks(100, true),
          skor: nilai('Skor'),
          bobot: z.coerce
            .number()
            .positive('Bobot harus lebih dari 0')
            .max(100, 'Bobot maksimal 100')
            .optional()
            .default(1),
          catatan: teks(255)
        })
      )
      .min(1, 'Isi minimal satu aspek penilaian')
      .max(20, 'Terlalu banyak aspek penilaian')
  })
  .refine(
    (v) => {
      const aspek = v.detail.map((d) => d.aspek.toLowerCase());
      return new Set(aspek).size === aspek.length;
    },
    { message: 'Ada aspek penilaian yang ditulis dua kali', path: ['detail'] }
  );

/* ------------------------------------------------------------------ *
 * Hasil akhir (ADMIN)
 * ------------------------------------------------------------------ */

const hasilAkhirSchema = z.object({
  status_akhir: z.enum(['DITERIMA', 'TIDAK_DITERIMA'], {
    message: 'Status akhir harus DITERIMA atau TIDAK_DITERIMA'
  }),
  catatan: teks(5000)
});

module.exports = { verifikasiSchema, wawancaraSchema, hasilAkhirSchema };
