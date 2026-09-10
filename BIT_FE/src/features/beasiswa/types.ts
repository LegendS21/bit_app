export const STATUS_BEASISWA = ["DRAFT", "AKTIF", "DITUTUP", "ARSIP"] as const;

export type StatusBeasiswa = (typeof STATUS_BEASISWA)[number];

/** Label & warna badge per status, dipakai tabel dan filter. */
export const LABEL_STATUS: Record<StatusBeasiswa, string> = {
  DRAFT: "Draft",
  AKTIF: "Aktif",
  DITUTUP: "Ditutup",
  ARSIP: "Arsip",
};

export type Beasiswa = {
  id: number;
  kode: string;
  nama: string;
  deskripsi: string | null;
  penyelenggara: string | null;
  kuota: number;
  /** Format YYYY-MM-DD. */
  tgl_buka: string;
  tgl_tutup: string;
  status: StatusBeasiswa;
  /** Logical reference ke db_rbac.users.id. */
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

/**
 * Bentuk data katalog publik (`GET /beasiswa/publik`) — dipakai landing page
 * yang dibuka tanpa login.
 *
 * Sengaja lebih sempit daripada `Beasiswa`: tidak ada `status` (yang tampil
 * pasti AKTIF), dan tidak ada `created_by`/`created_at`/`updated_at` karena
 * itu data internal yang tidak perlu bocor ke pengunjung.
 */
export type SyaratPublik = {
  kode: string;
  nama: string;
  deskripsi: string | null;
  is_wajib: boolean;
};

export type BeasiswaPublik = {
  id: number;
  kode: string;
  nama: string;
  deskripsi: string | null;
  penyelenggara: string | null;
  kuota: number;
  /** Format YYYY-MM-DD. */
  tgl_buka: string;
  tgl_tutup: string;
  persyaratan: SyaratPublik[];
};

export type MetaKatalog = {
  total: number;
  /** Jumlah kuota seluruh program aktif, untuk statistik di hero. */
  total_kuota: number;
};

export type FilterBeasiswa = {
  q?: string;
  status?: StatusBeasiswa | "";
  page?: number;
  limit?: number;
};

export type MetaHalaman = {
  total: number;
  page: number;
  limit: number;
  total_halaman: number;
};

/** `kode` tidak dikirim: dirakit backend sebagai BEA-{tahun}-{urut 3 digit}. */
export type BuatBeasiswaPayload = {
  nama: string;
  deskripsi?: string;
  penyelenggara?: string;
  kuota?: number;
  tgl_buka: string;
  tgl_tutup: string;
  status?: StatusBeasiswa;
};

export type UbahBeasiswaPayload = Partial<BuatBeasiswaPayload>;

/**
 * Satu persyaratan yang berlaku pada sebuah program. Datanya gabungan:
 * `is_wajib` & `urutan` milik kaitannya, sisanya ikut dari master persyaratan
 * supaya tabel tidak perlu memanggil dua endpoint.
 */
export type SyaratProgram = {
  persyaratan_id: number;
  kode: string;
  nama: string;
  deskripsi: string | null;
  allowed_mime: string[];
  max_size_kb: number;
  /** Persyaratan yang sudah dinonaktifkan tapi terlanjur terpasang. */
  is_active: boolean;
  is_wajib: boolean;
  urutan: number;
};

export type DaftarSyaratProgram = {
  beasiswa: { id: number; kode: string; nama: string; status: StatusBeasiswa };
  persyaratan: SyaratProgram[];
};

/** Urutan tampil diambil dari urutan array, bukan dari kolom `urutan`. */
export type ItemSyaratPayload = {
  persyaratan_id: number;
  is_wajib: boolean;
};

/** Program yang masa pendaftarannya sudah lewat tidak bisa diubah syaratnya. */
export const STATUS_SYARAT_TERKUNCI: StatusBeasiswa[] = ["DITUTUP", "ARSIP"];
