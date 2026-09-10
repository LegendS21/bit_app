import { useNavigate, useSearchParams } from "react-router-dom";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import AuthShell from "../../components/AuthShell";
import FormLogin from "../../components/auth/FormLogin";
import { DASHBOARD, tujuanAman, tujuanSetelahLogin } from "../../features/auth/types";

/**
 * Login internal tetap halaman penuh (bukan pop-up): pintu masuk terpisah
 * untuk Verifikator, Lembaga Seleksi, dan Admin. Pop-up di halaman publik
 * juga menyediakan pilihan ini lewat tab "Internal".
 */
export default function LoginInternal() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  return (
    <AuthShell
      icon={ShieldCheck}
      title="Portal Internal"
      subtitle="Sistem Pengelola & Seleksi Beasiswa"
      footer={
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <BadgeCheck size={14} className="text-brand-600" />
          Akses terenkripsi &amp; ter-autentikasi
        </p>
      }
    >
      <FormLogin
        mode="internal"
        labelTombol="Masuk Dashboard"
        onBerhasil={(user, roleAkses) =>
          navigate(
            tujuanAman(
              params.get("next"),
              roleAkses ? DASHBOARD[roleAkses] : tujuanSetelahLogin(user.roles),
            ),
            { replace: true },
          )
        }
      />
    </AuthShell>
  );
}
