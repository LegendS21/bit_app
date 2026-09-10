# Aplikasi Pendaftaran Beasiswa Pelatihan — PT Bentang Inspirasi Teknologi

Spesifikasi lengkap ada di `1. PETUNJUK/PETUNJUK TESTING.docx` (sudah diringkas di file ini —
**jangan baca ulang .docx-nya**, 3.4 MB). Mockup UI: `2. MOCKUP/{Calon Pendaftar,Internal}/`.

## Arsitektur — microservice, 1 service = 1 container (satu monorepo)

| Folder | Peran | Port | Stack | DB |
|---|---|---|---|---|
| `BIT_BE_GATEWAY/` | API Gateway — **satu-satunya yang publik** | 3000 (host 8080) | Express 5 | — |
| `BIT_FE/` | Frontend | 5173 dev / nginx `:80` di container | React + TS + Vite + Tailwind v4 + Redux Toolkit | — |
| `BIT_BE_RBAC/` | Login, CRUD Users, Role + Akses Menu, CRUD Menu | 3001 | Express + Sequelize | MySQL `db_rbac` |
| `BIT_BE_MASTER/` | CRUD Data Beasiswa, CRUD Data Persyaratan | 3002 | Express + Sequelize | MySQL `db_master` |
| `BIT_BE_TRANSAKSI/` | Pendaftaran → Seleksi Admin → Wawancara → Hasil, Export Excel | 3003 | Express + Sequelize | MySQL `db_transaksi` |
| `BIT_BE_DOKUMEN/` | Upload & akses dokumen persyaratan | 3004 | Express + Sequelize | **PostgreSQL** `db_dokumen` |

