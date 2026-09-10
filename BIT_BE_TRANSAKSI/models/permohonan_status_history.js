'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  /**
   * Jejak tiap perpindahan status. Wajib ditulis dalam transaksi yang sama
   * dengan perubahan statusnya, supaya tidak ada perpindahan yang lolos
   * tanpa tercatat.
   */
  class permohonan_status_history extends Model {
    static associate(models) {
      permohonan_status_history.belongsTo(models.permohonan, {
        foreignKey: 'permohonan_id',
        as: 'permohonan'
      });
    }
  }

  permohonan_status_history.init({
    permohonan_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    // Sengaja VARCHAR, bukan ENUM: riwayat harus tetap terbaca apa adanya
    // walau daftar status kelak berubah. Kosong = baris pertama (pembuatan).
    status_dari: DataTypes.STRING(30),
    status_ke: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    // Logical reference ke db_rbac.users.id. Boleh kosong kalau perpindahannya
    // dilakukan sistem, bukan orang.
    actor_id: DataTypes.BIGINT.UNSIGNED,
    actor_role: DataTypes.STRING(50),
    catatan: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'permohonan_status_history',
    tableName: 'permohonan_status_history',
    underscored: true,
    // Hanya `created_at`: baris riwayat tidak pernah diubah.
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  return permohonan_status_history;
};
