import { createBrowserRouter } from "react-router-dom";

import PublicLayout from "../layouts/PublicLayout";
import PesertaLayout from "../layouts/PesertaLayout";
import InternalLayout from "../layouts/InternalLayout";

import RequireAuth from "../components/auth/RequireAuth";
import TamuSaja from "../components/auth/TamuSaja";

import Landing from "../pages/public/Landing";
import RegisterPeserta from "../pages/public/RegisterPeserta";
import LoginInternal from "../pages/public/LoginInternal";

import PesertaDashboard from "../pages/peserta/Dashboard";
import FormulirWizard from "../pages/peserta/FormulirWizard";

import DaftarVerifikasi from "../pages/verifikator/DaftarVerifikasi";
import DetailVerifikasi from "../pages/verifikator/DetailVerifikasi";

import DaftarWawancara from "../pages/seleksi/DaftarWawancara";
import FormPenilaian from "../pages/seleksi/FormPenilaian";

import AdminDashboard from "../pages/admin/Dashboard";
import HasilSeleksi from "../pages/admin/HasilSeleksi";
import MasterBeasiswa from "../pages/admin/MasterBeasiswa";
import MasterPersyaratan from "../pages/admin/MasterPersyaratan";
import SettingUsers from "../pages/admin/SettingUsers";
import SettingRoles from "../pages/admin/SettingRoles";
import SettingMenu from "../pages/admin/SettingMenu";

import NotFoundPage from "../pages/NotFoundPage";

const router = createBrowserRouter([
  /* ---------------- Publik ----------------
     `/login` bukan halaman tersendiri: ia merender halaman utama dengan
     pop-up login terbuka (lihat PublicLayout), sesuai mockup. Tetap berupa
     route supaya bisa jadi tujuan redirect dari RequireAuth. */
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <Landing /> },
      {
        element: <TamuSaja />,
        children: [{ path: "/login", element: <Landing /> }],
      },
    ],
  },
  { path: "/daftar", element: <RegisterPeserta /> },
  {
    element: <TamuSaja />,
    children: [{ path: "/internal/login", element: <LoginInternal /> }],
  },

  /* ---------------- Calon Peserta ---------------- */
  {
    element: <RequireAuth roles={["APPLICANT"]} loginPath="/login" />,
    children: [
      {
        path: "/peserta",
        element: <PesertaLayout />,
        children: [
          { index: true, element: <PesertaDashboard /> },
          { path: "formulir/:id", element: <FormulirWizard /> },
        ],
      },
    ],
  },

  /* ---------------- Internal ----------------
     Dipisah per peran supaya satu peran tidak bisa membuka area peran lain
     hanya dengan mengetik alamatnya. */
  {
    element: <RequireAuth roles={["VERIFIKATOR"]} loginPath="/internal/login" />,
    children: [
      {
        element: <InternalLayout />,
        children: [
          { path: "/verifikator", element: <DaftarVerifikasi /> },
          { path: "/verifikator/:id", element: <DetailVerifikasi /> },
        ],
      },
    ],
  },
  {
    element: <RequireAuth roles={["LEMBAGA_SELEKSI"]} loginPath="/internal/login" />,
    children: [
      {
        element: <InternalLayout />,
        children: [
          { path: "/lembaga-seleksi", element: <DaftarWawancara /> },
          { path: "/lembaga-seleksi/:id", element: <FormPenilaian /> },
        ],
      },
    ],
  },
  {
    element: <RequireAuth roles={["ADMIN"]} loginPath="/internal/login" />,
    children: [
      {
        element: <InternalLayout />,
        children: [
          { path: "/admin", element: <AdminDashboard /> },
          { path: "/admin/hasil-seleksi", element: <HasilSeleksi /> },
          { path: "/admin/master/beasiswa", element: <MasterBeasiswa /> },
          { path: "/admin/master/persyaratan", element: <MasterPersyaratan /> },
          { path: "/admin/pengaturan/users", element: <SettingUsers /> },
          { path: "/admin/pengaturan/role", element: <SettingRoles /> },
          { path: "/admin/pengaturan/menu", element: <SettingMenu /> },
        ],
      },
    ],
  },

  /* ---------------- Fallback ---------------- */
  { path: "*", element: <NotFoundPage /> },
]);

export default router;
