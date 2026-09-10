import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  CalendarDays,
  ClipboardCheck,
  Clock,
  Contact,
  FileBadge,
  FileCheck2,
  MapPin,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import {
  ALUR_PENDAFTARAN,
  PROGRAM,
  SYARAT_BERKAS,
  type Program,
} from "../../data/dummy";

const IKON_SYARAT = {
  id: Contact,
  family: Users,
  diploma: FileBadge,
  letter: FileCheck2,
} as const;

export default function Landing() {
  const [detail, setDetail] = useState<Program | null>(null);

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
              <Award size={14} /> GELOMBANG PENDAFTARAN 2026 DIBUKA
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

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/20 pt-6">
              {[
                ["3", "Program Aktif"],
                ["225", "Kuota Peserta"],
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

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PROGRAM.map((p) => (
              <article
                key={p.id}
                className="card flex flex-col transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="grow p-5">
                  {p.status === "dibuka" ? (
                    <Badge tone="success">
                      <Clock size={12} /> Pendaftaran Dibuka
                    </Badge>
                  ) : (
                    <Badge tone="danger">
                      <XCircle size={12} /> Segera Ditutup
                    </Badge>
                  )}

                  <h3 className="mt-3 text-lg font-bold text-slate-900">
                    {p.nama}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">{p.deskripsi}</p>

                  <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
                    <li className="flex items-center gap-2">
                      <CalendarDays size={16} className="text-brand-600" />
                      <span className="text-slate-500">
                        <b className="text-slate-700">Batas:</b>{" "}
                        {p.batasPendaftaran}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <MapPin size={16} className="text-brand-600" />
                      <span className="text-slate-500">
                        <b className="text-slate-700">Metode:</b> {p.metode}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Users size={16} className="text-brand-600" />
                      <span className="text-slate-500">
                        <b className="text-slate-700">Kuota:</b> {p.kuota}{" "}
                        Peserta
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
            ))}
          </div>
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
                        {!last && (
                          <span className="mt-1 w-px grow bg-slate-300" />
                        )}
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
        subtitle={`Kuota ${detail?.kuota ?? 0} peserta · ${detail?.metode ?? ""}`}
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
              <h3 className="mb-2 font-bold text-slate-800">
                Deskripsi Program
              </h3>
              <p className="text-sm text-slate-500">{detail.deskripsi}</p>
            </div>
            <div>
              <h3 className="mb-2 font-bold text-slate-800">
                Persyaratan Khusus
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-500">
                {detail.persyaratanKhusus.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-bold text-slate-800">
                Dokumen yang Wajib Diunggah
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-500">
                {detail.dokumenWajib.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-brand-50 p-4 text-sm text-brand-800">
              <b>Batas pendaftaran:</b> {detail.batasPendaftaran}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
