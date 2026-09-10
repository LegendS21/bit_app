import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CornerDownRight, ListTree, Loader2, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SubNav from "../../components/ui/SubNav";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Alert from "../../components/ui/Alert";
import EmptyState from "../../components/ui/EmptyState";
import { Field } from "../../components/ui/Field";
import { SETTING_NAV } from "../../config/nav";
import { pesanError } from "../../lib/api";
import { buatMenu, daftarMenus, hapusMenu, ubahMenu } from "../../features/menus/menusApi";
import type { MenuSystem } from "../../features/menus/types";

type FormMenu = {
  kode: string;
  nama: string;
  path: string;
  icon: string;
  parentId: string;
  urutan: string;
  is_active: boolean;
};

const FORM_KOSONG: FormMenu = {
  kode: "",
  nama: "",
  path: "",
  icon: "",
  parentId: "",
  urutan: "0",
  is_active: true,
};

export default function SettingMenu() {
  const [daftar, setDaftar] = useState<MenuSystem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [errorMuat, setErrorMuat] = useState<string | null>(null);
  const [pemicuMuat, setPemicuMuat] = useState(0);
  const muatUlang = useCallback(() => setPemicuMuat((p) => p + 1), []);

  const [formTerbuka, setFormTerbuka] = useState(false);
  const [sedangDiubah, setSedangDiubah] = useState<MenuSystem | null>(null);
  const [form, setForm] = useState<FormMenu>(FORM_KOSONG);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  const [akanDihapus, setAkanDihapus] = useState<MenuSystem | null>(null);
  const [errorHapus, setErrorHapus] = useState<string | null>(null);
  const [menghapus, setMenghapus] = useState(false);

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
        const hasil = await daftarMenus();
        if (!aktif) return;
        setDaftar(hasil);
        setErrorMuat(null);
      } catch (error) {
        if (!aktif) return;
        setErrorMuat(pesanError(error, "Gagal memuat struktur menu"));
        setDaftar([]);
      } finally {
        if (aktif) setMemuat(false);
      }
    })();

    return () => {
      aktif = false;
    };
  }, [pemicuMuat]);

  /**
   * Hanya menu tingkat atas yang boleh jadi induk — struktur menu dibatasi dua
   * tingkat, sama seperti yang dirender sidebar. Menu yang sedang diubah tidak
   * boleh memilih dirinya sendiri.
   */
  const calonInduk = daftar.filter(
    (m) => m.parent_id === null && m.id !== sedangDiubah?.id,
  );

  function bukaTambah() {
    setSedangDiubah(null);
    setForm(FORM_KOSONG);
    setErrorForm(null);
    setFormTerbuka(true);
  }

  function bukaUbah(m: MenuSystem) {
    setSedangDiubah(m);
    setForm({
      kode: m.kode,
      nama: m.nama,
      path: m.path ?? "",
      icon: m.icon ?? "",
      parentId: m.parent_id === null ? "" : String(m.parent_id),
      urutan: String(m.urutan),
      is_active: m.is_active,
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
      path: form.path,
      icon: form.icon,
      parent_id: form.parentId === "" ? null : Number(form.parentId),
      urutan: Number(form.urutan) || 0,
    };

    try {
      if (sedangDiubah) {
        await ubahMenu(sedangDiubah.id, {
          ...isian,
          // Kode dan status menu bawaan sistem terkunci di backend.
          ...(sedangDiubah.bawaan_sistem
            ? {}
            : { kode: form.kode, is_active: form.is_active }),
        });
      } else {
        await buatMenu({ ...isian, kode: form.kode, is_active: form.is_active });
      }
      setFormTerbuka(false);
      muatUlang();
    } catch (error) {
      setErrorForm(pesanError(error, "Gagal menyimpan menu"));
    } finally {
      setMenyimpan(false);
    }
  }

  async function konfirmasiHapus() {
    if (!akanDihapus) return;
    setMenghapus(true);
    setErrorHapus(null);
    try {
      await hapusMenu(akanDihapus.id);
      setAkanDihapus(null);
      muatUlang();
    } catch (error) {
      setErrorHapus(pesanError(error, "Gagal menghapus menu"));
    } finally {
      setMenghapus(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Setting System"
        subtitle="Manajemen pengguna internal, role, dan struktur menu aplikasi"
      />
      <SubNav items={SETTING_NAV} />

      <div className="card">
        <div className="card-head">
          <span className="card-title">
            <ListTree size={16} className="text-brand-600" />
            Manajemen Struktur Menu System
          </span>
          <button type="button" onClick={bukaTambah} className="btn btn-sm btn-primary">
            <Plus size={15} /> Tambah Menu
          </button>
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
            <Loader2 size={18} className="animate-spin text-brand-600" /> Memuat struktur menu…
          </div>
        ) : daftar.length === 0 && !errorMuat ? (
          <EmptyState
            icon={ListTree}
            title="Belum ada menu"
            description="Tambahkan menu untuk menyusun sidebar portal internal."
            action={
              <button type="button" onClick={bukaTambah} className="btn btn-primary">
                <Plus size={15} /> Tambah Menu
              </button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nama Menu</th>
                  <th>URL / Route</th>
                  <th>Icon</th>
                  <th>Urutan</th>
                  <th>Dipakai Role</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span
                        className={`flex items-center gap-1.5 font-bold text-slate-800 ${
                          m.parent_id ? "pl-5" : ""
                        }`}
                      >
                        {m.parent_id && (
                          <CornerDownRight size={13} className="shrink-0 text-slate-400" />
                        )}
                        {m.nama}
                        {m.bawaan_sistem && (
                          <Lock
                            size={13}
                            className="text-slate-400"
                            aria-label="Menu bawaan sistem"
                          />
                        )}
                      </span>
                      <span
                        className={`block font-mono text-xs text-slate-500 ${
                          m.parent_id ? "pl-5" : ""
                        }`}
                      >
                        {m.kode}
                      </span>
                      {!m.is_active && (
                        <Badge tone="neutral" className="mt-1">
                          Non-Aktif
                        </Badge>
                      )}
                    </td>
                    <td>
                      {m.path ? (
                        <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
                          {m.path}
                        </code>
                      ) : (
                        <span className="text-xs text-slate-400">grup menu</span>
                      )}
                    </td>
                    <td className="text-slate-500">{m.icon ?? "—"}</td>
                    <td className="text-slate-500">{m.urutan}</td>
                    <td className="whitespace-nowrap text-slate-500">
                      {m.jumlah_role} role
                    </td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          aria-label={`Ubah ${m.nama}`}
                          onClick={() => bukaUbah(m)}
                          className="btn btn-icon btn-warning"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Hapus ${m.nama}`}
                          disabled={m.bawaan_sistem}
                          title={
                            m.bawaan_sistem
                              ? "Menu bawaan sistem tidak bisa dihapus"
                              : undefined
                          }
                          onClick={() => {
                            setAkanDihapus(m);
                            setErrorHapus(null);
                          }}
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
        )}
      </div>

      {/* ---------------- Tambah / ubah menu ---------------- */}
      <Modal
        open={formTerbuka}
        onClose={() => setFormTerbuka(false)}
        title={sedangDiubah ? "Ubah Menu System" : "Tambah Menu System"}
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
              form="form-menu"
              disabled={menyimpan}
              className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {menyimpan && <Loader2 size={15} className="animate-spin" />}
              {sedangDiubah ? "Simpan Perubahan" : "Simpan Menu"}
            </button>
          </>
        }
      >
        <form id="form-menu" onSubmit={simpan} className="space-y-4">
          {errorForm && <Alert tone="danger">{errorForm}</Alert>}

          {sedangDiubah?.bawaan_sistem && (
            <Alert tone="info">
              Menu bawaan sistem. Kode dan statusnya terkunci karena dipakai guard hak
              akses di backend — nama, route, ikon, dan urutannya tetap bisa diubah.
            </Alert>
          )}

          <Field
            label="Kode Menu"
            required
            hint="Huruf kapital, angka, dan garis bawah. Contoh: ADMIN_LAPORAN"
          >
            <input
              type="text"
              required
              maxLength={80}
              disabled={sedangDiubah?.bawaan_sistem}
              value={form.kode}
              onChange={(e) => setForm({ ...form, kode: e.target.value.toUpperCase() })}
              className="input font-mono disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="ADMIN_LAPORAN"
            />
          </Field>

          <Field label="Nama Menu" required>
            <input
              type="text"
              required
              maxLength={100}
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="input"
              placeholder="Contoh: Laporan Rekapitulasi"
            />
          </Field>

          <Field
            label="Menu Induk"
            hint="Kosongkan untuk menu tingkat atas. Struktur menu hanya dua tingkat."
          >
            <select
              className="input"
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            >
              <option value="">— Menu tingkat atas —</option>
              {calonInduk.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nama}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="URL / Route"
            hint="Kosongkan kalau menu ini hanya grup pembungkus di sidebar."
          >
            <input
              type="text"
              maxLength={150}
              value={form.path}
              onChange={(e) => setForm({ ...form, path: e.target.value })}
              className="input font-mono"
              placeholder="/admin/laporan"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nama Icon"
              hint="Nama ikon lucide-react, contoh: FileSpreadsheet."
            >
              <input
                type="text"
                maxLength={50}
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="input"
                placeholder="FileSpreadsheet"
              />
            </Field>

            <Field label="Urutan Tampil">
              <input
                type="number"
                min={0}
                max={9999}
                value={form.urutan}
                onChange={(e) => setForm({ ...form, urutan: e.target.value })}
                className="input"
              />
            </Field>
          </div>

          <Field label="Status">
            <select
              className="input disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={sedangDiubah?.bawaan_sistem}
              value={form.is_active ? "aktif" : "nonaktif"}
              onChange={(e) => setForm({ ...form, is_active: e.target.value === "aktif" })}
            >
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Non-Aktif</option>
            </select>
          </Field>
        </form>
      </Modal>

      {/* ---------------- Konfirmasi hapus ---------------- */}
      <Modal
        open={akanDihapus !== null}
        onClose={() => setAkanDihapus(null)}
        title="Hapus Menu System"
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
            Hapus menu <span className="font-bold text-slate-800">{akanDihapus?.nama}</span>{" "}
            ({akanDihapus?.kode})?
          </p>
          {akanDihapus && akanDihapus.jumlah_anak > 0 && (
            <Alert tone="warning">
              Menu ini punya {akanDihapus.jumlah_anak} submenu. Hapus atau pindahkan
              submenunya dulu — kalau tidak, penghapusan akan ditolak.
            </Alert>
          )}
          {akanDihapus && akanDihapus.jumlah_role > 0 && (
            <Alert tone="warning">
              Hak akses menu ini pada {akanDihapus.jumlah_role} role ikut terhapus dan
              tidak bisa dikembalikan.
            </Alert>
          )}
        </div>
      </Modal>
    </>
  );
}