**Root adalah git repo — monorepo.** Ini berubah pada 2026-09-10 atas keputusan user;
aturan lama ("root bukan git repo, tiap folder punya `.git` sendiri") sudah tidak berlaku.
`.git` di kelima subfolder lama dilepas, seluruh berkas kini tersimpan langsung di
[github.com/LegendS21/bit_app](https://github.com/LegendS21/bit_app).

Konsekuensinya: **ini menyimpang dari petunjuk penilaian** yang meminta *"setiap service
adalah satu Git repo tersendiri (tidak satu repo untuk keseluruhan)"*. Riwayat commit tiap
modul masih utuh di repo lamanya (`bit_be_rbac`, `bit_be_master`, `bit_be_transaksi`,
`bit_be_dokumen`, `bit_fe`) sebagai arsip — jangan dihapus. Kalau nanti diputuskan kembali
ke repo terpisah, arsip itu titik baliknya.

**Autentikasi antar service**: RBAC yang menerbitkan token; service lain memverifikasinya
sendiri memakai public key dari `GET :3001/.well-known/jwks.json` (di-cache), tanpa
memegang kunci rahasia. Payload access token: `sub` (uuid), `email`, `roles`, `typ`,
plus **`uid`** (id numerik `db_rbac.users.id`) yang dipakai service lain sebagai logical
reference — mis. `db_master.beasiswa.created_by`. Gateway **sudah** meneruskan `uid` lewat
header `X-User-Id` (plus `X-User-Uuid`, `X-User-Email`, `X-User-Roles`), dan membuang
keempat header itu dari request masuk supaya tidak bisa dipalsukan. Service di belakangnya
tetap memverifikasi token sendiri — gateway bukan satu-satunya lapisan.

Akun uji tiap aktor ada di `aktor.md` (root) dan `BIT_BE_RBAC/README.md`.

## Status saat ini (per 2026-09-10)

Desain database seluruh service ada di `desain-database-beasiswa.md` (DDL + kontrak
JWT + daftar endpoint per service). Itu acuannya, bukan menebak dari kode.

Dokumen pendamping di root: **`DOCKER.md`** (penjelasan Docker untuk pemula + urutan
pengerjaan) — untuk user, bukan catatan teknis, jangan diringkas ke sini. **Sebagian
isinya kini usang**: ia masih menyebut 8 container, FE di `:5173` sebagai pintu masuk,
dan Gateway "belum dibuat". Perlu diselaraskan.

`aktor.md` berisi email + password keempat akun uji.

**`BIT_BE_RBAC` — autentikasi + CRUD users + role & akses menu selesai.** Express 5 +
Sequelize + MySQL. Migration & model lengkap (users, roles, user_roles, menus,
role_menu_access, refresh_tokens, user_tokens, audit_log), seeder 4 role + satu akun per
aktor + struktur menu, endpoint `/auth/*`, `/.well-known/jwks.json`, CRUD `/users`,
`/roles`, `/menus`, dan `/roles/:id/akses-menu`. Access token RS256 15 menit, refresh
token HttpOnly + rotasi + reuse detection. Hak akses menu ditegakkan `middlewares/
izinMenu.js` di tiap request, bukan cuma disimpan. Detail kontrak ada di
`BIT_BE_RBAC/README.md` (baca itu). **`POST /auth/register` sudah ada** —
pendaftaran mandiri dari `/daftar`, hanya menerbitkan role `APPLICANT`; `roles`/
`tipe_user` tidak ada di skemanya dan skemanya `.strict()`, jadi percobaan
menyelundupkannya dibalas 400. Belum ada: verifikasi email, reset password.

**`BIT_FE` — seluruh alur keempat aktor tersambung ke API sungguhan.** `tsc`,
`eslint`, dan `npm run build` bersih. Sudah memakai API: login/logout + guard route
per role, seluruh `/admin/*`, alur peserta (`/peserta`, `/peserta/formulir/:id` —
pilih program → wizard 4 langkah dengan autosave per bagian → unggah berkas →
kirim), verifikator (`/verifikator`, `/verifikator/:id` — checklist per berkas +
putusan), lembaga seleksi (`/lembaga-seleksi`, `/lembaga-seleksi/:id` — penilaian
berbobot), dan admin (`/admin` statistik + rekap per program, `/admin/hasil-seleksi`
penetapan hasil akhir + unduh CSV). `lib/api.ts` mengekspor `api`, `apiMaster`,
`apiTransaksi`, dan `apiDokumen` — sejak ada Gateway keempatnya **alias dari satu
klien** dengan `baseURL` relatif `/api` (dulu satu klien per service dengan alamat
sendiri-sendiri). Namanya dipertahankan supaya tetap terbaca service mana yang
dipanggil, dan supaya tidak ada file di `features/` yang perlu diubah.
**Tidak ada lagi data dummy**: landing publik sudah memanggil
`GET /beasiswa/publik` (kartu program, dialog detail, dan angka statistik di hero
semuanya dari data sungguhan). `data/dummy.ts` diganti nama jadi
`data/kontenLanding.ts` dan kini hanya berisi `SYARAT_BERKAS` + `ALUR_PENDAFTARAN` —
teks penjelasan alur, memang statis, bukan data yang dikelola admin. Keempat halaman
pratinjau peserta sudah dihapus. Daftar route, struktur `src/`, dan sisa pekerjaan
ada di `BIT_FE/README.md` (baca itu, bukan menelusuri ulang folder `src`).

**`BIT_BE_MASTER` — CRUD beasiswa & persyaratan + syarat per program selesai.** Express 5
+ Sequelize + MySQL `db_master`, port 3002. Kelima tabel sesuai desain sudah ada
(`beasiswa`, `persyaratan`, `beasiswa_persyaratan`, `ref_pendidikan`, `ref_pekerjaan`)
plus `sequence_counter`, beserta relasinya; API sudah ada untuk CRUD `/beasiswa`,
`/persyaratan`, dan `/beasiswa/:id/persyaratan` (dokumen apa saja yang diminta satu
program, lengkap dengan wajib/opsional dan urutannya). Kode program dibuat otomatis
`BEA-{tahun}-{urut 3 digit}` lewat `sequence_counter` + row lock; kode persyaratan diisi
admin karena bermakna (KTP, IJAZAH, …). **`GET /beasiswa/publik` sudah ada** — katalog
tanpa token untuk landing page, hanya program `AKTIF` yang `tgl_tutup`-nya belum lewat,
persyaratan ikut disertakan, dan `created_by`/timestamp sengaja tidak dikeluarkan. Di
router ia **wajib** di atas `router.use(authentication)` dan di atas `/:id`. Detail di
`BIT_BE_MASTER/README.md`. Belum ada: API + seeder data acuan pendidikan/pekerjaan.

**`BIT_BE_TRANSAKSI` — alur pendaftaran sampai hasil akhir selesai.** Express 5 +
Sequelize + MySQL `db_transaksi`, port 3003. Kedua belas tabel sesuai desain sudah
dimigrasi. API lengkap: buat draft, wizard 4 langkah dengan **autosave per bagian**
(`PUT /permohonan/:id/step-1..4`), `/submit`, `/verifikasi` (VERIFIKATOR),
`/wawancara` (LEMBAGA_SELEKSI), `/hasil-akhir` (ADMIN), `/dashboard/statistik`.
Semua perubahan status lewat satu pintu `helpers/pindahStatus.js` yang memvalidasi
state machine (`helpers/statusPermohonan.js`) dan menulis
`permohonan_status_history` dalam transaksi yang sama. Anti-IDOR: permohonan milik
orang lain dibalas **404, bukan 403**; `user_id` selalu dari klaim `uid`, tidak
pernah dari body. Data program diambil dari Master lewat `helpers/master.js` yang
**meneruskan token pemanggil**, jadi aturan visibilitas program tetap ditegakkan
Master. `GET /permohonan` punya pintasan `tahap` (verifikasi/wawancara/hasil) untuk
antrean tiap peran, dan `/dashboard/statistik` ikut mengembalikan `per_beasiswa`.
Detail di `BIT_BE_TRANSAKSI/README.md`. Seluruh halaman FE yang memakainya sudah
tersambung. Belum ada: `/export/excel`.

**`BIT_BE_DOKUMEN` — unggah & akses berkas selesai.** Express 5 + Sequelize +
**PostgreSQL** `db_dokumen`, port 3004. Tiga tabel sesuai desain (`dokumen`,
`dokumen_akses_log`, `presigned_token`) lengkap dengan partial index-nya.
Satu-satunya service yang memegang file fisik; Transaksi cuma menyimpan
`dokumen_uuid` yang diterbitkan di sini. Jenis berkas dikenali dari **magic
bytes** (`helpers/magicBytes.js`, ditulis sendiri untuk 4 format), berkas
dipindai ClamAV lewat protokol INSTREAM **selagi masih di memori**, baru ditulis
ke disk — jadi berkas yang gagal pemeriksaan tidak pernah menyentuh filesystem.
Nama di disk selalu di-rename jadi `{kode}_{uuid}{ext}`. Tautan presigned
sekali pakai, terikat satu user, hash-nya saja yang disimpan. Tiap akses dicatat
ke `dokumen_akses_log`. **`CLAMAV_ENABLED=false` di dev** → berkas disimpan
berstatus `PENDING`, bukan `CLEAN`; **di docker-compose sudah `true`** karena ada
container ClamAV sungguhan. Detail di `BIT_BE_DOKUMEN/README.md`. Sudah dipakai
langkah 3 wizard peserta di FE. Belum ada: penjadwalan pembersihan.

**`BIT_BE_GATEWAY` — selesai.** Express 5, tanpa database, tanpa state. Rutenya
ditentukan segmen pertama setelah `/api` (`config/layanan.js`): `auth|users|roles|menus|
.well-known` → RBAC, `beasiswa|persyaratan` → Master, `permohonan|dashboard` → Transaksi,
`dokumen` → Dokumen, selain itu → nginx frontend. Keempat service kebetulan sudah punya
prefix yang tidak bertabrakan, jadi **tidak ada satu pun rute service yang diubah** —
gateway cuma memasang dan melepas `/api`. Verifikasi token memakai JWKS RBAC (pola sama
persis dengan `authentication.js` service lain, sengaja disalin karena dulu repo terpisah).
Tujuh jalur boleh tanpa token: `auth/register`, `auth/login`, `auth/refresh`,
`auth/logout`, `.well-known/jwks.json`, `beasiswa/publik`, dan `dokumen/public/:token` —
semuanya regex terikat `^...$`, jadi `/beasiswa` dan `/beasiswa/publik/17` tetap
menuntut token.
Rate limit sesungguhnya ada di sini. **Sengaja tanpa body parser**: begitu body dibaca,
unggahan multipart ke Dokumen menggantung dan POST biasa terkirim kosong. Detail di
`BIT_BE_GATEWAY/README.md`.

**Docker — selesai, 9 container.** `docker-compose.yml` di root: gateway, mysql, postgres,
clamav, rbac, master, transaksi, dokumen, frontend. Tiap folder service punya `Dockerfile`
+ `.dockerignore` sendiri; keempat service backend punya `docker-entrypoint.sh` yang
menunggu database siap lalu menjalankan migrasi. **Hanya gateway yang menerbitkan port**
(`8080:3000`); sisanya di jaringan `dalam` bertanda `internal: true`. Satu pengecualian:
ClamAV ikut di jaringan `tepi` karena freshclam perlu mengunduh signature dari internet —
ia tidak menerbitkan port, jadi hanya arah keluar yang terbuka. Lima persistent volume:
`mysql_data`, `postgres_data`, `storage_dokumen`, `clamav_data`, `rbac_keys`. Password
dibaca dari `.env` root (di-gitignore; contohnya `.env.example`). Seeder **tidak** jalan
otomatis: `docker compose exec rbac npm run db:seed`.

Repo monorepo `bit_app` punya 2 commit; perubahan Docker + Gateway **belum di-commit**.

Sudah beres (jangan dikerjakan lagi): `config/config.js` + `.sequelizerc` di keempat
service — `config.json` sudah dihapus, kredensial dibaca dari `DB_*`. `BIT_BE_GATEWAY`
sudah ada dan FE sudah memakai satu `VITE_API_URL` relatif.

Utang teknis yang sudah diketahui (tak perlu dilaporkan ulang):
- Hak akses per menu (`role_menu_access`) baru ditegakkan di RBAC. Service lain tidak bisa
  membacanya (beda database), jadi Master baru menjaga dengan role.
- Gateway hanya memverifikasi **keaslian** token, bukan hak aksesnya. Otorisasi per role
  dan ownership tetap ditegakkan masing-masing service. Ini disengaja, tapi berarti
  menambah rute baru dengan prefix teratas yang belum terdaftar di `config/layanan.js`
  akan jatuh ke proxy frontend — bukan 404 API. Tambahkan segmennya kalau bikin prefix baru.
- `DOCKER.md` belum diselaraskan dengan hasil akhir (masih menyebut 8 container, FE
  sebagai pintu masuk di `:5173`, dan Gateway belum dibuat).
- Aturan "1 peserta hanya 1 program" baru ditegakkan di FE. Backend cuma mencegah
  pendaftaran ganda ke program yang sama. Perlu diputuskan dulu apakah peserta yang
  ditolak boleh mendaftar program lain, baru dipindah ke service Transaksi.
- Access token belum memuat klaim `nama`, padahal Transaksi menyimpan snapshot
  `verifikator_nama`/`penilai_nama` — sementara diisi email. Perbaikannya di RBAC.
- Isian wilayah bertingkat dihapus dari wizard FE: `permohonan_biodata` hanya punya
  kolom `alamat` (TEXT), jadi dropdown Provinsi/Kab/Kec/Kel akan membuang datanya.
  Kembalikan setelah Master menyediakan data wilayah dan DDL-nya menampung.
- Menu sidebar internal di FE masih hardcode, belum dari `role_menu_access` — menu yang
  ditambah lewat halaman Menu System belum muncul di sidebar sampai `/auth/me`
  mengembalikan daftar menu sesuai role.

## Aturan wajib dari dokumen (checklist penilaian)

**Deployment**: tiap repo punya Dockerfile sendiri; orkestrasi Docker Compose atau K8s; tiap
container yang menyimpan data wajib pointing ke persistent volume.
→ Dockerfile & Compose sudah ada. **Satu poin tidak terpenuhi**: dokumen meminta tiap
service jadi repo Git terpisah, sedangkan proyek ini kini satu monorepo (lihat Arsitektur).

**Keamanan & Gateway** — keempatnya sudah terpenuhi per 2026-09-10.
- JWT access token short-lived ~15 menit + refresh token di **HttpOnly cookie**.
- Gateway verifikasi token sebelum forward ke service.
- Service internal di **private subnet** — hanya Gateway yang expose port ke host.
- CORS dibatasi ke domain frontend saja; rate limit ~100 req/menit.

**Proteksi celah**
- SQLi → wajib ORM / prepared statement (TypeORM/Prisma).
- XSS → sanitasi input string di backend + andalkan auto-escape React.
- CSRF → JWT di header + cookie `SameSite=Strict`.
- IDOR → tiap path hanya bisa diakses user yang berhak (guard cek ownership, bukan cuma role).

**Upload dokumen** (service dokumen)
- Validasi **magic bytes**, bukan ekstensi. Lalu scan **ClamAV** sebelum disimpan.
- Simpan di direktori privat pada persistent volume, **bukan** folder publik.
- Akses hanya lewat endpoint ber-auth atau presigned URL yang punya expiry.
- Path: `/storage/permohonan/{kode_permohonan}/{uuid}namaFile`
  contoh `/storage/PRM-2026-001/ktp_9b1deb4d-3b7d.pdf`. Nama asli user di-rename jadi UUID.

**Form wizard pendaftaran** — input bertahap, bukan satu form besar. Disimpan ke DB tiap kali
user menekan "Selanjutnya"/"Selesai" supaya bisa dilanjut. Section: (1) Data Diri & Kontak
(NIK, Nama, TGL Lahir, Alamat, No. HP, Email) → (2) Latar Belakang Pendidikan & Pekerjaan →
(3) Unggah Dokumen (KTP, KK, Ijazah, Surat Rekomendasi) → (4) Lembar Persetujuan + Submit/Draft.

## Alur & peran

**Verifikator, Lembaga Seleksi, dan Admin adalah pengguna internal** (`tipe_user =
INTERNAL`) — masuk lewat portal internal dengan dropdown "Masuk Sebagai (Role Akses)".
Hanya Calon Peserta yang `tipe_user = APPLICANT` dan masuk lewat pop-up login publik.

- **Calon Peserta**: daftar akun → login → pilih beasiswa → wizard → simpan draft / kirim.
  Bisa revisi selama belum terkirim; setelah terkirim tidak bisa diubah. Bisa monitoring status.
- **Verifikator**: verifikasi seleksi administrasi → beri catatan/checklist → putusan
  Disetujui / Ditolak / Revisi Perbaikan.
- **Lembaga Seleksi**: lihat peserta lolos admin → input penilaian wawancara → Lulus / Tidak Lulus.
- **Admin**: dashboard rekap status, terima peserta lulus wawancara, export Excel, CRUD data
  master, CRUD users/role/menu.

## Perintah

Backend (tiap folder service): `npm run dev` (node --watch) | `npm start` |
`npm run db:migrate` | `npm run db:seed`. Frontend: `npm run dev` | `npm run build` |
`npm run lint` (eslint). Gateway tidak punya perintah DB — cuma `npm run dev`/`npm start`.
Node v24, npm 11. Shell utama PowerShell (Windows) — `&&` tidak jalan, pakai `;`.

Docker (dari root): `docker compose up -d --build` | `docker compose ps` |
`docker compose logs -f gateway` | `docker compose down` (data aman) |
`docker compose down -v` (**hapus semua volume**). Aplikasi dibuka di
`http://localhost:8080` — satu-satunya pintu masuk. Database tidak lagi menerbitkan port;
untuk inspeksi pakai `docker compose exec mysql mysql -u root -p`.

Menjalankan manual tanpa Docker butuh 6 terminal (4 service + gateway + FE), dan FE harus
menunjuk gateway: `VITE_API_URL=http://localhost:3000/api` di `BIT_FE/.env`.

## Konvensi kerja

- Struktur backend ikut pola `BIT_BE_RBAC`: `routes/`, `controllers/`, `services/`,
  `middlewares/`, `models/`, `migrations/`, `seeders/`, `helpers/`, `validators/`.
  CommonJS (`require`), bukan ESM.
- Sejak jadi monorepo, perubahan lintas service **boleh** satu commit — tapi tetap
  pisahkan kalau tidak benar-benar satu perubahan, supaya riwayatnya enak dibaca.
- Jangan commit/push kecuali diminta.
- Balasan ke user dalam Bahasa Indonesia.

**Jangan menjalankan aplikasinya** — dev server BE maupun FE dijalankan user sendiri di
terminal terpisah. Perintah yang sifatnya memeriksa tetap boleh: `tsc -b`, `eslint`,
`npm run build`, migration/seeder, dan query DB.

Karena itu, endpoint diuji **tanpa menyalakan server**: tulis skrip node sekali jalan
yang memanggil service/middleware langsung ke database (`node -e "..."`), jalankan
lewat validator dulu supaya sama dengan alur controller, lalu **bersihkan data ujinya**.
Kalau butuh uji lapisan HTTP, minta user menyalakan service-nya dulu baru pakai `curl`.
Kalau terlanjur menyalakan sesuatu, hentikan hanya PID yang dimulai sendiri (cari lewat
`netstat -ano` pada port itu) — jangan `taskkill /IM node.exe`, itu ikut mematikan dev
server milik user.
