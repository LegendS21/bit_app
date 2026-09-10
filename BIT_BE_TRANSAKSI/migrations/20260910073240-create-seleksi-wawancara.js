'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('seleksi_wawancara', {
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
      // Logical reference db_rbac.users.id.
      penilai_id: {
        allowNull: false,
        type: Sequelize.BIGINT.UNSIGNED
      },
      penilai_nama: {
        allowNull: false,
        type: Sequelize.STRING(150)
      },
      tgl_wawancara: {
        allowNull: true,
        type: Sequelize.DATEONLY
      },
      // Hasil hitung skor × bobot dari penilaian_detail.
      nilai_total: {
        allowNull: true,
        type: Sequelize.DECIMAL(5, 2)
      },
      hasil: {
        allowNull: false,
        type: Sequelize.ENUM('LULUS', 'TIDAK_LULUS')
      },
      catatan: {
        allowNull: true,
        type: Sequelize.TEXT
      },
      submitted_at: {
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        type: Sequelize.DATE
      }
    });

    await queryInterface.addIndex('seleksi_wawancara', ['permohonan_id'], {
      name: 'idx_sw_permohonan'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('seleksi_wawancara');
  }
};
