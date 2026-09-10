'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ref_pekerjaan extends Model {
    static associate() {
      // Tabel acuan, dipakai lintas service lewat nilai kode-nya.
    }
  }

  ref_pekerjaan.init({
    kode: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true
    },
    nama: {
      type: DataTypes.STRING(100),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'ref_pekerjaan',
    tableName: 'ref_pekerjaan',
    underscored: true,
    // Sesuai DDL: tabel acuan tanpa kolom waktu.
    timestamps: false
  });

  return ref_pekerjaan;
};
