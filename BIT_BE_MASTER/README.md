# bit_be_master — Data Master

Service Master: Express 5 + Sequelize + MySQL (`db_master`). Port default `3002`.
Saat ini berisi CRUD **Data Beasiswa Pelatihan**, CRUD **Data Persyaratan**, dan
pemasangan **persyaratan per program**.

## Tabel

Kelima tabel `db_master` sesuai `desain-database-beasiswa.md` bagian 2:

| Tabel | Isi |
|---|---|
| `beasiswa` | program pelatihan (soft delete) |
| `sequence_counter` | sumber nomor urut per tahun untuk kode program |
| `persyaratan` | jenis dokumen: KTP, KK, IJAZAH, SURAT_REKOMENDASI |
| `beasiswa_persyaratan` | penghubung: syarat apa untuk program mana |
| `ref_pendidikan` | acuan jenjang: SD…S3 |
| `ref_pekerjaan` | acuan pekerjaan |

Relasi `beasiswa ⇄ persyaratan` dipasang many-to-many lewat
`beasiswa_persyaratan`, dengan `is_wajib` dan `urutan` sebagai atribut
penghubung. Menghapus program ikut menghapus daftar syaratnya (`CASCADE`),
sedangkan persyaratan yang masih dipakai program tidak bisa dihapus
(`RESTRICT`) — supaya program tidak kehilangan acuannya diam-diam.

`beasiswa_persyaratan`, `ref_pendidikan`, dan `ref_pekerjaan` **tidak punya
kolom waktu**, mengikuti DDL — modelnya memakai `timestamps: false`.

`ref_pendidikan` dan `ref_pekerjaan` baru berupa struktur; API dan data
isiannya belum ada.

> **Jebakan pada `beasiswa_persyaratan`.** Tabelnya punya kolom `id` auto
> increment, tapi karena modelnya dipakai sebagai `through` pada
> `belongsToMany`, Sequelize menjadikan pasangan (`beasiswa_id`,
> `persyaratan_id`) sebagai primary key model dan **tidak memetakan `id`**.
> Jadi `baris.id` bernilai `undefined`, dan `destroy({ where: { id } })`
> menghapus nol baris tanpa error. Selalu pakai pasangan kuncinya.

## Menjalankan

```powershell
npm install
copy .env.example .env    # lalu sesuaikan
npm run db:create
npm run db:migrate
npm run dev
```

Service RBAC (`:3001`) harus ikut berjalan — token diverifikasi memakai JWKS
miliknya.

## Endpoint

| Method | Path | Auth | Keterangan |
|---|---|---|---|
| GET | `/health` | — | status service |
| GET | `/beasiswa` | Bearer | daftar program (cari, filter status, halaman) |
| GET | `/beasiswa/:id` | Bearer | detail program |
| POST | `/beasiswa` | Bearer **ADMIN** | tambah program |
| PUT | `/beasiswa/:id` | Bearer **ADMIN** | ubah program |
| DELETE | `/beasiswa/:id` | Bearer **ADMIN** | hapus program (soft delete) |
| GET | `/persyaratan` | Bearer | daftar jenis dokumen (cari, filter status, halaman) |
| GET | `/persyaratan/:id` | Bearer | detail jenis dokumen |
| POST | `/persyaratan` | Bearer **ADMIN** | tambah jenis dokumen |
| PUT | `/persyaratan/:id` | Bearer **ADMIN** | ubah jenis dokumen |
| DELETE | `/persyaratan/:id` | Bearer **ADMIN** | hapus jenis dokumen (permanen) |
| GET | `/beasiswa/:id/persyaratan` | Bearer | syarat yang berlaku untuk satu program |
| PUT | `/beasiswa/:id/persyaratan` | Bearer **ADMIN** | ganti seluruh daftar syarat program |
| DELETE | `/beasiswa/:id/persyaratan/:persyaratanId` | Bearer **ADMIN** | lepas satu syarat |

### GET /beasiswa

Query: `q` (cari nama/kode/penyelenggara), `status`, `page` (default 1),
`limit` (default 10, maks 100).

```json
{
  "data": [{ "id": 1, "kode": "BEA-WEBDEV-2026",
             "nama": "Pelatihan Web Developer Specialist",
             "penyelenggara": "PT Bentang Inspirasi Teknologi", "kuota": 40,
             "tgl_buka": "2026-09-01", "tgl_tutup": "2026-10-31",
             "status": "AKTIF", "created_by": 1 }],
  "meta": { "total": 1, "page": 1, "limit": 10, "total_halaman": 1 }
}
```

