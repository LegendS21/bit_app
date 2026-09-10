'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  /** Rincian aspek penilaian wawancara — sumber hitungan `nilai_total`. */
  class penilaian_detail extends Model {
    static associate(models) {
      penilaian_detail.belongsTo(models.seleksi_wawancara, {
        foreignKey: 'wawancara_id',
        as: 'wawancara'
      });
    }
  }

  penilaian_detail.init({
    wawancara_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    // Aspeknya bebas teks, bukan tabel acuan: daftar aspek bisa berbeda
    // tiap program dan tidak perlu dikelola sebagai data master.
    aspek: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    skor: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    },
    bobot: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 1
    },
    catatan: DataTypes.STRING(255)
  }, {
    sequelize,
    modelName: 'penilaian_detail',
    tableName: 'penilaian_detail',
    underscored: true,
    timestamps: false
  });

  return penilaian_detail;
};
