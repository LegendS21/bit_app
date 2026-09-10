import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, type LucideIcon } from "lucide-react";

/** Kerangka halaman autentikasi (login peserta, daftar akun, login internal). */
export default function AuthShell({
  icon: Icon,
  title,
  subtitle,
  children,
  footer,
  backTo = "/",
  backLabel = "Kembali ke Halaman Utama",
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-brand-50 via-slate-100 to-brand-100 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl shadow-brand-900/10">
        <div className="bg-linear-to-br from-brand-600 to-brand-800 px-6 py-8 text-center text-white">
          <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur">
            <Icon size={30} />
          </span>
          <h1 className="text-xl font-extrabold">{title}</h1>
          <p className="mt-1 text-sm text-white/70">{subtitle}</p>
        </div>

        <div className="p-6">{children}</div>

        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-center">
          {footer}
          <Link
            to={backTo}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700"
          >
            <ArrowLeft size={14} /> {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
