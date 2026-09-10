import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../store/hooks";
import TidakBerhak from "../../pages/TidakBerhak";
import type { KodeRole } from "../../features/auth/types";

/**
 * Penjaga route. Selama sesi belum ketahuan (masih menukar cookie refresh)
 * halaman ditahan dulu — tanpa ini, user yang sudah login akan sempat
 * terlempar ke halaman login setiap kali me-refresh browser.
 *
 * Ini hanya penjaga tampilan. Otorisasi yang mengikat tetap di backend:
 * setiap endpoint memverifikasi token dan role-nya sendiri.
 */
export default function RequireAuth({
  roles = [],
  loginPath = "/login",
}: {
  roles?: KodeRole[];
  loginPath?: string;
}) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "awal" || status === "memuat") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
          <Loader2 size={20} className="animate-spin text-brand-600" />
          Memeriksa sesi…
        </div>
      </div>
    );
  }

  if (!user) {
    const tujuan = `${location.pathname}${location.search}`;
    return <Navigate to={`${loginPath}?next=${encodeURIComponent(tujuan)}`} replace />;
  }

  if (roles.length > 0 && !roles.some((r) => user.roles.includes(r))) {
    return <TidakBerhak />;
  }

  return <Outlet />;
}
