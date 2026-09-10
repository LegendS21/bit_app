import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Eye,
  FileUp,
  Loader2,
  Lock,
  Send,
  Trash2,
} from "lucide-react";
import Stepper from "../../components/Stepper";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import { Field } from "../../components/ui/Field";
import { pesanError } from "../../lib/api";
import {
  detailPermohonan,
  hapusDokumen,
  kirimPermohonan,
  simpanStep1,
  simpanStep2,
  simpanStep4,
  tautanBerkas,
  unggahDokumen,
} from "../../features/permohonan/permohonanApi";
import {
  LABEL_STATUS,
  REF_PEKERJAAN,
  REF_PENDIDIKAN,
  ukuranTerbaca,
  type PermohonanLengkap,
} from "../../features/permohonan/types";
import { daftarSyaratProgram } from "../../features/beasiswa/beasiswaApi";
import type { SyaratProgram } from "../../features/beasiswa/types";

const LANGKAH = [
  "Data Diri & Kontak",
  "Pendidikan & Pekerjaan",
  "Unggah Dokumen",
  "Persetujuan & Submit",
];

type FormStep1 = {
  nik: string;
  nama_lengkap: string;
  tempat_lahir: string;
  tgl_lahir: string;
  jenis_kelamin: string;
  alamat: string;
  no_hp: string;
  no_hp_alt: string;
  email: string;
};

type FormStep2 = {
  pendidikan_kode: string;
  instansi: string;
  jurusan: string;
  tahun_lulus: string;
  pekerjaan_kode: string;
  nama_tempat_kerja: string;
};

const KOSONG1: FormStep1 = {
  nik: "",
  nama_lengkap: "",
  tempat_lahir: "",
  tgl_lahir: "",
  jenis_kelamin: "",
  alamat: "",
  no_hp: "",
  no_hp_alt: "",
  email: "",
};

const KOSONG2: FormStep2 = {
  pendidikan_kode: "",
  instansi: "",
  jurusan: "",
  tahun_lulus: "",
  pekerjaan_kode: "",
  nama_tempat_kerja: "",
};

