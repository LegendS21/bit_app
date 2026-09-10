'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ref_pendidikan extends Model {
    static associate() {
      // Tabel acuan, dipakai lintas service lewat nilai kode-nya.
    }
  }

  ref_pendidikan.init({
    // SD, SMP, SMA, D3, S1, S2, S3
    kode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    nama: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    // Menjaga jenjang tampil berurutan, bukan menurut abjad.
    urutan: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'ref_pendidikan',
    tableName: 'ref_pendidikan',
    underscored: true,
    // Sesuai DDL: tabel acuan tanpa kolom waktu.
    timestamps: false
  });

  return ref_pendidikan;
};
