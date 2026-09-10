import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogIn,
  Mail,
  Phone,
  Send,
  UserPlus,
  UserRound,
} from "lucide-react";
import AuthShell from "../../components/AuthShell";
import Alert from "../../components/ui/Alert";
import { Field } from "../../components/ui/Field";
import { registerRequest } from "../../features/auth/authApi";
import { pesanError } from "../../lib/api";

type Form = {
  nama: string;
  email: string;
  no_hp: string;
  password: string;
  konfirmasi_password: string;
};

const KOSONG: Form = {
  nama: "",
  email: "",
  no_hp: "",
  password: "",
  konfirmasi_password: "",
};

/**
 * Aturannya disamakan persis dengan `passwordBaru` di
 * `BIT_BE_RBAC/validators/authValidator.js`. Pemeriksaan di sini cuma supaya
 * pengguna dapat umpan balik langsung — backend tetap yang menegakkan.
 */
const SYARAT: { uji: (v: string) => boolean; teks: string }[] = [
  { uji: (v) => v.length >= 8, teks: "Minimal 8 karakter" },
  { uji: (v) => /[a-z]/.test(v), teks: "Ada huruf kecil" },
  { uji: (v) => /[A-Z]/.test(v), teks: "Ada huruf besar" },
  { uji: (v) => /[0-9]/.test(v), teks: "Ada angka" },
];

function periksa(form: Form): Partial<Record<keyof Form, string>> {
  const galat: Partial<Record<keyof Form, string>> = {};

  if (!form.nama.trim()) galat.nama = "Nama lengkap wajib diisi";
  if (!form.email.trim()) galat.email = "Email wajib diisi";

  if (form.no_hp && !/^[0-9+\-\s]*$/.test(form.no_hp)) {
    galat.no_hp = "Nomor HP hanya boleh angka, spasi, + dan -";
  }

  const belumTerpenuhi = SYARAT.filter((s) => !s.uji(form.password));
  if (belumTerpenuhi.length) galat.password = "Password belum memenuhi syarat di bawah";

  if (form.konfirmasi_password !== form.password) {
    galat.konfirmasi_password = "Konfirmasi password tidak sama";
  }

  return galat;
}

