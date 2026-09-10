'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('refresh_tokens', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED
      },
      user_id: {
        allowNull: false,
        type: Sequelize.BIGINT.UNSIGNED,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      // SHA-256 dari refresh token — token mentah tidak pernah disimpan.
      token_hash: {
        allowNull: false,
        unique: true,
        type: Sequelize.CHAR(64)
      },
      expires_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      revoked_at: {
        allowNull: true,
        type: Sequelize.DATE
      },
      // Diisi hash token pengganti saat rotasi.
      replaced_by: {
        allowNull: true,
        type: Sequelize.CHAR(64)
      },
      user_agent: {
        allowNull: true,
        type: Sequelize.STRING(255)
      },
      ip_address: {
        allowNull: true,
        type: Sequelize.STRING(45)
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

    await queryInterface.addIndex('refresh_tokens', ['user_id', 'revoked_at'], {
      name: 'idx_rt_user'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('refresh_tokens');
  }
};
