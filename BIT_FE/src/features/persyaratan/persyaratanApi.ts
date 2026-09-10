import { apiMaster } from "../../lib/api";
import type {
  BuatPersyaratanPayload,
  FilterPersyaratan,
  MetaHalaman,
  Persyaratan,
  UbahPersyaratanPayload,
} from "./types";

/**
 * Modul jenis dokumen persyaratan — service Master (`bit_be_master`).
 * Membaca boleh siapa saja yang login; mutasi khusus ADMIN.
 */

export async function daftarPersyaratan(filter: FilterPersyaratan) {
  const params = Object.fromEntries(
    Object.entries(filter).filter(([, v]) => v !== "" && v !== undefined && v !== null),
  );

  const { data } = await apiMaster.get<{ data: Persyaratan[]; meta: MetaHalaman }>(
    "/persyaratan",
    { params },
  );
  return data;
}

export async function detailPersyaratan(id: number) {
  const { data } = await apiMaster.get<{ data: Persyaratan }>(`/persyaratan/${id}`);
  return data.data;
}

export async function buatPersyaratan(payload: BuatPersyaratanPayload) {
  const { data } = await apiMaster.post<{ data: Persyaratan }>("/persyaratan", payload);
  return data.data;
}

export async function ubahPersyaratan(id: number, payload: UbahPersyaratanPayload) {
  const { data } = await apiMaster.put<{ data: Persyaratan }>(
    `/persyaratan/${id}`,
    payload,
  );
  return data.data;
}

export async function hapusPersyaratan(id: number) {
  await apiMaster.delete(`/persyaratan/${id}`);
}
