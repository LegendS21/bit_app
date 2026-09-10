'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class user extends Model {
    static associate(models) {
      user.belongsToMany(models.role, {
        through: models.user_role,
        foreignKey: 'user_id',
        otherKey: 'role_id',
        as: 'roles'
      });
      user.hasMany(models.user_role, { foreignKey: 'user_id', as: 'user_roles' });
      user.hasMany(models.refresh_token, { foreignKey: 'user_id', as: 'refresh_tokens' });
      user.hasMany(models.user_token, { foreignKey: 'user_id', as: 'user_tokens' });
    }
  }

  user.init({
    uuid: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      unique: true,
      defaultValue: DataTypes.UUIDV4
    },
    nama: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    // Simpan hash bcrypt/argon2, jangan pernah password mentah.
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    no_hp: DataTypes.STRING(20),
    tipe_user: {
      type: DataTypes.ENUM('APPLICANT', 'INTERNAL'),
      allowNull: false,
      defaultValue: 'APPLICANT'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    email_verified_at: DataTypes.DATE,
    last_login_at: DataTypes.DATE,
    // Dipakai untuk penguncian sementara setelah beberapa kali gagal login.
    failed_attempt: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    locked_until: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'user',
    tableName: 'users',
    underscored: true,
    timestamps: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at'
  });

  return user;
};
