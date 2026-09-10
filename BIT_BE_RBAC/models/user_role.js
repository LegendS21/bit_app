'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class user_role extends Model {
    static associate(models) {
      user_role.belongsTo(models.user, { foreignKey: 'user_id', as: 'user' });
      user_role.belongsTo(models.role, { foreignKey: 'role_id', as: 'role' });
    }
  }

  user_role.init({
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    role_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'user_role',
    tableName: 'user_roles',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return user_role;
};
