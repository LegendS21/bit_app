import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Clock,
  Contact,
  FileBadge,
  FileCheck2,
  Inbox,
  Loader2,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import { katalogPublik } from "../../features/beasiswa/beasiswaApi";
import type { BeasiswaPublik } from "../../features/beasiswa/types";
import { pesanError } from "../../lib/api";
import { ALUR_PENDAFTARAN, SYARAT_BERKAS } from "../../data/kontenLanding";

const IKON_SYARAT = {
  id: Contact,
  family: Users,
  diploma: FileBadge,
  letter: FileCheck2,
} as const;

/** Di bawah ini kartunya ditandai "Segera Ditutup", bukan "Pendaftaran Dibuka". */
const AMBANG_SEGERA_TUTUP_HARI = 7;

/** `YYYY-MM-DD` → "20 September 2026". */
function tanggalPanjang(iso: string) {
  // Ditambah T00:00:00 supaya dibaca sebagai waktu lokal; tanpa itu string
  // tanggal polos dianggap UTC dan bisa mundur sehari di zona WIB.
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00`));
}

function sisaHari(iso: string) {
  const tutup = new Date(`${iso}T00:00:00`);
  const kini = new Date();
  const hariIni = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate());
  return Math.round((tutup.getTime() - hariIni.getTime()) / 86_400_000);
}

export default function Landing() {
  const [program, setProgram] = useState<BeasiswaPublik[]>([]);
  const [totalKuota, setTotalKuota] = useState(0);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<BeasiswaPublik | null>(null);

  useEffect(() => {
    let batal = false;

    (async () => {
      try {
        const hasil = await katalogPublik();
        if (batal) return;
        setProgram(hasil.data);
        setTotalKuota(hasil.meta.total_kuota);
      } catch (err) {
        if (!batal) setError(pesanError(err, "Gagal memuat daftar program pelatihan."));
      } finally {
        if (!batal) setMemuat(false);
      }
    })();

    // Menghindari setState setelah komponen dilepas kalau pengunjung cepat pindah.
    return () => {
      batal = true;
    };
  }, []);

  const wajib = detail?.persyaratan.filter((p) => p.is_wajib) ?? [];
  const opsional = detail?.persyaratan.filter((p) => !p.is_wajib) ?? [];

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section
        id="beranda"
        className="relative overflow-hidden bg-linear-to-br from-brand-600 via-brand-700 to-brand-900 text-white"
      >
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:py-24">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold tracking-wide backdrop-blur">
              <Award size={14} /> GELOMBANG PENDAFTARAN {new Date().getFullYear()} DIBUKA
            </span>
            <h1 className="mt-5 text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
              Tingkatkan Keahlian Anda Bersama{" "}
              <span className="text-amber-300">Beasiswa Pelatihan</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-white/80">
              Daftarkan diri Anda untuk mengikuti berbagai program pelatihan
              bersertifikat gratis. Pilih program yang sesuai dengan jalur karier
              impian Anda.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#program" className="btn btn-lg btn-warning">
                Lihat Beasiswa Aktif
              </a>
              <Link
                to="/daftar"
                className="btn btn-lg border-white/60 text-white hover:bg-white/15"
              >
                Daftar Sekarang
              </Link>
            </div>

            {/* Angkanya dihitung dari katalog sungguhan, bukan ditulis tetap. */}
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/20 pt-6">
              {[
                [memuat ? "…" : String(program.length), "Program Aktif"],
                [memuat ? "…" : String(totalKuota), "Kuota Peserta"],
                ["100%", "Gratis Biaya"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="text-2xl font-extrabold">{v}</dt>
                  <dd className="text-xs text-white/70">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="hidden justify-center lg:col-span-5 lg:flex">
            <div className="flex h-64 w-64 items-center justify-center rounded-[2.5rem] bg-white/10 backdrop-blur">
              <Award size={150} strokeWidth={1} className="text-amber-300" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Program ---------------- */}
      <section id="program" className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Program Beasiswa Pelatihan Aktif
            </h2>
            <p className="mt-3 text-slate-500">
              Pilih program pelatihan yang saat ini membuka pendaftaran
            </p>
          </div>

          {memuat && (
            <p className="mt-10 flex items-center justify-center gap-2 text-sm font-medium text-slate-500">
              <Loader2 size={18} className="animate-spin" /> Memuat program…
            </p>
          )}

          {!memuat && error && (
            <div className="mx-auto mt-10 max-w-2xl">
              <Alert tone="danger" title="Program tidak dapat ditampilkan">
                {error}
              </Alert>
            </div>
          )}

          {!memuat && !error && program.length === 0 && (
            <div className="mx-auto mt-10 max-w-2xl">
              <div className="card flex flex-col items-center p-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Inbox size={26} />
                </span>
                <h3 className="mt-4 font-bold text-slate-800">
                  Belum ada program yang dibuka
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Saat ini belum ada gelombang pendaftaran yang aktif. Silakan buat
                  akun terlebih dahulu supaya Anda siap ketika program dibuka.
                </p>
                <Link to="/daftar" className="btn btn-primary mt-6">
                  <ClipboardCheck size={16} /> Daftar Akun
                </Link>
              </div>
            </div>
          )}

          {!memuat && !error && program.length > 0 && (
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {program.map((p) => {
                const sisa = sisaHari(p.tgl_tutup);
                const segeraTutup = sisa <= AMBANG_SEGERA_TUTUP_HARI;

                return (
                  <article
                    key={p.id}
                    className="card flex flex-col transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="grow p-5">
                      {segeraTutup ? (
                        <Badge tone="danger">
                          <XCircle size={12} />
                          {sisa <= 0 ? "Hari Terakhir" : `Segera Ditutup · ${sisa} hari lagi`}
                        </Badge>
                      ) : (
                        <Badge tone="success">
                          <Clock size={12} /> Pendaftaran Dibuka
                        </Badge>
                      )}

                      <h3 className="mt-3 text-lg font-bold text-slate-900">{p.nama}</h3>
                      <p className="mt-1 font-mono text-xs text-slate-400">{p.kode}</p>

                      {p.deskripsi && (
                        <p className="mt-2 text-sm text-slate-500">{p.deskripsi}</p>
                      )}

                      <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
                        <li className="flex items-center gap-2">
                          <CalendarDays size={16} className="shrink-0 text-brand-600" />
                          <span className="text-slate-500">
                            <b className="text-slate-700">Batas:</b>{" "}
                            {tanggalPanjang(p.tgl_tutup)}
                          </span>
                        </li>
                        {p.penyelenggara && (
                          <li className="flex items-center gap-2">
                            <Building2 size={16} className="shrink-0 text-brand-600" />
                            <span className="text-slate-500">
                              <b className="text-slate-700">Penyelenggara:</b>{" "}
                              {p.penyelenggara}
                            </span>
                          </li>
                        )}
                        <li className="flex items-center gap-2">
                          <Users size={16} className="shrink-0 text-brand-600" />
                          <span className="text-slate-500">
                            <b className="text-slate-700">Kuota:</b> {p.kuota} Peserta
                          </span>
                        </li>
                      </ul>
                    </div>
                    <div className="p-5 pt-0">
                      <button
                        type="button"
                        onClick={() => setDetail(p)}
                        className="btn btn-primary w-full"
                      >
                        Lihat Detail &amp; Daftar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ---------------- Persyaratan & alur ---------------- */}
      <section id="persyaratan" className="bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Persyaratan Berkas Pendaftaran
            </h2>
            <p className="mt-3 text-slate-500">
              Sebelum melakukan pendaftaran, pastikan Anda telah menyiapkan
              berkas pendukung berikut dalam format{" "}
              <b className="text-slate-700">PDF/JPG/PNG (maks. 2MB per file)</b>:
            </p>

            <ul className="mt-8 space-y-5">
              {SYARAT_BERKAS.map((s) => {
                const Icon = IKON_SYARAT[s.icon];
                return (
                  <li key={s.nama} className="flex gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Icon size={22} />
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-800">{s.nama}</h3>
                      <p className="text-sm text-slate-500">{s.keterangan}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div id="alur">
            <div className="card bg-slate-50 p-7">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Alur Pendaftaran
              </h2>
              <ol className="mt-6 space-y-6">
                {ALUR_PENDAFTARAN.map((a, i) => {
                  const last = i === ALUR_PENDAFTARAN.length - 1;
                  return (
                    <li key={a.judul} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                            last ? "bg-emerald-500" : "bg-brand-600"
                          }`}
                        >
                          {i + 1}
                        </span>
                        {!last && <span className="mt-1 w-px grow bg-slate-300" />}
                      </div>
                      <div className="pb-1">
                        <h3 className="font-bold text-slate-800">{a.judul}</h3>
                        <p className="mt-1 text-sm text-slate-500">{a.isi}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-200 pt-6">
                <Link to="/daftar" className="btn btn-primary">
                  <ClipboardCheck size={16} /> Mulai Daftar Akun
                </Link>
                <Link to="/internal/login" className="btn btn-outline">
                  <ShieldCheck size={16} /> Portal Internal
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Modal detail program ---------------- */}
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.nama ?? ""}
        subtitle={
          detail
            ? `${detail.kode} · Kuota ${detail.kuota} peserta${
                detail.penyelenggara ? ` · ${detail.penyelenggara}` : ""
              }`
            : ""
        }
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setDetail(null)}
            >
              Tutup
            </button>
            <Link to="/daftar" className="btn btn-primary">
              Daftar Beasiswa Ini
            </Link>
          </>
        }
      >
        {detail && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 font-bold text-slate-800">Deskripsi Program</h3>
              <p className="text-sm text-slate-500">
                {detail.deskripsi || "Belum ada deskripsi untuk program ini."}
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-bold text-slate-800">Masa Pendaftaran</h3>
              <p className="text-sm text-slate-500">
                {tanggalPanjang(detail.tgl_buka)} — {tanggalPanjang(detail.tgl_tutup)}
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-bold text-slate-800">
                Dokumen yang Wajib Diunggah
              </h3>
              {wajib.length > 0 ? (
                <ul className="list-inside list-disc space-y-1 text-sm text-slate-500">
                  {wajib.map((p) => (
                    <li key={p.kode}>
                      {p.nama}
                      {p.deskripsi && (
                        <span className="text-slate-400"> — {p.deskripsi}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  Daftar dokumen untuk program ini belum ditetapkan. Anda tetap bisa
                  mendaftar; berkas yang diminta akan muncul pada langkah unggah.
                </p>
              )}
            </div>

            {opsional.length > 0 && (
              <div>
                <h3 className="mb-2 font-bold text-slate-800">Dokumen Opsional</h3>
                <ul className="list-inside list-disc space-y-1 text-sm text-slate-500">
                  {opsional.map((p) => (
                    <li key={p.kode}>{p.nama}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-xl bg-brand-50 p-4 text-sm text-brand-800">
              <b>Batas pendaftaran:</b> {tanggalPanjang(detail.tgl_tutup)}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
