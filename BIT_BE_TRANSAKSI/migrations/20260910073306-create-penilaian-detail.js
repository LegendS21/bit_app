'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('penilaian_detail', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED
      },
      wawancara_id: {
        allowNull: false,
        type: Sequelize.BIGINT.UNSIGNED,
        references: { model: 'seleksi_wawancara', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      aspek: {
        allowNull: false,
        type: Sequelize.STRING(100)
      },
      skor: {
        allowNull: false,
        type: Sequelize.DECIMAL(5, 2)
      },
      bobot: {
        allowNull: false,
        defaultValue: 1,
        type: Sequelize.DECIMAL(5, 2)
      },
      catatan: {
        allowNull: true,
        type: Sequelize.STRING(255)
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('penilaian_detail');
  }
};
