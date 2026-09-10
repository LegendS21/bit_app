export type Persyaratan = {
  id: number;
  /** KTP, KK, IJAZAH, SURAT_REKOMENDASI — ditentukan admin, bukan otomatis. */
  kode: string;
  nama: string;
  deskripsi: string | null;
  /** Dikirim backend sebagai array, di DB disimpan dipisah koma. */
  allowed_mime: string[];
  max_size_kb: number;
  is_active: boolean;
  /** Berapa program beasiswa yang memakai persyaratan ini. */
  jumlah_program: number;
  created_at: string;
  updated_at: string;
};

export type FilterPersyaratan = {
  q?: string;
  status?: "aktif" | "nonaktif" | "";
  page?: number;
  limit?: number;
};

export type MetaHalaman = {
  total: number;
  page: number;
  limit: number;
  total_halaman: number;
};

export type BuatPersyaratanPayload = {
  kode: string;
  nama: string;
  deskripsi?: string;
  allowed_mime?: string[];
  max_size_kb?: number;
  is_active?: boolean;
};

export type UbahPersyaratanPayload = Partial<BuatPersyaratanPayload>;

/** Pilihan format berkas yang lazim dipakai, ditampilkan sebagai centang. */
export const MIME_UMUM: { mime: string; label: string }[] = [
  { mime: "application/pdf", label: "PDF" },
  { mime: "image/jpeg", label: "JPG / JPEG" },
  { mime: "image/png", label: "PNG" },
  { mime: "image/webp", label: "WEBP" },
];

/** KB → tampilan yang enak dibaca. */
export function ukuranTerbaca(kb: number) {
  return kb >= 1024 ? `${(kb / 1024).toFixed(kb % 1024 === 0 ? 0 : 1)} MB` : `${kb} KB`;
}

/** application/pdf → PDF; tipe di luar daftar ditampilkan apa adanya. */
export function labelMime(mime: string) {
  return MIME_UMUM.find((m) => m.mime === mime)?.label ?? mime;
}
