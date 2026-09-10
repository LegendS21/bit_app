import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Gavel,
  Loader2,
  SendHorizontal,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Alert from "../../components/ui/Alert";
import { Field } from "../../components/ui/Field";
import { pesanError } from "../../lib/api";
import { detailPermohonan, simpanWawancara } from "../../features/permohonan/permohonanApi";
import {
  AMBANG_LULUS,
  LABEL_STATUS,
  TONE_STATUS,
  tanggalIndonesia,
  type PermohonanLengkap,
} from "../../features/permohonan/types";

/**
 * Aspek penilaian beserta bobotnya.
 *
 * Bobot dikirim apa adanya ke backend, dan backend yang menghitung nilai
 * akhirnya sebagai rata-rata berbobot — angka di layar ini cuma pratinjau,
 * bukan yang disimpan. Nanti daftar aspek ini sebaiknya jadi data master
 * supaya bisa diatur admin tanpa mengubah kode.
 */
const ASPEK = [
  { kunci: "Komunikasi & Sikap", bobot: 3 },
  { kunci: "Pemahaman Teknis & Motivasi", bobot: 4 },
  { kunci: "Komitmen & Kehadiran Pelatihan", bobot: 3 },
] as const;

const TOTAL_BOBOT = ASPEK.reduce((n, a) => n + a.bobot, 0);

