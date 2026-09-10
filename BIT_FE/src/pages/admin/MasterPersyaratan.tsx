import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ListTree,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SubNav from "../../components/ui/SubNav";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Alert from "../../components/ui/Alert";
import EmptyState from "../../components/ui/EmptyState";
import { Field } from "../../components/ui/Field";
import { MASTER_NAV } from "../../config/nav";
import { pesanError } from "../../lib/api";
import {
  buatPersyaratan,
  daftarPersyaratan,
  hapusPersyaratan,
  ubahPersyaratan,
} from "../../features/persyaratan/persyaratanApi";
import {
  labelMime,
  MIME_UMUM,
  ukuranTerbaca,
  type MetaHalaman,
  type Persyaratan,
} from "../../features/persyaratan/types";

const LIMIT = 10;

type FormPersyaratan = {
  kode: string;
  nama: string;
  deskripsi: string;
  mime: string[];
  maxSizeKb: string;
  is_active: boolean;
};

const FORM_KOSONG: FormPersyaratan = {
  kode: "",
  nama: "",
  deskripsi: "",
  mime: ["application/pdf", "image/jpeg", "image/png"],
  maxSizeKb: "2048",
  is_active: true,
};

export default function MasterPersyaratan() {
  const [daftar, setDaftar] = useState<Persyaratan[]>([]);
  const [meta, setMeta] = useState<MetaHalaman | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [errorMuat, setErrorMuat] = useState<string | null>(null);

  const [cari, setCari] = useState("");
  const [cariTertunda, setCariTertunda] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | "aktif" | "nonaktif">("");
  const [halaman, setHalaman] = useState(1);

  const [pemicuMuat, setPemicuMuat] = useState(0);
  const muatUlang = useCallback(() => setPemicuMuat((p) => p + 1), []);

  const [formTerbuka, setFormTerbuka] = useState(false);
  const [sedangDiubah, setSedangDiubah] = useState<Persyaratan | null>(null);
  const [form, setForm] = useState<FormPersyaratan>(FORM_KOSONG);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  const [akanDihapus, setAkanDihapus] = useState<Persyaratan | null>(null);
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
        const hasil = await daftarPersyaratan({
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
        setErrorMuat(pesanError(error, "Gagal memuat data persyaratan"));
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

  function bukaUbah(p: Persyaratan) {
    setSedangDiubah(p);
    setForm({
      kode: p.kode,
      nama: p.nama,
      deskripsi: p.deskripsi ?? "",
      mime: p.allowed_mime,
      maxSizeKb: String(p.max_size_kb),
      is_active: p.is_active,
    });
    setErrorForm(null);
    setFormTerbuka(true);
  }

  function toggleMime(mime: string, dicentang: boolean) {
    setForm((f) => ({
      ...f,
      mime: dicentang ? [...f.mime, mime] : f.mime.filter((m) => m !== mime),
    }));
  }

  async function simpan(e: FormEvent) {
    e.preventDefault();

    if (form.mime.length === 0) {
      setErrorForm("Pilih minimal satu format berkas yang diizinkan.");
      return;
    }

    setMenyimpan(true);
    setErrorForm(null);

    const isian = {
      kode: form.kode,
      nama: form.nama,
      deskripsi: form.deskripsi,
      allowed_mime: form.mime,
      max_size_kb: Number(form.maxSizeKb) || 1,
      is_active: form.is_active,
    };

    try {
      if (sedangDiubah) await ubahPersyaratan(sedangDiubah.id, isian);
      else await buatPersyaratan(isian);

      setFormTerbuka(false);
      muatUlang();
    } catch (error) {
      setErrorForm(pesanError(error, "Gagal menyimpan data persyaratan"));
    } finally {
      setMenyimpan(false);
    }
  }

  async function konfirmasiHapus() {
    if (!akanDihapus) return;
    setMenghapus(true);
    setErrorHapus(null);
    try {
      await hapusPersyaratan(akanDihapus.id);
      setAkanDihapus(null);
      // Kalau baris terakhir di halaman ini habis, mundur satu halaman.
      if (daftar.length === 1 && halaman > 1) setHalaman((h) => h - 1);
      else muatUlang();
    } catch (error) {
      setErrorHapus(pesanError(error, "Gagal menghapus data persyaratan"));
    } finally {
      setMenghapus(false);
    }
  }

  // Format yang tersimpan tapi di luar daftar umum tetap ditampilkan sebagai
  // centang tersendiri, supaya tidak hilang diam-diam saat form disimpan.
  const mimeTambahan = form.mime.filter((m) => !MIME_UMUM.some((u) => u.mime === m));

  return (
    <>
      <PageHeader
        title="Data Master Persyaratan"
        subtitle="Kelola jenis dokumen persyaratan yang harus diunggah pendaftar"
      />
      <SubNav items={MASTER_NAV} />

      <div className="card">
        <div className="card-head">
          <span className="card-title">
            <ListTree size={16} className="text-brand-600" />
            Master Data Persyaratan Dokumen
          </span>
          <button type="button" onClick={bukaTambah} className="btn btn-sm btn-primary">
            <Plus size={15} /> Tambah Persyaratan
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
              placeholder="Cari nama atau kode dokumen…"
            />
          </div>
          <select
            className="input w-auto"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as "" | "aktif" | "nonaktif");
              setHalaman(1);
            }}
          >
            <option value="">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Non-Aktif</option>
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
            <Loader2 size={18} className="animate-spin text-brand-600" /> Memuat data
            persyaratan…
          </div>
        ) : daftar.length === 0 && !errorMuat ? (
          <EmptyState
            icon={ListTree}
            title="Belum ada jenis dokumen"
            description={
              cariTertunda || filterStatus
                ? "Tidak ada dokumen yang cocok dengan filter yang dipilih."
                : "Tambahkan jenis dokumen yang harus diunggah pendaftar, mis. KTP dan Ijazah."
            }
            action={
              <button type="button" onClick={bukaTambah} className="btn btn-primary">
                <Plus size={15} /> Tambah Persyaratan
              </button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nama Dokumen</th>
                  <th>Format Diizinkan</th>
                  <th>Ukuran Maks.</th>
                  <th>Dipakai</th>
                  <th>Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <p className="font-bold text-slate-800">{p.nama}</p>
                      <p className="font-mono text-xs text-slate-500">{p.kode}</p>
                      {p.deskripsi && (
                        <p className="max-w-md truncate text-xs text-slate-500">
                          {p.deskripsi}
                        </p>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {p.allowed_mime.map((m) => (
                          <Badge key={m} tone="neutral">
                            {labelMime(m)}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">{ukuranTerbaca(p.max_size_kb)}</td>
                    <td className="whitespace-nowrap text-slate-500">
                      {p.jumlah_program} program
                    </td>
                    <td>
                      <Badge tone={p.is_active ? "success" : "neutral"}>
                        {p.is_active ? "Aktif" : "Non-Aktif"}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          aria-label={`Ubah ${p.nama}`}
                          onClick={() => bukaUbah(p)}
                          className="btn btn-icon btn-warning"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Hapus ${p.nama}`}
                          onClick={() => {
                            setAkanDihapus(p);
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
              Halaman {meta.page} dari {meta.total_halaman} — {meta.total} dokumen
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

      {/* ---------------- Tambah / ubah persyaratan ---------------- */}
      <Modal
        open={formTerbuka}
        onClose={() => setFormTerbuka(false)}
        title={sedangDiubah ? "Ubah Persyaratan Dokumen" : "Tambah Persyaratan Dokumen"}
        subtitle={sedangDiubah?.kode}
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
              form="form-persyaratan"
              disabled={menyimpan}
              className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {menyimpan && <Loader2 size={15} className="animate-spin" />}
              {sedangDiubah ? "Simpan Perubahan" : "Simpan Persyaratan"}
            </button>
          </>
        }
      >
        <form id="form-persyaratan" onSubmit={simpan} className="space-y-4">
          {errorForm && <Alert tone="danger">{errorForm}</Alert>}

          <Field
            label="Kode Dokumen"
            required
            hint="Huruf kapital, angka, dan garis bawah. Contoh: SURAT_REKOMENDASI"
          >
            <input
              type="text"
              required
              maxLength={50}
              value={form.kode}
              onChange={(e) => setForm({ ...form, kode: e.target.value.toUpperCase() })}
              className="input font-mono"
              placeholder="SURAT_REKOMENDASI"
            />
          </Field>

          <Field label="Nama Dokumen" required>
            <input
              type="text"
              required
              maxLength={150}
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="input"
              placeholder="Contoh: Surat Keterangan Sehat"
            />
          </Field>

          <Field label="Keterangan">
            <textarea
              rows={2}
              maxLength={5000}
              value={form.deskripsi}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              className="input"
              placeholder="Penjelasan singkat untuk pendaftar…"
            />
          </Field>

          <Field
            label="Format Berkas Diizinkan"
            required
            hint="Dipakai service Dokumen saat memeriksa isi berkas yang diunggah."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {MIME_UMUM.map((m) => (
                <label
                  key={m.mime}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 transition hover:border-brand-300 hover:bg-brand-50/40"
                >
                  <input
                    type="checkbox"
                    checked={form.mime.includes(m.mime)}
                    onChange={(e) => toggleMime(m.mime, e.target.checked)}
                    className="h-4 w-4 accent-brand-600"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-800">{m.label}</span>
                    <span className="block truncate font-mono text-xs text-slate-500">
                      {m.mime}
                    </span>
                  </span>
                </label>
              ))}

              {mimeTambahan.map((m) => (
                <label
                  key={m}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked
                    onChange={(e) => toggleMime(m, e.target.checked)}
                    className="h-4 w-4 accent-brand-600"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-800">Lainnya</span>
                    <span className="block truncate font-mono text-xs text-slate-500">{m}</span>
                  </span>
                </label>
              ))}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Ukuran Maksimal (KB)"
              required
              hint={`Sekitar ${ukuranTerbaca(Number(form.maxSizeKb) || 0)}.`}
            >
              <input
                type="number"
                required
                min={1}
                max={102400}
                value={form.maxSizeKb}
                onChange={(e) => setForm({ ...form, maxSizeKb: e.target.value })}
                className="input"
              />
            </Field>

            <Field
              label="Status"
              hint="Dokumen non-aktif tidak bisa dipilih lagi untuk program baru."
            >
              <select
                className="input"
                value={form.is_active ? "aktif" : "nonaktif"}
                onChange={(e) => setForm({ ...form, is_active: e.target.value === "aktif" })}
              >
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Non-Aktif</option>
              </select>
            </Field>
          </div>
        </form>
      </Modal>

      {/* ---------------- Konfirmasi hapus ---------------- */}
      <Modal
        open={akanDihapus !== null}
        onClose={() => setAkanDihapus(null)}
        title="Hapus Persyaratan Dokumen"
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
            Hapus dokumen <span className="font-bold text-slate-800">{akanDihapus?.nama}</span>{" "}
            ({akanDihapus?.kode})?
          </p>
          {akanDihapus && akanDihapus.jumlah_program > 0 ? (
            <Alert tone="warning">
              Dokumen ini masih dipakai {akanDihapus.jumlah_program} program beasiswa, jadi
              penghapusan akan ditolak. Lepaskan dari programnya dulu, atau cukup
              nonaktifkan lewat tombol Ubah.
            </Alert>
          ) : (
            <Alert tone="warning">
              Berbeda dengan data beasiswa, dokumen ini terhapus permanen — tidak ada
              penanda terhapus di tabelnya.
            </Alert>
          )}
        </div>
      </Modal>
    </>
  );
}
