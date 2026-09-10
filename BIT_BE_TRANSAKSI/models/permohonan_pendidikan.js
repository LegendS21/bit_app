'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  /** Bagian 2 wizard: Latar Belakang Pendidikan & Pekerjaan. */
  class permohonan_pendidikan extends Model {
    static associate(models) {
      permohonan_pendidikan.belongsTo(models.permohonan, {
        foreignKey: 'permohonan_id',
        as: 'permohonan'
      });
    }
  }

  permohonan_pendidikan.init({
    permohonan_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    // Logical reference ke db_master.ref_pendidikan.kode (SD…S3). Disimpan
    // sebagai kode, bukan id, supaya tetap terbaca tanpa memanggil Master.
    pendidikan_kode: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    instansi: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    jurusan: DataTypes.STRING(150),
    tahun_lulus: DataTypes.SMALLINT,
    // Logical reference ke db_master.ref_pekerjaan.kode. Boleh kosong:
    // pelamar yang belum bekerja tetap sah.
    pekerjaan_kode: DataTypes.STRING(30),
    nama_tempat_kerja: DataTypes.STRING(200)
  }, {
    sequelize,
    modelName: 'permohonan_pendidikan',
    tableName: 'permohonan_pendidikan',
    underscored: true,
    timestamps: true,
    createdAt: false,
    updatedAt: 'updated_at'
  });

  return permohonan_pendidikan;
};
