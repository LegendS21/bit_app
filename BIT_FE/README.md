# BIT_FE — Portal Pendaftaran Beasiswa Pelatihan

Frontend React + TypeScript + Vite + Tailwind v4 untuk aplikasi pendaftaran beasiswa
pelatihan. **Seluruh alur keempat aktor sudah memakai API sungguhan** — pendaftaran
peserta, seleksi administrasi, seleksi wawancara, hasil seleksi, dan seluruh halaman
admin. Yang tersisa memakai `src/data/dummy.ts` hanya **landing publik**.

## Perintah

```
copy .env.example .env    # isi VITE_API_URL
npm run dev      # vite dev server
npm run build    # tsc -b && vite build
npm run lint     # eslint
```

Karena `BIT_BE_GATEWAY` belum ada, tiap service dipanggil langsung:

| Variabel | Service | Port |
|---|---|---|
| `VITE_API_URL` | RBAC | 3001 |
| `VITE_API_MASTER_URL` | Master | 3002 |
| `VITE_API_TRANSAKSI_URL` | Transaksi | 3003 |
| `VITE_API_DOKUMEN_URL` | Dokumen | 3004 |

Begitu gateway jadi, semuanya tinggal diarahkan ke satu alamat. Service yang dipakai
halaman yang sedang dibuka harus berjalan; akun uji untuk keempat aktor ada di
`BIT_BE_RBAC/README.md`.

## Daftar Route

| Route | Halaman | Aktor |
|---|---|---|
| `/` | Landing (hero, katalog program, persyaratan, alur) | Publik |
| `/login` | Landing + **pop-up login** (pilihan Calon Peserta / Internal) | Publik |
| `/daftar` | Registrasi akun peserta | Publik |
| `/internal/login` | Login internal (halaman penuh) | Publik |
| `/peserta` | Dashboard — status pendaftaran + katalog program (**API sungguhan**) | Calon Peserta |
| `/peserta/formulir/:id` | Wizard 4 tahap, autosave per bagian (**API sungguhan**) | Calon Peserta |
| `/verifikator` | Daftar pendaftar yang perlu diverifikasi | Verifikator |
| `/verifikator/:id` | Detail verifikasi 4 tahap + keputusan | Verifikator |
| `/lembaga-seleksi` | Daftar peserta seleksi wawancara | Lembaga Seleksi |
| `/lembaga-seleksi/:id` | Form penilaian wawancara (nilai akhir dihitung server) | Lembaga Seleksi |
| `/admin` | Dashboard statistik + rekap per program | Admin |
| `/admin/hasil-seleksi` | Hasil kelulusan + Export Excel | Admin |
| `/admin/master/beasiswa` | CRUD data beasiswa | Admin |
| `/admin/master/persyaratan` | CRUD data persyaratan dokumen | Admin |
| `/admin/pengaturan/users` | CRUD users internal | Admin |
| `/admin/pengaturan/role` | CRUD role + setting akses menu | Admin |
| `/admin/pengaturan/menu` | CRUD menu system | Admin |
| `*` | Halaman 404 | — |

Kelima kondisi dashboard peserta pada mockup dulu dipisah jadi route pratinjau sendiri
(`/peserta/status`, `/revisi`, `/ditutup`, `/pengumuman`) beserta strip "Pratinjau
kondisi" di `PesertaLayout`. **Semuanya sudah dihapus** — dashboard `/peserta`
menampilkan kondisi yang sebenarnya dari service Transaksi, jadi pratinjaunya justru
menyesatkan. ("Pratinjau peran" di sidebar internal sudah dihapus lebih dulu karena
peran kini ditentukan role dari sesi login.)

## Autentikasi

Semua route selain publik dijaga `RequireAuth` sesuai role: `/peserta/*` (APPLICANT),
`/verifikator/*` (VERIFIKATOR), `/lembaga-seleksi/*` (LEMBAGA_SELEKSI), `/admin/*` (ADMIN).
Role yang tidak cocok mendapat halaman 403. Penjagaan ini hanya untuk tampilan —
otorisasi yang mengikat tetap ada di backend.

- **Access token** disimpan **hanya di memori** (`lib/tokenStore.ts`), tidak pernah ke
  localStorage, supaya tidak bisa dicuri lewat XSS.
- **Refresh token** ada di cookie HttpOnly milik service RBAC; `axios` dipanggil dengan
  `withCredentials: true`.
- Saat halaman dimuat ulang, `App.tsx` memanggil `muatSesi()` untuk menukar cookie refresh
  jadi access token baru — inilah yang membuat sesi bertahan tanpa menyimpan token.
