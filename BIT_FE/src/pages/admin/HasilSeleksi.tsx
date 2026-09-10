import { useCallback, useEffect, useState } from "react";
import {
  Award,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Gavel,
  Loader2,
  Search,
  Trophy,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Badge from "../../components/ui/Badge";
import Alert from "../../components/ui/Alert";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import { Field } from "../../components/ui/Field";
import { pesanError } from "../../lib/api";
import {
  daftarPermohonan,
  detailPermohonan,
  tetapkanHasilAkhir,
} from "../../features/permohonan/permohonanApi";
import {
  LABEL_STATUS,
  TONE_STATUS,
  tanggalIndonesia,
  type MetaHalaman,
  type PermohonanRingkas,
  type StatusPermohonan,
} from "../../features/permohonan/types";
import { daftarBeasiswa } from "../../features/beasiswa/beasiswaApi";
import type { Beasiswa } from "../../features/beasiswa/types";

const LIMIT = 10;

/** Status yang tampil di halaman ini (sama dengan `tahap=hasil`). */
const STATUS_TAHAP: StatusPermohonan[] = [
  "LULUS_WAWANCARA",
  "DITERIMA",
  "TIDAK_DITERIMA",
];

/**
 * Unduh sebagai CSV ber-BOM UTF-8 — dikenali Excel apa adanya, termasuk
 * huruf beraksen. Endpoint `.xlsx` di service Transaksi belum ada; begitu
 * tersedia, tombolnya tinggal diarahkan ke sana.
 */
function unduhCsv(baris: PermohonanRingkas[]) {
  const kolom = ["Kode Permohonan", "NIK", "Nama Peserta", "Program", "Status"];
  const sel = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const isi = [
    kolom.map(sel).join(","),
    ...baris.map((p) =>
      [
        p.kode_permohonan,
        p.pendaftar?.nik ?? "",
        p.pendaftar?.nama_lengkap ?? "",
        p.beasiswa_nama,
        LABEL_STATUS[p.status],
      ]
        .map(sel)
        .join(","),
    ),
  ].join("\r\n");

  const url = URL.createObjectURL(
    new Blob(["﻿" + isi], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `hasil-seleksi-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HasilSeleksi() {
  const [daftar, setDaftar] = useState<PermohonanRingkas[]>([]);
  const [meta, setMeta] = useState<MetaHalaman | null>(null);
  const [program, setProgram] = useState<Beasiswa[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cari, setCari] = useState("");
  const [cariTertunda, setCariTertunda] = useState("");
  const [filterProgram, setFilterProgram] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusPermohonan | "">("");
  const [halaman, setHalaman] = useState(1);

  const [pemicu, setPemicu] = useState(0);
  const muatUlang = useCallback(() => setPemicu((p) => p + 1), []);

  // Penetapan hasil akhir
  const [akanDitetapkan, setAkanDitetapkan] = useState<PermohonanRingkas | null>(null);
  const [statusAkhir, setStatusAkhir] = useState<"DITERIMA" | "TIDAK_DITERIMA">("DITERIMA");
  const [catatan, setCatatan] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);
  const [errorSimpan, setErrorSimpan] = useState<string | null>(null);
  const [nilai, setNilai] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCariTertunda(cari);
      setHalaman(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [cari]);

  useEffect(() => {
    let aktif = true;

    (async () => {
      await Promise.resolve();
      if (!aktif) return;
      setMemuat(true);

      try {
        const [hasil, p] = await Promise.all([
          daftarPermohonan({
            tahap: "hasil",
            q: cariTertunda,
            status: filterStatus,
            beasiswa_id: filterProgram ? Number(filterProgram) : undefined,
            page: halaman,
            limit: LIMIT,
          }),
          daftarBeasiswa({ page: 1, limit: 100 }),
        ]);
        if (!aktif) return;
        setDaftar(hasil.data);
        setMeta(hasil.meta);
        setProgram(p.data);
        setError(null);
      } catch (e) {
        if (!aktif) return;
        setError(pesanError(e, "Gagal memuat hasil seleksi"));
        setDaftar([]);
        setMeta(null);
      } finally {
        if (aktif) setMemuat(false);
      }
    })();

    return () => {
      aktif = false;
    };
  }, [cariTertunda, filterStatus, filterProgram, halaman, pemicu]);

  /** Nilai wawancara tidak ikut di daftar ringkas, jadi diambil saat modal dibuka. */
  async function bukaPenetapan(p: PermohonanRingkas) {
    setAkanDitetapkan(p);
    setStatusAkhir("DITERIMA");
    setCatatan("");
    setErrorSimpan(null);
    setNilai(null);

    try {
      const detail = await detailPermohonan(p.id);
      const terakhir = detail.wawancara.at(-1);
      setNilai(terakhir ? Number(terakhir.nilai_total).toFixed(2) : "—");
    } catch {
      setNilai("—");
    }
  }

  async function simpanPenetapan() {
    if (!akanDitetapkan) return;
    setMenyimpan(true);
    setErrorSimpan(null);

    try {
      await tetapkanHasilAkhir(akanDitetapkan.id, {
        status_akhir: statusAkhir,
        catatan: catatan || undefined,
      });
      setAkanDitetapkan(null);
      muatUlang();
    } catch (e) {
      setErrorSimpan(pesanError(e, "Gagal menetapkan hasil akhir"));
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Hasil Kelulusan Peserta"
        subtitle="Rekap hasil seleksi wawancara dan penetapan status final peserta"
        actions={
          <button
            type="button"
            disabled={daftar.length === 0}
            onClick={() => unduhCsv(daftar)}
            title="Mengunduh baris pada halaman ini sebagai CSV (bisa dibuka Excel)"
            className="btn btn-success disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileSpreadsheet size={16} /> Export Excel
          </button>
        }
      />

      <div className="card">
        <div className="card-head">
          <span className="card-title">
            <Trophy size={16} className="text-brand-600" />
            Hasil Seleksi (Wawancara &amp; Final)
          </span>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterProgram}
              onChange={(e) => {
                setFilterProgram(e.target.value);
                setHalaman(1);
              }}
              className="input py-2 text-sm sm:w-56"
            >
              <option value="">Semua Program Pelatihan</option>
              {program.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as StatusPermohonan | "");
                setHalaman(1);
              }}
              className="input py-2 text-sm sm:w-52"
            >
              <option value="">Semua Status</option>
              {STATUS_TAHAP.map((s) => (
                <option key={s} value={s}>
                  {LABEL_STATUS[s]}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari nama / NIK / kode..."
                className="input py-2 pl-9 text-sm sm:w-56"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4">
            <Alert
              tone="danger"
              action={
                <button type="button" onClick={muatUlang} className="btn btn-sm btn-outline">
                  Coba lagi
                </button>
              }
            >
              {error}
            </Alert>
          </div>
        )}

        {memuat ? (
          <div className="flex items-center justify-center gap-2 py-14 text-sm font-semibold text-slate-500">
            <Loader2 size={18} className="animate-spin text-brand-600" /> Memuat hasil…
          </div>
        ) : daftar.length === 0 && !error ? (
          <EmptyState
            icon={Trophy}
            title="Belum ada peserta yang lulus wawancara"
            description={
              cariTertunda || filterStatus || filterProgram
                ? "Tidak ada data yang cocok dengan filter yang dipilih."
                : "Peserta muncul di sini setelah lembaga seleksi menyelesaikan penilaian wawancara."
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th className="w-12">No</th>
                  <th>NIK &amp; Nama Peserta</th>
                  <th>Program Pelatihan</th>
                  <th>Tanggal Kirim</th>
                  <th>Status Final</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((p, i) => (
                  <tr key={p.id}>
                    <td className="text-slate-400">{(halaman - 1) * LIMIT + i + 1}</td>
                    <td>
                      <p className="font-bold text-slate-800">
                        {p.pendaftar?.nama_lengkap ?? "—"}
                      </p>
                      <p className="font-mono text-xs text-slate-500">
                        {p.pendaftar?.nik ? `NIK: ${p.pendaftar.nik}` : p.kode_permohonan}
                      </p>
                    </td>
                    <td>{p.beasiswa_nama}</td>
                    <td className="whitespace-nowrap">
                      {tanggalIndonesia(p.submitted_at)}
                    </td>
                    <td>
                      {p.status === "DITERIMA" ? (
                        <Badge tone="success">
                          <Award size={12} /> DITERIMA
                        </Badge>
                      ) : (
                        <Badge tone={TONE_STATUS[p.status]}>
                          {LABEL_STATUS[p.status]}
                        </Badge>
                      )}
                    </td>
                    <td className="text-right">
                      {p.status === "LULUS_WAWANCARA" ? (
                        <button
                          type="button"
                          onClick={() => bukaPenetapan(p)}
                          className="btn btn-sm btn-primary"
                        >
                          <Gavel size={14} /> Tetapkan Hasil
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Sudah ditetapkan</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
            <span>
              Halaman {meta.page} dari {meta.total_halaman} — {meta.total} peserta
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={meta.page <= 1}
                onClick={() => setHalaman((h) => h - 1)}
                className="btn btn-sm btn-outline disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={15} /> Sebelumnya
              </button>
              <button
                type="button"
                disabled={meta.page >= meta.total_halaman}
                onClick={() => setHalaman((h) => h + 1)}
                className="btn btn-sm btn-outline disabled:cursor-not-allowed disabled:opacity-50"
              >
                Berikutnya <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------------- Penetapan hasil akhir ---------------- */}
      <Modal
        open={akanDitetapkan !== null}
        onClose={() => setAkanDitetapkan(null)}
        title="Penetapan Hasil Akhir"
        subtitle={akanDitetapkan?.kode_permohonan}
        icon={<Gavel size={20} />}
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setAkanDitetapkan(null)}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={simpanPenetapan}
              disabled={menyimpan}
              className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {menyimpan && <Loader2 size={15} className="animate-spin" />}
              Tetapkan
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {errorSimpan && <Alert tone="danger">{errorSimpan}</Alert>}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-800">
              {akanDitetapkan?.pendaftar?.nama_lengkap ?? "—"}
            </p>
            <p className="text-xs text-slate-500">{akanDitetapkan?.beasiswa_nama}</p>
            <p className="mt-2 text-xs text-slate-500">
              Nilai wawancara:{" "}
              <span className="font-bold text-slate-700">
                {nilai ?? "memuat…"}
              </span>
            </p>
          </div>

          <Field label="Status Akhir" required>
            <select
              className="input"
              value={statusAkhir}
              onChange={(e) =>
                setStatusAkhir(e.target.value as "DITERIMA" | "TIDAK_DITERIMA")
              }
            >
              <option value="DITERIMA">Diterima</option>
              <option value="TIDAK_DITERIMA">Tidak Diterima</option>
            </select>
          </Field>

          <Field label="Catatan" hint="Tampil di dashboard peserta.">
            <textarea
              rows={3}
              maxLength={5000}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="input"
              placeholder="Contoh: Selamat bergabung, panitia akan menghubungi Anda untuk daftar ulang."
            />
          </Field>

          <Alert tone="warning">
            Penetapan bersifat final — status peserta tidak bisa diubah lagi setelah ini.
          </Alert>
        </div>
      </Modal>
    </>
  );
}
