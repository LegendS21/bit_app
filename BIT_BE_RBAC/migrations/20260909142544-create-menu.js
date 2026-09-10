'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('menus', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED
      },
      parent_id: {
        allowNull: true,
        type: Sequelize.INTEGER.UNSIGNED,
        references: { model: 'menus', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      kode: {
        allowNull: false,
        unique: true,
        type: Sequelize.STRING(80)
      },
      nama: {
        allowNull: false,
        type: Sequelize.STRING(100)
      },
      path: {
        allowNull: true,
        type: Sequelize.STRING(150)
      },
      icon: {
        allowNull: true,
        type: Sequelize.STRING(50)
      },
      urutan: {
        allowNull: false,
        defaultValue: 0,
        type: Sequelize.INTEGER
      },
      is_active: {
        allowNull: false,
        defaultValue: true,
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
    await queryInterface.dropTable('menus');
  }
};