function jam(iso: string | Date) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export default function FormulirWizard() {
  const { id } = useParams();
  const permohonanId = Number(id);
  const navigate = useNavigate();

  const [data, setData] = useState<PermohonanLengkap | null>(null);
  const [syarat, setSyarat] = useState<SyaratProgram[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [errorMuat, setErrorMuat] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [form1, setForm1] = useState<FormStep1>(KOSONG1);
  const [form2, setForm2] = useState<FormStep2>(KOSONG2);
  const [setuju, setSetuju] = useState(false);

  const [menyimpan, setMenyimpan] = useState(false);
  const [errorSimpan, setErrorSimpan] = useState<string | null>(null);
  const [tersimpanPada, setTersimpanPada] = useState<Date | null>(null);

  const [sedangUnggah, setSedangUnggah] = useState<number | null>(null);
  const [errorUnggah, setErrorUnggah] = useState<string | null>(null);

  // Ditetapkan di onClick sebelum submit terpicu, jadi satu <form> bisa dipakai
  // dua tombol: "Simpan Draft" (tetap di tempat) dan "Selanjutnya" (maju).
  const majuRef = useRef(false);

  useEffect(() => {
    if (!Number.isFinite(permohonanId)) return;
    let aktif = true;

    (async () => {
      // `await` di depan memindahkan setState keluar dari fase sinkron effect.
      await Promise.resolve();
      if (!aktif) return;
      setMemuat(true);

      try {
        const p = await detailPermohonan(permohonanId);
        if (!aktif) return;

        setData(p);
        // Mulai dari bagian terakhir yang sedang dikerjakan.
        setStep(Math.min(Math.max((p.current_step || 1) - 1, 0), 3));
        setSetuju(p.persetujuan?.is_setuju ?? false);

        if (p.biodata) {
          setForm1({
            nik: p.biodata.nik,
            nama_lengkap: p.biodata.nama_lengkap,
            tempat_lahir: p.biodata.tempat_lahir ?? "",
            tgl_lahir: p.biodata.tgl_lahir?.slice(0, 10) ?? "",
            jenis_kelamin: p.biodata.jenis_kelamin ?? "",
            alamat: p.biodata.alamat,
            no_hp: p.biodata.no_hp,
            no_hp_alt: p.biodata.no_hp_alt ?? "",
            email: p.biodata.email,
          });
        }
        if (p.pendidikan) {
          setForm2({
            pendidikan_kode: p.pendidikan.pendidikan_kode,
            instansi: p.pendidikan.instansi,
            jurusan: p.pendidikan.jurusan ?? "",
            tahun_lulus: p.pendidikan.tahun_lulus ? String(p.pendidikan.tahun_lulus) : "",
            pekerjaan_kode: p.pendidikan.pekerjaan_kode ?? "",
            nama_tempat_kerja: p.pendidikan.nama_tempat_kerja ?? "",
          });
        }

        const s = await daftarSyaratProgram(p.beasiswa_id);
        if (!aktif) return;
        setSyarat(s.persyaratan);
        setErrorMuat(null);
      } catch (error) {
        if (!aktif) return;
        setErrorMuat(pesanError(error, "Gagal memuat formulir pendaftaran"));
      } finally {
        if (aktif) setMemuat(false);
      }
    })();

    return () => {
      aktif = false;
    };
  }, [permohonanId]);

  const terkunci = data?.is_locked ?? false;
  const revisi = data?.status === "REVISI";
  const akhir = step === LANGKAH.length - 1;

  async function simpanLangkah(e: FormEvent) {
    e.preventDefault();
    if (!data || terkunci) return;

    const maju = majuRef.current;
    setMenyimpan(true);
    setErrorSimpan(null);

    try {
      let hasil = data;

      if (step === 0) {
        hasil = await simpanStep1(data.id, {
          nik: form1.nik,
          nama_lengkap: form1.nama_lengkap,
          tempat_lahir: form1.tempat_lahir || undefined,
          tgl_lahir: form1.tgl_lahir,
          jenis_kelamin: (form1.jenis_kelamin || undefined) as "L" | "P" | undefined,
          alamat: form1.alamat,
          no_hp: form1.no_hp,
          no_hp_alt: form1.no_hp_alt || undefined,
          email: form1.email,
        });
      } else if (step === 1) {
        hasil = await simpanStep2(data.id, {
          pendidikan_kode: form2.pendidikan_kode,
          instansi: form2.instansi,
          jurusan: form2.jurusan || undefined,
          tahun_lulus: form2.tahun_lulus ? Number(form2.tahun_lulus) : undefined,
          pekerjaan_kode: form2.pekerjaan_kode || undefined,
          nama_tempat_kerja: form2.nama_tempat_kerja || undefined,
        });
      } else if (step === 3) {
        hasil = await simpanStep4(data.id, setuju);
      }
      // Langkah 3 tidak punya isian sendiri — berkasnya sudah tersimpan saat
      // diunggah, jadi tombolnya cuma memindahkan langkah.

      setData(hasil);
      setTersimpanPada(new Date());
      if (maju && step < 3) setStep((s) => s + 1);
    } catch (error) {
      setErrorSimpan(pesanError(error, "Gagal menyimpan isian"));
    } finally {
      setMenyimpan(false);
    }
  }

  async function kirim() {
    if (!data) return;
    setMenyimpan(true);
    setErrorSimpan(null);

    try {
      // Persetujuannya disimpan dulu; submit menolak kalau belum dicentang.
      await simpanStep4(data.id, setuju);
      await kirimPermohonan(data.id);
      navigate("/peserta", { replace: true });
    } catch (error) {
      setErrorSimpan(pesanError(error, "Gagal mengirim pendaftaran"));
    } finally {
      setMenyimpan(false);
    }
  }

  async function unggah(persyaratanId: number, berkas: File | undefined) {
    if (!berkas || !data) return;
    setSedangUnggah(persyaratanId);
    setErrorUnggah(null);

    try {
      setData(await unggahDokumen(data.id, data.kode_permohonan, persyaratanId, berkas));
      setTersimpanPada(new Date());
    } catch (error) {
      setErrorUnggah(pesanError(error, "Gagal mengunggah berkas"));
    } finally {
      setSedangUnggah(null);
    }
  }

  async function lepas(persyaratanId: number, dokumenUuid: string) {
    if (!data) return;
    setSedangUnggah(persyaratanId);
    setErrorUnggah(null);

    try {
      setData(await hapusDokumen(data.id, persyaratanId, dokumenUuid));
    } catch (error) {
      setErrorUnggah(pesanError(error, "Gagal menghapus berkas"));
    } finally {
      setSedangUnggah(null);
    }
  }

  async function lihat(dokumenUuid: string) {
    try {
      window.open(await tautanBerkas(dokumenUuid), "_blank", "noopener");
    } catch (error) {
      setErrorUnggah(pesanError(error, "Gagal membuka berkas"));
    }
  }

  /* ---------------- Tampilan ---------------- */

  if (memuat) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm font-semibold text-slate-500">
        <Loader2 size={18} className="animate-spin text-brand-600" /> Memuat formulir…
      </div>
    );
  }

  if (errorMuat || !data) {
    return (
      <div className="space-y-4">
        <Alert tone="danger">{errorMuat ?? "Permohonan tidak ditemukan"}</Alert>
        <Link to="/peserta" className="btn btn-outline">
          <ArrowLeft size={15} /> Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  const putusanTerakhir = data.verifikasi.at(-1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
            Formulir Pendaftaran
          </h1>
          <p className="text-sm text-slate-500">
            {data.beasiswa_nama}{" "}
            <span className="font-mono text-xs text-slate-400">· {data.kode_permohonan}</span>
          </p>
        </div>
        <Link to="/peserta" className="btn btn-outline btn-sm">
          <ArrowLeft size={15} /> Kembali ke Dashboard
        </Link>
      </div>

      {terkunci ? (
        <Alert tone="info" title={`Status: ${LABEL_STATUS[data.status]}`}>
          Pendaftaran Anda sudah terkirim, jadi isiannya tidak bisa diubah lagi. Formulir
          ini ditampilkan sebagai salinan saja.
        </Alert>
      ) : revisi ? (
        <Alert tone="warning" title="Perbaikan Diminta Verifikator">
          {putusanTerakhir?.catatan ?? "Silakan perbaiki isian atau berkas Anda."} Setelah
          diperbaiki, tekan <b>Kirim Pendaftaran</b> di langkah terakhir.
        </Alert>
      ) : (
        <Alert tone="brand" title="Isian Tersimpan per Bagian">
          Data disimpan setiap kali Anda menekan <b>Selanjutnya</b> atau{" "}
          <b>Simpan Draft</b>, sehingga pengisian bisa dilanjutkan kapan saja. Satu bagian
          harus lengkap dulu sebelum bisa disimpan.
        </Alert>
      )}

      <div className="card overflow-hidden">
        <Stepper steps={LANGKAH} current={step} onSelect={setStep} />

        <form onSubmit={simpanLangkah}>
          <fieldset disabled={terkunci} className="border-t border-slate-200 p-5 sm:p-6">
            {errorSimpan && (
              <div className="mb-5">
                <Alert tone="danger">{errorSimpan}</Alert>
              </div>
            )}

            {/* ---------------- 1. Data diri ---------------- */}
            {step === 0 && (
              <section>
                <h2 className="mb-5 text-sm font-bold text-brand-700">
                  Bagian 1: Data Diri &amp; Informasi Kontak
                </h2>
                <div className="grid gap-4 sm:grid-cols-12">
                  <Field
                    label="NIK (Nomor Induk Kependudukan)"
                    required
                    className="sm:col-span-6"
                  >
                    <input
                      type="text"
                      required
                      pattern="\d{16}"
                      maxLength={16}
                      inputMode="numeric"
                      value={form1.nik}
                      onChange={(e) => setForm1({ ...form1, nik: e.target.value })}
                      className="input font-mono tracking-wider"
                      placeholder="Masukkan 16 digit NIK"
                      title="NIK harus tepat 16 digit angka"
                    />
                  </Field>
                  <Field label="Nama Lengkap" required className="sm:col-span-6">
                    <input
                      type="text"
                      required
                      maxLength={150}
                      value={form1.nama_lengkap}
                      onChange={(e) => setForm1({ ...form1, nama_lengkap: e.target.value })}
                      className="input"
                      placeholder="Sesuai KTP"
                    />
                  </Field>

                  <Field label="Tempat Lahir" className="sm:col-span-4">
                    <input
                      type="text"
                      maxLength={100}
                      value={form1.tempat_lahir}
                      onChange={(e) => setForm1({ ...form1, tempat_lahir: e.target.value })}
                      className="input"
                      placeholder="Kota tempat lahir"
                    />
                  </Field>
                  <Field label="Tanggal Lahir" required className="sm:col-span-4">
                    <input
                      type="date"
                      required
                      value={form1.tgl_lahir}
                      onChange={(e) => setForm1({ ...form1, tgl_lahir: e.target.value })}
                      className="input"
                    />
                  </Field>
                  <Field label="Jenis Kelamin" className="sm:col-span-4">
                    <select
                      className="input"
                      value={form1.jenis_kelamin}
                      onChange={(e) => setForm1({ ...form1, jenis_kelamin: e.target.value })}
                    >
                      <option value="">-- Pilih Jenis Kelamin --</option>
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </Field>

                  <Field
                    label="Alamat Domisili"
                    required
                    className="sm:col-span-12"
                    hint="Tulis lengkap: jalan, RT/RW, kelurahan, kecamatan, kabupaten/kota, provinsi."
                  >
                    <textarea
                      rows={3}
                      required
                      maxLength={2000}
                      value={form1.alamat}
                      onChange={(e) => setForm1({ ...form1, alamat: e.target.value })}
                      className="input"
                      placeholder="Jl. Contoh No. 1 RT 01 RW 02, Kel. Dago, Kec. Coblong, Kota Bandung, Jawa Barat"
                    />
                  </Field>

                  <Field label="No. HP / WhatsApp" required className="sm:col-span-4">
                    <input
                      type="tel"
                      required
                      value={form1.no_hp}
                      onChange={(e) => setForm1({ ...form1, no_hp: e.target.value })}
                      className="input"
                      placeholder="081234567890"
                    />
                  </Field>
                  <Field label="No. HP Alternatif" className="sm:col-span-4">
                    <input
                      type="tel"
                      value={form1.no_hp_alt}
                      onChange={(e) => setForm1({ ...form1, no_hp_alt: e.target.value })}
                      className="input"
                      placeholder="Opsional"
                    />
                  </Field>
                  <Field label="Alamat Email" required className="sm:col-span-4">
                    <input
                      type="email"
                      required
                      maxLength={150}
                      value={form1.email}
                      onChange={(e) => setForm1({ ...form1, email: e.target.value })}
                      className="input"
                      placeholder="nama@email.com"
                    />
                  </Field>
                </div>
              </section>
            )}

            {/* ---------------- 2. Pendidikan ---------------- */}
            {step === 1 && (
              <section>
                <h2 className="mb-5 text-sm font-bold text-brand-700">
                  Bagian 2: Latar Belakang Pendidikan &amp; Pekerjaan
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Pendidikan Terakhir" required>
                    <select
                      className="input"
                      required
                      value={form2.pendidikan_kode}
                      onChange={(e) => setForm2({ ...form2, pendidikan_kode: e.target.value })}
                    >
                      <option value="">-- Pilih Pendidikan --</option>
                      {REF_PENDIDIKAN.map((p) => (
                        <option key={p.kode} value={p.kode}>
                          {p.nama}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Nama Instansi / Sekolah / Universitas" required>
                    <input
                      type="text"
                      required
                      maxLength={200}
                      value={form2.instansi}
                      onChange={(e) => setForm2({ ...form2, instansi: e.target.value })}
                      className="input"
                      placeholder="Contoh: SMA Negeri 1 / Universitas X"
                    />
                  </Field>
                  <Field label="Jurusan / Program Studi">
                    <input
                      type="text"
                      maxLength={150}
                      value={form2.jurusan}
                      onChange={(e) => setForm2({ ...form2, jurusan: e.target.value })}
                      className="input"
                      placeholder="Contoh: Teknik Informatika"
                    />
                  </Field>
                  <Field label="Tahun Lulus">
                    <input
                      type="number"
                      min={1950}
                      max={new Date().getFullYear() + 1}
                      value={form2.tahun_lulus}
                      onChange={(e) => setForm2({ ...form2, tahun_lulus: e.target.value })}
                      className="input"
                      placeholder="2020"
                    />
                  </Field>
                  <Field label="Pekerjaan Saat Ini">
                    <select
                      className="input"
                      value={form2.pekerjaan_kode}
                      onChange={(e) => setForm2({ ...form2, pekerjaan_kode: e.target.value })}
                    >
                      <option value="">-- Pilih Pekerjaan --</option>
                      {REF_PEKERJAAN.map((p) => (
                        <option key={p.kode} value={p.kode}>
                          {p.nama}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Nama Tempat Kerja">
                    <input
                      type="text"
                      maxLength={200}
                      value={form2.nama_tempat_kerja}
                      onChange={(e) =>
                        setForm2({ ...form2, nama_tempat_kerja: e.target.value })
                      }
                      className="input"
                      placeholder="Kosongkan kalau belum bekerja"
                    />
                  </Field>
                </div>
              </section>
            )}

            {/* ---------------- 3. Dokumen ---------------- */}
            {step === 2 && (
              <section>
                <h2 className="mb-1 text-sm font-bold text-brand-700">
                  Bagian 3: Unggah Dokumen Pendukung
                </h2>
                <p className="mb-5 text-xs text-slate-500">
                  Berkas tersimpan begitu selesai diunggah — tidak perlu menekan Simpan.
                  Nama berkas diubah otomatis oleh sistem, dan isinya diperiksa sebelum
                  diterima.
                </p>

                {errorUnggah && (
                  <div className="mb-4">
                    <Alert tone="danger">{errorUnggah}</Alert>
                  </div>
                )}

                {syarat.length === 0 ? (
                  <Alert tone="info">
                    Program ini tidak menuntut dokumen apa pun. Lanjut ke langkah
                    berikutnya.
                  </Alert>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {syarat.map((s) => {
                      const terunggah = data.dokumen.find(
                        (d) => d.persyaratan_id === s.persyaratan_id,
                      );
                      const bermasalah = terunggah?.status_verifikasi === "TIDAK_SESUAI";
                      const sibuk = sedangUnggah === s.persyaratan_id;

                      return (
                        <div
                          key={s.persyaratan_id}
                          className={`rounded-xl border p-4 ${
                            bermasalah
                              ? "border-rose-300 bg-rose-50/60"
                              : "border-slate-200 bg-slate-50/60"
                          }`}
                        >
                          <div className="mb-3 flex items-start gap-3">
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                bermasalah
                                  ? "bg-rose-100 text-rose-600"
                                  : terunggah
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-brand-50 text-brand-600"
                              }`}
                            >
                              {terunggah && !bermasalah ? (
                                <CheckCircle2 size={18} />
                              ) : (
                                <FileUp size={18} />
                              )}
                            </span>
                            <div className="min-w-0 grow">
                              <p className="text-sm font-bold text-slate-800">
                                {s.nama}{" "}
                                {s.is_wajib ? (
                                  <span className="text-rose-600">*</span>
                                ) : (
                                  <Badge tone="neutral">Opsional</Badge>
                                )}
                              </p>
                              {terunggah && (
                                <p className="truncate text-xs text-slate-500">
                                  {terunggah.nama_file_asli} (
                                  {ukuranTerbaca(terunggah.ukuran_byte)})
                                </p>
                              )}
                            </div>
                          </div>

                          {terunggah ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => lihat(terunggah.dokumen_uuid)}
                                className="btn btn-sm btn-outline"
                              >
                                <Eye size={14} /> Lihat
                              </button>
                              {!terkunci && (
                                <button
                                  type="button"
                                  disabled={sibuk}
                                  onClick={() =>
                                    lepas(s.persyaratan_id, terunggah.dokumen_uuid)
                                  }
                                  className="btn btn-sm btn-danger disabled:opacity-60"
                                >
                                  {sibuk ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={14} />
                                  )}
                                  Ganti / Hapus
                                </button>
                              )}
                            </div>
                          ) : (
                            <input
                              type="file"
                              accept={s.allowed_mime.join(",")}
                              disabled={sibuk || terkunci}
                              onChange={(e) => unggah(s.persyaratan_id, e.target.files?.[0])}
                              className="input input-file"
                            />
                          )}

                          {sibuk && !terunggah && (
                            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-brand-600">
                              <Loader2 size={13} className="animate-spin" /> Mengunggah &amp;
                              memeriksa berkas…
                            </p>
                          )}

                          {bermasalah && terunggah?.catatan ? (
                            <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-rose-600">
                              <AlertCircle size={14} className="mt-px shrink-0" />
                              Catatan Verifikator: {terunggah.catatan}
                            </p>
                          ) : (
                            <p className="hint">
                              Maks. {Math.round(s.max_size_kb / 1024) || 1} MB ·{" "}
                              {s.allowed_mime
                                .map((m) => m.split("/")[1]?.toUpperCase())
                                .join(", ")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ---------------- 4. Persetujuan ---------------- */}
            {step === 3 && (
              <section>
                <h2 className="mb-5 text-sm font-bold text-brand-700">
                  Bagian 4: Ringkasan &amp; Lembar Persetujuan
                </h2>

                <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="mb-3 text-sm font-bold text-slate-800">
                    Ringkasan Data Pendaftaran
                  </p>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    {[
                      ["Program Pelatihan", data.beasiswa_nama],
                      [
                        "Nama / NIK",
                        data.biodata
                          ? `${data.biodata.nama_lengkap} (${data.biodata.nik})`
                          : "— belum diisi —",
                      ],
                      [
                        "Pendidikan",
                        data.pendidikan
                          ? `${data.pendidikan.pendidikan_kode} — ${data.pendidikan.instansi}`
                          : "— belum diisi —",
                      ],
                      [
                        "Kontak",
                        data.biodata
                          ? `${data.biodata.no_hp} · ${data.biodata.email}`
                          : "— belum diisi —",
                      ],
                      [
                        "Dokumen Terunggah",
                        `${data.dokumen.length} dari ${syarat.length} berkas`,
                      ],
                    ].map(([k, val]) => (
                      <div key={k}>
                        <dt className="text-xs font-semibold text-slate-500">{k}</dt>
                        <dd className="font-semibold text-slate-800">{val}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <Alert tone="warning">
                  Periksa kembali seluruh isian pada Langkah 1 sampai 3 sebelum menekan
                  Kirim. Data yang telah dikirim tidak dapat diubah kecuali verifikator
                  meminta revisi.
                </Alert>

                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-brand-300 hover:bg-brand-50/40">
                  <input
                    type="checkbox"
                    checked={setuju}
                    onChange={(e) => setSetuju(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
                  />
                  <span className="text-sm text-slate-600">
                    Saya menyatakan dengan sesungguhnya bahwa seluruh data dan dokumen yang
                    saya unggah adalah <b>benar, sah, dan milik saya pribadi</b>. Apabila di
                    kemudian hari ditemukan ketidaksesuaian, saya bersedia didiskualifikasi
                    dari seleksi pendaftaran.
                  </span>
                </label>
              </section>
            )}
          </fieldset>

          {/* ---------------- Navigasi ---------------- */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="btn btn-outline disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft size={16} /> Kembali
            </button>

            {terkunci ? (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                <Lock size={15} /> Formulir terkunci
              </span>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={menyimpan}
                  onClick={() => {
                    majuRef.current = false;
                  }}
                  className="btn btn-outline-brand disabled:opacity-60"
                >
                  {menyimpan ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Bookmark size={16} />
                  )}
                  Simpan Draft
                </button>

                {akhir ? (
                  <button
                    type="button"
                    disabled={!setuju || menyimpan}
                    onClick={kirim}
                    className="btn btn-success disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {menyimpan ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    Kirim Pendaftaran
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={menyimpan}
                    onClick={() => {
                      majuRef.current = true;
                    }}
                    className="btn btn-primary disabled:opacity-60"
                  >
                    Selanjutnya <ArrowRight size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        </form>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <CheckCircle2 size={13} />
        {tersimpanPada
          ? `Terakhir tersimpan pukul ${jam(tersimpanPada)}`
          : `Perubahan terakhir ${jam(data.updated_at)}`}
      </p>
    </div>
  );
}
