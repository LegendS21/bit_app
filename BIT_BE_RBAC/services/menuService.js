'use strict';

const { Op } = require('sequelize');
const { menu, role_menu_access, audit_log } = require('../models');
const { badRequest, conflict, forbidden, notFound } = require('../helpers/errors.js');

/**
 * Menu yang dipakai `middlewares/izinMenu.js` sebagai penjaga endpoint.
 * Kalau salah satunya dihapus, diganti kodenya, atau dinonaktifkan, guard-nya
 * tidak menemukan baris apa pun dan seluruh halaman pengaturan ikut tertutup —
 * tanpa cara membatalkannya lewat aplikasi.
 */
const MENU_SISTEM = ['SETTING_USERS', 'SETTING_ROLE', 'SETTING_MENU'];

async function catatAudit(data) {
  try {
    await audit_log.create({
      user_id: data.user_id || null,
      aksi: data.aksi,
      keterangan: data.keterangan ? String(data.keterangan).slice(0, 255) : null,
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
    });
  } catch (error) {
    console.error('Gagal menulis audit_log:', error.message);
  }
}

function bentukMenu(baris, jumlahAnak = 0, jumlahRole = 0) {
  return {
    id: baris.id,
    parent_id: baris.parent_id,
    kode: baris.kode,
    nama: baris.nama,
    path: baris.path,
    icon: baris.icon,
    urutan: baris.urutan,
    is_active: baris.is_active,
    bawaan_sistem: MENU_SISTEM.includes(baris.kode),
    jumlah_anak: jumlahAnak,
    jumlah_role: jumlahRole,
  };
}

async function ambilMenu(id) {
  const baris = await menu.findByPk(id);
  if (!baris) throw notFound('Menu tidak ditemukan', 'MENU_NOT_FOUND');
  return baris;
}

function pastikanBukanMenuSistem(baris, aksi) {
  if (MENU_SISTEM.includes(baris.kode)) {
    throw forbidden(
      `Menu bawaan sistem (${baris.kode}) tidak bisa ${aksi} — guard hak akses ` +
        'backend bergantung padanya.',
      'MENU_SISTEM'
    );
  }
}

/**
 * Sidebar hanya merender dua tingkat, jadi induk wajib menu tingkat atas.
 * Tanpa batas ini, menu bisa dibuat bersarang lebih dalam dan tidak pernah
 * tampil di mana pun.
 */
async function pastikanIndukSah(parentId, idSendiri = null) {
  if (parentId === null || parentId === undefined) return;

  if (idSendiri !== null && parentId === idSendiri) {
    throw badRequest('Menu tidak bisa menjadi induk dirinya sendiri', 'PARENT_DIRI_SENDIRI');
  }

  const induk = await menu.findByPk(parentId);
  if (!induk) throw badRequest('Menu induk tidak ditemukan', 'PARENT_NOT_FOUND');

  if (induk.parent_id !== null) {
    throw badRequest(
      'Menu induk harus menu tingkat atas — struktur menu hanya dua tingkat.',
      'PARENT_BERTINGKAT'
    );
  }

  if (idSendiri !== null) {
    const punyaAnak = await menu.count({ where: { parent_id: idSendiri } });
    if (punyaAnak > 0) {
      throw badRequest(
        'Menu ini punya submenu, jadi tidak bisa dijadikan submenu milik menu lain.',
        'SUDAH_PUNYA_ANAK'
      );
    }
  }
}

class MenuService {
  /** GET /menus — seluruh menu, terurut sesuai tampilan sidebar. */
  static async daftar() {
    const daftar = await menu.findAll({
      order: [
        ['urutan', 'ASC'],
        ['id', 'ASC'],
      ],
    });

    const [anak, akses] = await Promise.all([
      menu.findAll({ attributes: ['id', 'parent_id'] }),
      role_menu_access.findAll({ attributes: ['menu_id', 'role_id'] }),
    ]);

    const hitungAnak = {};
    for (const a of anak) {
      if (a.parent_id) hitungAnak[a.parent_id] = (hitungAnak[a.parent_id] || 0) + 1;
    }

    const hitungRole = {};
    for (const a of akses) {
      hitungRole[a.menu_id] = (hitungRole[a.menu_id] || 0) + 1;
    }

    // Anak ditempatkan tepat di bawah induknya supaya urutannya sama dengan
    // yang dilihat user di sidebar.
    const induk = daftar.filter((m) => !m.parent_id);
    const tersusun = [];
    for (const m of induk) {
      tersusun.push(m);
      tersusun.push(...daftar.filter((a) => a.parent_id === m.id));
    }
    // Jaga-jaga kalau ada anak yang induknya sudah tidak ada.
    for (const m of daftar) {
      if (!tersusun.includes(m)) tersusun.push(m);
    }

    return tersusun.map((m) =>
      bentukMenu(m, hitungAnak[m.id] || 0, hitungRole[m.id] || 0)
    );
  }

