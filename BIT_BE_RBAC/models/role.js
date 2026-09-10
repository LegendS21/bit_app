'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class role extends Model {
    static associate(models) {
      role.belongsToMany(models.user, {
        through: models.user_role,
        foreignKey: 'role_id',
        otherKey: 'user_id',
        as: 'users'
      });
      role.belongsToMany(models.menu, {
        through: models.role_menu_access,
        foreignKey: 'role_id',
        otherKey: 'menu_id',
        as: 'menus'
      });
      role.hasMany(models.role_menu_access, {
        foreignKey: 'role_id',
        as: 'menu_access'
      });
    }
  }

  role.init({
    // ADMIN, VERIFIKATOR, LEMBAGA_SELEKSI, APPLICANT
    kode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    nama: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    deskripsi: DataTypes.STRING(255),
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'role',
    tableName: 'roles',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return role;
};