- Ketika access token kedaluwarsa (15 menit), interceptor di `lib/api.ts` merefresh sekali
  lalu mengulang request. Refresh yang bersamaan digabung jadi satu supaya tidak ada rotasi
  ganda — backend membacanya sebagai pemakaian ulang token.
- Pop-up login punya pilihan **Calon Peserta / Internal**. Memilih Internal memunculkan
  dropdown **"Masuk Sebagai (Role Akses)"** (Verifikator / Lembaga Seleksi / Administrator
  System) seperti mockup `Internal/1_index_login.html`, dan dashboard tujuannya mengikuti
  role yang dipilih. Kalau role akun tidak cocok dengan pilihannya, sesi yang baru terbit
  langsung dicabut lagi dan pesannya ditampilkan.

## Struktur `src/`

```
routes/index.tsx          createBrowserRouter — satu-satunya sumber definisi route
lib/
  api.ts                  klien axios per service (api, apiMaster, apiTransaksi,
                          apiDokumen) + interceptor auto-refresh token bersama
  tokenStore.ts           access token di memori (bukan localStorage)
features/auth/
  authApi.ts              pemanggilan /auth/login, /auth/refresh, /auth/logout, /auth/me
  authSlice.ts            state sesi (login, muatSesi, logout)
  types.ts                tipe role/pengguna + tujuan redirect per role
features/users/
  usersApi.ts             CRUD /users (dipakai halaman Setting Users)
  types.ts                tipe user internal, filter, dan meta halaman
features/roles/
  rolesApi.ts             CRUD /roles + hak akses menu per role
  types.ts                tipe role dan baris akses menu
features/menus/
  menusApi.ts             CRUD /menus (struktur menu sidebar)
  types.ts                tipe menu system
features/beasiswa/
  beasiswaApi.ts          CRUD /beasiswa + syarat per program — service Master
  types.ts                tipe program, status DRAFT/AKTIF/DITUTUP/ARSIP, syarat program
features/persyaratan/
  persyaratanApi.ts       CRUD /persyaratan — service Master
  types.ts                tipe dokumen + daftar MIME umum & format ukuran
features/permohonan/
  permohonanApi.ts        wizard peserta — service Transaksi + unggah ke Dokumen
  types.ts                status permohonan, biodata/pendidikan/dokumen, ref acuan
store/                    configureStore + useAppDispatch/useAppSelector/useAuth
components/auth/
  LoginModal.tsx          pop-up login, terbuka saat route /login
  FormLogin.tsx           form login bersama (pop-up & halaman internal)
  RequireAuth.tsx         penjaga route per role
  TamuSaja.tsx            kebalikannya — halaman login untuk yang belum masuk
layouts/
  PublicLayout            navbar publik + footer (membungkus landing)
  PesertaLayout           navbar peserta + dropdown user + strip pratinjau kondisi
  InternalLayout          sidebar (menu mengikuti peran dari pathname) + drawer mobile
pages/
  public/                 Landing, RegisterPeserta, LoginInternal
  TidakBerhak.tsx         halaman 403
  peserta/                Dashboard (status + katalog), FormulirWizard (wizard 4 langkah)
  verifikator/            DaftarVerifikasi, DetailVerifikasi
  seleksi/                DaftarWawancara, FormPenilaian
  admin/                  Dashboard, HasilSeleksi, MasterBeasiswa, MasterPersyaratan,
                          SettingUsers, SettingRoles, SettingMenu
  NotFoundPage.tsx
components/
  ui/                     Badge, Alert, Modal, StatCard, Field/ReadField, PageHeader,
                          EmptyState, SubNav
  Stepper.tsx             indikator langkah wizard
  AuthShell.tsx           kerangka halaman login/daftar
  peserta/                PilihProgram — katalog program dari service Master
  admin/                  PersyaratanProgramModal — dokumen yang diminta tiap program
config/nav.ts             tab Data Master & Setting System + tipe InternalContext
data/dummy.ts             data contoh untuk landing publik saja (126 baris)
index.css                 @theme warna brand + class komponen (.btn, .card, .input, .tbl)
```

## Catatan desain

- Palet brand mengikuti mockup (Bootstrap `#0d6efd`) tapi diimplementasikan sebagai skala
  `brand-50..950` di `@theme`; pakai `bg-brand-600`, `text-brand-700`, dst.
- Ikon memakai `lucide-react` (menggantikan Bootstrap Icons pada mockup).
- Modal Bootstrap pada mockup dipetakan jadi dua bentuk: form panjang (wizard pendaftaran,
  verifikasi, penilaian wawancara) menjadi **halaman ber-route**; form pendek (detail
  program, CRUD master, konfirmasi) tetap **modal** lewat `components/ui/Modal`.

