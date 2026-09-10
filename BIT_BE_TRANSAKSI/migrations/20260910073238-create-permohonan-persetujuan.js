'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Bagian 4 wizard: Lembar Persetujuan.
    await queryInterface.createTable('permohonan_persetujuan', {
      permohonan_id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED,
        references: { model: 'permohonan', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      is_setuju: {
        allowNull: false,
        defaultValue: false,
        type: Sequelize.BOOLEAN
      },
      disetujui_at: {
        allowNull: true,
        type: Sequelize.DATE
      },
      // Muat IPv6, karena itu 45 karakter.
      ip_address: {
        allowNull: true,
        type: Sequelize.STRING(45)
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('permohonan_persetujuan');
  }
};
