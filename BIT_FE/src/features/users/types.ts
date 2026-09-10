import type { KodeRole } from "../auth/types";

export type RoleRingkas = { id: number; kode: KodeRole; nama: string };

export type UserInternal = {
  uuid: string;
  nama: string;
  email: string;
  no_hp: string | null;
  tipe_user: "INTERNAL" | "APPLICANT";
  is_active: boolean;
  email_verified_at: string | null;
  last_login_at: string | null;
  roles: RoleRingkas[];
  created_at: string;
};

export type FilterUser = {
  q?: string;
  role?: KodeRole | "";
  tipe?: "INTERNAL" | "APPLICANT";
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

export type BuatUserPayload = {
  nama: string;
  email: string;
  password: string;
  no_hp?: string;
  roles: KodeRole[];
  is_active?: boolean;
};

/** Semua opsional — hanya kolom yang dikirim yang akan diubah. */
export type UbahUserPayload = Partial<BuatUserPayload> & {
  /** Wajib saat user mengganti password akunnya sendiri. */
  password_lama?: string;
};
