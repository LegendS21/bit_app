'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Rincian per dokumen dari satu putaran verifikasi.
    await queryInterface.createTable('verifikasi_checklist', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED
      },
      verifikasi_id: {
        allowNull: false,
        type: Sequelize.BIGINT.UNSIGNED,
        references: { model: 'verifikasi_administrasi', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      permohonan_dokumen_id: {
        allowNull: false,
        type: Sequelize.BIGINT.UNSIGNED,
        references: { model: 'permohonan_dokumen', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      is_sesuai: {
        allowNull: false,
        type: Sequelize.BOOLEAN
      },
      catatan: {
        allowNull: true,
        type: Sequelize.STRING(500)
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('verifikasi_checklist');
  }
};
