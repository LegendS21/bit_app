import { Link, useNavigate } from "react-router-dom";
import { Send, UserPlus } from "lucide-react";
import AuthShell from "../../components/AuthShell";
import Alert from "../../components/ui/Alert";
import { Field } from "../../components/ui/Field";

export default function RegisterPeserta() {
  const navigate = useNavigate();

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
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          navigate("/login");
        }}
      >
        <Field label="Nomor Induk Kependudukan (NIK)" required>
          <input
            type="text"
            inputMode="numeric"
            maxLength={16}
            className="input font-mono tracking-wider"
            placeholder="16 digit NIK sesuai KTP"
          />
        </Field>

        <Field label="Nama Lengkap" required>
          <input type="text" className="input" placeholder="Sesuai KTP" />
        </Field>

        <Field
          label="Alamat Email Aktif"
          required
          hint="Username dan password sementara akan dikirim ke email ini."
        >
          <input type="email" className="input" placeholder="nama@email.com" />
        </Field>

        <Alert tone="brand">
          Pastikan NIK dan email benar. Data ini dipakai untuk verifikasi
          identitas pada tahap seleksi administrasi.
        </Alert>

        <button type="submit" className="btn btn-primary btn-lg w-full">
          <Send size={18} /> Daftar &amp; Kirim Kredensial
        </button>
      </form>
    </AuthShell>
  );
}
