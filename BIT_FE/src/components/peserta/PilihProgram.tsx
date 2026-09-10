import { useEffect, useState } from "react";
import {
  BookMarked,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Lock,
  PencilLine,
  Users,
} from "lucide-react";
import Badge from "../ui/Badge";
import Alert from "../ui/Alert";
import EmptyState from "../ui/EmptyState";
import { pesanError } from "../../lib/api";
import { daftarBeasiswa } from "../../features/beasiswa/beasiswaApi";
import type { Beasiswa } from "../../features/beasiswa/types";

/** YYYY-MM-DD → "1 September 2026". */
function tanggalIndonesia(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/** Katalog program yang sedang dibuka, dari service Master. */
export default function PilihProgram({
  beasiswaTerpilih,
  onPilih,
  sedangMembuat,
}: {
  /** Program yang sudah didaftar peserta ini, kalau ada. */
  beasiswaTerpilih?: number;
  onPilih: (beasiswaId: number) => void;
  sedangMembuat?: number | null;
}) {
  const [daftar, setDaftar] = useState<Beasiswa[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aktif = true;

    (async () => {
      await Promise.resolve();
      if (!aktif) return;
      setMemuat(true);

      try {
        // Peserta hanya bisa melihat program AKTIF — penyaringannya di backend.
        const hasil = await daftarBeasiswa({ page: 1, limit: 50 });
        if (!aktif) return;
        setDaftar(hasil.data);
        setError(null);
      } catch (e) {
        if (!aktif) return;
        setError(pesanError(e, "Gagal memuat katalog program"));
      } finally {
        if (aktif) setMemuat(false);
      }
    })();

    return () => {
      aktif = false;
    };
  }, []);

  const sudahMendaftar = beasiswaTerpilih !== undefined;

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-800">
        <BookMarked size={18} className="text-brand-600" />
        Katalog Program Pelatihan
      </h2>

      {error && <Alert tone="danger">{error}</Alert>}

      {memuat ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-slate-500">
          <Loader2 size={18} className="animate-spin text-brand-600" /> Memuat katalog…
        </div>
      ) : daftar.length === 0 && !error ? (
        <EmptyState
          icon={BookMarked}
          title="Belum ada program yang dibuka"
          description="Saat ini tidak ada program pelatihan yang sedang menerima pendaftaran. Silakan periksa kembali nanti."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {daftar.map((p) => {
            const terpilih = p.id === beasiswaTerpilih;
            const terkunci = sudahMendaftar && !terpilih;
            const sibuk = sedangMembuat === p.id;

            return (
              <article
                key={p.id}
                className={`card flex flex-col ${
                  terpilih ? "border-brand-400 ring-1 ring-brand-200" : ""
                } ${terkunci ? "bg-slate-50 opacity-80" : ""}`}
              >
                <div className="grow p-5">
                  {terpilih ? (
                    <Badge tone="brand">
                      <CheckCircle2 size={12} /> Program Pilihan Anda
                    </Badge>
                  ) : (
                    <Badge tone={terkunci ? "neutral" : "success"}>Pendaftaran Aktif</Badge>
                  )}

                  <h3
                    className={`mt-3 font-bold ${
                      terkunci ? "text-slate-500" : "text-slate-900"
                    }`}
                  >
                    {p.nama}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-500">
                    {p.deskripsi ?? p.penyelenggara ?? "—"}
                  </p>

                  <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-xs text-slate-500">
                    <li className="flex items-center gap-2">
                      <CalendarDays size={14} />
                      <span>
                        <b>Batas:</b> {tanggalIndonesia(p.tgl_tutup)}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Users size={14} />
                      <span>
                        <b>Kuota:</b> {p.kuota} peserta
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="p-5 pt-0">
                  {terpilih ? (
                    <button
                      type="button"
                      onClick={() => onPilih(p.id)}
                      className="btn btn-sm btn-outline-brand w-full"
                    >
                      <PencilLine size={14} /> Lihat / Lanjutkan Formulir
                    </button>
                  ) : terkunci ? (
                    <button
                      type="button"
                      disabled
                      title="Anda sudah mendaftar pada program lain"
                      className="btn btn-sm w-full btn-outline"
                    >
                      <Lock size={14} /> Sudah Mendaftar Program Lain
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={sibuk}
                      onClick={() => onPilih(p.id)}
                      className="btn btn-sm btn-primary w-full disabled:opacity-60"
                    >
                      {sibuk && <Loader2 size={14} className="animate-spin" />}
                      Pilih &amp; Isi Formulir
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