export default function RegisterPeserta() {
  const [form, setForm] = useState<Form>(KOSONG);
  const [galat, setGalat] = useState<Partial<Record<keyof Form, string>>>({});
  const [error, setError] = useState("");
  const [sedangKirim, setSedangKirim] = useState(false);
  const [berhasil, setBerhasil] = useState<{ nama: string; email: string } | null>(null);
  const [lihatSandi, setLihatSandi] = useState(false);

  const ubah = (kolom: keyof Form) => (nilai: string) => {
    setForm((f) => ({ ...f, [kolom]: nilai }));
    // Pesan galat kolom ini dibuang begitu diperbaiki, biar tidak mengganggu.
    setGalat((g) => (g[kolom] ? { ...g, [kolom]: undefined } : g));
  };

  async function kirim(e: FormEvent) {
    e.preventDefault();
    setError("");

    const hasilPeriksa = periksa(form);
    setGalat(hasilPeriksa);
    if (Object.values(hasilPeriksa).some(Boolean)) return;

    setSedangKirim(true);
    try {
      const akun = await registerRequest({
        nama: form.nama,
        email: form.email,
        password: form.password,
        konfirmasi_password: form.konfirmasi_password,
        // Kolom opsional; jangan kirim string kosong.
        ...(form.no_hp.trim() ? { no_hp: form.no_hp.trim() } : {}),
      });
      setBerhasil({ nama: akun.nama, email: akun.email });
    } catch (err) {
      setError(pesanError(err, "Pendaftaran gagal. Coba lagi sebentar lagi."));
    } finally {
      setSedangKirim(false);
    }
  }

  /* ---------------- Setelah berhasil ---------------- */
  if (berhasil) {
    return (
      <AuthShell
        icon={CheckCircle2}
        title="Pendaftaran Berhasil"
        subtitle="Akun Anda sudah aktif dan siap dipakai"
      >
        <div className="space-y-4">
          <Alert tone="success">
            Akun untuk <strong>{berhasil.nama}</strong> berhasil dibuat.
          </Alert>

          <p className="text-sm text-slate-600">
            Masuk memakai email <strong className="break-all">{berhasil.email}</strong> dan
            password yang baru saja Anda buat. Setelah login, pilih program pelatihan lalu
            isi formulir pendaftaran secara bertahap.
          </p>

          <Link to="/login" className="btn btn-primary btn-lg w-full">
            <LogIn size={18} /> Login Sekarang
          </Link>
        </div>
      </AuthShell>
    );
  }

  /* ---------------- Formulir ---------------- */
  return (
    <AuthShell
      icon={UserPlus}
      title="Daftar Akun Peserta"
      subtitle="Satu akun untuk satu program pelatihan"
      footer={
        <p className="text-xs text-slate-500">
          Sudah punya akun?{" "}
          <Link to="/login" className="font-bold text-brand-700 hover:underline">
            Login di sini
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={kirim} noValidate>
        {error && <Alert tone="danger">{error}</Alert>}

        <Field label="Nama Lengkap" required error={galat.nama} hint="Sesuai KTP.">
          <div className="relative">
            <UserRound
              size={16}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              autoFocus
              maxLength={150}
              value={form.nama}
              onChange={(e) => ubah("nama")(e.target.value)}
              className="input pl-10"
              placeholder="Nama sesuai KTP"
              autoComplete="name"
            />
          </div>
        </Field>

        <Field
          label="Alamat Email Aktif"
          required
          error={galat.email}
          hint="Dipakai untuk login. Pastikan masih aktif."
        >
          <div className="relative">
            <Mail
              size={16}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
            />
            <input
              type="email"
              maxLength={150}
              value={form.email}
              onChange={(e) => ubah("email")(e.target.value)}
              className="input pl-10"
              placeholder="nama@email.com"
              autoComplete="email"
            />
          </div>
        </Field>

        <Field label="Nomor HP" error={galat.no_hp} hint="Opsional.">
          <div className="relative">
            <Phone
              size={16}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
            />
            <input
              type="tel"
              maxLength={20}
              value={form.no_hp}
              onChange={(e) => ubah("no_hp")(e.target.value)}
              className="input pl-10"
              placeholder="08xxxxxxxxxx"
              autoComplete="tel"
            />
          </div>
        </Field>

        <Field label="Password" required error={galat.password}>
          <div className="relative">
            <KeyRound
              size={16}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
            />
            <input
              type={lihatSandi ? "text" : "password"}
              maxLength={128}
              value={form.password}
              onChange={(e) => ubah("password")(e.target.value)}
              className="input pr-11 pl-10"
              placeholder="Buat password"
              autoComplete="new-password"
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

        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {SYARAT.map((s) => {
            const lulus = s.uji(form.password);
            return (
              <li
                key={s.teks}
                className={`flex items-center gap-1.5 text-xs font-medium ${
                  lulus ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                <CheckCircle2 size={13} className="shrink-0" />
                {s.teks}
              </li>
            );
          })}
        </ul>

        <Field label="Ulangi Password" required error={galat.konfirmasi_password}>
          <div className="relative">
            <KeyRound
              size={16}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
            />
            <input
              type={lihatSandi ? "text" : "password"}
              maxLength={128}
              value={form.konfirmasi_password}
              onChange={(e) => ubah("konfirmasi_password")(e.target.value)}
              className="input pl-10"
              placeholder="Ketik ulang password"
              autoComplete="new-password"
            />
          </div>
        </Field>

        <Alert tone="brand">
          Halaman ini khusus <strong>Calon Peserta</strong>. Akun Verifikator, Lembaga
          Seleksi, dan Administrator dibuatkan oleh Admin.
        </Alert>

        <button
          type="submit"
          disabled={sedangKirim}
          className="btn btn-primary btn-lg w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sedangKirim ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Mendaftarkan…
            </>
          ) : (
            <>
              <Send size={18} /> Daftar Sekarang
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
