import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LogIn } from "lucide-react";
import Modal from "../ui/Modal";
import FormLogin from "./FormLogin";
import { useAppDispatch } from "../../store/hooks";
import { bersihkanError } from "../../features/auth/authSlice";
import {
  DASHBOARD,
  tujuanAman,
  tujuanSetelahLogin,
  type ModeLogin,
} from "../../features/auth/types";

/**
 * Pop-up login, mengikuti mockup (`#loginModal` pada 1_index.html) —
 * login peserta muncul di atas halaman utama, bukan halaman tersendiri.
 * Kemunculannya dikendalikan route `/login` supaya tetap bisa di-bookmark
 * dan bisa jadi tujuan redirect saat sesi habis.
 */
export default function LoginModal({ open }: { open: boolean }) {
  const [mode, setMode] = useState<ModeLogin>("peserta");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Error dari percobaan sebelumnya jangan ikut muncul saat modal dibuka lagi.
  useEffect(() => {
    if (open) dispatch(bersihkanError());
  }, [open, dispatch]);

  function tutup() {
    navigate("/", { replace: true });
  }

  return (
    <Modal
      open={open}
      onClose={tutup}
      title="Login Masuk"
      subtitle="Portal Pendaftaran Beasiswa Pelatihan"
      icon={<LogIn size={20} />}
      footer={
        <p className="w-full text-center text-xs text-slate-500">
          Belum punya akun?{" "}
          <Link
            to="/daftar"
            className="font-bold text-brand-700 hover:underline"
            onClick={tutup}
          >
            Daftar di sini
          </Link>
        </p>
      }
    >
      <FormLogin
        autoFocus
        mode={mode}
        onGantiMode={setMode}
        labelTombol="Masuk ke Dashboard"
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
    </Modal>
  );
}
