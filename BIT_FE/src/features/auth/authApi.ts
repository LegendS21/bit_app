import { api, refreshSesi, type SesiPayload } from "../../lib/api";
import type { PenggunaSesi } from "./types";

type SesiResponse = { data: SesiPayload<PenggunaSesi> };

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
