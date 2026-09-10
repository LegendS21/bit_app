'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('persyaratan', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED
      },
      // KTP, KK, IJAZAH, SURAT_REKOMENDASI
      kode: {
        allowNull: false,
        unique: true,
        type: Sequelize.STRING(50)
      },
      nama: {
        allowNull: false,
        type: Sequelize.STRING(150)
      },
      deskripsi: {
        allowNull: true,
        type: Sequelize.TEXT
      },
      // Daftar MIME yang boleh diunggah, dipisah koma. Dipakai service Dokumen
      // sebagai acuan saat memeriksa magic bytes berkas.
      allowed_mime: {
        allowNull: false,
        defaultValue: 'application/pdf,image/jpeg,image/png',
        type: Sequelize.STRING(255)
      },
      max_size_kb: {
        allowNull: false,
        defaultValue: 2048,
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
    await queryInterface.dropTable('persyaratan');
  }
};
