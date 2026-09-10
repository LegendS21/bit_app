'use strict';

const { Op, fn, col } = require('sequelize');
const { sequelize, role, menu, role_menu_access, user_role, audit_log } = require('../models');
const { badRequest, conflict, forbidden, notFound } = require('../helpers/errors.js');

/**
 * Role bawaan sistem. Kode-kode ini dipakai di payload JWT, guard route
 * frontend, dan penentuan tipe_user — jadi tidak boleh dihapus, diganti
 * kodenya, atau dinonaktifkan lewat CRUD ini.
 */
const ROLE_SISTEM = ['ADMIN', 'VERIFIKATOR', 'LEMBAGA_SELEKSI', 'APPLICANT'];

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

function bentukRole(baris, jumlahUser = 0, menus = []) {
  return {
    id: baris.id,
    kode: baris.kode,
    nama: baris.nama,
    deskripsi: baris.deskripsi,
    is_active: baris.is_active,
    bawaan_sistem: ROLE_SISTEM.includes(baris.kode),
    jumlah_user: jumlahUser,
    menus,
  };
}

async function ambilRole(id) {
  const baris = await role.findByPk(id);
  if (!baris) throw notFound('Role tidak ditemukan', 'ROLE_NOT_FOUND');
  return baris;
}

function pastikanBukanRoleSistem(baris, aksi) {
  if (ROLE_SISTEM.includes(baris.kode)) {
    throw forbidden(
      `Role bawaan sistem (${baris.kode}) tidak bisa ${aksi}.`,
      'ROLE_SISTEM'
    );
  }
}

/** Jumlah user per role, dihitung sekali untuk seluruh daftar. */
async function hitungUserPerRole() {
  const baris = await user_role.findAll({
    attributes: ['role_id', [fn('COUNT', col('user_id')), 'jumlah']],
    group: ['role_id'],
    raw: true,
  });
  return Object.fromEntries(baris.map((b) => [b.role_id, Number(b.jumlah)]));
}

class RoleService {
  /** GET /roles — daftar role beserta menu yang boleh dilihat. */
  static async daftar() {
    const daftar = await role.findAll({
      order: [['id', 'ASC']],
      include: [
        {
          model: role_menu_access,
          as: 'menu_access',
          required: false,
          where: { can_view: true },
          include: [{ model: menu, as: 'menu', attributes: ['id', 'nama', 'path'] }],
        },
      ],
    });

    const jumlahUser = await hitungUserPerRole();

    return daftar.map((r) =>
      bentukRole(
        r,
        jumlahUser[r.id] || 0,
        (r.menu_access || [])
          .filter((a) => a.menu)
          .map((a) => ({ id: a.menu.id, nama: a.menu.nama, path: a.menu.path }))
      )
    );
  }

  /** GET /roles/:id */
  static async detail(id) {
    const baris = await ambilRole(id);
    const jumlahUser = await user_role.count({ where: { role_id: baris.id } });
    return bentukRole(baris, jumlahUser);
  }

  /** POST /roles */
  static async buat(data, pelaku, meta) {
    const ada = await role.findOne({ where: { kode: data.kode } });
    if (ada) throw conflict(`Kode role "${data.kode}" sudah dipakai`);

    const baru = await role.create({
      kode: data.kode,
      nama: data.nama,
      deskripsi: data.deskripsi || null,
      is_active: data.is_active ?? true,
    });

    await catatAudit({
      user_id: pelaku.id,
      aksi: 'CREATE_ROLE',
      keterangan: `Membuat role ${baru.kode}`,
      ...meta,
    });

    return bentukRole(baru, 0, []);
  }

  /** PUT /roles/:id */
  static async ubah(id, data, pelaku, meta) {
    const baris = await ambilRole(id);

    if (data.kode !== undefined && data.kode !== baris.kode) {
      pastikanBukanRoleSistem(baris, 'diganti kodenya');
      const ada = await role.findOne({ where: { kode: data.kode, id: { [Op.ne]: baris.id } } });
      if (ada) throw conflict(`Kode role "${data.kode}" sudah dipakai`);
    }

    if (data.is_active === false && baris.is_active) {
      pastikanBukanRoleSistem(baris, 'dinonaktifkan');
    }

    const perubahan = {};
    if (data.kode !== undefined) perubahan.kode = data.kode;
    if (data.nama !== undefined) perubahan.nama = data.nama;
    if (data.deskripsi !== undefined) perubahan.deskripsi = data.deskripsi || null;
    if (data.is_active !== undefined) perubahan.is_active = data.is_active;

    await baris.update(perubahan);

    await catatAudit({
      user_id: pelaku.id,
      aksi: 'UPDATE_ROLE',
      keterangan: `Mengubah role ${baris.kode} (${Object.keys(perubahan).join(', ')})`,
      ...meta,
    });

    return RoleService.detail(baris.id);
  }

