'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class beasiswa extends Model {
    static associate(models) {
      beasiswa.belongsToMany(models.persyaratan, {
        through: models.beasiswa_persyaratan,
        foreignKey: 'beasiswa_id',
        otherKey: 'persyaratan_id',
        as: 'persyaratan'
      });
      beasiswa.hasMany(models.beasiswa_persyaratan, {
        foreignKey: 'beasiswa_id',
        as: 'syarat'
      });
    }
  }

  beasiswa.init({
    // Kode program, dipakai user & dokumen. Contoh: BEA-WEBDEV-2026
    kode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    nama: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    deskripsi: DataTypes.TEXT,
    penyelenggara: DataTypes.STRING(150),
    kuota: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    tgl_buka: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    tgl_tutup: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    // DRAFT belum tampil ke publik; AKTIF sedang menerima pendaftaran;
    // DITUTUP sudah lewat masanya; ARSIP disimpan sebagai riwayat.
    status: {
      type: DataTypes.ENUM('DRAFT', 'AKTIF', 'DITUTUP', 'ARSIP'),
      allowNull: false,
      defaultValue: 'DRAFT'
    },
    // Logical reference ke db_rbac.users.id — databasenya terpisah per service,
    // jadi tidak ada foreign key ke sana.
    created_by: DataTypes.BIGINT.UNSIGNED
  }, {
    sequelize,
    modelName: 'beasiswa',
    tableName: 'beasiswa',
    underscored: true,
    timestamps: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at'
  });

  return beasiswa;
};
