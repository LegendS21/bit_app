'use strict';

require('dotenv').config();

/**
 * Struktur menu portal internal + hak akses awal tiap role.
 * Isinya mengikuti sidebar `InternalLayout` di BIT_FE, supaya nanti sidebar
 * bisa dibangun dari tabel ini alih-alih hardcode.
 */

const MENU = [
  { kode: 'VERIFIKASI_ADMIN', nama: 'Verifikasi Seleksi Administrasi', path: '/verifikator', icon: 'FileCheck2', urutan: 10 },
  { kode: 'PROSES_WAWANCARA', nama: 'Proses Wawancara', path: '/lembaga-seleksi', icon: 'MessagesSquare', urutan: 20 },
  { kode: 'ADMIN_DASHBOARD', nama: 'Dashboard', path: '/admin', icon: 'LayoutDashboard', urutan: 30 },
  { kode: 'ADMIN_HASIL_SELEKSI', nama: 'Hasil Seleksi', path: '/admin/hasil-seleksi', icon: 'FileSpreadsheet', urutan: 40 },

  // Grup tanpa path — hanya pembungkus di sidebar.
  { kode: 'GRUP_DATA_MASTER', nama: 'Data Master', path: null, icon: 'Database', urutan: 50 },
  { kode: 'MASTER_BEASISWA', nama: 'Data Beasiswa', path: '/admin/master/beasiswa', icon: 'Database', urutan: 51, parent: 'GRUP_DATA_MASTER' },
  { kode: 'MASTER_PERSYARATAN', nama: 'Data Persyaratan', path: '/admin/master/persyaratan', icon: 'ListTree', urutan: 52, parent: 'GRUP_DATA_MASTER' },

  { kode: 'GRUP_SETTING', nama: 'Setting System', path: null, icon: 'Settings2', urutan: 60 },
  { kode: 'SETTING_USERS', nama: 'Users Internal', path: '/admin/pengaturan/users', icon: 'Users', urutan: 61, parent: 'GRUP_SETTING' },
  { kode: 'SETTING_ROLE', nama: 'Role & Akses Menu', path: '/admin/pengaturan/role', icon: 'ShieldHalf', urutan: 62, parent: 'GRUP_SETTING' },
  { kode: 'SETTING_MENU', nama: 'Menu System', path: '/admin/pengaturan/menu', icon: 'UserCog', urutan: 63, parent: 'GRUP_SETTING' },
];

const PENUH = { can_view: true, can_create: true, can_update: true, can_delete: true };
const LIHAT = { can_view: true, can_create: false, can_update: false, can_delete: false };
const PROSES = { can_view: true, can_create: false, can_update: true, can_delete: false };

/** Hak akses awal: ADMIN penuh, dua role lain hanya menu kerjanya. */
const AKSES = {
  ADMIN: MENU.map((m) => ({
    menu: m.kode,
    // Grup cuma pembungkus, tidak ada aksi CRUD di dalamnya.
    ...(m.path === null ? LIHAT : PENUH),
  })),
  VERIFIKATOR: [{ menu: 'VERIFIKASI_ADMIN', ...PROSES }],
  LEMBAGA_SELEKSI: [{ menu: 'PROSES_WAWANCARA', ...PROSES }],
  APPLICANT: [],
};

module.exports = {
  async up(queryInterface) {
    const sekarang = new Date();
    const sql = queryInterface.sequelize;

    // Idempoten: hanya menu yang belum ada yang dimasukkan.
    const [menuAda] = await sql.query('SELECT kode FROM menus');
    const kodeAda = new Set(menuAda.map((m) => m.kode));

    // Induk harus lebih dulu ada supaya parent_id-nya bisa diisi.
    const induk = MENU.filter((m) => !m.parent && !kodeAda.has(m.kode));
    if (induk.length) {
      await queryInterface.bulkInsert(
        'menus',
        induk.map((m) => ({
          parent_id: null,
          kode: m.kode,
          nama: m.nama,
          path: m.path,
          icon: m.icon,
          urutan: m.urutan,
          is_active: true,
          created_at: sekarang,
          updated_at: sekarang,
        }))
      );
    }

    const [semuaMenu] = await sql.query('SELECT id, kode FROM menus');
    const idMenu = Object.fromEntries(semuaMenu.map((m) => [m.kode, m.id]));

    const anak = MENU.filter((m) => m.parent && !kodeAda.has(m.kode));
    if (anak.length) {
      await queryInterface.bulkInsert(
        'menus',
        anak.map((m) => ({
          parent_id: idMenu[m.parent],
          kode: m.kode,
          nama: m.nama,
          path: m.path,
          icon: m.icon,
          urutan: m.urutan,
          is_active: true,
          created_at: sekarang,
          updated_at: sekarang,
        }))
      );
    }

    const [menuFinal] = await sql.query('SELECT id, kode FROM menus');
    const petaMenu = Object.fromEntries(menuFinal.map((m) => [m.kode, m.id]));

    const [roleDb] = await sql.query('SELECT id, kode FROM roles');
    const idRole = Object.fromEntries(roleDb.map((r) => [r.kode, r.id]));

    const [aksesAda] = await sql.query('SELECT role_id, menu_id FROM role_menu_access');
    const sudahPunya = new Set(aksesAda.map((a) => `${a.role_id}-${a.menu_id}`));

    const barisAkses = [];
    for (const [kodeRole, daftar] of Object.entries(AKSES)) {
      const roleId = idRole[kodeRole];
      if (!roleId) continue;

      for (const a of daftar) {
        const menuId = petaMenu[a.menu];
        if (!menuId || sudahPunya.has(`${roleId}-${menuId}`)) continue;

        barisAkses.push({
          role_id: roleId,
          menu_id: menuId,
          can_view: a.can_view,
          can_create: a.can_create,
          can_update: a.can_update,
          can_delete: a.can_delete,
          created_at: sekarang,
          updated_at: sekarang,
        });
      }
    }

    if (barisAkses.length) {
      await queryInterface.bulkInsert('role_menu_access', barisAkses);
    }
  },

  async down(queryInterface, Sequelize) {
    const { Op } = Sequelize;
    const kode = MENU.map((m) => m.kode);

    const [menuDb] = await queryInterface.sequelize.query(
      'SELECT id FROM menus WHERE kode IN (:kode)',
      { replacements: { kode } }
    );
    const idMenu = menuDb.map((m) => m.id);

    if (idMenu.length) {
      await queryInterface.bulkDelete('role_menu_access', { menu_id: { [Op.in]: idMenu } });
    }
    // Anak lebih dulu, baru induknya (foreign key parent_id).
    await queryInterface.bulkDelete('menus', {
      kode: { [Op.in]: MENU.filter((m) => m.parent).map((m) => m.kode) },
    });
    await queryInterface.bulkDelete('menus', {
      kode: { [Op.in]: MENU.filter((m) => !m.parent).map((m) => m.kode) },
    });
  },
};
