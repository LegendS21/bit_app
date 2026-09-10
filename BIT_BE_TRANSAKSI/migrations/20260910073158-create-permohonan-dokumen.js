'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Bagian 3 wizard: pointer ke file di service Dokumen. File-nya TIDAK di sini.
    await queryInterface.createTable('permohonan_dokumen', {
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
      // Logical reference db_master.persyaratan.id.
      persyaratan_id: {
        allowNull: false,
        type: Sequelize.BIGINT.UNSIGNED
      },
      // Snapshot nama persyaratannya.
      persyaratan_nama: {
        allowNull: false,
        type: Sequelize.STRING(150)
      },
      // Logical reference db_dokumen.dokumen.id — PostgreSQL, service lain.
      dokumen_uuid: {
        allowNull: false,
        type: Sequelize.CHAR(36)
      },
      nama_file_asli: {
        allowNull: false,
        type: Sequelize.STRING(255)
      },
      ukuran_byte: {
        allowNull: false,
        type: Sequelize.BIGINT
      },
      status_verifikasi: {
        allowNull: false,
        defaultValue: 'BELUM_DIPERIKSA',
        type: Sequelize.ENUM('BELUM_DIPERIKSA', 'SESUAI', 'TIDAK_SESUAI')
      },
      catatan: {
        allowNull: true,
        type: Sequelize.TEXT
      },
      uploaded_at: {
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        type: Sequelize.DATE
      }
    });

    // Satu jenis dokumen cukup sekali per permohonan; unggah ulang menimpa,
    // bukan menumpuk.
    await queryInterface.addConstraint('permohonan_dokumen', {
      fields: ['permohonan_id', 'persyaratan_id'],
      type: 'unique',
      name: 'uq_pd'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('permohonan_dokumen');
  }
};
