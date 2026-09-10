'use strict';

const { fn, col, Op } = require('sequelize');
const {
  sequelize,
  permohonan,
  permohonan_dokumen,
  verifikasi_administrasi,
  verifikasi_checklist,
  seleksi_wawancara,
  penilaian_detail,
  hasil_seleksi
} = require('../models');

const { badRequest, conflict } = require('../helpers/errors.js');
const { pindahStatus } = require('../helpers/pindahStatus.js');
const { STATUS_PERMOHONAN } = require('../helpers/statusPermohonan.js');
const PermohonanService = require('./permohonanService.js');

const { ambilPermohonan } = PermohonanService.internal;

/**
 * Status yang berarti permohonannya pernah lolos seleksi administrasi —
 * termasuk yang sudah lanjut ke tahap berikutnya.
 */
const LOLOS_ADMIN = [
  "LULUS_ADMIN",
  "DALAM_WAWANCARA",
  "LULUS_WAWANCARA",
  "TIDAK_LULUS_WAWANCARA",
  "DITERIMA",
  "TIDAK_DITERIMA"
];

/** Keputusan verifikator → status permohonan berikutnya. */
const STATUS_DARI_KEPUTUSAN = {
  DISETUJUI: 'LULUS_ADMIN',
  DITOLAK: 'DITOLAK_ADMIN',
  REVISI: 'REVISI'
};

/**
 * Beberapa perpindahan bersifat administratif — "diambil untuk diperiksa",
 * "mulai diwawancara". Daripada menuntut pemanggil menekan dua endpoint,
 * status antaranya dilewati otomatis di sini, tapi **tetap dicatat** di
 * riwayat supaya jejaknya utuh.
 */
async function lewatiStatusAntara(baris, antara, pelaku, t) {
  if (baris.status === antara) return;

  await pindahStatus(baris, antara, {
    actorId: pelaku.actorId,
    actorRole: pelaku.actorRole,
    catatan: pelaku.catatan
  }, t);
}

/** Nama penilai untuk snapshot; token hanya membawa email, bukan nama. */
function namaPelaku(user) {
  return user?.nama || user?.email || `User #${user?.id ?? '?'}`;
}

class SeleksiService {
  /**
   * POST /permohonan/:id/verifikasi — seleksi administrasi (VERIFIKATOR).
   *
   * Menerima permohonan berstatus `DIAJUKAN` maupun `DALAM_VERIFIKASI`.
   * Kalau masih `DIAJUKAN`, perpindahan `DIAJUKAN → DALAM_VERIFIKASI` dicatat
   * lebih dulu, jadi riwayatnya tetap menunjukkan permohonan itu sempat
   * diambil sebelum diputus.
   */
  static async verifikasi(id, data, user) {
    const baris = await ambilPermohonan(id);

    if (!['DIAJUKAN', 'DALAM_VERIFIKASI'].includes(baris.status)) {
      throw conflict(
        `Permohonan berstatus ${baris.status} tidak sedang menunggu verifikasi administrasi`,
        'BUKAN_TAHAP_VERIFIKASI'
      );
    }

    // Checklist harus menunjuk dokumen milik permohonan ini — kalau tidak,
    // verifikator bisa menandai berkas milik pelamar lain.
    const idChecklist = data.checklist.map((c) => c.permohonan_dokumen_id);
    let dokumenSah = [];

    if (idChecklist.length) {
      dokumenSah = await permohonan_dokumen.findAll({
        where: { permohonan_id: baris.id, id: { [Op.in]: idChecklist } },
        attributes: ['id']
      });

      if (dokumenSah.length !== idChecklist.length) {
        throw badRequest(
          'Ada dokumen pada checklist yang bukan milik permohonan ini',
          'DOKUMEN_BUKAN_MILIK_PERMOHONAN'
        );
      }
    }

    const pelaku = { actorId: user.id, actorRole: 'VERIFIKATOR' };

    await sequelize.transaction(async (t) => {
      await lewatiStatusAntara(
        baris,
        'DALAM_VERIFIKASI',
        { ...pelaku, catatan: 'Diambil untuk diperiksa' },
        t
      );

      const putusan = await verifikasi_administrasi.create(
        {
          permohonan_id: baris.id,
          verifikator_id: user.id,
          verifikator_nama: namaPelaku(user),
          keputusan: data.keputusan,
          catatan: data.catatan || null,
          verified_at: new Date()
        },
        { transaction: t }
      );

      for (const c of data.checklist) {
        await verifikasi_checklist.create(
          {
            verifikasi_id: putusan.id,
            permohonan_dokumen_id: c.permohonan_dokumen_id,
            is_sesuai: c.is_sesuai,
            catatan: c.catatan || null
          },
          { transaction: t }
        );

        // Status per berkas ikut diperbarui supaya pelamar tahu berkas mana
        // yang harus diganti, tanpa harus membaca seluruh riwayat verifikasi.
        await permohonan_dokumen.update(
          {
            status_verifikasi: c.is_sesuai ? 'SESUAI' : 'TIDAK_SESUAI',
            catatan: c.catatan || null
          },
          { where: { id: c.permohonan_dokumen_id }, transaction: t }
        );
      }

      await pindahStatus(
        baris,
        STATUS_DARI_KEPUTUSAN[data.keputusan],
        { ...pelaku, catatan: data.catatan || null },
        t
      );
    });

    return PermohonanService.detail(id, user);
  }

