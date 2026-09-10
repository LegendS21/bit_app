'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Tabel penghubung: persyaratan mana saja yang berlaku untuk satu program.
    // Sesuai DDL, tabel ini tidak punya kolom waktu.
    await queryInterface.createTable('beasiswa_persyaratan', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED
      },
      beasiswa_id: {
        allowNull: false,
        type: Sequelize.BIGINT.UNSIGNED,
        references: { model: 'beasiswa', key: 'id' },
        // Program dihapus → daftar persyaratannya ikut hilang.
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      persyaratan_id: {
        allowNull: false,
        type: Sequelize.BIGINT.UNSIGNED,
        references: { model: 'persyaratan', key: 'id' },
        // Sengaja RESTRICT: persyaratan yang masih dipakai program tidak boleh
        // lenyap begitu saja.
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      is_wajib: {
        allowNull: false,
        defaultValue: true,
        type: Sequelize.BOOLEAN
      },
      urutan: {
        allowNull: false,
        defaultValue: 0,
        type: Sequelize.INTEGER
      }
    });

    await queryInterface.addConstraint('beasiswa_persyaratan', {
      fields: ['beasiswa_id', 'persyaratan_id'],
      type: 'unique',
      name: 'uq_bp'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('beasiswa_persyaratan');
  }
};
