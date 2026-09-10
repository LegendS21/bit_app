import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { GraduationCap, Menu, ShieldCheck, X } from "lucide-react";
import LoginModal from "../components/auth/LoginModal";

const NAV = [
  { href: "#beranda", label: "Beranda" },
  { href: "#program", label: "Program Beasiswa" },
  { href: "#persyaratan", label: "Persyaratan Umum" },
  { href: "#alur", label: "Alur Pendaftaran" },
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-40 bg-linear-to-r from-brand-600 to-brand-800 text-white shadow-lg shadow-brand-900/10">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-extrabold tracking-tight"
          >
            <GraduationCap size={26} />
            BeasiswaApp
          </Link>

          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/15 hover:text-white"
              >
                {n.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-2 lg:ml-4 lg:flex">
            <Link to="/login" className="btn btn-sm border-white/60 text-white hover:bg-white/15">
              Masuk
            </Link>
            <Link to="/daftar" className="btn btn-sm btn-white">
              Daftar Akun
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Buka menu"
            className="ml-auto cursor-pointer rounded-lg p-2 hover:bg-white/15 lg:hidden"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {open && (
          <div className="border-t border-white/15 bg-brand-800 px-4 py-3 lg:hidden">
            <nav className="flex flex-col gap-1">
              {NAV.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-white/85 hover:bg-white/10"
                >
                  {n.label}
                </a>
              ))}
            </nav>
            <div className="mt-3 flex gap-2">
              <Link
                to="/login"
                className="btn btn-sm flex-1 border-white/60 text-white hover:bg-white/15"
              >
                Masuk
              </Link>
              <Link to="/daftar" className="btn btn-sm btn-white flex-1">
                Daftar Akun
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="grow">
        <Outlet />
      </main>

      <footer className="bg-slate-900 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
          <div>
            <p className="flex items-center gap-2 text-base font-extrabold text-white">
              <GraduationCap size={22} /> BeasiswaApp
            </p>
            <p className="mt-2 max-w-xs text-sm text-slate-400">
              Portal pendaftaran beasiswa pelatihan bersertifikat — PT Bentang
              Inspirasi Teknologi.
            </p>
          </div>
          <div>
            <p className="mb-3 text-sm font-bold text-white">Tautan</p>
            <ul className="space-y-2 text-sm">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a href={n.href} className="hover:text-white">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-bold text-white">Akses Lain</p>
            <Link
              to="/internal/login"
              className="inline-flex items-center gap-2 text-sm hover:text-white"
            >
              <ShieldCheck size={16} /> Portal Internal (Pemroses)
            </Link>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-slate-500">
          &copy; 2026 Portal Aplikasi Pendaftaran Beasiswa Pelatihan. All rights
          reserved.
        </div>
      </footer>

      {/* Pop-up login — terbuka saat alamatnya /login */}
      <LoginModal open={pathname === "/login"} />
    </div>
  );
}
