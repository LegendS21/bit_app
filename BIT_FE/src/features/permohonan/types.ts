import type { BadgeTone } from "../../components/ui/Badge";

export const STATUS_PERMOHONAN = [
  "DRAFT",
  "DIAJUKAN",
  "DALAM_VERIFIKASI",
  "REVISI",
  "DITOLAK_ADMIN",
  "LULUS_ADMIN",
  "DALAM_WAWANCARA",
  "LULUS_WAWANCARA",
  "TIDAK_LULUS_WAWANCARA",
  "DITERIMA",
  "TIDAK_DITERIMA",
] as const;

export type StatusPermohonan = (typeof STATUS_PERMOHONAN)[number];

/** Label & nada badge per status, dipakai dashboard dan riwayat. */
export const LABEL_STATUS: Record<StatusPermohonan, string> = {
  DRAFT: "Draft — Belum Dikirim",
  DIAJUKAN: "Terkirim — Menunggu Verifikasi",
  DALAM_VERIFIKASI: "Sedang Diverifikasi",
  REVISI: "Perlu Perbaikan",
  DITOLAK_ADMIN: "Tidak Lolos Seleksi Administrasi",
  LULUS_ADMIN: "Lolos Administrasi",
  DALAM_WAWANCARA: "Menunggu / Sedang Wawancara",
  LULUS_WAWANCARA: "Lulus Wawancara",
  TIDAK_LULUS_WAWANCARA: "Tidak Lulus Wawancara",
  DITERIMA: "Diterima",
  TIDAK_DITERIMA: "Tidak Diterima",
};

export type Biodata = {
  nik: string;
  nama_lengkap: string;
  tempat_lahir: string | null;
  tgl_lahir: string;
  jenis_kelamin: "L" | "P" | null;
  alamat: string;
  no_hp: string;
  no_hp_alt: string | null;
  email: string;
};

export type Pendidikan = {
  pendidikan_kode: string;
  instansi: string;
  jurusan: string | null;
  tahun_lulus: number | null;
  pekerjaan_kode: string | null;
  nama_tempat_kerja: string | null;
};

export type DokumenPermohonan = {
  id: number;
  persyaratan_id: number;
  persyaratan_nama: string;
  dokumen_uuid: string;
  nama_file_asli: string;
  ukuran_byte: number;
  status_verifikasi: "BELUM_DIPERIKSA" | "SESUAI" | "TIDAK_SESUAI";
  catatan: string | null;
  uploaded_at: string;
};

export type Persetujuan = {
  is_setuju: boolean;
  disetujui_at: string | null;
};

export type PutusanVerifikasi = {
  id: number;
  verifikator_nama: string;
  keputusan: "DISETUJUI" | "DITOLAK" | "REVISI";
  catatan: string | null;
  verified_at: string;
  checklist?: {
    permohonan_dokumen_id: number;
    is_sesuai: boolean;
    catatan: string | null;
  }[];
};

export type RiwayatStatus = {
  id: number;
  status_dari: string | null;
  status_ke: string;
  actor_role: string | null;
  catatan: string | null;
  created_at: string;
};

export type MetaHalaman = {
  total: number;
  page: number;
  limit: number;
  total_halaman: number;
};

/** Pintasan antrean per peran; backend yang memetakannya ke kumpulan status. */
export type Tahap = "verifikasi" | "wawancara" | "hasil";

export type FilterPermohonan = {
  tahap?: Tahap;
  q?: string;
  status?: StatusPermohonan | "";
  beasiswa_id?: number;
  page?: number;
  limit?: number;
};

export type PermohonanRingkas = {
  id: number;
  kode_permohonan: string;
  beasiswa_id: number;
  beasiswa_nama: string;
  status: StatusPermohonan;
  /** Posisi wizard 1..4 — hanya maju, dipakai untuk melanjutkan pengisian. */
  current_step: number;
  is_locked: boolean;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  /** Hanya ikut pada daftar untuk internal. */
  pendaftar?: Pendaftar;
};

export type PermohonanLengkap = PermohonanRingkas & {
  biodata: Biodata | null;
  pendidikan: Pendidikan | null;
  dokumen: DokumenPermohonan[];
  persetujuan: Persetujuan | null;
  verifikasi: PutusanVerifikasi[];
  wawancara: PenilaianWawancara[];
  hasil: HasilAkhir | null;
  riwayat_status: RiwayatStatus[];
};

export type Step1Payload = Omit<Biodata, "tempat_lahir" | "no_hp_alt" | "jenis_kelamin"> & {
  tempat_lahir?: string;
  no_hp_alt?: string;
  jenis_kelamin?: "L" | "P";
};

export type Step2Payload = {
  pendidikan_kode: string;
  instansi: string;
  jurusan?: string;
  tahun_lulus?: number;
  pekerjaan_kode?: string;
  nama_tempat_kerja?: string;
};

