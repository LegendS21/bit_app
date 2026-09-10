'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('beasiswa', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED
      },
      kode: {
        allowNull: false,
        unique: true,
        type: Sequelize.STRING(50)
      },
      nama: {
        allowNull: false,
        type: Sequelize.STRING(200)
      },
      deskripsi: {
        allowNull: true,
        type: Sequelize.TEXT
      },
      penyelenggara: {
        allowNull: true,
        type: Sequelize.STRING(150)
      },
      kuota: {
        allowNull: false,
        defaultValue: 0,
        type: Sequelize.INTEGER
      },
      tgl_buka: {
        allowNull: false,
        type: Sequelize.DATEONLY
      },
      tgl_tutup: {
        allowNull: false,
        type: Sequelize.DATEONLY
      },
      status: {
        allowNull: false,
        defaultValue: 'DRAFT',
        type: Sequelize.ENUM('DRAFT', 'AKTIF', 'DITUTUP', 'ARSIP')
      },
      // Logical reference ke db_rbac.users.id — sengaja tanpa foreign key,
      // databasenya terpisah per service.
      created_by: {
        allowNull: true,
        type: Sequelize.BIGINT.UNSIGNED
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
      },
      deleted_at: {
        allowNull: true,
        type: Sequelize.DATE
      }
    });

    await queryInterface.addIndex('beasiswa', ['status', 'tgl_buka', 'tgl_tutup'], {
      name: 'idx_beasiswa_status'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('beasiswa');
  }
};
