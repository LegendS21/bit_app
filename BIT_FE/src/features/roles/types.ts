import type { RoleRingkas } from "../users/types";

export type MenuRingkas = { id: number; nama: string; path: string | null };

export type Role = RoleRingkas & {
  deskripsi: string | null;
  is_active: boolean;
  /** Role bawaan sistem tidak bisa dihapus, diganti kodenya, atau dinonaktifkan. */
  bawaan_sistem: boolean;
  jumlah_user: number;
  menus: MenuRingkas[];
};

export type BarisAksesMenu = {
  menu_id: number;
  parent_id: number | null;
  kode: string;
  nama: string;
  path: string | null;
  icon: string | null;
  is_active: boolean;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
};

export type AksesMenuRole = {
  role: { id: number; kode: string; nama: string; bawaan_sistem: boolean };
  menus: BarisAksesMenu[];
};

export type BuatRolePayload = {
  kode: string;
  nama: string;
  deskripsi?: string;
  is_active?: boolean;
};

export type UbahRolePayload = Partial<BuatRolePayload>;

/** Hanya empat kolom flag yang dikirim balik ke backend. */
export type AksesDikirim = Pick<
  BarisAksesMenu,
  "menu_id" | "can_view" | "can_create" | "can_update" | "can_delete"
>;
