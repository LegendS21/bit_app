import { Link } from "react-router-dom";
import { Home, LogOut, ShieldAlert } from "lucide-react";
import { useAppDispatch, useAuth } from "../store/hooks";
import { logout } from "../features/auth/authSlice";
import { tujuanSetelahLogin } from "../features/auth/types";

/** Tampil saat user sudah login tapi role-nya tidak berhak atas halaman itu. */
export default function TidakBerhak() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const beranda = user ? tujuanSetelahLogin(user.roles) : "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-brand-50 via-slate-100 to-brand-100 p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-10 text-center shadow-xl shadow-brand-900/10">
        <span className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <ShieldAlert size={40} strokeWidth={1.5} />
        </span>
        <p className="text-5xl font-extrabold tracking-tight text-rose-600">403</p>
        <h1 className="mt-3 text-xl font-bold text-slate-900">
          Anda tidak berhak membuka halaman ini
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Halaman ini hanya untuk peran tertentu.
          {user && (
            <>
              {" "}
              Akun <span className="font-semibold text-slate-700">{user.email}</span>{" "}
              terdaftar sebagai {user.roles.join(", ")}.
            </>
          )}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => dispatch(logout())}
            className="btn btn-outline"
          >
            <LogOut size={16} /> Keluar
          </button>
          <Link to={beranda} className="btn btn-primary">
            <Home size={16} /> Ke Dashboard Saya
          </Link>
        </div>
      </div>
    </div>
  );
}