  /** GET /menus/:id */
  static async detail(id) {
    const baris = await ambilMenu(id);
    const [jumlahAnak, jumlahRole] = await Promise.all([
      menu.count({ where: { parent_id: baris.id } }),
      role_menu_access.count({ where: { menu_id: baris.id } }),
    ]);
    return bentukMenu(baris, jumlahAnak, jumlahRole);
  }

  /** POST /menus */
  static async buat(data, pelaku, meta) {
    const ada = await menu.findOne({ where: { kode: data.kode } });
    if (ada) throw conflict(`Kode menu "${data.kode}" sudah dipakai`);

    await pastikanIndukSah(data.parent_id ?? null);

    const baru = await menu.create({
      parent_id: data.parent_id ?? null,
      kode: data.kode,
      nama: data.nama,
      path: data.path || null,
      icon: data.icon || null,
      urutan: data.urutan ?? 0,
      is_active: data.is_active ?? true,
    });

    await catatAudit({
      user_id: pelaku.id,
      aksi: 'CREATE_MENU',
      keterangan: `Membuat menu ${baru.kode}`,
      ...meta,
    });

    return bentukMenu(baru);
  }

  /** PUT /menus/:id */
  static async ubah(id, data, pelaku, meta) {
    const baris = await ambilMenu(id);

    if (data.kode !== undefined && data.kode !== baris.kode) {
      pastikanBukanMenuSistem(baris, 'diganti kodenya');
      const ada = await menu.findOne({ where: { kode: data.kode, id: { [Op.ne]: baris.id } } });
      if (ada) throw conflict(`Kode menu "${data.kode}" sudah dipakai`);
    }

    if (data.is_active === false && baris.is_active) {
      pastikanBukanMenuSistem(baris, 'dinonaktifkan');
    }

    if (data.parent_id !== undefined && data.parent_id !== baris.parent_id) {
      await pastikanIndukSah(data.parent_id, baris.id);
    }

    const perubahan = {};
    if (data.kode !== undefined) perubahan.kode = data.kode;
    if (data.nama !== undefined) perubahan.nama = data.nama;
    if (data.path !== undefined) perubahan.path = data.path || null;
    if (data.icon !== undefined) perubahan.icon = data.icon || null;
    if (data.urutan !== undefined) perubahan.urutan = data.urutan;
    if (data.is_active !== undefined) perubahan.is_active = data.is_active;
    if (data.parent_id !== undefined) perubahan.parent_id = data.parent_id;

    await baris.update(perubahan);

    await catatAudit({
      user_id: pelaku.id,
      aksi: 'UPDATE_MENU',
      keterangan: `Mengubah menu ${baris.kode} (${Object.keys(perubahan).join(', ')})`,
      ...meta,
    });

    return MenuService.detail(baris.id);
  }

  /** DELETE /menus/:id */
  static async hapus(id, pelaku, meta) {
    const baris = await ambilMenu(id);
    pastikanBukanMenuSistem(baris, 'dihapus');

    // Foreign key menus.parent_id memakai ON DELETE CASCADE, jadi menghapus
    // induk akan menghapus submenunya diam-diam. Lebih baik ditolak terang-terangan.
    const punyaAnak = await menu.count({ where: { parent_id: baris.id } });
    if (punyaAnak > 0) {
      throw conflict(
        `Menu ini punya ${punyaAnak} submenu. Hapus atau pindahkan submenunya dulu.`,
        'MENU_PUNYA_ANAK'
      );
    }

    // role_menu_access ikut terhapus lewat ON DELETE CASCADE.
    const jumlahRole = await role_menu_access.count({ where: { menu_id: baris.id } });
    await baris.destroy();

    await catatAudit({
      user_id: pelaku.id,
      aksi: 'DELETE_MENU',
      keterangan: `Menghapus menu ${baris.kode} (hak akses ${jumlahRole} role ikut terhapus)`,
      ...meta,
    });

    return { id: baris.id, kode: baris.kode, hak_akses_terhapus: jumlahRole };
  }
}

module.exports = MenuService;