## Halaman yang sudah pakai data sungguhan

- `/peserta` — dashboard peserta ke `BIT_BE_TRANSAKSI`: menampilkan permohonan yang
  sedang berjalan (kode, status, riwayat status) plus katalog program `AKTIF` dari
  Master. Memilih program membuat draft permohonan lalu langsung masuk ke wizard-nya.
- `/peserta/formulir/:id` — wizard 4 langkah yang **benar-benar menyimpan**. Tiap
  bagian punya endpointnya sendiri, jadi menyimpan bagian 2 tidak menyentuh bagian 1.
  **Simpan Draft** dan **Selanjutnya** memanggil endpoint yang sama; bedanya cuma
  apakah halaman lanjut pindah langkah. Karena kolom di `permohonan_biodata` bersifat
  NOT NULL, satu bagian harus lengkap dulu sebelum bisa disimpan — jadi keduanya ikut
  memicu validasi bawaan browser. Wizard dibuka pada `current_step` terakhir, dan
  posisinya tidak turun lagi kalau pengguna kembali menyunting bagian sebelumnya.
  Berkas di langkah 3 diunggah ke `BIT_BE_DOKUMEN` lebih dulu (di sana isinya
  diperiksa magic bytes lalu dipindai), baru `dokumen_uuid`-nya dicatat ke Transaksi —
  tersimpan begitu selesai, tanpa perlu menekan Simpan. Permohonan yang sudah terkirim
  tampil terkunci lewat satu `<fieldset disabled>`, dan saat statusnya REVISI catatan
  verifikator muncul di atas formulir serta menempel pada berkas yang bermasalah.
- `/verifikator` — antrean seleksi administrasi ke `BIT_BE_TRANSAKSI`
  (`tahap=verifikasi`): kartu statistik, pencarian (ditunda 350 ms) atas nama /
  NIK / kode, filter status, dan halaman.
- `/verifikator/:id` — empat tab peninjauan. Tab dokumen menandai tiap berkas
  Sesuai/Ditolak beserta catatannya, dan **Pratinjau** membuka berkas lewat
  tautan sementara dari `BIT_BE_DOKUMEN` (sekali pakai, berumur pendek).
  Catatan wajib diisi kalau keputusannya Ditolak atau Revisi — tombol submit
  tetap nonaktif sampai terisi, sama seperti aturan di backend. Permohonan yang
  sudah diputus tampil sebagai riwayat, lengkap dengan putusan-putusan
  sebelumnya.
- `/lembaga-seleksi` — antrean wawancara (`tahap=wawancara`), pola yang sama.
- `/lembaga-seleksi/:id` — form penilaian. Nilai akhir di layar hanya
  **pratinjau**; yang disimpan dihitung ulang backend dari skor dan bobot tiap
  aspek, jadi tidak mungkin berbeda dari rinciannya. Peserta yang sudah dinilai
  tampil read-only lewat `<fieldset disabled>`.
- `/admin` — dashboard statistik: delapan kartu ringkasan plus rekap per
  program. Kuota diambil dari service Master lalu digabungkan dengan
  `per_beasiswa` dari Transaksi berdasarkan `beasiswa_id`; program yang
  kuotanya tidak ketemu menampilkan "Kuota tidak diketahui", bukan 0%.
- `/admin/hasil-seleksi` — daftar `tahap=hasil` dengan filter program & status.
  Peserta berstatus Lulus Wawancara punya tombol **Tetapkan Hasil** (modal
  Diterima / Tidak Diterima + catatan); nilai wawancaranya diambil saat modal
  dibuka karena tidak ikut di daftar ringkas. Tombol **Export Excel** mengunduh
  CSV ber-BOM UTF-8 yang dirakit di browser — endpoint `.xlsx` di backend belum
  ada, dan unduhannya hanya memuat baris pada halaman yang sedang tampil.
- `/admin/pengaturan/users` — CRUD users internal ke `BIT_BE_RBAC`: pencarian (ditunda
  350 ms), filter role & status, halaman, tambah/ubah/hapus lewat modal. Pesan error dari
  backend (mis. "Anda tidak bisa menghapus akun sendiri") ditampilkan apa adanya di modal.
  Mengubah akun sendiri menyegarkan sesi (`segarkanProfil`) supaya nama di navbar ikut
  berubah, dan mengganti password sendiri meminta password lama.
