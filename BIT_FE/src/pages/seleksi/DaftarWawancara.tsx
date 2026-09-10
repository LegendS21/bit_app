import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  MessagesSquare,
  PencilLine,
  Search,
  UserRoundX,
  Users,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Badge from "../../components/ui/Badge";
import Alert from "../../components/ui/Alert";
import EmptyState from "../../components/ui/EmptyState";
import { pesanError } from "../../lib/api";
import { daftarPermohonan, statistik } from "../../features/permohonan/permohonanApi";
import {
  AMBANG_LULUS,
  LABEL_STATUS,
  TONE_STATUS,
  type MetaHalaman,
  type PermohonanRingkas,
  type Statistik,
  type StatusPermohonan,
} from "../../features/permohonan/types";
import type { InternalContext } from "../../config/nav";

const LIMIT = 10;

/** Status yang masuk antrean lembaga seleksi (sama dengan `tahap=wawancara`). */
const STATUS_ANTREAN: StatusPermohonan[] = [
  "LULUS_ADMIN",
  "DALAM_WAWANCARA",
  "LULUS_WAWANCARA",
  "TIDAK_LULUS_WAWANCARA",
];

/** Nilai wawancara tidak ikut di daftar ringkas; diambil dari detail per baris. */
const belumDinilai = (s: StatusPermohonan) =>
  s === "LULUS_ADMIN" || s === "DALAM_WAWANCARA";

export default function DaftarWawancara() {
  const { badge } = useOutletContext<InternalContext>();

  const [daftar, setDaftar] = useState<PermohonanRingkas[]>([]);
  const [meta, setMeta] = useState<MetaHalaman | null>(null);
  const [stat, setStat] = useState<Statistik | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cari, setCari] = useState("");
  const [cariTertunda, setCariTertunda] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusPermohonan | "">("");
  const [halaman, setHalaman] = useState(1);

  const [pemicu, setPemicu] = useState(0);
  const muatUlang = useCallback(() => setPemicu((p) => p + 1), []);

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
        const [hasil, s] = await Promise.all([
          daftarPermohonan({
            tahap: "wawancara",
            q: cariTertunda,
            status: filterStatus,
            page: halaman,
            limit: LIMIT,
          }),
          statistik(),
        ]);
        if (!aktif) return;
        setDaftar(hasil.data);
        setMeta(hasil.meta);
        setStat(s);
        setError(null);
      } catch (e) {
        if (!aktif) return;
        setError(pesanError(e, "Gagal memuat daftar wawancara"));
        setDaftar([]);
        setMeta(null);
      } finally {
        if (aktif) setMemuat(false);
      }
    })();

    return () => {
      aktif = false;
    };
  }, [cariTertunda, filterStatus, halaman, pemicu]);

  return (
    <>
      <PageHeader
        title="Menu Proses Wawancara"
        subtitle="Kelola penilaian wawancara dan hasil seleksi peserta yang lolos administrasi"
        actions={
          <Badge tone="brand" className="px-3 py-2">
            <Building2 size={15} /> {badge}
          </Badge>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Siap Wawancara"
          value={stat?.ringkas.menunggu_wawancara ?? 0}
          tone="brand"
          icon={Users}
        />
        <StatCard
          label="Belum Dinilai"
          value={stat?.per_status.LULUS_ADMIN ?? 0}
          tone="neutral"
          icon={ClipboardList}
        />
        <StatCard
          label="Lulus Wawancara"
          value={
            stat
              ? stat.per_status.LULUS_WAWANCARA +
                stat.per_status.DITERIMA +
                stat.per_status.TIDAK_DITERIMA
              : 0
          }
          tone="success"
          icon={CheckCircle2}
        />
        <StatCard
          label="Tidak Lulus"
          value={stat?.per_status.TIDAK_LULUS_WAWANCARA ?? 0}
          tone="danger"
          icon={UserRoundX}
        />
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-title">
            <MessagesSquare size={16} className="text-brand-600" />
            Daftar Peserta Seleksi Wawancara
          </span>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as StatusPermohonan | "");
                setHalaman(1);
              }}
              className="input py-2 text-sm sm:w-52"
            >
              <option value="">Semua Status Wawancara</option>
              {STATUS_ANTREAN.map((s) => (
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
            <Loader2 size={18} className="animate-spin text-brand-600" /> Memuat daftar…
          </div>
        ) : daftar.length === 0 && !error ? (
          <EmptyState
            icon={MessagesSquare}
            title="Belum ada peserta yang siap diwawancara"
            description={
              cariTertunda || filterStatus
                ? "Tidak ada peserta yang cocok dengan filter yang dipilih."
                : "Peserta akan muncul di sini setelah lolos seleksi administrasi."
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
                  <th>Seleksi Administrasi</th>
                  <th>Status Wawancara</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((p, i) => {
                  const belum = belumDinilai(p.status);
                  return (
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
                      <td>
                        <Badge tone="success">
                          <CheckCircle2 size={12} /> Lolos
                        </Badge>
                      </td>
                      <td>
                        <Badge tone={TONE_STATUS[p.status]}>{LABEL_STATUS[p.status]}</Badge>
                      </td>
                      <td className="text-right">
                        <Link
                          to={`/lembaga-seleksi/${p.id}`}
                          className={`btn btn-sm ${belum ? "btn-primary" : "btn-outline-brand"}`}
                        >
                          <PencilLine size={14} />
                          {belum ? "Input Penilaian" : "Lihat Penilaian"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
            <span>
              Halaman {meta.page} dari {meta.total_halaman} — {meta.total} peserta ·
              ambang kelulusan {AMBANG_LULUS.toFixed(2)}
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
    </>
  );
}
