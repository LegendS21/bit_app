/** Tab navigasi antar halaman pada grup Data Master & Setting System. */

export const MASTER_NAV = [
  { to: "/admin/master/beasiswa", label: "CRUD Beasiswa Pelatihan" },
  { to: "/admin/master/persyaratan", label: "CRUD Persyaratan" },
];

export const SETTING_NAV = [
  { to: "/admin/pengaturan/users", label: "CRUD Users Internal" },
  { to: "/admin/pengaturan/role", label: "CRUD Role & Akses Menu" },
  { to: "/admin/pengaturan/menu", label: "CRUD Menu System" },
];

/** Konteks yang dibagikan InternalLayout ke halaman anaknya. */
export type InternalContext = { badge: string };
