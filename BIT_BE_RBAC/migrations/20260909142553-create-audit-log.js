'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Sengaja tanpa foreign key ke users: jejak audit harus tetap ada
    // walaupun user-nya sudah dihapus.
    await queryInterface.createTable('audit_log', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED
      },
      user_id: {
        allowNull: true,
        type: Sequelize.BIGINT.UNSIGNED
      },
      // LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, CREATE_USER, ...
      aksi: {
        allowNull: false,
        type: Sequelize.STRING(80)
      },
      keterangan: {
        allowNull: true,
        type: Sequelize.STRING(255)
      },
      ip_address: {
        allowNull: true,
        type: Sequelize.STRING(45)
      },
      user_agent: {
        allowNull: true,
        type: Sequelize.STRING(255)
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
      }
    });

    await queryInterface.addIndex('audit_log', ['user_id', 'created_at'], {
      name: 'idx_audit_user'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_log');
  }
};
