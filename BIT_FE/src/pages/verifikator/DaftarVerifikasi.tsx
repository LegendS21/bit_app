import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Loader2,
  PencilLine,
  Search,
  UserCircle2,
  XCircle,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Badge from "../../components/ui/Badge";
import Alert from "../../components/ui/Alert";
import EmptyState from "../../components/ui/EmptyState";
import { pesanError } from "../../lib/api";
import { daftarPermohonan, statistik } from "../../features/permohonan/permohonanApi";
import {
  LABEL_STATUS,
  TONE_STATUS,
  tanggalIndonesia,
  type MetaHalaman,
  type PermohonanRingkas,
  type Statistik,
  type StatusPermohonan,
} from "../../features/permohonan/types";
import type { InternalContext } from "../../config/nav";

const LIMIT = 10;

/** Status yang masuk antrean verifikator (sama dengan `tahap=verifikasi`). */
const STATUS_ANTREAN: StatusPermohonan[] = ["DIAJUKAN", "DALAM_VERIFIKASI", "REVISI"];

export default function DaftarVerifikasi() {
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

  // Tunda pencarian supaya tidak memanggil API tiap ketikan.
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
      // `await` di depan memindahkan setState keluar dari fase sinkron effect.
      await Promise.resolve();
      if (!aktif) return;
      setMemuat(true);

      try {
        const [hasil, s] = await Promise.all([
          daftarPermohonan({
            tahap: "verifikasi",
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
        setError(pesanError(e, "Gagal memuat daftar verifikasi"));
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

  // "Lolos administrasi" dihitung dari yang pernah lolos, termasuk yang sudah
  // lanjut ke tahap berikutnya — kalau hanya LULUS_ADMIN, angkanya justru
  // menyusut setiap kali ada peserta yang maju ke wawancara.
  const lolosAdmin = stat
    ? stat.per_status.LULUS_ADMIN +
      stat.per_status.DALAM_WAWANCARA +
      stat.per_status.LULUS_WAWANCARA +
      stat.per_status.TIDAK_LULUS_WAWANCARA +
      stat.per_status.DITERIMA +
      stat.per_status.TIDAK_DITERIMA
    : 0;

  return (
    <>
      <PageHeader
        title="Verifikasi Seleksi Administrasi"
        subtitle="Kelola dan selesaikan verifikasi berkas calon peserta beasiswa"
        actions={
          <Badge tone="brand" className="px-3 py-2">
            <UserCircle2 size={15} /> {badge}
          </Badge>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Perlu Verifikasi"
          value={stat?.ringkas.menunggu_verifikasi ?? 0}
          tone="brand"
          icon={ListChecks}
        />
        <StatCard
          label="Menunggu Revisi Peserta"
          value={stat?.ringkas.perlu_revisi ?? 0}
          tone="warning"
          icon={PencilLine}
        />
        <StatCard
          label="Lolos Administrasi"
          value={lolosAdmin}
          tone="success"
          icon={CheckCircle2}
        />
        <StatCard
          label="Ditolak Administrasi"
          value={stat?.per_status.DITOLAK_ADMIN ?? 0}
          tone="danger"
          icon={XCircle}
        />
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-title">
            <ListChecks size={16} className="text-brand-600" />
            Daftar Pendaftar (Baru Submit &amp; Revisi)
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
              <option value="">Semua Status</option>
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
                className="input py-2 pl-9 text-sm sm:w-64"
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
            icon={ListChecks}
            title="Tidak ada berkas yang menunggu verifikasi"
            description={
              cariTertunda || filterStatus
                ? "Tidak ada pendaftar yang cocok dengan filter yang dipilih."
                : "Semua pendaftaran yang masuk sudah selesai diperiksa."
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
                  <th>Tanggal Submit</th>
                  <th>Status Saat Ini</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((p, i) => (
                  <tr key={p.id}>
                    <td className="text-slate-400">
                      {(halaman - 1) * LIMIT + i + 1}
                    </td>
                    <td>
                      <p className="font-bold text-slate-800">
                        {p.pendaftar?.nama_lengkap ?? "— biodata belum diisi —"}
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
                      <Badge tone={TONE_STATUS[p.status]}>{LABEL_STATUS[p.status]}</Badge>
                    </td>
                    <td className="text-right">
                      <Link to={`/verifikator/${p.id}`} className="btn btn-sm btn-primary">
                        <PencilLine size={14} />
                        {p.status === "REVISI" ? "Lihat" : "Verifikasi Data"}
                      </Link>
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
              Halaman {meta.page} dari {meta.total_halaman} — {meta.total} pendaftar
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
