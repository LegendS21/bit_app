import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Hash,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SubNav from "../../components/ui/SubNav";
import Badge, { type BadgeTone } from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Alert from "../../components/ui/Alert";
import EmptyState from "../../components/ui/EmptyState";
import { Field } from "../../components/ui/Field";
import PersyaratanProgramModal from "../../components/admin/PersyaratanProgramModal";
import { MASTER_NAV } from "../../config/nav";
import { pesanError } from "../../lib/api";
import {
  buatBeasiswa,
  daftarBeasiswa,
  hapusBeasiswa,
  ubahBeasiswa,
} from "../../features/beasiswa/beasiswaApi";
import {
  LABEL_STATUS,
  STATUS_BEASISWA,
  type Beasiswa,
  type MetaHalaman,
  type StatusBeasiswa,
} from "../../features/beasiswa/types";

const LIMIT = 10;

const TONE_STATUS: Record<StatusBeasiswa, BadgeTone> = {
  DRAFT: "neutral",
  AKTIF: "success",
  DITUTUP: "warning",
  ARSIP: "info",
};

/** `kode` tidak ada di form: dirakit backend sebagai BEA-{tahun}-{urut}. */
type FormBeasiswa = {
  nama: string;
  deskripsi: string;
  penyelenggara: string;
  kuota: string;
  tgl_buka: string;
  tgl_tutup: string;
  status: StatusBeasiswa;
};

const FORM_KOSONG: FormBeasiswa = {
  nama: "",
  deskripsi: "",
  penyelenggara: "",
  kuota: "0",
  tgl_buka: "",
  tgl_tutup: "",
  status: "DRAFT",
};

