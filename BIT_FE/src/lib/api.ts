import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { ambilToken, picuSesiHabis, simpanToken } from "./tokenStore";

/**
 * Semua request lewat `bit_be_gateway` — satu alamat untuk keempat service.
 * Gateway yang memilah tujuannya dari segmen pertama setelah `/api`
 * (`/api/auth` → RBAC, `/api/beasiswa` → Master, dan seterusnya), jadi jalur
 * yang ditulis di seluruh `features/` tidak berubah sama sekali.
 *
 * Nilainya sengaja **relatif**, bukan alamat absolut. Vite memanggang
 * `import.meta.env` ke dalam bundel saat build, jadi alamat absolut akan
 * mengunci hasil build ke satu host. Dengan path relatif, FE memanggil origin
 * yang sama dengan yang menyajikannya — sehingga tidak ada preflight CORS
 * sama sekali dan cookie refresh token tetap first-party.
 */
const URL_API = import.meta.env.VITE_API_URL ?? "/api";

type RequestUlang = InternalAxiosRequestConfig & { _ulangi?: boolean };

export type ApiError = { message: string; code?: string };

/** Ambil pesan error yang layak ditampilkan ke user dari response backend. */
export function pesanError(error: unknown, fallback = "Terjadi kesalahan pada sistem"): string {
  const err = error as AxiosError<ApiError>;
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === "ERR_NETWORK") return "Tidak dapat terhubung ke server. Pastikan service berjalan.";
  return fallback;
}

export function kodeError(error: unknown): string | undefined {
  return (error as AxiosError<ApiError>)?.response?.data?.code;
}

/** Endpoint yang tidak boleh memicu auto-refresh (kalau gagal ya memang gagal). */
const TANPA_AUTO_REFRESH = ["/auth/login", "/auth/refresh", "/auth/logout"];

/**
 * Bikin klien untuk satu service. Semua klien berbagi access token yang sama
 * (terbitan RBAC) dan perilaku auto-refresh yang sama — token 15 menit bisa
 * kedaluwarsa di tengah request ke service mana pun.
 */
function buatKlien(baseURL: string): AxiosInstance {
  const klien = axios.create({
    baseURL,
    // Tetap wajib: saat FE dijalankan `npm run dev` di :5173 sementara gateway
    // di :3000, cookie refresh token hanya ikut terkirim kalau ini menyala.
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
  });

  klien.interceptors.request.use((config) => {
    const token = ambilToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Unggahan berkas dikirim sebagai FormData. Header bawaan JSON harus
    // dilepas supaya axios memasang multipart/form-data lengkap dengan
    // boundary-nya sendiri.
    if (config.data instanceof FormData) delete config.headers["Content-Type"];

    return config;
  });

  klien.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as RequestUlang | undefined;
      const url = config?.url ?? "";

      const bisaDicoba =
        error.response?.status === 401 &&
        config &&
        !config._ulangi &&
        !TANPA_AUTO_REFRESH.some((p) => url.includes(p));

      if (!bisaDicoba) return Promise.reject(error);

      config._ulangi = true;
      try {
        const sesi = await refreshSesi();
        config.headers.Authorization = `Bearer ${sesi.access_token}`;
        // Diulang lewat klien yang sama supaya baseURL-nya tetap benar.
        return klien(config);
      } catch {
        // Refresh pun gagal → sesi benar-benar habis.
        picuSesiHabis();
        return Promise.reject(error);
      }
    },
  );

  return klien;
}

/**
 * Satu klien untuk semuanya, karena kini hanya ada satu alamat.
 *
 * Keempat nama di bawah sengaja dipertahankan sebagai alias supaya tidak ada
 * satu pun file di `features/` yang perlu diubah — dan supaya tetap terbaca
 * service mana yang sedang dipanggil.
 */
const klien = buatKlien(URL_API);

/** Service RBAC: auth, users, roles, menus. */
export const api = klien;

/** Service Master: beasiswa & data acuan. */
export const apiMaster = klien;

/** Service Transaksi: permohonan, verifikasi, wawancara, hasil. */
export const apiTransaksi = klien;

/** Service Dokumen: unggah & akses berkas persyaratan. */
export const apiDokumen = klien;

/** Bentuk body sukses dari /auth/login dan /auth/refresh. */
export type SesiPayload<TUser = unknown> = {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: TUser;
};

/**
 * Satu proses refresh dipakai bersama semua request yang kebetulan kedaluwarsa
 * berbarengan — termasuk lintas service. Rotasi ganda akan terbaca backend
 * sebagai pemakaian ulang token.
 */
let refreshBerjalan: Promise<SesiPayload> | null = null;

export async function refreshSesi<TUser = unknown>(): Promise<SesiPayload<TUser>> {
  if (!refreshBerjalan) {
    refreshBerjalan = jalankanRefresh().finally(() => {
      refreshBerjalan = null;
    });
  }
  return refreshBerjalan as Promise<SesiPayload<TUser>>;
}

async function jalankanRefresh(percobaan = 0): Promise<SesiPayload> {
  try {
    // Refresh token hanya dikenal RBAC, jadi selalu lewat klien RBAC.
    const { data } = await api.post<{ data: SesiPayload }>("/auth/refresh");
    simpanToken(data.data.access_token);
    return data.data;
  } catch (error) {
    // REFRESH_RETRY = tab lain baru saja merotasi token. Cookie di browser
    // sudah berisi token baru, jadi cukup ulangi sekali setelah jeda singkat.
    if (kodeError(error) === "REFRESH_RETRY" && percobaan < 2) {
      await new Promise((r) => setTimeout(r, 400));
      return jalankanRefresh(percobaan + 1);
    }
    throw error;
  }
}
