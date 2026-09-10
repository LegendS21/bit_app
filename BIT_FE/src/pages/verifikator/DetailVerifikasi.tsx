import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Eye,
  FileCheck2,
  Gavel,
  IdCard,
  Loader2,
  Mail,
  Phone,
  SendHorizontal,
  UserSquare2,
  X,
  XCircle,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Alert from "../../components/ui/Alert";
import { Field, ReadField } from "../../components/ui/Field";
import { pesanError } from "../../lib/api";
import {
  detailPermohonan,
  simpanVerifikasi,
  tautanBerkas,
} from "../../features/permohonan/permohonanApi";
import {
  LABEL_STATUS,
  REF_PEKERJAAN,
  REF_PENDIDIKAN,
  TONE_STATUS,
  tanggalIndonesia,
  ukuranTerbaca,
  type PermohonanLengkap,
  type VerifikasiPayload,
} from "../../features/permohonan/types";

const TAB = [
  { label: "Data Diri & Kontak", icon: UserSquare2 },
  { label: "Pendidikan & Kerja", icon: BookOpen },
  { label: "Upload Dokumen", icon: FileCheck2 },
  { label: "Persetujuan & Keputusan", icon: Gavel },
];

const KEPUTUSAN = [
  { nilai: "DISETUJUI", label: "Disetujui (Lolos Seleksi Administrasi)" },
  { nilai: "REVISI", label: "Revisi (Harus Perbaikan Berkas)" },
  { nilai: "DITOLAK", label: "Ditolak (Gugur Administrasi)" },
] as const;

type Keputusan = (typeof KEPUTUSAN)[number]["nilai"];

/** Baris checklist per dokumen, dikelola sebagai state form. */
type BarisChecklist = { sesuai: boolean; catatan: string };

const namaAcuan = (daftar: { kode: string; nama: string }[], kode: string | null) =>
  daftar.find((d) => d.kode === kode)?.nama ?? kode ?? "—";

