import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  UserCircle2,
} from "lucide-react";
import { logout } from "../features/auth/authSlice";
import { useAppDispatch, useAuth } from "../store/hooks";

export default function PesertaLayout() {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  async function keluar() {
    await dispatch(logout());
    navigate("/", { replace: true });
  }

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 bg-linear-to-r from-brand-600 to-brand-800 text-white shadow-lg shadow-brand-900/10">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link
            to="/peserta"
            className="flex items-center gap-2 text-lg font-extrabold tracking-tight"
          >
            <GraduationCap size={26} />
            BeasiswaApp
          </Link>

          <NavLink
            to="/peserta"
            end
            className={({ isActive }) =>
              `ml-4 hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition sm:flex ${
                isActive
                  ? "bg-white/20 text-white"
                  : "text-white/85 hover:bg-white/15"
              }`
            }
          >
            <LayoutDashboard size={16} /> Dashboard Saya
          </NavLink>

          <div className="relative ml-auto" ref={boxRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/50 px-3 py-2 text-sm font-semibold transition hover:bg-white/15"
            >
              <UserCircle2 size={18} />
              <span className="hidden sm:inline">{user?.nama}</span>
              <ChevronDown size={14} />
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-700 shadow-xl">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-bold text-slate-800">
                    {user?.nama}
                  </p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50"
                >
                  <UserCircle2 size={16} /> Profil Saya
                </button>
                <button
                  type="button"
                  onClick={keluar}
                  className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <LogOut size={16} /> Keluar (Logout)
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl grow px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500">
        &copy; 2026 Portal Aplikasi Pendaftaran Beasiswa Pelatihan
      </footer>
    </div>
  );
}
