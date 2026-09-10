'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class audit_log extends Model {
    static associate(models) {
      // constraints: false — tabel audit sengaja tanpa foreign key
      // supaya jejaknya tetap ada walau user sudah dihapus.
      audit_log.belongsTo(models.user, {
        foreignKey: 'user_id',
        as: 'user',
        constraints: false
      });
    }
  }

  audit_log.init({
    user_id: DataTypes.BIGINT.UNSIGNED,
    // LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, CREATE_USER, ...
    aksi: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    keterangan: DataTypes.STRING(255),
    ip_address: DataTypes.STRING(45),
    user_agent: DataTypes.STRING(255)
  }, {
    sequelize,
    modelName: 'audit_log',
    tableName: 'audit_log',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return audit_log;
};
