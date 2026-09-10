import { api } from "../../lib/api";
import type {
  AksesDikirim,
  AksesMenuRole,
  BuatRolePayload,
  Role,
  UbahRolePayload,
} from "./types";

/** Modul Role & Akses Menu (khusus ADMIN). */

export async function daftarRoles() {
  const { data } = await api.get<{ data: Role[] }>("/roles");
  return data.data;
}

export async function buatRole(payload: BuatRolePayload) {
  const { data } = await api.post<{ data: Role }>("/roles", payload);
  return data.data;
}

export async function ubahRole(id: number, payload: UbahRolePayload) {
  const { data } = await api.put<{ data: Role }>(`/roles/${id}`, payload);
  return data.data;
}

export async function hapusRole(id: number) {
  await api.delete(`/roles/${id}`);
}

export async function aksesMenuRole(id: number) {
  const { data } = await api.get<{ data: AksesMenuRole }>(`/roles/${id}/akses-menu`);
  return data.data;
}

export async function simpanAksesMenuRole(id: number, akses: AksesDikirim[]) {
  const { data } = await api.put<{ data: AksesMenuRole }>(`/roles/${id}/akses-menu`, {
    akses,
  });
  return data.data;
}
