'use strict';

const { Op } = require('sequelize');
const { role, menu, role_menu_access } = require('../models');
const { forbidden, unauthorized } = require('../helpers/errors.js');

const KOLOM = {
  view: 'can_view',
  create: 'can_create',
  update: 'can_update',
  delete: 'can_delete',
};

const LABEL = {
  view: 'melihat',
  create: 'menambah',
  update: 'mengubah',
  delete: 'menghapus',
};

/**
 * Tegakkan hak akses menu dari tabel `role_menu_access`.
 * Dipakai setelah `authentication`; role diambil dari payload token.
 *
 * `kodeMenu` boleh berupa array — aksesnya diberikan kalau SALAH SATU menu
 * mengizinkan. Ini dipakai untuk data acuan yang dibutuhkan lebih dari satu
 * halaman, mis. daftar role yang juga mengisi dropdown pada halaman user.
 *
 * Catatan: ini melengkapi `isAdmin`, bukan menggantikannya. Cek role menjawab
 * "siapa dia", cek menu menjawab "boleh apa dia di layar ini".
 */
const izinMenu = (kodeMenu, aksi) => {
  const daftarKode = Array.isArray(kodeMenu) ? kodeMenu : [kodeMenu];
  const kolom = KOLOM[aksi];
  if (!kolom) throw new Error(`Aksi izin tidak dikenal: ${aksi}`);

  return async (req, res, next) => {
    try {
      const kodeRole = req.user?.roles || [];
      if (kodeRole.length === 0) {
        throw unauthorized('Belum terautentikasi', 'TOKEN_MISSING');
      }

      const jumlah = await role_menu_access.count({
        where: { [kolom]: true },
        include: [
          {
            model: role,
            as: 'role',
            attributes: [],
            required: true,
            where: { kode: { [Op.in]: kodeRole }, is_active: true },
          },
          {
            model: menu,
            as: 'menu',
            attributes: [],
            required: true,
            where: { kode: { [Op.in]: daftarKode }, is_active: true },
          },
        ],
      });

      if (jumlah === 0) {
        throw forbidden(
          `Role Anda tidak punya hak ${LABEL[aksi]} pada menu ini.`,
          'MENU_ACCESS_DENIED'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = izinMenu;
