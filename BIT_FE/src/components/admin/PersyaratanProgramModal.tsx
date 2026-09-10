import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ListChecks,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import Modal from "../ui/Modal";
import Alert from "../ui/Alert";
import Badge from "../ui/Badge";
import { pesanError } from "../../lib/api";
import { daftarSyaratProgram, simpanSyaratProgram } from "../../features/beasiswa/beasiswaApi";
import {
  STATUS_SYARAT_TERKUNCI,
  type Beasiswa,
  type SyaratProgram,
} from "../../features/beasiswa/types";
import { daftarPersyaratan } from "../../features/persyaratan/persyaratanApi";
import {
  labelMime,
  ukuranTerbaca,
  type Persyaratan,
} from "../../features/persyaratan/types";

/** Semua jenis dokumen ditarik sekaligus — jumlahnya puluhan, bukan ribuan. */
const LIMIT_PILIHAN = 100;

/**
 * Menentukan dokumen apa saja yang harus diunggah pelamar sebuah program.
 *
 * Sifat wajib/opsional melekat di sini, bukan di master persyaratan — satu
 * dokumen bisa wajib pada program A dan opsional pada program B.
 */
export default function PersyaratanProgramModal({
  program,
  onClose,
}: {
  program: Beasiswa | null;
  onClose: () => void;
}) {
  const [dipilih, setDipilih] = useState<SyaratProgram[]>([]);
  const [tersedia, setTersedia] = useState<Persyaratan[]>([]);
  const [akanDitambah, setAkanDitambah] = useState("");

  const [memuat, setMemuat] = useState(true);
  const [errorMuat, setErrorMuat] = useState<string | null>(null);
  const [errorSimpan, setErrorSimpan] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [tersimpan, setTersimpan] = useState(false);

  const terkunci = program ? STATUS_SYARAT_TERKUNCI.includes(program.status) : false;
  const programId = program?.id ?? null;

  useEffect(() => {
    if (programId === null) return;
    let aktif = true;

    (async () => {
      // `await` di depan memindahkan setState keluar dari fase sinkron effect;
      // dinyalakan dan dimatikan di tempat yang sama supaya loading tidak
      // mungkin menyala tanpa ada yang mematikannya.
      await Promise.resolve();
      if (!aktif) return;
      setMemuat(true);
      setErrorSimpan(null);
      setTersimpan(false);
      setAkanDitambah("");

      try {
        const [syarat, master] = await Promise.all([
          daftarSyaratProgram(programId),
          daftarPersyaratan({ status: "aktif", page: 1, limit: LIMIT_PILIHAN }),
        ]);
        if (!aktif) return;
        setDipilih(syarat.persyaratan);
        setTersedia(master.data);
        setErrorMuat(null);
      } catch (error) {
        if (!aktif) return;
        setErrorMuat(pesanError(error, "Gagal memuat persyaratan program"));
        setDipilih([]);
        setTersedia([]);
      } finally {
        if (aktif) setMemuat(false);
      }
    })();

    return () => {
      aktif = false;
    };
  }, [programId]);

  // Yang sudah terpasang tidak muncul lagi di daftar pilihan.
  const belumDipakai = tersedia.filter(
    (p) => !dipilih.some((d) => d.persyaratan_id === p.id),
  );

  function tambah() {
    const id = Number(akanDitambah);
    const master = tersedia.find((p) => p.id === id);
    if (!master) return;

    setDipilih((sebelumnya) => [
      ...sebelumnya,
      {
        persyaratan_id: master.id,
        kode: master.kode,
        nama: master.nama,
        deskripsi: master.deskripsi,
        allowed_mime: master.allowed_mime,
        max_size_kb: master.max_size_kb,
        is_active: master.is_active,
        is_wajib: true,
        urutan: sebelumnya.length + 1,
      },
    ]);
    setAkanDitambah("");
    setTersimpan(false);
  }

  function geser(indeks: number, arah: -1 | 1) {
    const tujuan = indeks + arah;
    setDipilih((sebelumnya) => {
      if (tujuan < 0 || tujuan >= sebelumnya.length) return sebelumnya;
      const salinan = [...sebelumnya];
      [salinan[indeks], salinan[tujuan]] = [salinan[tujuan], salinan[indeks]];
      return salinan;
    });
    setTersimpan(false);
  }

  function lepas(id: number) {
    setDipilih((sebelumnya) => sebelumnya.filter((d) => d.persyaratan_id !== id));
    setTersimpan(false);
  }

  function ubahWajib(id: number, wajib: boolean) {
    setDipilih((sebelumnya) =>
      sebelumnya.map((d) => (d.persyaratan_id === id ? { ...d, is_wajib: wajib } : d)),
    );
    setTersimpan(false);
  }

  async function simpan() {
    if (programId === null) return;
    setMenyimpan(true);
    setErrorSimpan(null);

    try {
      // Urutan array yang menentukan nomor urutnya, jadi cukup kirim apa adanya.
      const hasil = await simpanSyaratProgram(
        programId,
        dipilih.map((d) => ({ persyaratan_id: d.persyaratan_id, is_wajib: d.is_wajib })),
      );
      // Dipakai jawaban server, bukan state lokal: nomor urutnya sudah
      // dirapikan di sana.
      setDipilih(hasil.persyaratan);
      setTersimpan(true);
    } catch (error) {
      setErrorSimpan(pesanError(error, "Gagal menyimpan persyaratan program"));
    } finally {
      setMenyimpan(false);
    }
  }

  const jumlahWajib = dipilih.filter((d) => d.is_wajib).length;

  return (
    <Modal
      open={program !== null}
      onClose={onClose}
      title="Persyaratan Program"
      subtitle={program ? `${program.kode} — ${program.nama}` : undefined}
      icon={<ListChecks size={20} />}
      size="xl"
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Tutup
          </button>
          <button
            type="button"
            onClick={simpan}
            disabled={menyimpan || memuat || terkunci || errorMuat !== null}
            className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {menyimpan ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Simpan Persyaratan
          </button>
        </>
      }
    >
      {memuat ? (
        <div className="flex items-center justify-center gap-2 py-14 text-sm font-semibold text-slate-500">
          <Loader2 size={18} className="animate-spin text-brand-600" /> Memuat persyaratan…
        </div>
      ) : (
        <div className="space-y-4">
          {errorMuat && <Alert tone="danger">{errorMuat}</Alert>}
          {errorSimpan && <Alert tone="danger">{errorSimpan}</Alert>}
          {tersimpan && !errorSimpan && (
            <Alert tone="success">Persyaratan program berhasil disimpan.</Alert>
          )}

          {terkunci && (
            <Alert tone="warning" title="Daftar persyaratan terkunci">
              Program berstatus {program?.status === "ARSIP" ? "Arsip" : "Ditutup"} tidak
              bisa diubah daftar persyaratannya. Permohonan yang sudah masuk dinilai
              memakai daftar yang berlaku saat itu.
            </Alert>
          )}

          {!terkunci && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-56 grow">
                <span className="mb-1.5 block text-sm font-bold text-slate-700">
                  Tambah Persyaratan
                </span>
                <select
                  className="input"
                  value={akanDitambah}
                  onChange={(e) => setAkanDitambah(e.target.value)}
                  disabled={belumDipakai.length === 0}
                >
                  <option value="">
                    {belumDipakai.length === 0
                      ? "Semua jenis dokumen sudah dipasang"
                      : "— Pilih jenis dokumen —"}
                  </option>
                  {belumDipakai.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} ({p.kode})
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={tambah}
                disabled={!akanDitambah}
                className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={15} /> Tambahkan
              </button>
            </div>
          )}

          {dipilih.length === 0 ? (
            <Alert tone="info" title="Program ini belum menuntut dokumen apa pun">
              Pelamar bisa mengirim permohonan tanpa mengunggah berkas. Tambahkan jenis
              dokumen di atas kalau program ini membutuhkannya.
            </Alert>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th className="w-12">No</th>
                      <th>Jenis Dokumen</th>
                      <th>Format &amp; Ukuran</th>
                      <th className="w-32">Sifat</th>
                      <th className="w-28 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dipilih.map((d, i) => (
                      <tr key={d.persyaratan_id}>
                        <td className="text-center font-bold text-slate-500">{i + 1}</td>
                        <td>
                          <p className="font-bold text-slate-800">{d.nama}</p>
                          <p className="font-mono text-xs text-slate-500">{d.kode}</p>
                          {!d.is_active && (
                            <Badge tone="warning">Jenis dokumen sudah dinonaktifkan</Badge>
                          )}
                        </td>
                        <td className="text-xs text-slate-600">
                          {d.allowed_mime.map(labelMime).join(", ") || "—"}
                          <span className="block text-slate-400">
                            maks {ukuranTerbaca(d.max_size_kb)}
                          </span>
                        </td>
                        <td>
                          <select
                            className="input"
                            value={d.is_wajib ? "wajib" : "opsional"}
                            disabled={terkunci}
                            onChange={(e) =>
                              ubahWajib(d.persyaratan_id, e.target.value === "wajib")
                            }
                          >
                            <option value="wajib">Wajib</option>
                            <option value="opsional">Opsional</option>
                          </select>
                        </td>
                        <td>
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              aria-label={`Naikkan ${d.nama}`}
                              disabled={terkunci || i === 0}
                              onClick={() => geser(i, -1)}
                              className="btn btn-icon btn-outline disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Turunkan ${d.nama}`}
                              disabled={terkunci || i === dipilih.length - 1}
                              onClick={() => geser(i, 1)}
                              className="btn btn-icon btn-outline disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Lepas ${d.nama}`}
                              disabled={terkunci}
                              onClick={() => lepas(d.persyaratan_id)}
                              className="btn btn-icon btn-danger disabled:cursor-not-allowed disabled:opacity-40"
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

              <p className="text-sm text-slate-500">
                {dipilih.length} dokumen — {jumlahWajib} wajib,{" "}
                {dipilih.length - jumlahWajib} opsional. Urutannya menentukan urutan
                unggah pada wizard pendaftaran.
              </p>
            </>
          )}

          {!terkunci && dipilih.length > 0 && (
            <p className="text-xs text-slate-400">
              Perubahan di sini baru berlaku setelah ditekan “Simpan Persyaratan”.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
