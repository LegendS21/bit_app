'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  /** Penilaian wawancara oleh Lembaga Seleksi. */
  class seleksi_wawancara extends Model {
    static associate(models) {
      seleksi_wawancara.belongsTo(models.permohonan, {
        foreignKey: 'permohonan_id',
        as: 'permohonan'
      });
      seleksi_wawancara.hasMany(models.penilaian_detail, {
        foreignKey: 'wawancara_id',
        as: 'detail'
      });
    }
  }

  seleksi_wawancara.init({
    permohonan_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    // Logical reference ke db_rbac.users.id.
    penilai_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    penilai_nama: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    tgl_wawancara: DataTypes.DATEONLY,
    // Hasil hitung dari penilaian_detail (skor × bobot), disimpan supaya
    // perangkingan tidak perlu menghitung ulang tiap kali.
    nilai_total: DataTypes.DECIMAL(5, 2),
    hasil: {
      type: DataTypes.ENUM('LULUS', 'TIDAK_LULUS'),
      allowNull: false
    },
    catatan: DataTypes.TEXT,
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'seleksi_wawancara',
    tableName: 'seleksi_wawancara',
    underscored: true,
    timestamps: false
  });

  return seleksi_wawancara;
};
