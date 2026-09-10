'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  /**
   * Bagian 3 wizard: penunjuk ke berkas yang tersimpan di service Dokumen.
   * **File fisiknya tidak ada di sini** — yang disimpan hanya `dokumen_uuid`.
   */
  class permohonan_dokumen extends Model {
    static associate(models) {
      permohonan_dokumen.belongsTo(models.permohonan, {
        foreignKey: 'permohonan_id',
        as: 'permohonan'
      });
      permohonan_dokumen.hasMany(models.verifikasi_checklist, {
        foreignKey: 'permohonan_dokumen_id',
        as: 'checklist'
      });
    }
  }

  permohonan_dokumen.init({
    permohonan_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    // Logical reference ke db_master.persyaratan.id.
    persyaratan_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    // Snapshot nama persyaratan saat diunggah — kalau master diubah, checklist
    // verifikator yang sudah terbit tetap menyebut dokumen yang sama.
    persyaratan_nama: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    // Logical reference ke db_dokumen.dokumen.id (PostgreSQL, service lain).
    dokumen_uuid: {
      type: DataTypes.CHAR(36),
      allowNull: false
    },
    nama_file_asli: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    ukuran_byte: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    status_verifikasi: {
      type: DataTypes.ENUM('BELUM_DIPERIKSA', 'SESUAI', 'TIDAK_SESUAI'),
      allowNull: false,
      defaultValue: 'BELUM_DIPERIKSA'
    },
    catatan: DataTypes.TEXT,
    uploaded_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'permohonan_dokumen',
    tableName: 'permohonan_dokumen',
    underscored: true,
    // Waktunya diwakili `uploaded_at`, bukan created_at/updated_at.
    timestamps: false
  });

  return permohonan_dokumen;
};
