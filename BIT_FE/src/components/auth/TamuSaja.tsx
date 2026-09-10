import { Navigate, Outlet, useSearchParams } from "react-router-dom";
import { useAuth } from "../../store/hooks";
import { tujuanAman, tujuanSetelahLogin } from "../../features/auth/types";

/**
 * Kebalikan RequireAuth: halaman login tidak perlu dibuka lagi oleh user
 * yang sesinya masih hidup — langsung dilempar ke dashboard-nya.
 * Selama sesi masih diperiksa, halaman tetap dirender supaya tidak berkedip.
 */
export default function TamuSaja() {
  const { user } = useAuth();
  const [params] = useSearchParams();

  if (user) {
    return (
      <Navigate to={tujuanAman(params.get("next"), tujuanSetelahLogin(user.roles))} replace />
    );
  }

  return <Outlet />;
}