/**
 * Acuan jenjang pendidikan.
 *
 * Sementara didefinisikan di sini: tabel `ref_pendidikan` di service Master
 * sudah ada tapi belum punya API maupun isi. Begitu endpointnya tersedia,
 * daftar ini diganti pemanggilan API — kodenya sudah dibuat sama dengan yang
 * ada di DDL.
 */
export const REF_PENDIDIKAN = [
  { kode: "SD", nama: "SD / Sederajat" },
  { kode: "SMP", nama: "SMP / Sederajat" },
  { kode: "SMA", nama: "SMA / SMK / Sederajat" },
  { kode: "D3", nama: "D3 (Ahli Madya)" },
  { kode: "D4", nama: "D4 / Sarjana Terapan" },
  { kode: "S1", nama: "S1 (Sarjana)" },
  { kode: "S2", nama: "S2 (Magister)" },
  { kode: "S3", nama: "S3 (Doktor)" },
];

/** Acuan pekerjaan — sama, sementara sampai `ref_pekerjaan` punya API. */
export const REF_PEKERJAAN = [
  { kode: "BELUM_BEKERJA", nama: "Belum Bekerja" },
  { kode: "PELAJAR", nama: "Pelajar / Mahasiswa" },
  { kode: "KARYAWAN", nama: "Karyawan Swasta" },
  { kode: "PNS", nama: "PNS / ASN" },
  { kode: "WIRASWASTA", nama: "Wiraswasta" },
  { kode: "FREELANCER", nama: "Freelancer" },
  { kode: "LAINNYA", nama: "Lainnya" },
];

/** Byte → tampilan yang enak dibaca. */
export function ukuranTerbaca(byte: number) {
  if (byte >= 1024 * 1024) return `${(byte / 1024 / 1024).toFixed(1)} MB`;
  if (byte >= 1024) return `${Math.round(byte / 1024)} KB`;
  return `${byte} B`;
}

/** Ikut pada daftar untuk pengguna internal (hasil join ke biodata). */
export type Pendaftar = { nama_lengkap: string; nik: string };

export type PenilaianWawancara = {
  id: number;
  penilai_nama: string;
  tgl_wawancara: string | null;
  nilai_total: string | null;
  hasil: "LULUS" | "TIDAK_LULUS";
  catatan: string | null;
  submitted_at: string;
  detail?: { aspek: string; skor: string; bobot: string; catatan: string | null }[];
};

export type HasilAkhir = {
  status_akhir: "DITERIMA" | "TIDAK_DITERIMA";
  catatan: string | null;
  ditetapkan_at: string;
};

export type Statistik = {
  total: number;
  /** Tanpa DRAFT — yang benar-benar sudah masuk antrean. */
  total_masuk: number;
  per_status: Record<StatusPermohonan, number>;
  ringkas: {
    menunggu_verifikasi: number;
    perlu_revisi: number;
    menunggu_wawancara: number;
    menunggu_penetapan: number;
    diterima: number;
    ditolak: number;
  };
  per_beasiswa: {
    beasiswa_id: number;
    beasiswa_nama: string;
    pendaftar: number;
    /** Pernah lolos administrasi, termasuk yang sudah lanjut ke tahap berikutnya. */
    lolos_admin: number;
    diterima: number;
  }[];
};

export type VerifikasiPayload = {
  keputusan: "DISETUJUI" | "DITOLAK" | "REVISI";
  catatan?: string;
  checklist?: { permohonan_dokumen_id: number; is_sesuai: boolean; catatan?: string }[];
};

export type WawancaraPayload = {
  tgl_wawancara?: string;
  hasil: "LULUS" | "TIDAK_LULUS";
  catatan?: string;
  /** `nilai_total` tidak dikirim — dihitung backend dari aspek-aspek ini. */
  detail: { aspek: string; skor: number; bobot?: number; catatan?: string }[];
};

export type HasilAkhirPayload = {
  status_akhir: "DITERIMA" | "TIDAK_DITERIMA";
  catatan?: string;
};

/** Ambang kelulusan wawancara — dipakai untuk mewarnai nilai di tabel. */
export const AMBANG_LULUS = 70;

/**
 * Nada badge per status, dipakai bersama halaman peserta dan ketiga halaman
 * internal supaya satu status selalu tampil dengan warna yang sama.
 */
export const TONE_STATUS: Record<StatusPermohonan, BadgeTone> = {
  DRAFT: "neutral",
  DIAJUKAN: "info",
  DALAM_VERIFIKASI: "info",
  REVISI: "warning",
  DITOLAK_ADMIN: "danger",
  LULUS_ADMIN: "success",
  DALAM_WAWANCARA: "info",
  LULUS_WAWANCARA: "success",
  TIDAK_LULUS_WAWANCARA: "danger",
  DITERIMA: "success",
  TIDAK_DITERIMA: "danger",
};

/** YYYY-MM-DD atau ISO → "1 September 2026". */
export function tanggalIndonesia(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}
