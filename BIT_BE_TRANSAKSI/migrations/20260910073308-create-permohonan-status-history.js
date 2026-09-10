'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Jejak tiap perpindahan status permohonan.
    await queryInterface.createTable('permohonan_status_history', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED
      },
      permohonan_id: {
        allowNull: false,
        type: Sequelize.BIGINT.UNSIGNED,
        references: { model: 'permohonan', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      // VARCHAR, bukan ENUM: riwayat harus tetap terbaca apa adanya walau
      // daftar status kelak berubah.
      status_dari: {
        allowNull: true,
        type: Sequelize.STRING(30)
      },
      status_ke: {
        allowNull: false,
        type: Sequelize.STRING(30)
      },
      // Logical reference db_rbac.users.id; kosong kalau dilakukan sistem.
      actor_id: {
        allowNull: true,
        type: Sequelize.BIGINT.UNSIGNED
      },
      actor_role: {
        allowNull: true,
        type: Sequelize.STRING(50)
      },
      catatan: {
        allowNull: true,
        type: Sequelize.TEXT
      },
      created_at: {
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        type: Sequelize.DATE
      }
    });

    await queryInterface.addIndex('permohonan_status_history', ['permohonan_id', 'created_at'], {
      name: 'idx_psh'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('permohonan_status_history');
  }
};
