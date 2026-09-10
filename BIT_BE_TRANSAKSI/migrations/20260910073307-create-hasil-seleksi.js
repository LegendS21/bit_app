'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Penetapan akhir oleh Admin — satu baris per permohonan.
    await queryInterface.createTable('hasil_seleksi', {
      permohonan_id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED,
        references: { model: 'permohonan', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      status_akhir: {
        allowNull: false,
        type: Sequelize.ENUM('DITERIMA', 'TIDAK_DITERIMA')
      },
      // Logical reference db_rbac.users.id.
      ditetapkan_oleh: {
        allowNull: false,
        type: Sequelize.BIGINT.UNSIGNED
      },
      ditetapkan_at: {
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        type: Sequelize.DATE
      },
      catatan: {
        allowNull: true,
        type: Sequelize.TEXT
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hasil_seleksi');
  }
};