  /**
   * POST /permohonan/:id/wawancara — penilaian wawancara (LEMBAGA_SELEKSI).
   *
   * `nilai_total` dihitung di sini sebagai rata-rata berbobot, tidak diterima
   * dari client — supaya angka akhirnya selalu cocok dengan rincian aspeknya.
   */
  static async wawancara(id, data, user) {
    const baris = await ambilPermohonan(id);

    if (!['LULUS_ADMIN', 'DALAM_WAWANCARA'].includes(baris.status)) {
      throw conflict(
        `Permohonan berstatus ${baris.status} belum lolos seleksi administrasi`,
        'BUKAN_TAHAP_WAWANCARA'
      );
    }

    const totalBobot = data.detail.reduce((n, d) => n + Number(d.bobot), 0);
    const nilaiTotal =
      Math.round(
        (data.detail.reduce((n, d) => n + Number(d.skor) * Number(d.bobot), 0) / totalBobot) * 100
      ) / 100;

    const pelaku = { actorId: user.id, actorRole: 'LEMBAGA_SELEKSI' };

    await sequelize.transaction(async (t) => {
      await lewatiStatusAntara(
        baris,
        'DALAM_WAWANCARA',
        { ...pelaku, catatan: 'Masuk tahap wawancara' },
        t
      );

      const penilaian = await seleksi_wawancara.create(
        {
          permohonan_id: baris.id,
          penilai_id: user.id,
          penilai_nama: namaPelaku(user),
          tgl_wawancara: data.tgl_wawancara || null,
          nilai_total: nilaiTotal,
          hasil: data.hasil,
          catatan: data.catatan || null,
          submitted_at: new Date()
        },
        { transaction: t }
      );

      await penilaian_detail.bulkCreate(
        data.detail.map((d) => ({
          wawancara_id: penilaian.id,
          aspek: d.aspek,
          skor: d.skor,
          bobot: d.bobot,
          catatan: d.catatan || null
        })),
        { transaction: t }
      );

      await pindahStatus(
        baris,
        data.hasil === 'LULUS' ? 'LULUS_WAWANCARA' : 'TIDAK_LULUS_WAWANCARA',
        { ...pelaku, catatan: data.catatan || null },
        t
      );
    });

    return PermohonanService.detail(id, user);
  }

