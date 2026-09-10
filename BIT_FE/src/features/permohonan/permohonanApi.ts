import { apiDokumen, apiTransaksi } from "../../lib/api";
import type {
  FilterPermohonan,
  HasilAkhirPayload,
  MetaHalaman,
  PermohonanLengkap,
  PermohonanRingkas,
  Statistik,
  Step1Payload,
  Step2Payload,
  VerifikasiPayload,
  WawancaraPayload,
} from "./types";

/**
 * Modul permohonan — service Transaksi (`bit_be_transaksi`).
 *
 * Semua endpoint mutasi mengembalikan detail permohonan yang sudah diperbarui,
 * jadi pemanggil tidak perlu memuat ulang setelah menyimpan.
 */

/** Permohonan milik pengguna yang sedang login. */
export async function permohonanSaya() {
  const { data } = await apiTransaksi.get<{ data: PermohonanRingkas[]; meta: MetaHalaman }>(
    "/permohonan/saya",
    { params: { limit: 50 } },
  );
  return data.data;
}

export async function detailPermohonan(id: number) {
  const { data } = await apiTransaksi.get<{ data: PermohonanLengkap }>(`/permohonan/${id}`);
  return data.data;
}

/** Membuat draft untuk satu program. Kode permohonan dirakit backend. */
export async function buatPermohonan(beasiswaId: number) {
  const { data } = await apiTransaksi.post<{ data: PermohonanRingkas }>("/permohonan", {
    beasiswa_id: beasiswaId,
  });
  return data.data;
}

export async function simpanStep1(id: number, payload: Step1Payload) {
  const { data } = await apiTransaksi.put<{ data: PermohonanLengkap }>(
    `/permohonan/${id}/step-1`,
    payload,
  );
  return data.data;
}

export async function simpanStep2(id: number, payload: Step2Payload) {
  const { data } = await apiTransaksi.put<{ data: PermohonanLengkap }>(
    `/permohonan/${id}/step-2`,
    payload,
  );
  return data.data;
}

export async function simpanStep4(id: number, isSetuju: boolean) {
  const { data } = await apiTransaksi.put<{ data: PermohonanLengkap }>(
    `/permohonan/${id}/step-4`,
    { is_setuju: isSetuju },
  );
  return data.data;
}

export async function kirimPermohonan(id: number) {
  const { data } = await apiTransaksi.post<{ data: PermohonanLengkap }>(
    `/permohonan/${id}/submit`,
  );
  return data.data;
}

/**
 * Unggah satu berkas persyaratan.
 *
 * Dua langkah, dan urutannya tidak bisa dibalik: berkasnya lebih dulu masuk ke
 * service Dokumen (yang memeriksa magic bytes lalu memindainya), baru
 * `dokumen_uuid` yang diterbitkan dicatat sebagai isian langkah 3 di service
 * Transaksi. Service Transaksi memang tidak pernah menyentuh file.
 */
export async function unggahDokumen(
  permohonanId: number,
  kodePermohonan: string,
  persyaratanId: number,
  berkas: File,
) {
  const form = new FormData();
  form.append("berkas", berkas);
  form.append("kode_permohonan", kodePermohonan);
  form.append("persyaratan_id", String(persyaratanId));

  const { data: hasilUnggah } = await apiDokumen.post<{
    data: { id: string; nama_file_asli: string; ukuran_byte: number };
  }>("/dokumen/upload", form);

  const { data } = await apiTransaksi.post<{ data: PermohonanLengkap }>(
    `/permohonan/${permohonanId}/step-3`,
    {
      persyaratan_id: persyaratanId,
      dokumen_uuid: hasilUnggah.data.id,
      nama_file_asli: hasilUnggah.data.nama_file_asli,
      ukuran_byte: hasilUnggah.data.ukuran_byte,
    },
  );
  return data.data;
}

/**
 * Lepas satu berkas dari permohonan. Berkas di service Dokumen ikut dihapus
 * (soft delete) supaya tidak tertinggal tanpa ada yang menunjuknya.
 */
export async function hapusDokumen(
  permohonanId: number,
  persyaratanId: number,
  dokumenUuid: string,
) {
  const { data } = await apiTransaksi.delete<{ data: PermohonanLengkap }>(
    `/permohonan/${permohonanId}/step-3/${persyaratanId}`,
  );

  // Dijalankan setelah kaitannya lepas. Kalau gagal, permohonan tetap benar —
  // yang tertinggal cuma satu baris di service Dokumen, dan itu urusan
  // pembersihan berkala, bukan alasan menggagalkan aksi pengguna.
  try {
    await apiDokumen.delete(`/dokumen/${dokumenUuid}`);
  } catch {
    // sengaja diabaikan
  }

  return data.data;
}

/**
 * Tautan sementara untuk melihat berkas yang sudah diunggah. Sekali pakai dan
 * berumur pendek, jadi selalu diminta baru saat pengguna menekan "Lihat".
 */
export async function tautanBerkas(dokumenUuid: string) {
  const { data } = await apiDokumen.post<{ data: { url: string; token: string } }>(
    `/dokumen/${dokumenUuid}/presigned`,
    {},
  );
  return `${apiDokumen.defaults.baseURL}${data.data.url}`;
}

/* ------------------------------------------------------------------ *
 * Untuk pengguna internal
 * ------------------------------------------------------------------ */

/**
 * Antrean kerja verifikator / lembaga seleksi / admin.
 *
 * `tahap` adalah pintasan: backend yang memetakannya ke kumpulan status yang
 * relevan, jadi tiap halaman tidak perlu menghafal daftar statusnya sendiri.
 * Permohonan berstatus DRAFT tidak pernah ikut — itu isian yang belum dikirim
 * pemiliknya.
 */
export async function daftarPermohonan(filter: FilterPermohonan) {
  const params = Object.fromEntries(
    Object.entries(filter).filter(([, v]) => v !== "" && v !== undefined && v !== null),
  );

  const { data } = await apiTransaksi.get<{ data: PermohonanRingkas[]; meta: MetaHalaman }>(
    "/permohonan",
    { params },
  );
  return data;
}

export async function statistik(beasiswaId?: number) {
  const { data } = await apiTransaksi.get<{ data: Statistik }>("/dashboard/statistik", {
    params: beasiswaId ? { beasiswa_id: beasiswaId } : undefined,
  });
  return data.data;
}

/** Putusan seleksi administrasi — VERIFIKATOR. */
export async function simpanVerifikasi(id: number, payload: VerifikasiPayload) {
  const { data } = await apiTransaksi.post<{ data: PermohonanLengkap }>(
    `/permohonan/${id}/verifikasi`,
    payload,
  );
  return data.data;
}

/** Penilaian wawancara — LEMBAGA_SELEKSI. */
export async function simpanWawancara(id: number, payload: WawancaraPayload) {
  const { data } = await apiTransaksi.post<{ data: PermohonanLengkap }>(
    `/permohonan/${id}/wawancara`,
    payload,
  );
  return data.data;
}

/** Penetapan hasil akhir — ADMIN. */
export async function tetapkanHasilAkhir(id: number, payload: HasilAkhirPayload) {
  const { data } = await apiTransaksi.post<{ data: PermohonanLengkap }>(
    `/permohonan/${id}/hasil-akhir`,
    payload,
  );
  return data.data;
}