**Membaca boleh siapa saja yang login**, tapi isinya disaring: hanya ADMIN yang
melihat status selain `AKTIF`. Non-admin yang memfilter status di luar haknya
mendapat hasil kosong — bukan diam-diam diganti jadi status lain. Detail program
non-`AKTIF` dibalas `404` untuk non-admin, supaya keberadaannya tidak bocor lewat
tebak id.

### POST /beasiswa · PUT /beasiswa/:id

```json
{ "nama": "Pelatihan Web Developer Specialist",
  "deskripsi": "…", "penyelenggara": "…", "kuota": 40,
  "tgl_buka": "2026-09-01", "tgl_tutup": "2026-10-31", "status": "AKTIF" }
```

Pada PUT semua kolom opsional. `status`: `DRAFT` (belum tampil ke publik),
`AKTIF` (menerima pendaftaran), `DITUTUP` (masanya lewat), `ARSIP` (riwayat).

### Kode program dibuat otomatis

Formatnya `BEA-{tahun}-{urut 3 digit}` → `BEA-2026-001`. **`kode` tidak diterima
dari client** — kalau dikirim, nilainya diabaikan — dan tidak bisa diubah lewat
PUT, karena nomornya melekat pada program dan sudah beredar di dokumen maupun
permohonan peserta.

Nomor urut diambil dari `sequence_counter` dengan `SELECT … FOR UPDATE`
(`helpers/nomorUrut.js`), sesuai bagian 0.4 desain-database: request bersamaan
mengantre, jadi tidak mungkin dua program berebut kode yang sama. Pengambilan
nomor dan penyimpanan barisnya ada di satu transaksi — kalau penyimpanan gagal,
nomornya tidak terpakai.

Nomor dihitung ulang per tahun (`BEA-2027-001`), dan lebar 3 digit hanya batas
minimum: program ke-1000 menjadi `BEA-2026-1000`, bukan gagal.

### Aturan pengaman
- Masa pendaftaran diperiksa terhadap nilai **gabungan** (yang lama + yang
  diubah), jadi mengubah satu tanggal saja tidak bisa menghasilkan periode
  terbalik (`PERIODE_TIDAK_VALID`).
- DELETE = soft delete. Permohonan di service Transaksi menyimpan `beasiswa_id`
  sebagai logical reference, jadi barisnya harus tetap bisa ditelusuri.

## Persyaratan Dokumen

```json
{ "kode": "SURAT_REKOMENDASI", "nama": "Surat Rekomendasi",
  "deskripsi": "…", "allowed_mime": ["application/pdf", "image/jpeg"],
  "max_size_kb": 2048, "is_active": true }
```

`allowed_mime` **dikirim dan diterima sebagai array**, walau di DB disimpan
sebagai string dipisah koma sesuai DDL — frontend tidak perlu memecah string
sendiri. Input berupa string koma juga diterima; keduanya dinormalkan (dirapikan,
huruf kecil, duplikat dibuang). Tiap nilainya divalidasi berpola `tipe/subtipe`.

`kode` di sini **diisi admin**, tidak otomatis seperti kode beasiswa — nilainya
bermakna (`KTP`, `KK`, `IJAZAH`, `SURAT_REKOMENDASI`) dan dipakai service Dokumen
maupun Transaksi sebagai acuan. Formatnya dikunci: huruf kapital, angka, garis bawah.

`max_size_kb` dibatasi 1 KB – 100 MB, supaya salah ketik tidak membuat server
menerima berkas raksasa.

### Aturan pengaman

- Tabel ini **tidak punya `deleted_at`**, jadi penghapusannya permanen.
- Persyaratan yang masih dipakai program ditolak saat dihapus
  (`PERSYARATAN_DIPAKAI`), lengkap dengan jumlah programnya. Foreign key-nya
  memang sudah `RESTRICT`, tapi dicek lebih dulu supaya pesannya jelas, bukan
  error constraint mentah. Alternatifnya: nonaktifkan saja lewat `is_active`.
- **Wajib/opsional bukan milik tabel ini.** `is_wajib` ada di
  `beasiswa_persyaratan`, jadi sifat wajib ditentukan per program — satu dokumen
  bisa wajib di program A dan opsional di program B.

## Persyaratan per program

Menjawab "program A butuh dokumen apa saja". Master persyaratan cuma
mendaftar *jenis* dokumen; yang menentukan dokumen mana berlaku di program
mana — dan mana yang wajib — adalah tabel penghubungnya.