- `/admin/pengaturan/role` — CRUD role + Setting Akses Menu. Matriks centang
  Lihat/Tambah/Ubah/Hapus per menu; mencentang Tambah/Ubah/Hapus otomatis menyalakan
  Lihat, sama seperti aturan di backend. Role bawaan sistem ditandai gembok: tombol
  hapusnya nonaktif, kode dan statusnya terkunci di form.
- `/admin/master/beasiswa` — CRUD program pelatihan ke `BIT_BE_MASTER`: pencarian
  (ditunda 350 ms), filter status, halaman, tambah/ubah/hapus lewat modal. Kode program
  dibuat backend (`BEA-{tahun}-{urut}`), jadi di form hanya ditampilkan, tidak diisi.
  Form-nya menyimpang dari mockup karena mengikuti DDL: **tidak ada "Metode
  Pelaksanaan"** (tidak ada kolomnya), dan "Batas Pendaftaran" dipecah jadi `tgl_buka` +
  `tgl_tutup`. Statusnya empat (Draft/Aktif/Ditutup/Arsip), bukan Aktif/Non-Aktif.
  Tombol ikon ☑ per baris membuka **Persyaratan Program**
  (`components/admin/PersyaratanProgramModal`): memilih dokumen apa saja yang harus
  diunggah pelamar program itu, menandai tiap dokumen Wajib/Opsional, dan menyusun
  urutannya dengan tombol naik/turun. Urutan baris itulah yang dikirim sebagai
  `urutan`, jadi tidak ada nomor yang perlu diketik. Perubahannya baru berlaku
  setelah ditekan Simpan. Program berstatus Ditutup/Arsip tampil terkunci
  (baca saja), sesuai aturan backend.
- `/admin/master/persyaratan` — CRUD jenis dokumen ke `BIT_BE_MASTER`. Format berkas
  dipilih lewat centang (PDF/JPG/PNG/WEBP) alih-alih mengetik MIME; format tersimpan di
  luar daftar itu tetap ditampilkan sebagai centang tersendiri supaya tidak hilang.
  Kolom **"Sifat" (Wajib/Opsional) pada mockup dihapus** — `is_wajib` ada di
  `beasiswa_persyaratan`, jadi ditentukan per program, bukan per jenis dokumen.
  Gantinya kolom Status dan "Dipakai N program".
- `/admin/pengaturan/menu` — CRUD struktur menu. Submenu ditampilkan menempel di bawah
  induknya; dropdown "Menu Induk" hanya berisi menu tingkat atas karena strukturnya
  dibatasi dua tingkat. Menu bawaan sistem ditandai gembok seperti pada halaman role.

## Yang belum dikerjakan

- Registrasi akun (`/daftar`) belum tersambung — service RBAC belum punya `/auth/register`.
  Begitu juga "Lupa Password".
- Sidebar `InternalLayout` masih hardcode. Tabel `menus` dan `role_menu_access` sudah
  terisi dan bisa dikelola, tinggal `/auth/me` mengembalikan menu sesuai role lalu
  sidebar dibangun dari itu — selama belum, menu yang ditambah lewat halaman Menu System
  tidak akan muncul di sidebar.
- Masih dummy dari `dummy.ts`: **landing publik** saja. Katalognya menunggu
  endpoint terbuka di Master — `/beasiswa` sekarang masih menuntut token.
- Aspek penilaian wawancara (`ASPEK` di `pages/seleksi/FormPenilaian.tsx`)
  masih daftar tetap di kode. Sebaiknya jadi data master supaya bisa diatur
  admin tanpa mengubah kode.
- Tombol Export Excel mengunduh CSV yang dirakit di browser dan hanya memuat
  halaman yang sedang tampil. Ganti ke `GET /export/excel` begitu endpointnya
  ada di service Transaksi.
- **Aturan "1 peserta hanya 1 program" baru ditegakkan di FE.** Backend cuma mencegah
  satu peserta mendaftar dua kali ke program yang *sama* (`uq_user_beasiswa`). Perlu
  diputuskan dulu: apakah peserta yang ditolak boleh mendaftar program lain? Setelah
  itu aturannya dipindah ke service Transaksi.
- `pendidikan_kode` dan `pekerjaan_kode` memakai daftar tetap di
  `features/permohonan/types.ts` karena `ref_pendidikan`/`ref_pekerjaan` di Master
  belum punya API maupun isi.
- Isian wilayah bertingkat (Provinsi/Kab/Kec/Kel) di mockup **dihapus dari wizard** —
  `permohonan_biodata` hanya punya kolom `alamat` bertipe TEXT, jadi dropdown itu
  akan membuang datanya diam-diam. Sementara alamat diisi satu textarea; kembalikan
  bertingkat setelah Master menyediakan data wilayah dan DDL-nya menampung.
