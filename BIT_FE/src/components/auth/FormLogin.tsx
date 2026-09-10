import { useState, type FormEvent } from "react";
import { Eye, EyeOff, KeyRound, Loader2, LogIn, Mail, ShieldCheck, UserRound } from "lucide-react";
import Alert from "../ui/Alert";
import { Field } from "../ui/Field";
import { useAppDispatch, useAuth } from "../../store/hooks";
import { bersihkanError, login } from "../../features/auth/authSlice";
import {
  LABEL_ROLE,
  ROLE_INTERNAL,
  type KodeRole,
  type ModeLogin,
  type PenggunaSesi,
} from "../../features/auth/types";

const PILIHAN: { mode: ModeLogin; label: string; ikon: typeof UserRound }[] = [
  { mode: "peserta", label: "Calon Peserta", ikon: UserRound },
  { mode: "internal", label: "Internal", ikon: ShieldCheck },
];

/**
 * Form login yang dipakai bersama oleh pop-up login di halaman publik dan
 * halaman /internal/login. Ketika `onGantiMode` diberikan, pilihan
 * "masuk sebagai" ikut ditampilkan.
 */
export default function FormLogin({
  mode,
  onGantiMode,
  onBerhasil,
  labelTombol = "Masuk ke Dashboard",
  autoFocus = false,
}: {
  mode: ModeLogin;
  onGantiMode?: (mode: ModeLogin) => void;
  /** `roleAkses` hanya terisi kalau user memilih role di mode internal. */
  onBerhasil: (user: PenggunaSesi, roleAkses?: KodeRole) => void;
  labelTombol?: string;
  autoFocus?: boolean;
}) {
  const dispatch = useAppDispatch();
  const { sedangLogin, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lihatSandi, setLihatSandi] = useState(false);
  const [roleAkses, setRoleAkses] = useState<KodeRole>("VERIFIKATOR");

  async function kirim(e: FormEvent) {
    e.preventDefault();
    const pilihanRole = mode === "internal" ? roleAkses : undefined;
    const hasil = await dispatch(login({ email, password, mode, roleAkses: pilihanRole }));
    if (login.fulfilled.match(hasil)) onBerhasil(hasil.payload, pilihanRole);
  }

  function gantiMode(baru: ModeLogin) {
    if (baru === mode) return;
    dispatch(bersihkanError());
    onGantiMode?.(baru);
  }

  return (
    <form className="space-y-4" onSubmit={kirim}>
      {onGantiMode && (
        <div>
          <p className="label">Masuk sebagai</p>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            {PILIHAN.map((p) => {
              const Ikon = p.ikon;
              const aktif = p.mode === mode;
              return (
                <button
                  key={p.mode}
                  type="button"
                  onClick={() => gantiMode(p.mode)}
                  aria-pressed={aktif}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    aktif
                      ? "bg-white text-brand-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Ikon size={16} /> {p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mode === "internal" && (
        <Alert tone="brand">
          Area khusus pemroses data (Verifikator, Lembaga Seleksi &amp; Admin).
        </Alert>
      )}

      {error && <Alert tone="danger">{error}</Alert>}

      <Field label={mode === "internal" ? "Email Internal" : "Email"} required>
        <div className="relative">
          {mode === "internal" ? (
            <ShieldCheck
              size={16}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
            />
          ) : (
            <Mail
              size={16}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
            />
          )}
          <input
            type="email"
            required
            autoFocus={autoFocus}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input pl-10"
            placeholder="nama@email.com"
            autoComplete="username"
          />
        </div>
      </Field>

      <Field label="Password" required>
        <div className="relative">
          <KeyRound
            size={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
          />
          <input
            type={lihatSandi ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input pr-11 pl-10"
            placeholder="Masukkan password"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setLihatSandi((v) => !v)}
            aria-label={lihatSandi ? "Sembunyikan password" : "Tampilkan password"}
            className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600"
          >
            {lihatSandi ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </Field>

      {mode === "internal" && (
        <Field
          label="Masuk Sebagai (Role Akses)"
          required
          hint="Harus sesuai role akun Anda di service RBAC."
        >
          <select
            className="input"
            value={roleAkses}
            onChange={(e) => setRoleAkses(e.target.value as KodeRole)}
          >
            {ROLE_INTERNAL.map((r) => (
              <option key={r} value={r}>
                {LABEL_ROLE[r]}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className="flex items-center justify-end">
        <a href="#" className="text-sm font-semibold text-brand-700 hover:underline">
          Lupa Password?
        </a>
      </div>

      <button
        type="submit"
        disabled={sedangLogin}
        className="btn btn-primary btn-lg w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {sedangLogin ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Memproses…
          </>
        ) : (
          <>
            <LogIn size={18} /> {labelTombol}
          </>
        )}
      </button>
    </form>
  );
}
