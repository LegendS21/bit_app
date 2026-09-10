'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED
      },
      uuid: {
        allowNull: false,
        unique: true,
        type: Sequelize.CHAR(36)
      },
      nama: {
        allowNull: false,
        type: Sequelize.STRING(150)
      },
      email: {
        allowNull: false,
        unique: true,
        type: Sequelize.STRING(150)
      },
      password_hash: {
        allowNull: false,
        type: Sequelize.STRING(255)
      },
      no_hp: {
        allowNull: true,
        type: Sequelize.STRING(20)
      },
      tipe_user: {
        allowNull: false,
        defaultValue: 'APPLICANT',
        type: Sequelize.ENUM('APPLICANT', 'INTERNAL')
      },
      is_active: {
        allowNull: false,
        defaultValue: true,
        type: Sequelize.BOOLEAN
      },
      email_verified_at: {
        allowNull: true,
        type: Sequelize.DATE
      },
      last_login_at: {
        allowNull: true,
        type: Sequelize.DATE
      },
      failed_attempt: {
        allowNull: false,
        defaultValue: 0,
        type: Sequelize.INTEGER
      },
      locked_until: {
        allowNull: true,
        type: Sequelize.DATE
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

    await queryInterface.addIndex('users', ['email'], {
      name: 'idx_users_email'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  }
};
