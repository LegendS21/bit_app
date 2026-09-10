'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Bagian 1 wizard: Data Diri & Kontak.
    await queryInterface.createTable('permohonan_biodata', {
      // Primary key sekaligus foreign key: satu permohonan satu biodata.
      permohonan_id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED,
        references: { model: 'permohonan', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      nik: {
        allowNull: false,
        type: Sequelize.CHAR(16)
      },
      nama_lengkap: {
        allowNull: false,
        type: Sequelize.STRING(150)
      },
      tempat_lahir: {
        allowNull: true,
        type: Sequelize.STRING(100)
      },
      tgl_lahir: {
        allowNull: false,
        type: Sequelize.DATEONLY
      },
      jenis_kelamin: {
        allowNull: true,
        type: Sequelize.ENUM('L', 'P')
      },
      alamat: {
        allowNull: false,
        type: Sequelize.TEXT
      },
      no_hp: {
        allowNull: false,
        type: Sequelize.STRING(20)
      },
      no_hp_alt: {
        allowNull: true,
        type: Sequelize.STRING(20)
      },
      email: {
        allowNull: false,
        type: Sequelize.STRING(150)
      },
      updated_at: {
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        type: Sequelize.DATE
      }
    });

    // Dipakai admin untuk menelusuri pendaftar lewat NIK.
    await queryInterface.addIndex('permohonan_biodata', ['nik'], { name: 'idx_nik' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('permohonan_biodata');
  }
};
