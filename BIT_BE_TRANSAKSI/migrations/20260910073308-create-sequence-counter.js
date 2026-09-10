'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Sumber nomor urut per tahun (lihat bagian 0.4 desain-database).
    // Primary key gabungan (nama, tahun), tanpa kolom id maupun kolom waktu.
    await queryInterface.createTable('sequence_counter', {
      nama: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.STRING(50)
      },
      tahun: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.SMALLINT
      },
      last_value: {
        allowNull: false,
        defaultValue: 0,
        type: Sequelize.BIGINT
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sequence_counter');
  }
};
