import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  FileText,
  History,
  Loader2,
  NotebookPen,
  PencilLine,
} from "lucide-react";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import PilihProgram from "../../components/peserta/PilihProgram";
import { pesanError } from "../../lib/api";
import {
  buatPermohonan,
  detailPermohonan,
  permohonanSaya,
} from "../../features/permohonan/permohonanApi";
import {
  LABEL_STATUS,
  TONE_STATUS,
  type PermohonanLengkap,
  type StatusPermohonan,
} from "../../features/permohonan/types";

/** Status yang sudah selesai — peserta boleh mendaftar program lain lagi. */
const STATUS_FINAL: StatusPermohonan[] = [
  "DITOLAK_ADMIN",
  "TIDAK_LULUS_WAWANCARA",
  "DITERIMA",
  "TIDAK_DITERIMA",
];

function waktuIndonesia(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [permohonan, setPermohonan] = useState<PermohonanLengkap | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sedangMembuat, setSedangMembuat] = useState<number | null>(null);

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
        const daftar = await permohonanSaya();
        if (!aktif) return;

        // Yang ditampilkan permohonan terbaru; peserta hanya boleh punya satu
        // pendaftaran aktif.
        const terbaru = daftar[0];
        setPermohonan(terbaru ? await detailPermohonan(terbaru.id) : null);
        if (!aktif) return;
        setError(null);
      } catch (e) {
        if (!aktif) return;
        setError(pesanError(e, "Gagal memuat data pendaftaran Anda"));
        setPermohonan(null);
      } finally {
        if (aktif) setMemuat(false);
      }
    })();

    return () => {
      aktif = false;
    };
  }, [pemicu]);

  /**
   * Memilih program = membuat draft permohonan, lalu masuk ke wizard-nya.
   * Kalau programnya sudah pernah dipilih, langsung buka formulirnya.
   */
  async function pilihProgram(beasiswaId: number) {
    if (permohonan?.beasiswa_id === beasiswaId) {
      navigate(`/peserta/formulir/${permohonan.id}`);
      return;
    }

    setSedangMembuat(beasiswaId);
    setError(null);
    try {
      const baru = await buatPermohonan(beasiswaId);
      navigate(`/peserta/formulir/${baru.id}`);
    } catch (e) {
      setError(pesanError(e, "Gagal membuat pendaftaran"));
    } finally {
      setSedangMembuat(null);
    }
  }

  if (memuat) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm font-semibold text-slate-500">
        <Loader2 size={18} className="animate-spin text-brand-600" /> Memuat dashboard…
      </div>
    );
  }

  const aktif = permohonan && !STATUS_FINAL.includes(permohonan.status);
  const bisaDisunting = permohonan && !permohonan.is_locked;

  return (
    <div className="space-y-6">
      {error && (
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
      )}

      {!permohonan && (
        <Alert tone="brand" title="Selamat Datang! Silakan Pilih Program Pelatihan">
          Setiap peserta hanya diperbolehkan mendaftar pada{" "}
          <b>1 (satu) program pelatihan saja</b>. Pilih programnya di bawah, lalu isi data
          diri dan unggah dokumen persyaratan. Isian tersimpan pada setiap langkah.
        </Alert>
      )}

      <div className="card">
        <div className="card-head">
          <span className="card-title">
            <FileText size={16} className="text-brand-600" />
            Pendaftaran Aktif Anda
          </span>
          {permohonan && (
            <Badge tone={TONE_STATUS[permohonan.status]}>
              {LABEL_STATUS[permohonan.status]}
            </Badge>
          )}
        </div>

        {!permohonan ? (
          <EmptyState
            icon={NotebookPen}
            title="Anda belum memulai pendaftaran"
            description="Pilih salah satu program pelatihan pada katalog di bawah untuk mulai mengisi formulir. Isian akan tersimpan otomatis pada setiap langkah."
          />
        ) : (
          <div className="space-y-5 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-slate-500">Program Pelatihan</p>
                <p className="font-bold text-slate-800">{permohonan.beasiswa_nama}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Kode Permohonan</p>
                <p className="font-mono font-bold text-slate-800">
                  {permohonan.kode_permohonan}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Terakhir Diperbarui</p>
                <p className="font-semibold text-slate-700">
                  {waktuIndonesia(permohonan.updated_at)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Dikirim Pada</p>
                <p className="font-semibold text-slate-700">
                  {permohonan.submitted_at
                    ? waktuIndonesia(permohonan.submitted_at)
                    : "Belum dikirim"}
                </p>
              </div>
            </div>

            {permohonan.status === "REVISI" && (
              <Alert tone="warning" title="Verifikator Meminta Perbaikan">
                {permohonan.verifikasi.at(-1)?.catatan ??
                  "Silakan periksa kembali isian dan berkas Anda."}
              </Alert>
            )}

            {permohonan.status === "DITERIMA" && (
              <Alert tone="success" title="Selamat, Anda Diterima!">
                {permohonan.hasil?.catatan ??
                  "Panitia akan menghubungi Anda untuk tahap berikutnya."}
              </Alert>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate(`/peserta/formulir/${permohonan.id}`)}
                className="btn btn-primary"
              >
                <PencilLine size={16} />
                {bisaDisunting ? "Lanjutkan Isi Formulir" : "Lihat Formulir"}
              </button>
            </div>

            {permohonan.riwayat_status.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <History size={15} /> Riwayat Status
                </p>
                <ol className="space-y-2.5">
                  {[...permohonan.riwayat_status]
                    .sort((a, b) => b.id - a.id)
                    .map((r) => (
                      <li key={r.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                        <ClipboardList size={13} className="shrink-0 text-slate-400" />
                        <span className="font-semibold text-slate-700">
                          {LABEL_STATUS[r.status_ke as StatusPermohonan] ?? r.status_ke}
                        </span>
                        <span className="text-xs text-slate-400">
                          {waktuIndonesia(r.created_at)}
                        </span>
                        {r.catatan && (
                          <span className="w-full text-xs text-slate-500">{r.catatan}</span>
                        )}
                      </li>
                    ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      <PilihProgram
        beasiswaTerpilih={aktif ? permohonan.beasiswa_id : undefined}
        onPilih={pilihProgram}
        sedangMembuat={sedangMembuat}
      />
    </div>
  );
}
