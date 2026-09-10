'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('role_menu_access', {
      role_id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
        references: { model: 'roles', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      menu_id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED,
        references: { model: 'menus', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      can_view: {
        allowNull: false,
        defaultValue: false,
        type: Sequelize.BOOLEAN
      },
      can_create: {
        allowNull: false,
        defaultValue: false,
        type: Sequelize.BOOLEAN
      },
      can_update: {
        allowNull: false,
        defaultValue: false,
        type: Sequelize.BOOLEAN
      },
      can_delete: {
        allowNull: false,
        defaultValue: false,
        type: Sequelize.BOOLEAN
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('role_menu_access');
  }
};
