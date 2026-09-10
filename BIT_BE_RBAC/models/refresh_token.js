'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class refresh_token extends Model {
    static associate(models) {
      refresh_token.belongsTo(models.user, { foreignKey: 'user_id', as: 'user' });
    }
  }

  refresh_token.init({
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    // SHA-256 dari refresh token — token mentah tidak pernah disimpan.
    token_hash: {
      type: DataTypes.CHAR(64),
      allowNull: false,
      unique: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    revoked_at: DataTypes.DATE,
    // Diisi hash token pengganti saat rotasi refresh token.
    replaced_by: DataTypes.CHAR(64),
    user_agent: DataTypes.STRING(255),
    ip_address: DataTypes.STRING(45)
  }, {
    sequelize,
    modelName: 'refresh_token',
    tableName: 'refresh_tokens',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return refresh_token;
};