export default function FormPenilaian() {
  const { id } = useParams();
  const permohonanId = Number(id);
  const navigate = useNavigate();

  const [data, setData] = useState<PermohonanLengkap | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [errorMuat, setErrorMuat] = useState<string | null>(null);

  const [skor, setSkor] = useState<Record<string, string>>(
    Object.fromEntries(ASPEK.map((a) => [a.kunci, ""])),
  );
  const [hasil, setHasil] = useState<"LULUS" | "TIDAK_LULUS">("LULUS");
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [catatan, setCatatan] = useState("");

  const [menyimpan, setMenyimpan] = useState(false);
  const [errorSimpan, setErrorSimpan] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(permohonanId)) return;
    let aktif = true;

    (async () => {
      await Promise.resolve();
      if (!aktif) return;
      setMemuat(true);

      try {
        const p = await detailPermohonan(permohonanId);
        if (!aktif) return;
        setData(p);

        // Kalau sudah pernah dinilai, tampilkan penilaian terakhirnya.
        const terakhir = p.wawancara.at(-1);
        if (terakhir) {
          setHasil(terakhir.hasil);
          setCatatan(terakhir.catatan ?? "");
          if (terakhir.tgl_wawancara) setTanggal(terakhir.tgl_wawancara.slice(0, 10));
          if (terakhir.detail?.length) {
            setSkor(
              Object.fromEntries(terakhir.detail.map((d) => [d.aspek, String(d.skor)])),
            );
          }
        }
        setErrorMuat(null);
      } catch (e) {
        if (!aktif) return;
        setErrorMuat(pesanError(e, "Gagal memuat data peserta"));
      } finally {
        if (aktif) setMemuat(false);
      }
    })();

    return () => {
      aktif = false;
    };
  }, [permohonanId]);

  // Pratinjau nilai akhir — rumusnya sama dengan yang dipakai backend.
  const nilaiAkhir =
    ASPEK.reduce((n, a) => n + (Number(skor[a.kunci]) || 0) * a.bobot, 0) / TOTAL_BOBOT;

  const semuaTerisi = ASPEK.every((a) => skor[a.kunci] !== "");

  async function kirim() {
    if (!data) return;
    setMenyimpan(true);
    setErrorSimpan(null);

    try {
      await simpanWawancara(data.id, {
        tgl_wawancara: tanggal || undefined,
        hasil,
        catatan: catatan || undefined,
        // `nilai_total` tidak dikirim — backend yang menghitungnya dari sini.
        detail: ASPEK.map((a) => ({
          aspek: a.kunci,
          skor: Number(skor[a.kunci]) || 0,
          bobot: a.bobot,
        })),
      });
      navigate("/lembaga-seleksi", { replace: true });
    } catch (e) {
      setErrorSimpan(pesanError(e, "Gagal menyimpan penilaian wawancara"));
    } finally {
      setMenyimpan(false);
    }
  }

  if (memuat) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm font-semibold text-slate-500">
        <Loader2 size={18} className="animate-spin text-brand-600" /> Memuat data peserta…
      </div>
    );
  }

  if (errorMuat || !data) {
    return (
      <div className="space-y-4">
        <Alert tone="danger">{errorMuat ?? "Permohonan tidak ditemukan"}</Alert>
        <Link to="/lembaga-seleksi" className="btn btn-outline">
          <ArrowLeft size={15} /> Kembali
        </Link>
      </div>
    );
  }

  const bisaDinilai = ["LULUS_ADMIN", "DALAM_WAWANCARA"].includes(data.status);
  const terakhir = data.wawancara.at(-1);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/lembaga-seleksi" className="btn btn-outline btn-icon">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Form Penilaian &amp; Hasil Wawancara
            </h1>
            <p className="text-sm text-slate-500">
              Kode Pendaftaran:{" "}
              <span className="font-mono font-semibold">{data.kode_permohonan}</span>
            </p>
          </div>
        </div>
        <Badge tone={TONE_STATUS[data.status]}>{LABEL_STATUS[data.status]}</Badge>
      </div>

      {!bisaDinilai && (
        <div className="mb-5">
          <Alert tone="info" title="Peserta ini sudah selesai dinilai">
            Statusnya <b>{LABEL_STATUS[data.status]}</b>
            {terakhir && ` dengan nilai akhir ${Number(terakhir.nilai_total).toFixed(2)}`}.
            Halaman ini ditampilkan sebagai riwayat.
          </Alert>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {errorSimpan && <Alert tone="danger">{errorSimpan}</Alert>}

          {/* ---------------- Identitas peserta ---------------- */}
          <div className="card card-body grid gap-3 sm:grid-cols-2">
            {[
              ["Nama Peserta", data.biodata?.nama_lengkap ?? "—"],
              ["NIK", data.biodata?.nik ?? "—"],
              ["Program Pelatihan", data.beasiswa_nama],
              ["Kontak", data.biodata ? `${data.biodata.no_hp} · ${data.biodata.email}` : "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-xs font-semibold text-slate-500">{k}</p>
                <p className="font-bold text-slate-800">{v}</p>
              </div>
            ))}
            <div>
              <p className="text-xs font-semibold text-slate-500">Status Administrasi</p>
              <Badge tone="success" className="mt-1">
                <CheckCircle2 size={12} /> Lolos Administrasi
              </Badge>
            </div>
          </div>

          {/* ---------------- Skor ---------------- */}
          <fieldset disabled={!bisaDinilai} className="card">
            <div className="card-head">
              <span className="card-title">
                <ClipboardCheck size={16} className="text-brand-600" />
                Seksi 1: Input Skor Penilaian (Skala 0 - 100)
              </span>
            </div>
            <div className="card-body grid gap-4 sm:grid-cols-2">
              {ASPEK.map((a) => (
                <Field
                  key={a.kunci}
                  label={`${a.kunci} (bobot ${a.bobot})`}
                  required
                >
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={skor[a.kunci] ?? ""}
                    onChange={(e) =>
                      setSkor((s) => ({ ...s, [a.kunci]: e.target.value }))
                    }
                    className="input"
                    placeholder="0 - 100"
                  />
                </Field>
              ))}

              <Field
                label="Nilai Akhir (dihitung server)"
                hint="Rata-rata berbobot. Angka final dihitung ulang backend saat disimpan."
              >
                <input
                  type="text"
                  readOnly
                  value={semuaTerisi ? nilaiAkhir.toFixed(2) : "—"}
                  className="input border-brand-300 bg-brand-50 text-lg font-extrabold text-brand-700"
                />
              </Field>
            </div>
          </fieldset>

          {/* ---------------- Keputusan ---------------- */}
          <fieldset disabled={!bisaDinilai} className="card border-brand-200">
            <div className="flex items-center gap-2 rounded-t-xl bg-linear-to-r from-brand-600 to-brand-700 px-5 py-3 text-sm font-bold text-white">
              <Gavel size={16} /> Seksi 2: Update Status Wawancara &amp; Keputusan
            </div>
            <div className="card-body space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tanggal Wawancara">
                  <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="Status Wawancara" required>
                  <select
                    className="input"
                    value={hasil}
                    onChange={(e) => setHasil(e.target.value as "LULUS" | "TIDAK_LULUS")}
                  >
                    <option value="LULUS">Lulus Wawancara</option>
                    <option value="TIDAK_LULUS">Tidak Lulus Wawancara</option>
                  </select>
                </Field>
              </div>
              <Field
                label="Catatan / Ringkasan Evaluasi"
                hint="Ringkasan ini menjadi dasar keputusan akhir Admin."
              >
                <textarea
                  rows={4}
                  maxLength={5000}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="input"
                  placeholder="Tuliskan catatan hasil wawancara, kelebihan, atau alasan keputusan..."
                />
              </Field>
            </div>
          </fieldset>
        </div>

        {/* ---------------- Ringkasan samping ---------------- */}
        <aside className="lg:col-span-1">
          <div className="card sticky top-6">
            <div className="card-head">
              <span className="card-title">Ringkasan Penilaian</span>
            </div>
            <div className="card-body">
              <div
                className={`rounded-xl p-5 text-center text-white ${
                  nilaiAkhir >= AMBANG_LULUS
                    ? "bg-linear-to-br from-emerald-500 to-emerald-700"
                    : "bg-linear-to-br from-rose-500 to-rose-700"
                }`}
              >
                <p className="text-xs font-semibold text-white/80">Nilai Akhir</p>
                <p className="text-4xl font-extrabold">
                  {semuaTerisi ? nilaiAkhir.toFixed(2) : "—"}
                </p>
                <p className="mt-1 text-xs text-white/80">
                  Ambang kelulusan {AMBANG_LULUS.toFixed(2)}
                </p>
              </div>

              <ul className="mt-4 space-y-2.5">
                {ASPEK.map((a) => (
                  <li key={a.kunci}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">{a.kunci}</span>
                      <span className="font-bold text-slate-800">
                        {skor[a.kunci] || 0}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{
                          width: `${Math.min(100, Math.max(0, Number(skor[a.kunci]) || 0))}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>

              {terakhir && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  Dinilai <b>{terakhir.penilai_nama}</b> pada{" "}
                  {tanggalIndonesia(terakhir.submitted_at)} — nilai{" "}
                  <b>{Number(terakhir.nilai_total).toFixed(2)}</b>.
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2 border-t border-slate-200 pt-4">
                {bisaDinilai && (
                  <button
                    type="button"
                    disabled={menyimpan || !semuaTerisi}
                    onClick={kirim}
                    className="btn btn-success w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {menyimpan ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <SendHorizontal size={16} />
                    )}
                    Submit Hasil Wawancara
                  </button>
                )}
                <Link to="/lembaga-seleksi" className="btn btn-outline w-full">
                  {bisaDinilai ? "Batal" : "Kembali"}
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
