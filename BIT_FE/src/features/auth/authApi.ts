import { api, refreshSesi, type SesiPayload } from "../../lib/api";
import type { PenggunaSesi } from "./types";

type SesiResponse = { data: SesiPayload<PenggunaSesi> };

export type DataPendaftaran = {
  nama: string;
  email: string;
  password: string;
  konfirmasi_password: string;
  no_hp?: string;
};

/**
 * POST /auth/register — pendaftaran mandiri calon peserta.
 *
 * Hanya untuk Calon Peserta. Akun internal (Verifikator, Lembaga Seleksi,
 * Admin) dibuat Admin lewat halaman Pengaturan → Users, bukan dari sini;
 * RBAC memaksa role APPLICANT dan menolak body yang menyelipkan `roles`.
 *
 * Tidak menerbitkan token — setelah berhasil, pengguna login seperti biasa.
 */
export async function registerRequest(data: DataPendaftaran) {
  const { data: body } = await api.post<{ message: string; data: PenggunaSesi }>(
    "/auth/register",
    data,
  );
  return body.data;
}

/**
 * POST /auth/login — refresh token dikirim balik sebagai cookie HttpOnly,
 * jadi tidak ada yang perlu disimpan sendiri di sini.
 */
export async function loginRequest(email: string, password: string) {
  const { data } = await api.post<SesiResponse>("/auth/login", { email, password });
  return data.data;
}

/**
 * POST /auth/refresh — dipakai saat memulihkan sesi setelah halaman dimuat
 * ulang. Lewat `refreshSesi` di lib/api supaya berbagi antrean dengan refresh
 * otomatis dari interceptor: dua rotasi sekaligus akan dibaca backend sebagai
 * pemakaian ulang token.
 */
export async function refreshRequest() {
  return refreshSesi<PenggunaSesi>();
}

export async function logoutRequest() {
  await api.post("/auth/logout");
}

export async function meRequest() {
  const { data } = await api.get<{ data: PenggunaSesi }>("/auth/me");
  return data.data;
}