export default function DetailVerifikasi() {
  const { id } = useParams();
  const permohonanId = Number(id);
  const navigate = useNavigate();

  const [data, setData] = useState<PermohonanLengkap | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [errorMuat, setErrorMuat] = useState<string | null>(null);

  const [tab, setTab] = useState(0);
  const [checklist, setChecklist] = useState<Record<number, BarisChecklist>>({});
  const [keputusan, setKeputusan] = useState<Keputusan>("DISETUJUI");
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
        // Nilai awal checklist mengikuti hasil pemeriksaan sebelumnya kalau
        // permohonan ini sudah pernah diverifikasi.
        setChecklist(
          Object.fromEntries(
            p.dokumen.map((d) => [
              d.id,
              {
                sesuai: d.status_verifikasi !== "TIDAK_SESUAI",
                catatan: d.catatan ?? "",
              },
            ]),
          ),
        );
        setErrorMuat(null);
      } catch (e) {
        if (!aktif) return;
        setErrorMuat(pesanError(e, "Gagal memuat data pendaftar"));
      } finally {
        if (aktif) setMemuat(false);
      }
    })();

    return () => {
      aktif = false;
    };
  }, [permohonanId]);

  async function lihat(dokumenUuid: string) {
    try {
      window.open(await tautanBerkas(dokumenUuid), "_blank", "noopener");
    } catch (e) {
      setErrorSimpan(pesanError(e, "Gagal membuka berkas"));
    }
  }

  async function kirimKeputusan() {
    if (!data) return;
    setMenyimpan(true);
    setErrorSimpan(null);

    try {
      const payload: VerifikasiPayload = {
        keputusan,
        catatan: catatan || undefined,
        checklist: data.dokumen.map((d) => ({
          permohonan_dokumen_id: d.id,
          is_sesuai: checklist[d.id]?.sesuai ?? true,
          catatan: checklist[d.id]?.catatan || undefined,
        })),
      };

      await simpanVerifikasi(data.id, payload);
      navigate("/verifikator", { replace: true });
    } catch (e) {
      setErrorSimpan(pesanError(e, "Gagal menyimpan keputusan verifikasi"));
    } finally {
      setMenyimpan(false);
    }
  }

  if (memuat) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm font-semibold text-slate-500">
        <Loader2 size={18} className="animate-spin text-brand-600" /> Memuat data pendaftar…
      </div>
    );
  }

  if (errorMuat || !data) {
    return (
      <div className="space-y-4">
        <Alert tone="danger">{errorMuat ?? "Permohonan tidak ditemukan"}</Alert>
        <Link to="/verifikator" className="btn btn-outline">
          <ArrowLeft size={15} /> Kembali
        </Link>
      </div>
    );
  }

  const bisaDiputus = ["DIAJUKAN", "DALAM_VERIFIKASI"].includes(data.status);
  const bio = data.biodata;
  const pend = data.pendidikan;
  const putusanTerakhir = data.verifikasi.at(-1);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/verifikator" className="btn btn-outline btn-icon">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Verifikasi Berkas Seleksi Administrasi
            </h1>
            <p className="text-sm text-slate-500">
              Kode Pendaftaran:{" "}
              <span className="font-mono font-semibold">{data.kode_permohonan}</span> ·{" "}
              {data.beasiswa_nama}
            </p>
          </div>
        </div>
        <Badge tone={TONE_STATUS[data.status]}>{LABEL_STATUS[data.status]}</Badge>
      </div>

      {!bisaDiputus && (
        <div className="mb-5">
          <Alert tone="info" title="Permohonan ini tidak sedang menunggu keputusan">
            Statusnya sekarang <b>{LABEL_STATUS[data.status]}</b>
            {putusanTerakhir &&
              ` — putusan terakhir "${putusanTerakhir.keputusan}" oleh ${putusanTerakhir.verifikator_nama}.`}{" "}
            Halaman ini ditampilkan sebagai riwayat.
          </Alert>
        </div>
      )}

      <div className="card overflow-hidden">
        {/* ---------------- Navigasi tab ---------------- */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-3">
          {TAB.map((t, i) => {
            const Icon = t.icon;
            return (
              <button
                key={t.label}
                type="button"
                onClick={() => setTab(i)}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                  tab === i
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                <Icon size={15} /> {i + 1}. {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-5 sm:p-6">
          {errorSimpan && (
            <div className="mb-5">
              <Alert tone="danger">{errorSimpan}</Alert>
            </div>
          )}

          {/* ---------------- 1. Data diri ---------------- */}
          {tab === 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-brand-700">
                <IdCard size={16} /> Informasi Data Diri &amp; Domisili Peserta
              </h2>
              {!bio ? (
                <Alert tone="warning">Peserta belum mengisi bagian data diri.</Alert>
              ) : (
                <div className="grid gap-4 sm:grid-cols-12">
                  <ReadField label="NIK" value={bio.nik} className="sm:col-span-4" />
                  <ReadField
                    label="Nama Lengkap"
                    value={bio.nama_lengkap}
                    className="sm:col-span-5"
                  />
                  <ReadField
                    label="Jenis Kelamin"
                    value={
                      bio.jenis_kelamin === "L"
                        ? "Laki-laki"
                        : bio.jenis_kelamin === "P"
                          ? "Perempuan"
                          : "—"
                    }
                    className="sm:col-span-3"
                  />
                  <ReadField
                    label="Tempat, Tanggal Lahir"
                    value={`${bio.tempat_lahir ?? "—"}, ${tanggalIndonesia(bio.tgl_lahir)}`}
                    className="sm:col-span-4"
                  />
                  <ReadField
                    label="No. HP / WhatsApp"
                    value={bio.no_hp}
                    icon={<Phone size={14} className="text-emerald-600" />}
                    className="sm:col-span-4"
                  />
                  <ReadField
                    label="Alamat Email"
                    value={bio.email}
                    icon={<Mail size={14} className="text-brand-600" />}
                    className="sm:col-span-4"
                  />
                  <ReadField
                    label="Alamat Domisili Lengkap"
                    value={bio.alamat}
                    className="sm:col-span-12"
                  />
                  {bio.no_hp_alt && (
                    <ReadField
                      label="No. HP Alternatif"
                      value={bio.no_hp_alt}
                      className="sm:col-span-4"
                    />
                  )}
                </div>
              )}
            </section>
          )}

          {/* ---------------- 2. Pendidikan ---------------- */}
          {tab === 1 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-brand-700">
                <BookOpen size={16} /> Riwayat Pendidikan &amp; Pekerjaan
              </h2>
              {!pend ? (
                <Alert tone="warning">
                  Peserta belum mengisi bagian pendidikan &amp; pekerjaan.
                </Alert>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <ReadField
                    label="Pendidikan Terakhir"
                    value={namaAcuan(REF_PENDIDIKAN, pend.pendidikan_kode)}
                  />
                  <ReadField
                    label="Nama Instansi / Sekolah / Universitas"
                    value={pend.instansi}
                  />
                  <ReadField label="Jurusan / Program Studi" value={pend.jurusan ?? "—"} />
                  <ReadField
                    label="Tahun Lulus"
                    value={pend.tahun_lulus ? String(pend.tahun_lulus) : "—"}
                  />
                  <ReadField
                    label="Pekerjaan Saat Ini"
                    value={namaAcuan(REF_PEKERJAAN, pend.pekerjaan_kode)}
                  />
                  <ReadField
                    label="Nama Tempat Kerja"
                    value={pend.nama_tempat_kerja ?? "—"}
                  />
                </div>
              )}
            </section>
          )}

          {/* ---------------- 3. Peninjauan dokumen ---------------- */}
          {tab === 2 && (
            <section>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-bold text-brand-700">
                  <FileCheck2 size={16} /> Peninjauan Berkas Syarat
                </h2>
                <Badge tone="info">{data.dokumen.length} dokumen diunggah</Badge>
              </div>

              {data.dokumen.length === 0 ? (
                <Alert tone="warning">Peserta belum mengunggah berkas apa pun.</Alert>
              ) : (
                <div className="table-wrap rounded-xl border border-slate-200">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th className="w-1/4">Persyaratan Dokumen</th>
                        <th className="w-1/6">Berkas Peserta</th>
                        <th className="w-1/4">Kesesuaian Data</th>
                        <th>Catatan Perbaikan Verifikator</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.dokumen.map((d) => {
                        const baris = checklist[d.id] ?? { sesuai: true, catatan: "" };
                        const ubah = (nilai: Partial<BarisChecklist>) =>
                          setChecklist((c) => ({ ...c, [d.id]: { ...baris, ...nilai } }));

                        return (
                          <tr key={d.id}>
                            <td>
                              <p className="font-bold text-slate-800">
                                {d.persyaratan_nama}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {d.nama_file_asli} ({ukuranTerbaca(d.ukuran_byte)})
                              </p>
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => lihat(d.dokumen_uuid)}
                                className="btn btn-sm btn-outline w-full"
                              >
                                <Eye size={14} /> Pratinjau
                              </button>
                            </td>
                            <td>
                              <div className="inline-flex overflow-hidden rounded-lg ring-1 ring-slate-300">
                                <button
                                  type="button"
                                  disabled={!bisaDiputus}
                                  onClick={() => ubah({ sesuai: true })}
                                  className={`flex cursor-pointer items-center gap-1 px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed ${
                                    baris.sesuai
                                      ? "bg-emerald-600 text-white"
                                      : "bg-white text-slate-500 hover:bg-slate-50"
                                  }`}
                                >
                                  <Check size={13} /> Sesuai
                                </button>
                                <button
                                  type="button"
                                  disabled={!bisaDiputus}
                                  onClick={() => ubah({ sesuai: false })}
                                  className={`flex cursor-pointer items-center gap-1 border-l border-slate-300 px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed ${
                                    !baris.sesuai
                                      ? "bg-rose-600 text-white"
                                      : "bg-white text-slate-500 hover:bg-slate-50"
                                  }`}
                                >
                                  <X size={13} /> Ditolak
                                </button>
                              </div>
                            </td>
                            <td>
                              <input
                                type="text"
                                maxLength={500}
                                disabled={!bisaDiputus}
                                value={baris.catatan}
                                onChange={(e) => ubah({ catatan: e.target.value })}
                                placeholder="Isi catatan jika tidak sesuai..."
                                className={`input py-2 text-sm ${
                                  !baris.sesuai ? "border-rose-300 text-rose-700" : ""
                                }`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* ---------------- 4. Keputusan ---------------- */}
          {tab === 3 && (
            <section className="space-y-5">
              <div
                className={`flex items-start gap-3 rounded-xl border p-4 ${
                  data.persetujuan?.is_setuju
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                {data.persetujuan?.is_setuju ? (
                  <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle size={22} className="mt-0.5 shrink-0 text-amber-600" />
                )}
                <div>
                  <p className="font-bold text-slate-800">
                    {data.persetujuan?.is_setuju
                      ? "Pernyataan Keabsahan Data Disetujui Peserta"
                      : "Peserta Belum Menyetujui Pernyataan Keabsahan"}
                  </p>
                  {data.persetujuan?.disetujui_at && (
                    <p className="mt-1 text-sm text-slate-600">
                      Disetujui pada {tanggalIndonesia(data.persetujuan.disetujui_at)}.
                    </p>
                  )}
                </div>
              </div>

              {data.verifikasi.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-2 text-sm font-bold text-slate-700">
                    Riwayat Verifikasi
                  </p>
                  <ul className="space-y-2 text-sm">
                    {data.verifikasi.map((v) => (
                      <li key={v.id} className="flex flex-wrap items-baseline gap-2">
                        <Badge
                          tone={
                            v.keputusan === "DISETUJUI"
                              ? "success"
                              : v.keputusan === "DITOLAK"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {v.keputusan}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {v.verifikator_nama} · {tanggalIndonesia(v.verified_at)}
                        </span>
                        {v.catatan && (
                          <span className="w-full text-xs text-slate-600">{v.catatan}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {bisaDiputus && (
                <div className="rounded-xl border border-brand-200 bg-white">
                  <div className="flex items-center gap-2 rounded-t-xl bg-linear-to-r from-brand-600 to-brand-700 px-5 py-3 text-sm font-bold text-white">
                    <Gavel size={16} /> Keputusan Akhir Verifikator
                  </div>
                  <div className="grid gap-4 p-5 sm:grid-cols-12">
                    <Field label="Status Keputusan" required className="sm:col-span-5">
                      <select
                        className="input"
                        value={keputusan}
                        onChange={(e) => setKeputusan(e.target.value as Keputusan)}
                      >
                        {KEPUTUSAN.map((k) => (
                          <option key={k.nilai} value={k.nilai}>
                            {k.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field
                      label="Catatan Verifikator untuk Peserta"
                      required={keputusan !== "DISETUJUI"}
                      className="sm:col-span-7"
                      hint="Catatan ini tampil di dashboard peserta. Wajib diisi kalau keputusannya Ditolak atau Revisi."
                    >
                      <textarea
                        rows={3}
                        maxLength={5000}
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        className="input"
                        placeholder="Tuliskan alasan keputusan atau petunjuk perbaikan berkas secara jelas..."
                      />
                    </Field>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* ---------------- Aksi ---------------- */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <Link to="/verifikator" className="btn btn-outline">
            Tutup
          </Link>
          <div className="flex flex-wrap gap-2">
            {tab < TAB.length - 1 ? (
              <button
                type="button"
                onClick={() => setTab((t) => t + 1)}
                className="btn btn-primary"
              >
                Tahap Selanjutnya
              </button>
            ) : (
              bisaDiputus && (
                <button
                  type="button"
                  disabled={menyimpan || (keputusan !== "DISETUJUI" && !catatan.trim())}
                  onClick={kirimKeputusan}
                  className="btn btn-success disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {menyimpan ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <SendHorizontal size={16} />
                  )}
                  Submit Keputusan Verifikasi
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
}
