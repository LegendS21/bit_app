'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  /** Bagian 4 wizard: Lembar Persetujuan. */
  class permohonan_persetujuan extends Model {
    static associate(models) {
      permohonan_persetujuan.belongsTo(models.permohonan, {
        foreignKey: 'permohonan_id',
        as: 'permohonan'
      });
    }
  }

  permohonan_persetujuan.init({
    permohonan_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    is_setuju: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    disetujui_at: DataTypes.DATE,
    // Bukti kapan & dari mana pernyataan itu ditekan; dipakai kalau
    // keabsahannya dipersoalkan di kemudian hari.
    ip_address: DataTypes.STRING(45)
  }, {
    sequelize,
    modelName: 'permohonan_persetujuan',
    tableName: 'permohonan_persetujuan',
    underscored: true,
    // Sesuai DDL: tidak punya kolom waktu bawaan; `disetujui_at` yang berlaku.
    timestamps: false
  });

  return permohonan_persetujuan;
};
