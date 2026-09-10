import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  BarChart3,
  CheckCircle2,
  Hourglass,
  Loader2,
  MessagesSquare,
  Trophy,
  UserRoundCog,
  UserRoundX,
  Users,
  XCircle,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import Badge from "../../components/ui/Badge";
import Alert from "../../components/ui/Alert";
import EmptyState from "../../components/ui/EmptyState";
import { pesanError } from "../../lib/api";
import { statistik } from "../../features/permohonan/permohonanApi";
import type { Statistik } from "../../features/permohonan/types";
import { daftarBeasiswa } from "../../features/beasiswa/beasiswaApi";
import type { InternalContext } from "../../config/nav";

export default function AdminDashboard() {
  const { badge } = useOutletContext<InternalContext>();

  const [stat, setStat] = useState<Statistik | null>(null);
  /** Kuota tinggal di service Master, jadi digabungkan di sini per program. */
  const [kuota, setKuota] = useState<Record<number, number>>({});
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pemicu, setPemicu] = useState(0);
  const muatUlang = useCallback(() => setPemicu((p) => p + 1), []);

  useEffect(() => {
    let aktif = true;

    (async () => {
      // `await` di depan memindahkan setState keluar dari fase sinkron effect.
      await Promise.resolve();
      if (!aktif) return;
      setMemuat(true);

      try {
        const [s, program] = await Promise.all([
          statistik(),
          daftarBeasiswa({ page: 1, limit: 100 }),
        ]);
        if (!aktif) return;
        setStat(s);
        setKuota(Object.fromEntries(program.data.map((p) => [p.id, p.kuota])));
        setError(null);
      } catch (e) {
        if (!aktif) return;
        setError(pesanError(e, "Gagal memuat statistik pendaftaran"));
        setStat(null);
      } finally {
        if (aktif) setMemuat(false);
      }
    })();

    return () => {
      aktif = false;
    };
  }, [pemicu]);

  return (
    <>
      <PageHeader
        title="Panel Administrator"
        subtitle="Manajemen Sistem Pendaftaran & Seleksi Beasiswa Pelatihan"
        actions={
          <Badge tone="brand" className="px-3 py-2">
            <UserRoundCog size={15} /> {badge}
          </Badge>
        }
      />

      {error && (
        <div className="mb-5">
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
        <div className="flex items-center justify-center gap-2 py-20 text-sm font-semibold text-slate-500">
          <Loader2 size={18} className="animate-spin text-brand-600" /> Memuat statistik…
        </div>
      ) : (
        stat && (
          <>
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-800">
              <BarChart3 size={18} className="text-brand-600" />
              Ringkasan Statistik Pendaftaran
            </h2>

            <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total Pendaftaran Masuk"
                value={stat.total_masuk}
                tone="brand"
                icon={Users}
              />
              <StatCard
                label="Proses Administrasi"
                value={stat.ringkas.menunggu_verifikasi}
                tone="info"
                icon={Hourglass}
              />
              <StatCard
                label="Perlu Revisi Peserta"
                value={stat.ringkas.perlu_revisi}
                tone="warning"
                icon={MessagesSquare}
              />
              <StatCard
                label="Gugur Administrasi"
                value={stat.per_status.DITOLAK_ADMIN}
                tone="danger"
                icon={XCircle}
              />
            </div>

            <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Proses Wawancara"
                value={stat.ringkas.menunggu_wawancara}
                tone="info"
                icon={MessagesSquare}
              />
              <StatCard
                label="Menunggu Penetapan"
                value={stat.ringkas.menunggu_penetapan}
                tone="warning"
                icon={Hourglass}
              />
              <StatCard
                label="Diterima"
                value={stat.per_status.DITERIMA}
                tone="success"
                icon={Trophy}
              />
              <StatCard
                label="Tidak Lulus Wawancara"
                value={stat.per_status.TIDAK_LULUS_WAWANCARA}
                tone="neutral"
                icon={UserRoundX}
              />
            </div>

            <div className="card">
              <div className="card-head">
                <span className="card-title">
                  <CheckCircle2 size={16} className="text-brand-600" />
                  Rekap Per Program Pelatihan
                </span>
                <span className="text-xs text-slate-500">
                  Draft yang belum dikirim tidak dihitung
                </span>
              </div>

              {stat.per_beasiswa.length === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title="Belum ada pendaftaran masuk"
                  description="Rekap per program muncul setelah ada peserta yang mengirim pendaftarannya."
                />
              ) : (
                <div className="table-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Program Pelatihan</th>
                        <th>Kuota</th>
                        <th>Pendaftar</th>
                        <th>Lolos Administrasi</th>
                        <th>Diterima</th>
                        <th className="w-56">Keterisian Kuota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stat.per_beasiswa.map((r) => {
                        const k = kuota[r.beasiswa_id];
                        const persen = k ? Math.round((r.diterima / k) * 100) : null;

                        return (
                          <tr key={r.beasiswa_id}>
                            <td className="font-bold text-slate-800">{r.beasiswa_nama}</td>
                            <td>{k ?? "—"}</td>
                            <td>{r.pendaftar}</td>
                            <td>{r.lolos_admin}</td>
                            <td className="font-bold text-emerald-600">{r.diterima}</td>
                            <td>
                              {persen === null ? (
                                <span className="text-xs text-slate-400">
                                  Kuota tidak diketahui
                                </span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="h-2 grow overflow-hidden rounded-full bg-slate-200">
                                    <div
                                      className="h-full rounded-full bg-brand-500"
                                      style={{ width: `${Math.min(100, persen)}%` }}
                                    />
                                  </div>
                                  <span className="w-10 text-right text-xs font-bold text-slate-600">
                                    {persen}%
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )
      )}
    </>
  );
}
