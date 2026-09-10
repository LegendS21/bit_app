/** Kode role mengikuti kontrak service RBAC. */
export type KodeRole = "ADMIN" | "VERIFIKATOR" | "LEMBAGA_SELEKSI" | "APPLICANT";

export type PenggunaSesi = {
  uuid: string;
  nama: string;
  email: string;
  no_hp: string | null;
  tipe_user: "APPLICANT" | "INTERNAL";
  roles: KodeRole[];
};

/** Pilihan "masuk sebagai" pada form login. */
export type ModeLogin = "peserta" | "internal";

/** Verifikator, Lembaga Seleksi, dan Admin sama-sama pengguna internal. */
export const ROLE_INTERNAL: KodeRole[] = ["VERIFIKATOR", "LEMBAGA_SELEKSI", "ADMIN"];

/** Teks pilihan role mengikuti mockup `Internal/1_index_login.html`. */
export const LABEL_ROLE: Record<KodeRole, string> = {
  VERIFIKATOR: "Verifikator (Seleksi Administrasi)",
  LEMBAGA_SELEKSI: "Lembaga Seleksi (Wawancara)",
  ADMIN: "Administrator System",
  APPLICANT: "Calon Peserta",
};

export const DASHBOARD: Record<KodeRole, string> = {
  VERIFIKATOR: "/verifikator",
  LEMBAGA_SELEKSI: "/lembaga-seleksi",
  ADMIN: "/admin",
  APPLICANT: "/peserta",
};

/** Dashboard tujuan kalau user tidak memilih role tertentu di form. */
export function tujuanSetelahLogin(roles: KodeRole[]): string {
  if (roles.includes("ADMIN")) return DASHBOARD.ADMIN;
  if (roles.includes("VERIFIKATOR")) return DASHBOARD.VERIFIKATOR;
  if (roles.includes("LEMBAGA_SELEKSI")) return DASHBOARD.LEMBAGA_SELEKSI;
  return DASHBOARD.APPLICANT;
}

export function adalahInternal(roles: KodeRole[]) {
  return roles.some((r) => ROLE_INTERNAL.includes(r));
}

/**
 * Tujuan redirect setelah login, diambil dari `?next=`. Hanya path internal
 * yang diterima — tanpa penyaringan ini isi `next` bisa dipakai mengarahkan
 * user ke situs luar (open redirect).
 */
export function tujuanAman(next: string | null, bawaan: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return bawaan;
  return next;
}
