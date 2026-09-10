import { api } from "../../lib/api";
import type {
  BuatMenuPayload,
  HasilHapusMenu,
  MenuSystem,
  UbahMenuPayload,
} from "./types";

/** Modul CRUD menu system (khusus ADMIN). */

export async function daftarMenus() {
  const { data } = await api.get<{ data: MenuSystem[] }>("/menus");
  return data.data;
}

export async function buatMenu(payload: BuatMenuPayload) {
  const { data } = await api.post<{ data: MenuSystem }>("/menus", payload);
  return data.data;
}

export async function ubahMenu(id: number, payload: UbahMenuPayload) {
  const { data } = await api.put<{ data: MenuSystem }>(`/menus/${id}`, payload);
  return data.data;
}

export async function hapusMenu(id: number) {
  const { data } = await api.delete<{ data: HasilHapusMenu }>(`/menus/${id}`);
  return data.data;
}
