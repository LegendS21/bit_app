import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Loader2,
  Lock,
  Pencil,
  Plus,
  ShieldHalf,
  ShieldPlus,
  Trash2,
} from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SubNav from "../../components/ui/SubNav";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Alert from "../../components/ui/Alert";
import EmptyState from "../../components/ui/EmptyState";
import { Field } from "../../components/ui/Field";
import { SETTING_NAV } from "../../config/nav";
import { pesanError } from "../../lib/api";
import {
  aksesMenuRole,
  buatRole,
  daftarRoles,
  hapusRole,
  simpanAksesMenuRole,
  ubahRole,
} from "../../features/roles/rolesApi";
import type { AksesMenuRole, BarisAksesMenu, Role } from "../../features/roles/types";

type FormRole = {
  kode: string;
  nama: string;
  deskripsi: string;
  is_active: boolean;
};

const FORM_KOSONG: FormRole = { kode: "", nama: "", deskripsi: "", is_active: true };

export default function SettingRoles() {
  const [daftar, setDaftar] = useState<Role[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [errorMuat, setErrorMuat] = useState<string | null>(null);
  const [pemicuMuat, setPemicuMuat] = useState(0);
  const muatUlang = useCallback(() => setPemicuMuat((p) => p + 1), []);

  // Modal tambah/ubah role
  const [formTerbuka, setFormTerbuka] = useState(false);
  const [sedangDiubah, setSedangDiubah] = useState<Role | null>(null);
  const [form, setForm] = useState<FormRole>(FORM_KOSONG);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  // Modal setting akses menu
  const [roleAkses, setRoleAkses] = useState<Role | null>(null);
  const [akses, setAkses] = useState<AksesMenuRole | null>(null);
  const [memuatAkses, setMemuatAkses] = useState(false);
  const [errorAkses, setErrorAkses] = useState<string | null>(null);
  const [menyimpanAkses, setMenyimpanAkses] = useState(false);

  // Modal konfirmasi hapus
  const [akanDihapus, setAkanDihapus] = useState<Role | null>(null);
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
        const hasil = await daftarRoles();
        if (!aktif) return;
        setDaftar(hasil);
        setErrorMuat(null);
      } catch (error) {
        if (!aktif) return;
        setErrorMuat(pesanError(error, "Gagal memuat daftar role"));
        setDaftar([]);
      } finally {
        if (aktif) setMemuat(false);
      }
    })();

    return () => {
      aktif = false;
    };
  }, [pemicuMuat]);

  function bukaTambah() {
    setSedangDiubah(null);
    setForm(FORM_KOSONG);
    setErrorForm(null);
    setFormTerbuka(true);
  }

  function bukaUbah(r: Role) {
    setSedangDiubah(r);
    setForm({
      kode: r.kode,
      nama: r.nama,
      deskripsi: r.deskripsi ?? "",
      is_active: r.is_active,
    });
    setErrorForm(null);
    setFormTerbuka(true);
  }

  async function simpanRole(e: FormEvent) {
    e.preventDefault();
    setMenyimpan(true);
    setErrorForm(null);

    try {
      if (sedangDiubah) {
        await ubahRole(sedangDiubah.id, {
          nama: form.nama,
          deskripsi: form.deskripsi,
          // Kode dan status role bawaan sistem terkunci di backend, jadi
          // tidak perlu dikirim untuk role seperti itu.
          ...(sedangDiubah.bawaan_sistem
            ? {}
            : { kode: form.kode, is_active: form.is_active }),
        });
      } else {
        await buatRole({
          kode: form.kode,
          nama: form.nama,
          deskripsi: form.deskripsi,
          is_active: form.is_active,
        });
      }
      setFormTerbuka(false);
      muatUlang();
    } catch (error) {
      setErrorForm(pesanError(error, "Gagal menyimpan role"));
    } finally {
      setMenyimpan(false);
    }
  }

  async function bukaAkses(r: Role) {
    setRoleAkses(r);
    setAkses(null);
    setErrorAkses(null);
    setMemuatAkses(true);
    try {
      setAkses(await aksesMenuRole(r.id));
    } catch (error) {
      setErrorAkses(pesanError(error, "Gagal memuat hak akses menu"));
    } finally {
      setMemuatAkses(false);
    }
  }

  /**
   * Tambah/ubah/hapus tidak masuk akal tanpa bisa membuka menunya, jadi
   * mencentang salah satunya otomatis menyalakan "Lihat", dan mematikan
   * "Lihat" mematikan semuanya. Backend menerapkan aturan yang sama.
   */
  function ubahCentang(menuId: number, kolom: keyof BarisAksesMenu, nilai: boolean) {
    setAkses((sebelum) => {
      if (!sebelum) return sebelum;
      return {
        ...sebelum,
        menus: sebelum.menus.map((m) => {
          if (m.menu_id !== menuId) return m;
          if (kolom === "can_view" && !nilai) {
            return { ...m, can_view: false, can_create: false, can_update: false, can_delete: false };
          }
          return { ...m, [kolom]: nilai, ...(nilai ? { can_view: true } : {}) };
        }),
      };
    });
  }

  async function simpanAkses() {
    if (!akses || !roleAkses) return;
    setMenyimpanAkses(true);
    setErrorAkses(null);
    try {
      await simpanAksesMenuRole(
        roleAkses.id,
        akses.menus.map((m) => ({
          menu_id: m.menu_id,
          can_view: m.can_view,
          can_create: m.can_create,
          can_update: m.can_update,
          can_delete: m.can_delete,
        })),
      );
      setRoleAkses(null);
      muatUlang();
    } catch (error) {
      setErrorAkses(pesanError(error, "Gagal menyimpan hak akses menu"));
    } finally {
      setMenyimpanAkses(false);
    }
  }

  async function konfirmasiHapus() {
    if (!akanDihapus) return;
    setMenghapus(true);
    setErrorHapus(null);
    try {
      await hapusRole(akanDihapus.id);
      setAkanDihapus(null);
      muatUlang();
    } catch (error) {
      setErrorHapus(pesanError(error, "Gagal menghapus role"));
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
            <ShieldHalf size={16} className="text-brand-600" />
            Manajemen Role &amp; Hak Akses Menu
          </span>
          <button type="button" onClick={bukaTambah} className="btn btn-sm btn-primary">
            <Plus size={15} /> Tambah Role
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
            <Loader2 size={18} className="animate-spin text-brand-600" /> Memuat daftar role…
          </div>
        ) : daftar.length === 0 && !errorMuat ? (
          <EmptyState
            icon={ShieldHalf}
            title="Belum ada role"
            description="Tambahkan role untuk mengatur hak akses menu pengguna internal."
            action={
              <button type="button" onClick={bukaTambah} className="btn btn-primary">
                <Plus size={15} /> Tambah Role
              </button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nama Role</th>
                  <th>Akses Menu Terkait</th>
                  <th>Pengguna</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="flex items-center gap-1.5 font-bold text-slate-800">
                        {r.nama}
                        {r.bawaan_sistem && (
                          <Lock size={13} className="text-slate-400" aria-label="Role bawaan sistem" />
                        )}
                      </span>
                      <span className="block font-mono text-xs text-slate-500">{r.kode}</span>
                      {!r.is_active && (
                        <Badge tone="neutral" className="mt-1">
                          Non-Aktif
                        </Badge>
                      )}
                    </td>
                    <td>
                      {r.menus.length === 0 ? (
                        <span className="text-xs text-slate-400">Belum ada akses menu</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {r.menus.map((m) => (
                            <Badge key={m.id} tone="neutral">
                              {m.nama}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap">{r.jumlah_user} user</td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => bukaAkses(r)}
                          className="btn btn-sm btn-outline-brand"
                        >
                          <ShieldPlus size={14} /> Setting Akses
                        </button>
                        <button
                          type="button"
                          aria-label={`Ubah ${r.nama}`}
                          onClick={() => bukaUbah(r)}
                          className="btn btn-icon btn-warning"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Hapus ${r.nama}`}
                          disabled={r.bawaan_sistem}
                          title={
                            r.bawaan_sistem
                              ? "Role bawaan sistem tidak bisa dihapus"
                              : undefined
                          }
                          onClick={() => {
                            setAkanDihapus(r);
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

      {/* ---------------- Tambah / ubah role ---------------- */}
      <Modal
        open={formTerbuka}
        onClose={() => setFormTerbuka(false)}
        title={sedangDiubah ? "Ubah Role" : "Tambah Role"}
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
              form="form-role"
              disabled={menyimpan}
              className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {menyimpan && <Loader2 size={15} className="animate-spin" />}
              {sedangDiubah ? "Simpan Perubahan" : "Simpan Role"}
            </button>
          </>
        }
      >
        <form id="form-role" onSubmit={simpanRole} className="space-y-4">
          {errorForm && <Alert tone="danger">{errorForm}</Alert>}

          {sedangDiubah?.bawaan_sistem && (
            <Alert tone="info">
              Role bawaan sistem. Kode dan statusnya terkunci karena dipakai untuk
              menentukan hak akses di seluruh aplikasi — nama dan keterangannya tetap bisa
              diubah.
            </Alert>
          )}

          <Field
            label="Kode Role"
            required
            hint="Huruf kapital, angka, dan garis bawah. Contoh: OPERATOR_PELATIHAN"
          >
            <input
              type="text"
              required
              maxLength={50}
              disabled={sedangDiubah?.bawaan_sistem}
              value={form.kode}
              onChange={(e) => setForm({ ...form, kode: e.target.value.toUpperCase() })}
              className="input font-mono disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="OPERATOR_PELATIHAN"
            />
          </Field>

          <Field label="Nama Role" required>
            <input
              type="text"
              required
              maxLength={100}
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="input"
              placeholder="Contoh: Operator Pelatihan"
            />
          </Field>

          <Field label="Keterangan">
            <textarea
              rows={2}
              maxLength={255}
              value={form.deskripsi}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              className="input"
              placeholder="Ruang lingkup tugas role ini…"
            />
          </Field>

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

      {/* ---------------- Setting akses menu ---------------- */}
      <Modal
        open={roleAkses !== null}
        onClose={() => setRoleAkses(null)}
        title="Setting Akses Menu"
        subtitle={roleAkses ? `Role: ${roleAkses.nama}` : undefined}
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setRoleAkses(null)}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={simpanAkses}
              disabled={menyimpanAkses || memuatAkses || !akses}
              className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {menyimpanAkses && <Loader2 size={15} className="animate-spin" />}
              Simpan Hak Akses
            </button>
          </>
        }
      >
        {errorAkses && (
          <div className="mb-4">
            <Alert tone="danger">{errorAkses}</Alert>
          </div>
        )}

        {memuatAkses ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-slate-500">
            <Loader2 size={18} className="animate-spin text-brand-600" /> Memuat hak akses…
          </div>
        ) : akses ? (
          <>
            <p className="mb-4 text-sm text-slate-500">
              Centang menu yang boleh diakses role ini. Kolom Tambah/Ubah/Hapus otomatis
              menyalakan Lihat.
            </p>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Menu</th>
                    <th className="text-center">Lihat</th>
                    <th className="text-center">Tambah</th>
                    <th className="text-center">Ubah</th>
                    <th className="text-center">Hapus</th>
                  </tr>
                </thead>
                <tbody>
                  {akses.menus.map((m) => (
                    <tr key={m.menu_id}>
                      <td className={m.parent_id ? "pl-8" : undefined}>
                        <span className="block text-sm font-bold text-slate-800">
                          {m.nama}
                        </span>
                        <span className="block font-mono text-xs text-slate-500">
                          {m.path ?? "— grup menu —"}
                        </span>
                      </td>
                      {(["can_view", "can_create", "can_update", "can_delete"] as const).map(
                        (kolom) => (
                          <td key={kolom} className="text-center">
                            <input
                              type="checkbox"
                              aria-label={`${kolom} ${m.nama}`}
                              checked={m[kolom]}
                              onChange={(e) => ubahCentang(m.menu_id, kolom, e.target.checked)}
                              className="h-4 w-4 accent-brand-600"
                            />
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </Modal>

      {/* ---------------- Konfirmasi hapus ---------------- */}
      <Modal
        open={akanDihapus !== null}
        onClose={() => setAkanDihapus(null)}
        title="Hapus Role"
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
            Hapus role <span className="font-bold text-slate-800">{akanDihapus?.nama}</span>{" "}
            ({akanDihapus?.kode})? Hak akses menunya ikut terhapus.
          </p>
          {akanDihapus && akanDihapus.jumlah_user > 0 && (
            <Alert tone="warning">
              Role ini masih dipakai {akanDihapus.jumlah_user} user. Pindahkan user-nya ke
              role lain dulu — kalau tidak, penghapusan akan ditolak.
            </Alert>
          )}
        </div>
      </Modal>
    </>
  );
}