  /**
   * POST /permohonan/:id/hasil-akhir — penetapan akhir (ADMIN).
   * Hanya peserta yang lulus wawancara yang bisa ditetapkan.
   */
  static async hasilAkhir(id, data, user) {
    const baris = await ambilPermohonan(id);

    if (baris.status !== 'LULUS_WAWANCARA') {
      throw conflict(
        `Permohonan berstatus ${baris.status} belum lulus wawancara`,
        'BUKAN_TAHAP_HASIL_AKHIR'
      );
    }

    await sequelize.transaction(async (t) => {
      const nilai = {
        permohonan_id: baris.id,
        status_akhir: data.status_akhir,
        ditetapkan_oleh: user.id,
        ditetapkan_at: new Date(),
        catatan: data.catatan || null
      };

      const ada = await hasil_seleksi.findByPk(baris.id, { transaction: t });
      if (ada) await ada.update(nilai, { transaction: t });
      else await hasil_seleksi.create(nilai, { transaction: t });

      await pindahStatus(
        baris,
        data.status_akhir,
        { actorId: user.id, actorRole: 'ADMIN', catatan: data.catatan || null },
        t
      );
    });

    return PermohonanService.detail(id, user);
  }

  /**
   * GET /dashboard/statistik — rekap jumlah per status.
   *
   * Status yang tidak punya baris tetap muncul bernilai 0, supaya kartu di
   * dashboard tidak hilang-timbul mengikuti isi data.
   */
  static async statistik(filter = {}) {
    const where = {};
    if (filter.beasiswa_id) where.beasiswa_id = filter.beasiswa_id;

    const baris = await permohonan.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'jumlah']],
      where,
      group: ['status'],
      raw: true
    });

    const peta = Object.fromEntries(baris.map((b) => [b.status, Number(b.jumlah)]));
    const per_status = Object.fromEntries(STATUS_PERMOHONAN.map((s) => [s, peta[s] || 0]));

    const total = Object.values(per_status).reduce((a, b) => a + b, 0);

    // Rekap per program dihitung di sini, bukan dengan memanggil endpoint ini
    // sekali per program dari frontend. Nama programnya diambil dari snapshot
    // di `permohonan`, jadi tidak perlu memanggil service Master.
    const perProgram = await permohonan.findAll({
      attributes: [
        "beasiswa_id",
        "beasiswa_nama",
        "status",
        [fn("COUNT", col("id")), "jumlah"]
      ],
      where,
      group: ["beasiswa_id", "beasiswa_nama", "status"],
      raw: true
    });

    const petaProgram = new Map();
    for (const b of perProgram) {
      const id = Number(b.beasiswa_id);
      if (!petaProgram.has(id)) {
        petaProgram.set(id, {
          beasiswa_id: id,
          beasiswa_nama: b.beasiswa_nama,
          pendaftar: 0,
          lolos_admin: 0,
          diterima: 0
        });
      }

      const p = petaProgram.get(id);
      const n = Number(b.jumlah);

      // DRAFT belum dikirim, jadi belum terhitung sebagai pendaftar.
      if (b.status !== "DRAFT") p.pendaftar += n;

      // "Lolos administrasi" = pernah lolos, termasuk yang sudah lanjut ke
      // tahap berikutnya — kalau hanya menghitung LULUS_ADMIN, angkanya justru
      // menyusut setiap kali ada yang maju ke wawancara.
      if (LOLOS_ADMIN.includes(b.status)) p.lolos_admin += n;
      if (b.status === "DITERIMA") p.diterima += n;
    }

    return {
      data: {
        total,
        // DRAFT belum dikirim, jadi dipisah dari yang benar-benar masuk antrean.
        total_masuk: total - per_status.DRAFT,
        per_status,
        ringkas: {
          menunggu_verifikasi: per_status.DIAJUKAN + per_status.DALAM_VERIFIKASI,
          perlu_revisi: per_status.REVISI,
          menunggu_wawancara: per_status.LULUS_ADMIN + per_status.DALAM_WAWANCARA,
          menunggu_penetapan: per_status.LULUS_WAWANCARA,
          diterima: per_status.DITERIMA,
          ditolak:
            per_status.DITOLAK_ADMIN +
            per_status.TIDAK_LULUS_WAWANCARA +
            per_status.TIDAK_DITERIMA
        },
        // Diurutkan dari yang paling ramai supaya program tersibuk di atas.
        per_beasiswa: [...petaProgram.values()].sort((a, b) => b.pendaftar - a.pendaftar)
      }
    };
  }
}

module.exports = SeleksiService;
