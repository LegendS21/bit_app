'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class role_menu_access extends Model {
    static associate(models) {
      role_menu_access.belongsTo(models.role, { foreignKey: 'role_id', as: 'role' });
      role_menu_access.belongsTo(models.menu, { foreignKey: 'menu_id', as: 'menu' });
    }
  }

  role_menu_access.init({
    role_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    menu_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    can_view: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    can_create: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    can_update: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    can_delete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'role_menu_access',
    tableName: 'role_menu_access',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return role_menu_access;
};
