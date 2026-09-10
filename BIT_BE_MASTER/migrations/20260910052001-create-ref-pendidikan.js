'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Tabel acuan (SD, SMP, SMA, D3, S1, S2, S3). Sesuai DDL, tanpa kolom waktu.
    await queryInterface.createTable('ref_pendidikan', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED
      },
      kode: {
        allowNull: false,
        unique: true,
        type: Sequelize.STRING(20)
      },
      nama: {
        allowNull: false,
        type: Sequelize.STRING(50)
      },
      urutan: {
        allowNull: false,
        defaultValue: 0,
        type: Sequelize.INTEGER
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ref_pendidikan');
  }
};
