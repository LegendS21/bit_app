'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Histori: satu permohonan bisa punya banyak putaran verifikasi.
    await queryInterface.createTable('verifikasi_administrasi', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED
      },
      permohonan_id: {
        allowNull: false,
        type: Sequelize.BIGINT.UNSIGNED,
        references: { model: 'permohonan', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      // Logical reference db_rbac.users.id.
      verifikator_id: {
        allowNull: false,
        type: Sequelize.BIGINT.UNSIGNED
      },
      // Snapshot nama pemutusnya.
      verifikator_nama: {
        allowNull: false,
        type: Sequelize.STRING(150)
      },
      keputusan: {
        allowNull: false,
        type: Sequelize.ENUM('DISETUJUI', 'DITOLAK', 'REVISI')
      },
      catatan: {
        allowNull: true,
        type: Sequelize.TEXT
      },
      verified_at: {
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        type: Sequelize.DATE
      }
    });

    await queryInterface.addIndex('verifikasi_administrasi', ['permohonan_id', 'verified_at'], {
      name: 'idx_va_permohonan'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('verifikasi_administrasi');
  }
};
