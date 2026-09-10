'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class sequence_counter extends Model {
    static associate() {
      // Tabel utilitas, tidak berelasi dengan tabel lain.
    }
  }

  sequence_counter.init({
    // Nama urutan, mis. 'beasiswa'. Satu baris per (nama, tahun).
    nama: {
      type: DataTypes.STRING(50),
      allowNull: false,
      primaryKey: true
    },
    tahun: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      primaryKey: true
    },
    last_value: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'sequence_counter',
    tableName: 'sequence_counter',
    underscored: true,
    timestamps: false
  });

  return sequence_counter;
};
