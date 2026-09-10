import { apiMaster } from "../../lib/api";
import type {
  Beasiswa,
  BeasiswaPublik,
  BuatBeasiswaPayload,
  DaftarSyaratProgram,
  FilterBeasiswa,
  ItemSyaratPayload,
  MetaHalaman,
  MetaKatalog,
  UbahBeasiswaPayload,
} from "./types";

/**
 * Modul data beasiswa pelatihan — service Master (`bit_be_master`), bukan RBAC.
 * Membaca boleh siapa saja yang login; mutasi khusus ADMIN.
 */

/**
 * GET /beasiswa/publik — katalog untuk landing page.
 *
 * Satu-satunya endpoint Master yang jalan **tanpa token**, jadi aman dipanggil
 * dari halaman depan. Yang dikembalikan hanya program berstatus AKTIF yang
 * tenggat pendaftarannya belum lewat, lengkap dengan daftar persyaratannya.
 */
export async function katalogPublik() {
  const { data } = await apiMaster.get<{ data: BeasiswaPublik[]; meta: MetaKatalog }>(
    "/beasiswa/publik",
  );
  return data;
}

export async function daftarBeasiswa(filter: FilterBeasiswa) {
  // Kolom kosong tidak dikirim supaya tidak dianggap filter oleh backend.
  const params = Object.fromEntries(
    Object.entries(filter).filter(([, v]) => v !== "" && v !== undefined && v !== null),
  );

  const { data } = await apiMaster.get<{ data: Beasiswa[]; meta: MetaHalaman }>(
    "/beasiswa",
    { params },
  );
  return data;
}

export async function detailBeasiswa(id: number) {
  const { data } = await apiMaster.get<{ data: Beasiswa }>(`/beasiswa/${id}`);
  return data.data;
}

export async function buatBeasiswa(payload: BuatBeasiswaPayload) {
  const { data } = await apiMaster.post<{ data: Beasiswa }>("/beasiswa", payload);
  return data.data;
}

export async function ubahBeasiswa(id: number, payload: UbahBeasiswaPayload) {
  const { data } = await apiMaster.put<{ data: Beasiswa }>(`/beasiswa/${id}`, payload);
  return data.data;
}

export async function hapusBeasiswa(id: number) {
  await apiMaster.delete(`/beasiswa/${id}`);
}

/* ---------- Persyaratan yang berlaku untuk sebuah program ---------- */

export async function daftarSyaratProgram(beasiswaId: number) {
  const { data } = await apiMaster.get<{ data: DaftarSyaratProgram }>(
    `/beasiswa/${beasiswaId}/persyaratan`,
  );
  return data.data;
}

/**
 * Daftarnya dikirim utuh — apa yang dikirim itulah isinya setelah disimpan,
 * jadi yang dihilangkan dari array ikut dilepas. Urutan array menentukan
 * urutan tampilnya.
 */
export async function simpanSyaratProgram(beasiswaId: number, items: ItemSyaratPayload[]) {
  const { data } = await apiMaster.put<{ data: DaftarSyaratProgram }>(
    `/beasiswa/${beasiswaId}/persyaratan`,
    { items },
  );
  return data.data;
}

export async function lepasSyaratProgram(beasiswaId: number, persyaratanId: number) {
  const { data } = await apiMaster.delete<{ data: DaftarSyaratProgram }>(
    `/beasiswa/${beasiswaId}/persyaratan/${persyaratanId}`,
  );
  return data.data;
}
