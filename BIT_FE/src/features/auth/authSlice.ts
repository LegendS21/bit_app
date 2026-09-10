import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { pesanError } from "../../lib/api";
import { simpanToken } from "../../lib/tokenStore";
import { loginRequest, logoutRequest, meRequest, refreshRequest } from "./authApi";
import {
  adalahInternal,
  LABEL_ROLE,
  type KodeRole,
  type ModeLogin,
  type PenggunaSesi,
} from "./types";

type StatusSesi = "awal" | "memuat" | "masuk" | "tamu";

type AuthState = {
  user: PenggunaSesi | null;
  /** "awal"/"memuat" = belum ketahuan; guard menunggu sampai salah satu selesai. */
  status: StatusSesi;
  sedangLogin: boolean;
  error: string | null;
};

const initialState: AuthState = {
  user: null,
  status: "awal",
  sedangLogin: false,
  error: null,
};

/**
 * Dipanggil sekali saat aplikasi dimuat: tukar cookie refresh dengan access
 * token baru. Gagal = memang belum login, bukan error yang perlu ditampilkan.
 */
export const muatSesi = createAsyncThunk("auth/muatSesi", async (_, { rejectWithValue }) => {
  try {
    const sesi = await refreshRequest();
    return sesi.user;
  } catch {
    return rejectWithValue(null);
  }
});

export const login = createAsyncThunk<
  PenggunaSesi,
  { email: string; password: string; mode: ModeLogin; roleAkses?: KodeRole },
  { rejectValue: string }
>("auth/login", async ({ email, password, mode, roleAkses }, { rejectWithValue }) => {
  try {
    const sesi = await loginRequest(email, password);
    const { roles } = sesi.user;

    // Pilihan di form harus cocok dengan role akunnya. Kalau tidak, sesi yang
    // baru terbit langsung dicabut lagi supaya tidak ada token menganggur di
    // browser. Ini kenyamanan, bukan pengamanan — backend tetap yang menentukan
    // endpoint mana yang boleh diakses role apa.
    const tolak = async (pesan: string) => {
      await logoutRequest().catch(() => {});
      simpanToken(null);
      return rejectWithValue(pesan);
    };

    if (mode === "internal" && !adalahInternal(roles)) {
      return tolak("Akun ini bukan akun pengguna internal. Gunakan pilihan Calon Peserta.");
    }
    if (mode === "peserta" && !roles.includes("APPLICANT")) {
      return tolak("Akun ini terdaftar sebagai pengguna internal. Gunakan pilihan Internal.");
    }
    if (roleAkses && !roles.includes(roleAkses)) {
      return tolak(`Akun ini tidak punya akses sebagai ${LABEL_ROLE[roleAkses]}.`);
    }

    return sesi.user;
  } catch (error) {
    return rejectWithValue(pesanError(error, "Gagal masuk. Coba lagi."));
  }
});

/**
 * Ambil ulang profil dari server tanpa menyentuh token. Dipakai setelah user
 * mengubah datanya sendiri lewat halaman lain, supaya nama yang tampil di
 * sidebar/menu ikut berubah tanpa perlu memuat ulang halaman.
 */
export const segarkanProfil = createAsyncThunk("auth/segarkanProfil", async () => {
  return meRequest();
});

export const logout = createAsyncThunk("auth/logout", async () => {
  // Kegagalan logout di server tidak boleh menahan user keluar dari UI.
  await logoutRequest().catch(() => {});
  simpanToken(null);
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /** Dipakai saat interceptor menyerah memulihkan sesi (refresh gagal). */
    sesiHabis(state) {
      state.user = null;
      state.status = "tamu";
    },
    bersihkanError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(muatSesi.pending, (state) => {
        state.status = "memuat";
      })
      .addCase(muatSesi.fulfilled, (state, action: PayloadAction<PenggunaSesi>) => {
        state.user = action.payload;
        state.status = "masuk";
      })
      .addCase(muatSesi.rejected, (state) => {
        state.user = null;
        state.status = "tamu";
      })

      .addCase(login.pending, (state) => {
        state.sedangLogin = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.sedangLogin = false;
        state.user = action.payload;
        state.status = "masuk";
      })
      .addCase(login.rejected, (state, action) => {
        state.sedangLogin = false;
        state.user = null;
        state.status = "tamu";
        state.error = action.payload ?? "Gagal masuk. Coba lagi.";
      })

      .addCase(segarkanProfil.fulfilled, (state, action) => {
        state.user = action.payload;
      })

      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.status = "tamu";
        state.error = null;
      });
  },
});

export const { sesiHabis, bersihkanError } = authSlice.actions;
export default authSlice.reducer;
