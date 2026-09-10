'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  /** Rincian per dokumen dari satu putaran verifikasi. */
  class verifikasi_checklist extends Model {
    static associate(models) {
      verifikasi_checklist.belongsTo(models.verifikasi_administrasi, {
        foreignKey: 'verifikasi_id',
        as: 'verifikasi'
      });
      verifikasi_checklist.belongsTo(models.permohonan_dokumen, {
        foreignKey: 'permohonan_dokumen_id',
        as: 'dokumen'
      });
    }
  }

  verifikasi_checklist.init({
    verifikasi_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    permohonan_dokumen_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    is_sesuai: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    catatan: DataTypes.STRING(500)
  }, {
    sequelize,
    modelName: 'verifikasi_checklist',
    tableName: 'verifikasi_checklist',
    underscored: true,
    timestamps: false
  });

  return verifikasi_checklist;
};
