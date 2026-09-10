'use strict';

// Salinan beku daftar status saat migration ini dibuat. Sengaja tidak
// mengambil dari helpers/statusPermohonan.js: migration yang sudah jalan
// tidak boleh berubah isinya hanya karena file lain disunting.
const STATUS = [
  'DRAFT',
  'DIAJUKAN',
  'DALAM_VERIFIKASI',
  'REVISI',
  'DITOLAK_ADMIN',
  'LULUS_ADMIN',
  'DALAM_WAWANCARA',
  'LULUS_WAWANCARA',
  'TIDAK_LULUS_WAWANCARA',
  'DITERIMA',
  'TIDAK_DITERIMA'
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('permohonan', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED
      },
      // PRM-2026-000123
      kode_permohonan: {
        allowNull: false,
        unique: true,
        type: Sequelize.STRING(30)
      },
      // Logical reference db_rbac.users.id — tanpa foreign key, beda database.
      user_id: {
        allowNull: false,
        type: Sequelize.BIGINT.UNSIGNED
      },
      user_uuid: {
        allowNull: false,
        type: Sequelize.CHAR(36)
      },
      // Logical reference db_master.beasiswa.id.
      beasiswa_id: {
        allowNull: false,
        type: Sequelize.BIGINT.UNSIGNED
      },
      // Snapshot, agar histori tidak ikut berubah kalau master diubah.
      beasiswa_nama: {
        allowNull: false,
        type: Sequelize.STRING(200)
      },
      status: {
        allowNull: false,
        defaultValue: 'DRAFT',
        type: Sequelize.ENUM(...STATUS)
      },
      // Posisi wizard 1..4.
      current_step: {
        allowNull: false,
        defaultValue: 1,
        type: Sequelize.TINYINT
      },
      is_locked: {
        allowNull: false,
        defaultValue: false,
        type: Sequelize.BOOLEAN
      },
      submitted_at: {
        allowNull: true,
        type: Sequelize.DATE
      },
      created_at: {
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        type: Sequelize.DATE
      }
    });

    // Satu user hanya boleh punya satu permohonan per program.
    await queryInterface.addConstraint('permohonan', {
      fields: ['user_id', 'beasiswa_id'],
      type: 'unique',
      name: 'uq_user_beasiswa'
    });

    // Antrean kerja verifikator & rekap dashboard selalu menyaring status.
    await queryInterface.addIndex('permohonan', ['status', 'submitted_at'], {
      name: 'idx_status'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('permohonan');
  }
};
