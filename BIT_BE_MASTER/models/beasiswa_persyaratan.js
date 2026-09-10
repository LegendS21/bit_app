'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class beasiswa_persyaratan extends Model {
    static associate(models) {
      beasiswa_persyaratan.belongsTo(models.beasiswa, {
        foreignKey: 'beasiswa_id',
        as: 'beasiswa'
      });
      beasiswa_persyaratan.belongsTo(models.persyaratan, {
        foreignKey: 'persyaratan_id',
        as: 'persyaratan'
      });
    }
  }

  /**
   * Catatan: tabelnya punya kolom `id` auto increment, tapi karena model ini
   * dipakai sebagai `through` pada `belongsToMany`, Sequelize menjadikan
   * pasangan (beasiswa_id, persyaratan_id) sebagai primary key model — `id`
   * tidak ikut dipetakan. Jadi jangan pernah menghapus/mencari barisnya lewat
   * `baris.id` (nilainya `undefined`); pakai pasangan kuncinya.
   */
  beasiswa_persyaratan.init({
    beasiswa_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    persyaratan_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    // Persyaratan opsional tetap ditampilkan, tapi tidak menahan pengiriman.
    is_wajib: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    urutan: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'beasiswa_persyaratan',
    tableName: 'beasiswa_persyaratan',
    underscored: true,
    // Sesuai DDL: tabel penghubung ini tidak punya kolom waktu.
    timestamps: false
  });

  return beasiswa_persyaratan;
};
