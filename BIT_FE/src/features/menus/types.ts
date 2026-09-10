export type MenuSystem = {
  id: number;
  parent_id: number | null;
  kode: string;
  nama: string;
  path: string | null;
  icon: string | null;
  urutan: number;
  is_active: boolean;
  /** Menu yang dipakai guard hak akses backend — tidak bisa dihapus/dinonaktifkan. */
  bawaan_sistem: boolean;
  jumlah_anak: number;
  /** Berapa role yang punya hak akses ke menu ini. */
  jumlah_role: number;
};

export type BuatMenuPayload = {
  kode: string;
  nama: string;
  path?: string;
  icon?: string;
  parent_id?: number | null;
  urutan?: number;
  is_active?: boolean;
};

export type UbahMenuPayload = Partial<BuatMenuPayload>;

export type HasilHapusMenu = {
  id: number;
  kode: string;
  hak_akses_terhapus: number;
};
