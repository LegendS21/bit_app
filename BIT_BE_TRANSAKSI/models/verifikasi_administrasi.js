'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  /**
   * Histori putusan seleksi administrasi. Satu permohonan bisa punya banyak
   * putaran verifikasi (misalnya REVISI lalu diajukan lagi), jadi barisnya
   * ditambah, tidak ditimpa.
   */
  class verifikasi_administrasi extends Model {
    static associate(models) {
      verifikasi_administrasi.belongsTo(models.permohonan, {
        foreignKey: 'permohonan_id',
        as: 'permohonan'
      });
      verifikasi_administrasi.hasMany(models.verifikasi_checklist, {
        foreignKey: 'verifikasi_id',
        as: 'checklist'
      });
    }
  }

  verifikasi_administrasi.init({
    permohonan_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    // Logical reference ke db_rbac.users.id.
    verifikator_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    // Snapshot: putusan harus tetap menyebut nama pemutusnya walau akun
    // verifikatornya kelak diubah atau dinonaktifkan.
    verifikator_nama: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    keputusan: {
      type: DataTypes.ENUM('DISETUJUI', 'DITOLAK', 'REVISI'),
      allowNull: false
    },
    catatan: DataTypes.TEXT,
    verified_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'verifikasi_administrasi',
    tableName: 'verifikasi_administrasi',
    underscored: true,
    timestamps: false
  });

  return verifikasi_administrasi;
};
