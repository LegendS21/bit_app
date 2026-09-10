import { api } from "../../lib/api";
import type {
  BuatUserPayload,
  FilterUser,
  MetaHalaman,
  UbahUserPayload,
  UserInternal,
} from "./types";

/**
 * Modul CRUD users (khusus ADMIN). Access token dan auto-refresh sudah
 * ditangani interceptor di `lib/api.ts`, jadi di sini tinggal panggilannya.
 */

export async function daftarUsers(filter: FilterUser) {
  // Kolom kosong tidak dikirim supaya tidak dianggap filter oleh backend.
  const params = Object.fromEntries(
    Object.entries(filter).filter(([, v]) => v !== "" && v !== undefined && v !== null),
  );

  const { data } = await api.get<{ data: UserInternal[]; meta: MetaHalaman }>("/users", {
    params,
  });
  return data;
}

export async function buatUser(payload: BuatUserPayload) {
  const { data } = await api.post<{ data: UserInternal }>("/users", payload);
  return data.data;
}

export async function ubahUser(uuid: string, payload: UbahUserPayload) {
  const { data } = await api.put<{ data: UserInternal }>(`/users/${uuid}`, payload);
  return data.data;
}

export async function hapusUser(uuid: string) {
  await api.delete(`/users/${uuid}`);
}
