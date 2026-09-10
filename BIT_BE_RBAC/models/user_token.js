'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class user_token extends Model {
    static associate(models) {
      user_token.belongsTo(models.user, { foreignKey: 'user_id', as: 'user' });
    }
  }

  user_token.init({
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    tipe: {
      type: DataTypes.ENUM('EMAIL_VERIFICATION', 'PASSWORD_RESET'),
      allowNull: false
    },
    // SHA-256 dari token yang dikirim ke email pengguna.
    token_hash: {
      type: DataTypes.CHAR(64),
      allowNull: false,
      unique: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    used_at: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'user_token',
    tableName: 'user_tokens',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return user_token;
};
