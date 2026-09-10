'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Tabel acuan pekerjaan. Sesuai DDL, tanpa kolom waktu.
    await queryInterface.createTable('ref_pekerjaan', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED
      },
      kode: {
        allowNull: false,
        unique: true,
        type: Sequelize.STRING(30)
      },
      nama: {
        allowNull: false,
        type: Sequelize.STRING(100)
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ref_pekerjaan');
  }
};
