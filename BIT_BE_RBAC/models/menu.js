'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class menu extends Model {
    static associate(models) {
      // Menu bersarang: satu menu bisa punya submenu.
      menu.belongsTo(models.menu, { foreignKey: 'parent_id', as: 'parent' });
      menu.hasMany(models.menu, { foreignKey: 'parent_id', as: 'children' });

      menu.belongsToMany(models.role, {
        through: models.role_menu_access,
        foreignKey: 'menu_id',
        otherKey: 'role_id',
        as: 'roles'
      });
      menu.hasMany(models.role_menu_access, {
        foreignKey: 'menu_id',
        as: 'role_access'
      });
    }
  }

  menu.init({
    parent_id: DataTypes.INTEGER.UNSIGNED,
    kode: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true
    },
    nama: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    // Route pada frontend, contoh: /admin/master/beasiswa
    path: DataTypes.STRING(150),
    icon: DataTypes.STRING(50),
    urutan: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'menu',
    tableName: 'menus',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return menu;
};
