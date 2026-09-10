import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Search,
  Trash2,
  UserPlus,
  Users,
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
import { segarkanProfil } from "../../features/auth/authSlice";
import { useAppDispatch, useAuth } from "../../store/hooks";
import { LABEL_ROLE, ROLE_INTERNAL, type KodeRole } from "../../features/auth/types";
import { buatUser, daftarUsers, hapusUser, ubahUser } from "../../features/users/usersApi";
import { daftarRoles } from "../../features/roles/rolesApi";
import type { MetaHalaman, UserInternal } from "../../features/users/types";
import type { Role } from "../../features/roles/types";

const LIMIT = 10;

type FormUser = {
  nama: string;
  email: string;
  password: string;
  passwordLama: string;
  no_hp: string;
  role: KodeRole;
  is_active: boolean;
};

const FORM_KOSONG: FormUser = {
  nama: "",
  email: "",
  password: "",
  passwordLama: "",
  no_hp: "",
  role: "VERIFIKATOR",
  is_active: true,
};

export default function SettingUsers() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [daftar, setDaftar] = useState<UserInternal[]>([]);
  const [meta, setMeta] = useState<MetaHalaman | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [errorMuat, setErrorMuat] = useState<string | null>(null);

  const [cari, setCari] = useState("");
  const [cariTertunda, setCariTertunda] = useState("");
  const [filterRole, setFilterRole] = useState<KodeRole | "">("");
  const [filterStatus, setFilterStatus] = useState<"" | "aktif" | "nonaktif">("");
  const [halaman, setHalaman] = useState(1);

  // Modal tambah/ubah
  const [formTerbuka, setFormTerbuka] = useState(false);
  const [sedangDiubah, setSedangDiubah] = useState<UserInternal | null>(null);
  const [form, setForm] = useState<FormUser>(FORM_KOSONG);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  // Modal konfirmasi hapus
  const [akanDihapus, setAkanDihapus] = useState<UserInternal | null>(null);
  const [errorHapus, setErrorHapus] = useState<string | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  // Dinaikkan untuk memaksa daftar dimuat ulang (setelah simpan/hapus, atau
  // tombol "Coba lagi") tanpa menduplikasi logika pengambilan datanya.
  const [pemicuMuat, setPemicuMuat] = useState(0);
  const muatUlang = useCallback(() => setPemicuMuat((p) => p + 1), []);

  // Tunda pencarian supaya tidak memanggil API tiap ketikan.
  useEffect(() => {
    const timer = setTimeout(() => {
      setCariTertunda(cari);
      setHalaman(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [cari]);

  useEffect(() => {
    // `aktif` mencegah hasil request lama menimpa hasil request terbaru
    // ketika filter diganti cepat-cepat.
    let aktif = true;

    (async () => {
      // Dinyalakan dan dimatikan di tempat yang sama supaya tidak mungkin ada
      // loading yang menyala tanpa ada yang mematikannya. `await` di depan
      // memindahkannya keluar dari fase sinkron effect — setState sinkron di
      // badan effect memicu render berantai dan ditolak aturan lint react-hooks.
      await Promise.resolve();
      if (!aktif) return;
      setMemuat(true);

      try {
        const hasil = await daftarUsers({
          q: cariTertunda,
          role: filterRole,
          status: filterStatus,
          tipe: "INTERNAL",
          page: halaman,
          limit: LIMIT,
        });
        if (!aktif) return;
        setDaftar(hasil.data);
        setMeta(hasil.meta);
        setErrorMuat(null);
      } catch (error) {
        if (!aktif) return;
        setErrorMuat(pesanError(error, "Gagal memuat daftar user"));
        setDaftar([]);
        setMeta(null);
      } finally {
        if (aktif) setMemuat(false);
      }
    })();

    return () => {
      aktif = false;
    };
  }, [cariTertunda, filterRole, filterStatus, halaman, pemicuMuat]);

  // Daftar role cukup diambil sekali; isinya jarang berubah.
  useEffect(() => {
    daftarRoles()
      .then(setRoles)
      .catch(() => setRoles([]));
  }, []);

  const roleInternal = roles.filter((r) => ROLE_INTERNAL.includes(r.kode));
  const milikSendiri = sedangDiubah !== null && sedangDiubah.uuid === user?.uuid;

  function bukaTambah() {
    setSedangDiubah(null);
    setForm(FORM_KOSONG);
    setErrorForm(null);
    setFormTerbuka(true);
  }

  function bukaUbah(u: UserInternal) {
    setSedangDiubah(u);
    setForm({
      nama: u.nama,
      email: u.email,
      password: "",
      passwordLama: "",
      no_hp: u.no_hp ?? "",
      role: u.roles[0]?.kode ?? "VERIFIKATOR",
      is_active: u.is_active,
    });
    setErrorForm(null);
    setFormTerbuka(true);
  }

  async function simpan(e: FormEvent) {
    e.preventDefault();
    setMenyimpan(true);
    setErrorForm(null);
    const ubahDiriSendiri = sedangDiubah?.uuid === user?.uuid;

    try {
      if (sedangDiubah) {
        await ubahUser(sedangDiubah.uuid, {
          nama: form.nama,
          email: form.email,
          no_hp: form.no_hp,
          roles: [form.role],
          is_active: form.is_active,
          // Password hanya dikirim kalau memang diisi ulang. Password lama
          // hanya diminta backend saat mengubah akun sendiri.
          ...(form.password ? { password: form.password } : {}),
          ...(form.password && ubahDiriSendiri ? { password_lama: form.passwordLama } : {}),
        });

        // Nama/email yang tampil di navbar diambil dari sesi login, jadi harus
        // diambil ulang — kalau tidak, sidebar masih menampilkan data lama
        // sampai halaman dimuat ulang.
        if (ubahDiriSendiri) await dispatch(segarkanProfil());
      } else {
        await buatUser({
          nama: form.nama,
          email: form.email,
          password: form.password,
          no_hp: form.no_hp,
          roles: [form.role],
          is_active: form.is_active,
        });
      }
      setFormTerbuka(false);
      muatUlang();
    } catch (error) {
      setErrorForm(pesanError(error, "Gagal menyimpan user"));
    } finally {
      setMenyimpan(false);
    }
  }

  async function konfirmasiHapus() {
    if (!akanDihapus) return;
    setMenghapus(true);
    setErrorHapus(null);
    try {
      await hapusUser(akanDihapus.uuid);
      setAkanDihapus(null);
      // Kalau baris terakhir di halaman ini habis, mundur satu halaman.
      if (daftar.length === 1 && halaman > 1) setHalaman((h) => h - 1);
      else setPemicuMuat((p) => p + 1);
    } catch (error) {
      setErrorHapus(pesanError(error, "Gagal menghapus user"));
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
            <Users size={16} className="text-brand-600" />
            Manajemen Users Internal
          </span>
          <button type="button" onClick={bukaTambah} className="btn btn-sm btn-primary">
            <UserPlus size={15} /> Tambah User Internal
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
              placeholder="Cari nama atau email…"
            />
          </div>
          <select
            className="input w-auto"
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value as KodeRole | "");
              setHalaman(1);
            }}
          >
            <option value="">Semua Role</option>
            {ROLE_INTERNAL.map((r) => (
              <option key={r} value={r}>
                {LABEL_ROLE[r]}
              </option>
            ))}
          </select>
          <select
            className="input w-auto"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as "" | "aktif" | "nonaktif");
              setHalaman(1);
            }}
          >
            <option value="">Semua Status</option>
            <option value="aktif">Active</option>
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
            <Loader2 size={18} className="animate-spin text-brand-600" /> Memuat data user…
          </div>
        ) : daftar.length === 0 && !errorMuat ? (
          <EmptyState
            icon={Users}
            title="Belum ada user internal"
            description={
              cariTertunda || filterRole || filterStatus
                ? "Tidak ada user yang cocok dengan filter yang dipilih."
                : "Tambahkan pengguna internal untuk Verifikator, Lembaga Seleksi, atau Administrator."
            }
            action={
              <button type="button" onClick={bukaTambah} className="btn btn-primary">
                <UserPlus size={15} /> Tambah User Internal
              </button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nama User</th>
                  <th>Username / Email</th>
                  <th>Role System</th>
                  <th>Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((u) => (
                  <tr key={u.uuid}>
                    <td className="font-bold text-slate-800">{u.nama}</td>
                    <td>{u.email}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <Badge key={r.id} tone="brand">
                            {r.nama}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td>
                      <Badge tone={u.is_active ? "success" : "neutral"}>
                        {u.is_active ? "Active" : "Non-Aktif"}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          aria-label={`Ubah ${u.nama}`}
                          onClick={() => bukaUbah(u)}
                          className="btn btn-icon btn-warning"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Hapus ${u.nama}`}
                          onClick={() => {
                            setAkanDihapus(u);
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
              Halaman {meta.page} dari {meta.total_halaman} — {meta.total} user
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

      {/* ---------------- Form tambah / ubah ---------------- */}
      <Modal
        open={formTerbuka}
        onClose={() => setFormTerbuka(false)}
        title={sedangDiubah ? "Ubah User Internal" : "Tambah User Internal"}
        subtitle={sedangDiubah ? sedangDiubah.email : undefined}
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
              form="form-user"
              disabled={menyimpan}
              className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {menyimpan && <Loader2 size={15} className="animate-spin" />}
              {sedangDiubah ? "Simpan Perubahan" : "Simpan User"}
            </button>
          </>
        }
      >
        <form id="form-user" onSubmit={simpan} className="space-y-4">
          {errorForm && <Alert tone="danger">{errorForm}</Alert>}

          <Field label="Nama Lengkap" required>
            <input
              type="text"
              required
              maxLength={150}
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="input"
              placeholder="Nama pengguna"
            />
          </Field>

          <Field label="Username / Email Internal" required>
            <input
              type="email"
              required
              maxLength={150}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
              placeholder="nama@beasiswa.go.id"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role System" required>
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as KodeRole })}
              >
                {(roleInternal.length
                  ? roleInternal.map((r) => ({ kode: r.kode, nama: r.nama }))
                  : ROLE_INTERNAL.map((r) => ({ kode: r, nama: LABEL_ROLE[r] }))
                ).map((r) => (
                  <option key={r.kode} value={r.kode}>
                    {r.nama}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select
                className="input"
                value={form.is_active ? "aktif" : "nonaktif"}
                onChange={(e) => setForm({ ...form, is_active: e.target.value === "aktif" })}
              >
                <option value="aktif">Active</option>
                <option value="nonaktif">Non-Aktif</option>
              </select>
            </Field>
          </div>

          <Field label="No. HP">
            <input
              type="tel"
              maxLength={20}
              value={form.no_hp}
              onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
              className="input"
              placeholder="08xxxxxxxxxx"
            />
          </Field>

          <Field
            label={sedangDiubah ? "Password Baru" : "Password Sementara"}
            required={!sedangDiubah}
            hint={
              sedangDiubah
                ? "Kosongkan bila password tidak diganti. Mengganti password akan mengeluarkan user dari semua perangkat."
                : "Minimal 8 karakter. Sampaikan ke pengguna lewat jalur yang aman."
            }
          >
            <input
              type="password"
              required={!sedangDiubah}
              minLength={8}
              maxLength={128}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input"
              placeholder="Minimal 8 karakter"
              autoComplete="new-password"
            />
          </Field>

          {/* Hanya muncul saat mengganti password akun sendiri — admin tidak
              mungkin tahu password lama milik orang lain. */}
          {milikSendiri && form.password !== "" && (
            <Field
              label="Password Saat Ini"
              required
              hint="Diminta untuk memastikan yang mengganti password memang pemilik akun."
            >
              <input
                type="password"
                required
                maxLength={128}
                value={form.passwordLama}
                onChange={(e) => setForm({ ...form, passwordLama: e.target.value })}
                className="input"
                placeholder="Password lama Anda"
                autoComplete="current-password"
              />
            </Field>
          )}
        </form>
      </Modal>

      {/* ---------------- Konfirmasi hapus ---------------- */}
      <Modal
        open={akanDihapus !== null}
        onClose={() => setAkanDihapus(null)}
        title="Hapus User Internal"
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
            Hapus akun{" "}
            <span className="font-bold text-slate-800">{akanDihapus?.nama}</span> (
            {akanDihapus?.email})? Seluruh sesi login akun ini akan langsung dicabut.
          </p>
          <Alert tone="warning">
            Data user tidak dihapus permanen, hanya ditandai terhapus. Emailnya tetap
            terpakai dan belum bisa didaftarkan ulang.
          </Alert>
        </div>
      </Modal>
    </>
  );
}
