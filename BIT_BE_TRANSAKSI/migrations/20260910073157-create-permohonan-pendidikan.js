'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Bagian 2 wizard: Latar Belakang Pendidikan & Pekerjaan.
    await queryInterface.createTable('permohonan_pendidikan', {
      permohonan_id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED,
        references: { model: 'permohonan', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      // Logical reference db_master.ref_pendidikan.kode.
      pendidikan_kode: {
        allowNull: false,
        type: Sequelize.STRING(20)
      },
      instansi: {
        allowNull: false,
        type: Sequelize.STRING(200)
      },
      jurusan: {
        allowNull: true,
        type: Sequelize.STRING(150)
      },
      // DDL menyebut YEAR; Sequelize tidak punya tipe itu, jadi dipakai
      // SMALLINT dan rentang tahunnya dijaga validator.
      tahun_lulus: {
        allowNull: true,
        type: Sequelize.SMALLINT
      },
      // Logical reference db_master.ref_pekerjaan.kode. Boleh kosong.
      pekerjaan_kode: {
        allowNull: true,
        type: Sequelize.STRING(30)
      },
      nama_tempat_kerja: {
        allowNull: true,
        type: Sequelize.STRING(200)
      },
      updated_at: {
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        type: Sequelize.DATE
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('permohonan_pendidikan');
  }
};
