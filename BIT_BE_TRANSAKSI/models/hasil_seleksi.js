'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  /** Penetapan akhir oleh Admin — satu baris per permohonan. */
  class hasil_seleksi extends Model {
    static associate(models) {
      hasil_seleksi.belongsTo(models.permohonan, {
        foreignKey: 'permohonan_id',
        as: 'permohonan'
      });
    }
  }

  hasil_seleksi.init({
    permohonan_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    status_akhir: {
      type: DataTypes.ENUM('DITERIMA', 'TIDAK_DITERIMA'),
      allowNull: false
    },
    // Logical reference ke db_rbac.users.id (admin yang menetapkan).
    ditetapkan_oleh: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    ditetapkan_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    catatan: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'hasil_seleksi',
    tableName: 'hasil_seleksi',
    underscored: true,
    timestamps: false
  });

  return hasil_seleksi;
};
