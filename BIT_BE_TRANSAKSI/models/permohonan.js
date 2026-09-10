'use strict';
const { Model } = require('sequelize');
const { STATUS_PERMOHONAN } = require('../helpers/statusPermohonan.js');

module.exports = (sequelize, DataTypes) => {
  class permohonan extends Model {
    static associate(models) {
      // Tiap bagian wizard disimpan di tabelnya sendiri (autosave per section).
      permohonan.hasOne(models.permohonan_biodata, {
        foreignKey: 'permohonan_id',
        as: 'biodata'
      });
      permohonan.hasOne(models.permohonan_pendidikan, {
        foreignKey: 'permohonan_id',
        as: 'pendidikan'
      });
      permohonan.hasMany(models.permohonan_dokumen, {
        foreignKey: 'permohonan_id',
        as: 'dokumen'
      });
      permohonan.hasOne(models.permohonan_persetujuan, {
        foreignKey: 'permohonan_id',
        as: 'persetujuan'
      });

      permohonan.hasMany(models.verifikasi_administrasi, {
        foreignKey: 'permohonan_id',
        as: 'verifikasi'
      });
      permohonan.hasMany(models.seleksi_wawancara, {
        foreignKey: 'permohonan_id',
        as: 'wawancara'
      });
      permohonan.hasOne(models.hasil_seleksi, {
        foreignKey: 'permohonan_id',
        as: 'hasil'
      });
      permohonan.hasMany(models.permohonan_status_history, {
        foreignKey: 'permohonan_id',
        as: 'riwayat_status'
      });
    }
  }

  permohonan.init({
    // PRM-{tahun}-{6 digit}, dirakit lewat sequence_counter + row lock.
    kode_permohonan: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true
    },
    // Logical reference ke db_rbac.users.id — databasenya terpisah per service,
    // jadi tidak ada foreign key ke sana. Diambil dari klaim `uid` token.
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    user_uuid: {
      type: DataTypes.CHAR(36),
      allowNull: false
    },
    // Logical reference ke db_master.beasiswa.id.
    beasiswa_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    // Snapshot: kalau nama program di service Master diubah, histori
    // permohonan ini tetap menunjukkan nama yang berlaku saat mendaftar.
    beasiswa_nama: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM(...STATUS_PERMOHONAN),
      allowNull: false,
      defaultValue: 'DRAFT'
    },
    // Posisi wizard 1..4, supaya peserta bisa melanjutkan dari langkah terakhir.
    current_step: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    // Turunan dari status (lihat helpers/statusPermohonan.js), bukan isian bebas.
    is_locked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    submitted_at: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'permohonan',
    tableName: 'permohonan',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return permohonan;
};