  /** DELETE /roles/:id */
  static async hapus(id, pelaku, meta) {
    const baris = await ambilRole(id);
    pastikanBukanRoleSistem(baris, 'dihapus');

    const dipakai = await user_role.count({ where: { role_id: baris.id } });
    if (dipakai > 0) {
      throw conflict(
        `Role ini masih dipakai ${dipakai} user. Pindahkan user-nya dulu sebelum menghapus role.`,
        'ROLE_DIPAKAI'
      );
    }

    // role_menu_access ikut terhapus lewat ON DELETE CASCADE.
    await baris.destroy();

    await catatAudit({
      user_id: pelaku.id,
      aksi: 'DELETE_ROLE',
      keterangan: `Menghapus role ${baris.kode}`,
      ...meta,
    });

    return { id: baris.id, kode: baris.kode };
  }

  /**
   * GET /roles/:id/akses-menu
   * Mengembalikan SELURUH menu beserta status aksesnya untuk role ini —
   * termasuk menu yang belum diberi akses (semua flag false), supaya
   * frontend tinggal merender daftar centang tanpa menggabungkan sendiri.
   */
  static async aksesMenu(id) {
    const baris = await ambilRole(id);

    const [daftarMenu, akses] = await Promise.all([
      menu.findAll({
        order: [
          ['urutan', 'ASC'],
          ['id', 'ASC'],
        ],
      }),
      role_menu_access.findAll({ where: { role_id: baris.id } }),
    ]);

    const petaAkses = Object.fromEntries(akses.map((a) => [a.menu_id, a]));

    return {
      role: {
        id: baris.id,
        kode: baris.kode,
        nama: baris.nama,
        bawaan_sistem: ROLE_SISTEM.includes(baris.kode),
      },
      menus: daftarMenu.map((m) => {
        const a = petaAkses[m.id];
        return {
          menu_id: m.id,
          parent_id: m.parent_id,
          kode: m.kode,
          nama: m.nama,
          path: m.path,
          icon: m.icon,
          is_active: m.is_active,
          can_view: a ? a.can_view : false,
          can_create: a ? a.can_create : false,
          can_update: a ? a.can_update : false,
          can_delete: a ? a.can_delete : false,
        };
      }),
    };
  }

  /**
   * PUT /roles/:id/akses-menu — mengganti seluruh hak akses role ini.
   * Baris yang semua flag-nya false tidak disimpan; ketiadaan baris sudah
   * berarti "tidak punya akses".
   */
  static async simpanAksesMenu(id, daftarAkses, pelaku, meta) {
    const baris = await ambilRole(id);

    const idMenu = daftarAkses.map((a) => a.menu_id);
    if (idMenu.length) {
      const jumlah = await menu.count({ where: { id: { [Op.in]: idMenu } } });
      if (jumlah !== new Set(idMenu).size) {
        throw badRequest('Ada menu yang tidak dikenali', 'MENU_NOT_FOUND');
      }
    }

    const dipakai = daftarAkses.filter(
      (a) => a.can_view || a.can_create || a.can_update || a.can_delete
    );

    // Tanpa penjaga ini, ADMIN bisa mencabut aksesnya sendiri ke halaman
    // pengaturan akses — dan tidak ada lagi jalan untuk membatalkannya lewat
    // aplikasi. Menu ini tetap wajib bisa dilihat dan diubah oleh ADMIN.
    if (baris.kode === 'ADMIN') {
      const menuPengunci = await menu.findOne({ where: { kode: 'SETTING_ROLE' } });
      const tetapBisa =
        !menuPengunci ||
        dipakai.some((a) => a.menu_id === menuPengunci.id && a.can_update);

      if (!tetapBisa) {
        throw badRequest(
          'Administrator harus tetap punya hak Lihat dan Ubah pada menu "Role & Akses Menu". ' +
            'Tanpa itu, pengaturan hak akses tidak bisa dibuka lagi oleh siapa pun.',
          'ADMIN_TERKUNCI'
        );
      }
    }

    await sequelize.transaction(async (t) => {
      await role_menu_access.destroy({ where: { role_id: baris.id }, transaction: t });

      if (dipakai.length) {
        await role_menu_access.bulkCreate(
          dipakai.map((a) => ({
            role_id: baris.id,
            menu_id: a.menu_id,
            // Aksi tambah/ubah/hapus tidak masuk akal tanpa bisa membuka menunya.
            can_view: true,
            can_create: a.can_create,
            can_update: a.can_update,
            can_delete: a.can_delete,
          })),
          { transaction: t }
        );
      }
    });

    await catatAudit({
      user_id: pelaku.id,
      aksi: 'UPDATE_ROLE_MENU_ACCESS',
      keterangan: `Mengubah akses menu role ${baris.kode} (${dipakai.length} menu)`,
      ...meta,
    });

    return RoleService.aksesMenu(baris.id);
  }
}

module.exports = RoleService;
