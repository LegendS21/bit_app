'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class persyaratan extends Model {
    static associate(models) {
      persyaratan.belongsToMany(models.beasiswa, {
        through: models.beasiswa_persyaratan,
        foreignKey: 'persyaratan_id',
        otherKey: 'beasiswa_id',
        as: 'beasiswa'
      });
      persyaratan.hasMany(models.beasiswa_persyaratan, {
        foreignKey: 'persyaratan_id',
        as: 'pemakaian'
      });
    }
  }

  persyaratan.init({
    // KTP, KK, IJAZAH, SURAT_REKOMENDASI
    kode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    nama: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    deskripsi: DataTypes.TEXT,
    // Daftar MIME yang boleh diunggah, dipisah koma. Dipakai service Dokumen
    // sebagai acuan saat memeriksa magic bytes berkas.
    allowed_mime: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'application/pdf,image/jpeg,image/png'
    },
    max_size_kb: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2048
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'persyaratan',
    tableName: 'persyaratan',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return persyaratan;
};