/** YYYY-MM-DD → "1 September 2026". */
function tanggalIndonesia(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function MasterBeasiswa() {
  const [daftar, setDaftar] = useState<Beasiswa[]>([]);
  const [meta, setMeta] = useState<MetaHalaman | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [errorMuat, setErrorMuat] = useState<string | null>(null);

  const [cari, setCari] = useState("");
  const [cariTertunda, setCariTertunda] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusBeasiswa | "">("");
  const [halaman, setHalaman] = useState(1);

  const [pemicuMuat, setPemicuMuat] = useState(0);
  const muatUlang = useCallback(() => setPemicuMuat((p) => p + 1), []);

  const [formTerbuka, setFormTerbuka] = useState(false);
  const [sedangDiubah, setSedangDiubah] = useState<Beasiswa | null>(null);
  const [form, setForm] = useState<FormBeasiswa>(FORM_KOSONG);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  const [aturSyarat, setAturSyarat] = useState<Beasiswa | null>(null);

  const [akanDihapus, setAkanDihapus] = useState<Beasiswa | null>(null);
  const [errorHapus, setErrorHapus] = useState<string | null>(null);
  const [menghapus, setMenghapus] = useState(false);

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
      // `await` di depan memindahkan setState keluar dari fase sinkron effect;
      // dinyalakan dan dimatikan di tempat yang sama supaya loading tidak
      // mungkin menyala tanpa ada yang mematikannya.
      await Promise.resolve();
      if (!aktif) return;
      setMemuat(true);

      try {
        const hasil = await daftarBeasiswa({
          q: cariTertunda,
          status: filterStatus,
          page: halaman,
          limit: LIMIT,
        });
        if (!aktif) return;
        setDaftar(hasil.data);
        setMeta(hasil.meta);
        setErrorMuat(null);
      } catch (error) {
        if (!aktif) return;
        setErrorMuat(pesanError(error, "Gagal memuat data beasiswa"));
        setDaftar([]);
        setMeta(null);
      } finally {
        if (aktif) setMemuat(false);
      }
    })();

    return () => {
      aktif = false;
    };
  }, [cariTertunda, filterStatus, halaman, pemicuMuat]);

  function bukaTambah() {
    setSedangDiubah(null);
    setForm(FORM_KOSONG);
    setErrorForm(null);
    setFormTerbuka(true);
  }

  function bukaUbah(b: Beasiswa) {
    setSedangDiubah(b);
    setForm({
      nama: b.nama,
      deskripsi: b.deskripsi ?? "",
      penyelenggara: b.penyelenggara ?? "",
      kuota: String(b.kuota),
      tgl_buka: b.tgl_buka,
      tgl_tutup: b.tgl_tutup,
      status: b.status,
    });
    setErrorForm(null);
    setFormTerbuka(true);
  }

  async function simpan(e: FormEvent) {
    e.preventDefault();
    setMenyimpan(true);
    setErrorForm(null);

    const isian = {
      nama: form.nama,
      deskripsi: form.deskripsi,
      penyelenggara: form.penyelenggara,
      kuota: Number(form.kuota) || 0,
      tgl_buka: form.tgl_buka,
      tgl_tutup: form.tgl_tutup,
      status: form.status,
    };

    try {
      if (sedangDiubah) await ubahBeasiswa(sedangDiubah.id, isian);
      else await buatBeasiswa(isian);

      setFormTerbuka(false);
      muatUlang();
    } catch (error) {
      setErrorForm(pesanError(error, "Gagal menyimpan data beasiswa"));
    } finally {
      setMenyimpan(false);
    }
  }

  async function konfirmasiHapus() {
    if (!akanDihapus) return;
    setMenghapus(true);
    setErrorHapus(null);
    try {
      await hapusBeasiswa(akanDihapus.id);
      setAkanDihapus(null);
      // Kalau baris terakhir di halaman ini habis, mundur satu halaman.
      if (daftar.length === 1 && halaman > 1) setHalaman((h) => h - 1);
      else muatUlang();
    } catch (error) {
      setErrorHapus(pesanError(error, "Gagal menghapus data beasiswa"));
    } finally {
      setMenghapus(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Data Master Beasiswa"
        subtitle="Kelola program beasiswa pelatihan yang ditawarkan pada portal"
      />
      <SubNav items={MASTER_NAV} />

      <div className="card">
        <div className="card-head">
          <span className="card-title">
            <Database size={16} className="text-brand-600" />
            Master Data Beasiswa Pelatihan
          </span>
          <button type="button" onClick={bukaTambah} className="btn btn-sm btn-primary">
            <Plus size={15} /> Tambah Beasiswa
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-200 px-4 py-3">
          <div className="relative min-w-56 grow sm:grow-0">
            <Search
              size={15}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              className="input pl-9"
              placeholder="Cari nama, kode, penyelenggara…"
            />
          </div>
          <select
            className="input w-auto"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as StatusBeasiswa | "");
              setHalaman(1);
            }}
          >
            <option value="">Semua Status</option>
            {STATUS_BEASISWA.map((s) => (
              <option key={s} value={s}>
                {LABEL_STATUS[s]}
              </option>
            ))}
          </select>
        </div>

        {errorMuat && (
          <div className="p-4">
            <Alert
              tone="danger"
              action={
                <button type="button" onClick={muatUlang} className="btn btn-sm btn-outline">
                  Coba lagi
                </button>
              }
            >
              {errorMuat}
            </Alert>
          </div>
        )}

        {memuat ? (
          <div className="flex items-center justify-center gap-2 py-14 text-sm font-semibold text-slate-500">
            <Loader2 size={18} className="animate-spin text-brand-600" /> Memuat data beasiswa…
          </div>
        ) : daftar.length === 0 && !errorMuat ? (
          <EmptyState
            icon={Database}
            title="Belum ada program beasiswa"
            description={
              cariTertunda || filterStatus
                ? "Tidak ada program yang cocok dengan filter yang dipilih."
                : "Tambahkan program pelatihan yang akan dibuka pendaftarannya."
            }
            action={
              <button type="button" onClick={bukaTambah} className="btn btn-primary">
                <Plus size={15} /> Tambah Beasiswa
              </button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nama Beasiswa Pelatihan</th>
                  <th>Kuota</th>
                  <th>Penyelenggara</th>
                  <th>Masa Pendaftaran</th>
                  <th>Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <p className="font-bold text-slate-800">{b.nama}</p>
                      <p className="font-mono text-xs text-slate-500">{b.kode}</p>
                      {b.deskripsi && (
                        <p className="max-w-md truncate text-xs text-slate-500">
                          {b.deskripsi}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap">{b.kuota} peserta</td>
                    <td>{b.penyelenggara ?? "—"}</td>
                    <td className="whitespace-nowrap text-xs">
                      {tanggalIndonesia(b.tgl_buka)}
                      <span className="text-slate-400"> s/d </span>
                      {tanggalIndonesia(b.tgl_tutup)}
                    </td>
                    <td>
                      <Badge tone={TONE_STATUS[b.status]}>{LABEL_STATUS[b.status]}</Badge>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          aria-label={`Atur persyaratan ${b.nama}`}
                          title="Atur persyaratan dokumen"
                          onClick={() => setAturSyarat(b)}
                          className="btn btn-icon btn-outline"
                        >
                          <ListChecks size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Ubah ${b.nama}`}
                          onClick={() => bukaUbah(b)}
                          className="btn btn-icon btn-warning"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Hapus ${b.nama}`}
                          onClick={() => {
                            setAkanDihapus(b);
                            setErrorHapus(null);
                          }}
                          className="btn btn-icon btn-danger"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
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
              Halaman {meta.page} dari {meta.total_halaman} — {meta.total} program
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

      {/* ---------------- Tambah / ubah program ---------------- */}
      <Modal
        open={formTerbuka}
        onClose={() => setFormTerbuka(false)}
        title={sedangDiubah ? "Ubah Program Beasiswa" : "Tambah Program Beasiswa"}
        subtitle={sedangDiubah?.kode}
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setFormTerbuka(false)}
            >
              Batal
            </button>
            <button
              type="submit"
              form="form-beasiswa"
              disabled={menyimpan}
              className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {menyimpan && <Loader2 size={15} className="animate-spin" />}
              {sedangDiubah ? "Simpan Perubahan" : "Simpan Program"}
            </button>
          </>
        }
      >
        <form id="form-beasiswa" onSubmit={simpan} className="space-y-4">
          {errorForm && <Alert tone="danger">{errorForm}</Alert>}

          <Field label="Kode Program">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <Hash size={15} className="shrink-0 text-slate-400" />
              <span className="font-mono text-sm font-semibold text-slate-700">
                {sedangDiubah ? sedangDiubah.kode : `BEA-${new Date().getFullYear()}-###`}
              </span>
            </div>
            <div className="hint">
              {sedangDiubah
                ? "Kode melekat pada program ini dan tidak bisa diubah."
                : "Dibuat otomatis saat disimpan, berurutan per tahun."}
            </div>
          </Field>

          <Field label="Nama Beasiswa Pelatihan" required>
            <input
              type="text"
              required
              maxLength={200}
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="input"
              placeholder="Contoh: Pelatihan Web Developer Specialist"
            />
          </Field>

          <Field label="Deskripsi Program">
            <textarea
              rows={3}
              maxLength={5000}
              value={form.deskripsi}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              className="input"
              placeholder="Ringkasan materi dan sasaran peserta…"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Penyelenggara">
              <input
                type="text"
                maxLength={150}
                value={form.penyelenggara}
                onChange={(e) => setForm({ ...form, penyelenggara: e.target.value })}
                className="input"
                placeholder="PT Bentang Inspirasi Teknologi"
              />
            </Field>

            <Field label="Kuota Peserta" required>
              <input
                type="number"
                required
                min={0}
                max={1000000}
                value={form.kuota}
                onChange={(e) => setForm({ ...form, kuota: e.target.value })}
                className="input"
                placeholder="100"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pendaftaran Dibuka" required>
              <input
                type="date"
                required
                value={form.tgl_buka}
                onChange={(e) => setForm({ ...form, tgl_buka: e.target.value })}
                className="input"
              />
            </Field>

            <Field
              label="Pendaftaran Ditutup"
              required
              error={
                form.tgl_buka && form.tgl_tutup && form.tgl_tutup < form.tgl_buka
                  ? "Tanggal tutup tidak boleh lebih awal dari tanggal buka"
                  : undefined
              }
            >
              <input
                type="date"
                required
                min={form.tgl_buka || undefined}
                value={form.tgl_tutup}
                onChange={(e) => setForm({ ...form, tgl_tutup: e.target.value })}
                className="input"
              />
            </Field>
          </div>

          <Field
            label="Status"
            hint="Hanya program berstatus Aktif yang terlihat oleh calon peserta."
          >
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as StatusBeasiswa })}
            >
              {STATUS_BEASISWA.map((s) => (
                <option key={s} value={s}>
                  {LABEL_STATUS[s]}
                </option>
              ))}
            </select>
          </Field>
        </form>
      </Modal>

      {/* ---------------- Persyaratan dokumen program ---------------- */}
      <PersyaratanProgramModal program={aturSyarat} onClose={() => setAturSyarat(null)} />

      {/* ---------------- Konfirmasi hapus ---------------- */}
      <Modal
        open={akanDihapus !== null}
        onClose={() => setAkanDihapus(null)}
        title="Hapus Program Beasiswa"
        tone="neutral"
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setAkanDihapus(null)}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={konfirmasiHapus}
              disabled={menghapus}
              className="btn btn-danger disabled:cursor-not-allowed disabled:opacity-60"
            >
              {menghapus && <Loader2 size={15} className="animate-spin" />}
              <Trash2 size={15} /> Hapus
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {errorHapus && <Alert tone="danger">{errorHapus}</Alert>}
          <p className="text-sm text-slate-600">
            Hapus program <span className="font-bold text-slate-800">{akanDihapus?.nama}</span>{" "}
            ({akanDihapus?.kode})?
          </p>
          <Alert tone="warning">
            Data tidak dihapus permanen, hanya ditandai terhapus — permohonan peserta
            menyimpan acuan ke program ini. Kodenya tetap terpakai dan belum bisa
            didaftarkan ulang.
          </Alert>
        </div>
      </Modal>
    </>
  );
}
