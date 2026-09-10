'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  /** Bagian 1 wizard: Data Diri & Kontak. */
  class permohonan_biodata extends Model {
    static associate(models) {
      permohonan_biodata.belongsTo(models.permohonan, {
        foreignKey: 'permohonan_id',
        as: 'permohonan'
      });
    }
  }

  permohonan_biodata.init({
    // Sekaligus primary key: satu permohonan tepat satu biodata.
    permohonan_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    nik: {
      type: DataTypes.CHAR(16),
      allowNull: false
    },
    nama_lengkap: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    tempat_lahir: DataTypes.STRING(100),
    tgl_lahir: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    jenis_kelamin: DataTypes.ENUM('L', 'P'),
    alamat: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    no_hp: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    no_hp_alt: DataTypes.STRING(20),
    email: {
      type: DataTypes.STRING(150),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'permohonan_biodata',
    tableName: 'permohonan_biodata',
    underscored: true,
    // Sesuai DDL: hanya `updated_at`. Waktu dibuatnya sudah ada di induknya.
    timestamps: true,
    createdAt: false,
    updatedAt: 'updated_at'
  });

  return permohonan_biodata;
};
