'use strict';

// sequelize-cli tidak memuat .env sendiri.
require('dotenv').config();

const crypto = require('crypto');
const argon2 = require('argon2');

/**
 * Seed untuk pengembangan: 4 role sesuai kontrak + satu akun untuk tiap aktor
 * (Admin, Verifikator, Lembaga Seleksi, Calon Peserta), supaya seluruh alur
 * login dan penjagaan route bisa langsung dicoba.
 *
 * Email & password diambil dari .env. Jangan dipakai di produksi.
 */

const ROLES = [
  { kode: 'ADMIN', nama: 'Administrator', deskripsi: 'Akses penuh ke seluruh modul' },
  { kode: 'VERIFIKATOR', nama: 'Verifikator', deskripsi: 'Seleksi administrasi permohonan' },
  { kode: 'LEMBAGA_SELEKSI', nama: 'Lembaga Seleksi', deskripsi: 'Penilaian wawancara' },
  { kode: 'APPLICANT', nama: 'Calon Peserta', deskripsi: 'Pendaftar beasiswa' }
];

const AKUN = [
  {
    role: 'ADMIN',
    nama: 'Yosep Rohayadi',
    email: (process.env.SEED_ADMIN_EMAIL || 'admin@bit.test').toLowerCase(),
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin#12345',
    no_hp: '081200000001',
    tipe_user: 'INTERNAL'
  },
  {
    role: 'VERIFIKATOR',
    nama: 'Ahmad Rivaldi',
    email: (process.env.SEED_VERIFIKATOR_EMAIL || 'verifikator@bit.test').toLowerCase(),
    password: process.env.SEED_VERIFIKATOR_PASSWORD || 'Verifikator#12345',
    no_hp: '081200000002',
    tipe_user: 'INTERNAL'
  },
  {
    role: 'LEMBAGA_SELEKSI',
    nama: 'Lembaga Seleksi A',
    email: (process.env.SEED_SELEKSI_EMAIL || 'seleksi@bit.test').toLowerCase(),
    password: process.env.SEED_SELEKSI_PASSWORD || 'Seleksi#12345',
    no_hp: '081200000003',
    tipe_user: 'INTERNAL'
  },
  {
    role: 'APPLICANT',
    nama: 'Peserta Uji Coba',
    email: (process.env.SEED_APPLICANT_EMAIL || 'peserta@bit.test').toLowerCase(),
    password: process.env.SEED_APPLICANT_PASSWORD || 'Peserta#12345',
    no_hp: '081200000004',
    tipe_user: 'APPLICANT'
  }
];

const SEMUA_EMAIL = AKUN.map((a) => a.email);

module.exports = {
  async up(queryInterface) {
    const sekarang = new Date();

    // Idempoten: lewati baris yang sudah ada supaya seeder aman dijalankan ulang
    // di DB yang datanya sudah terlanjur terisi sebagian.
    const [roleAda] = await queryInterface.sequelize.query('SELECT kode FROM roles');
    const kodeAda = new Set(roleAda.map((r) => r.kode));
    const roleBaru = ROLES.filter((r) => !kodeAda.has(r.kode));

    if (roleBaru.length) {
      await queryInterface.bulkInsert(
        'roles',
        roleBaru.map((r) => ({ ...r, is_active: true, created_at: sekarang, updated_at: sekarang }))
      );
    }

    const [userAda] = await queryInterface.sequelize.query(
      'SELECT email FROM users WHERE email IN (:emails)',
      { replacements: { emails: SEMUA_EMAIL } }
    );
    const emailAda = new Set(userAda.map((u) => u.email));

    // argon2id — varian yang direkomendasikan karena tahan serangan GPU
    // sekaligus side-channel.
    const opsiHash = { type: argon2.argon2id };

    const userBaru = [];
    for (const akun of AKUN) {
      if (emailAda.has(akun.email)) continue;
      userBaru.push({
        uuid: crypto.randomUUID(),
        nama: akun.nama,
        email: akun.email,
        password_hash: await argon2.hash(akun.password, opsiHash),
        no_hp: akun.no_hp,
        tipe_user: akun.tipe_user,
        is_active: true,
        email_verified_at: sekarang,
        failed_attempt: 0,
        created_at: sekarang,
        updated_at: sekarang
      });
    }

    if (userBaru.length) {
      await queryInterface.bulkInsert('users', userBaru);
    }

    // Ambil id hasil insert — bulkInsert tidak mengembalikannya di MySQL.
    const [rolesDb] = await queryInterface.sequelize.query('SELECT id, kode FROM roles');
    const [usersDb] = await queryInterface.sequelize.query(
      'SELECT id, email FROM users WHERE email IN (:emails)',
      { replacements: { emails: SEMUA_EMAIL } }
    );
    const [pasanganAda] = await queryInterface.sequelize.query('SELECT user_id, role_id FROM user_roles');

    const idRole = Object.fromEntries(rolesDb.map((r) => [r.kode, r.id]));
    const idUser = Object.fromEntries(usersDb.map((u) => [u.email, u.id]));
    const sudahPunya = new Set(pasanganAda.map((p) => `${p.user_id}-${p.role_id}`));

    const relasiBaru = AKUN.map((a) => ({ user_id: idUser[a.email], role_id: idRole[a.role] }))
      .filter((r) => r.user_id && r.role_id && !sudahPunya.has(`${r.user_id}-${r.role_id}`))
      .map((r) => ({ ...r, assigned_at: sekarang, created_at: sekarang, updated_at: sekarang }));

    if (relasiBaru.length) {
      await queryInterface.bulkInsert('user_roles', relasiBaru);
    }
  },

  async down(queryInterface, Sequelize) {
    const { Op } = Sequelize;
    const [usersDb] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email IN (:emails)',
      { replacements: { emails: SEMUA_EMAIL } }
    );
    const idUser = usersDb.map((u) => u.id);

    if (idUser.length) {
      await queryInterface.bulkDelete('user_roles', { user_id: { [Op.in]: idUser } });
      await queryInterface.bulkDelete('refresh_tokens', { user_id: { [Op.in]: idUser } });
    }
    await queryInterface.bulkDelete('users', { email: { [Op.in]: SEMUA_EMAIL } });
    await queryInterface.bulkDelete('roles', { kode: { [Op.in]: ROLES.map((r) => r.kode) } });
  }
};