```
GET /beasiswa/7/persyaratan
{ "data": {
    "beasiswa": { "id": 7, "kode": "BEA-2026-001", "nama": "…", "status": "AKTIF" },
    "persyaratan": [
      { "persyaratan_id": 1, "kode": "KTP", "nama": "Kartu Tanda Penduduk",
        "allowed_mime": ["application/pdf"], "max_size_kb": 2048,
        "is_active": true, "is_wajib": true, "urutan": 1 }
    ] } }
```

Tiap baris membawa data master dokumennya sekalian (kode, nama, format, ukuran),
jadi wizard pendaftaran tidak perlu memanggil `/persyaratan` lagi.

### PUT /beasiswa/:id/persyaratan

```json
{ "items": [ { "persyaratan_id": 1, "is_wajib": true },
             { "persyaratan_id": 4, "is_wajib": false } ] }
```

- Daftarnya dikirim **utuh**: yang tidak ikut terkirim dianggap dilepas. Body
  boleh juga berupa array telanjang, dan satu item boleh ditulis ringkas
  sebagai id saja (`[1, 2, 3]`) kalau semuanya wajib.
- **`urutan` diambil dari posisi array**, bukan dari nilai yang dikirim client.
  Dengan begitu tidak mungkin ada dua syarat berebut nomor urut yang sama, dan
  frontend cukup menyusun ulang arraynya. Nomornya selalu rapat 1..n — termasuk
  setelah satu syarat dilepas.
- Penyimpanannya berupa selisih (lepas / perbarui / tambah) di dalam satu
  transaksi, bukan hapus-semua-lalu-buat-ulang, jadi baris yang tidak berubah
  tidak ikut tersentuh.
- Array kosong sah: artinya program itu tidak menuntut dokumen apa pun.

### Aturan pengaman

- Persyaratan yang sudah **dinonaktifkan tidak bisa dipasang** ke program
  (`PERSYARATAN_NONAKTIF`), tapi yang terlanjur terpasang tetap boleh
  dipertahankan — kalau tidak, admin jadi tidak bisa menyimpan perubahan apa
  pun pada program lamanya.
- `persyaratan_id` yang tidak ada ditolak `PERSYARATAN_NOT_FOUND`, id ganda
  ditolak validator.
- Program berstatus **`DITUTUP` atau `ARSIP` terkunci** (`PROGRAM_TERKUNCI`):
  permohonan yang sudah masuk dinilai memakai daftar yang berlaku saat itu,
  jadi menambah syarat baru akan membuat berkas peserta terlihat kurang tanpa
  mereka bisa memperbaikinya. Membacanya tetap boleh.
- GET-nya mengikuti aturan `GET /beasiswa/:id`: program non-`AKTIF` dibalas
  `404` untuk non-admin, supaya keberadaannya tidak bocor lewat tebak id.

## Autentikasi antar service

Service ini **tidak memegang kunci rahasia apa pun**. Token RS256 dari RBAC
diverifikasi memakai public key dari `GET /.well-known/jwks.json` milik RBAC,
di-cache 10 menit (`JWKS_CACHE_DETIK`). Kalau `kid` di header token belum
dikenal, JWKS diambil ulang sekali — supaya rotasi kunci di RBAC tidak
memutus service ini. Cara kerjanya sama persis dengan yang nanti dipakai
API Gateway.

Klaim `uid` (id numerik user di `db_rbac.users`) dibaca dari token dan disimpan
ke `beasiswa.created_by`. Databasenya terpisah, jadi service ini tidak bisa
menerjemahkan uuid jadi id sendiri. Nantinya API Gateway meneruskan nilai yang
sama lewat header `X-User-Id`.

## Catatan & yang belum dikerjakan

- **Hak akses per menu belum ditegakkan di sini.** `role_menu_access` hidup di
  `db_rbac` dan tidak bisa dibaca lintas database, jadi service ini menjaga
  dengan role saja (`ADMIN` untuk mutasi). Supaya centang di halaman Setting
  Akses ikut berlaku, RBAC perlu menyertakan hak akses di token atau
  menyediakan endpoint pengecekan izin.
- `ref_pendidikan` dan `ref_pekerjaan` belum punya API maupun isi — belum ada
  seeder untuk data acuannya.
- Katalog program di landing page masih publik tanpa login — perlu endpoint
  terbuka tersendiri, karena `/beasiswa` menuntut token. Landing page dan
  `KatalogProgram` di FE masih memakai data dummy.
- Belum ada Dockerfile.
- `config/config.json` masih hardcode password MySQL dan ikut ter-commit —
  utang teknis yang sama dengan service RBAC.
