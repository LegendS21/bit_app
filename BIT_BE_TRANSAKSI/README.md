# bit_be_transaksi — Permohonan & Seleksi

Service Transaksi: Express 5 + Sequelize + MySQL (`db_transaksi`). Port default `3003`.

Berisi alur pendaftaran (wizard 4 langkah dengan autosave), seleksi
administrasi, seleksi wawancara, dan penetapan hasil akhir.

## Menjalankan

```powershell
npm install
copy .env.example .env    # lalu sesuaikan
npm run db:create
npm run db:migrate
npm run dev
```

Service RBAC (`:3001`) dan Master (`:3002`) harus ikut berjalan — token
diverifikasi lewat JWKS milik RBAC, dan data program diambil dari Master.

## Endpoint

| Method | Path | Auth | Keterangan |
|---|---|---|---|
| GET | `/health` | — | status service |
| POST | `/permohonan` | **APPLICANT** | buat draft untuk satu program |
| GET | `/permohonan/saya` | **APPLICANT** | monitoring status milik sendiri |
| GET | `/permohonan` | internal | antrean kerja (`tahap`, cari, filter, halaman) |
| GET | `/permohonan/:id` | pemilik / internal | detail lengkap |
| PUT | `/permohonan/:id/step-1` | **APPLICANT** | data diri & kontak |
| PUT | `/permohonan/:id/step-2` | **APPLICANT** | pendidikan & pekerjaan |
| POST | `/permohonan/:id/step-3` | **APPLICANT** | daftarkan satu berkas |
| DELETE | `/permohonan/:id/step-3/:persyaratanId` | **APPLICANT** | lepas satu berkas |
| PUT | `/permohonan/:id/step-4` | **APPLICANT** | lembar persetujuan |
| POST | `/permohonan/:id/submit` | **APPLICANT** | DRAFT/REVISI → DIAJUKAN |
| POST | `/permohonan/:id/verifikasi` | **VERIFIKATOR** | putusan seleksi administrasi |
| POST | `/permohonan/:id/wawancara` | **LEMBAGA_SELEKSI** | penilaian wawancara |
| POST | `/permohonan/:id/hasil-akhir` | **ADMIN** | penetapan DITERIMA / TIDAK_DITERIMA |
| GET | `/dashboard/statistik` | internal | rekap per status + per program |

Seluruh endpoint mutasi mengembalikan **detail permohonan yang sudah
diperbarui**, jadi frontend tidak perlu memanggil ulang setelah menyimpan.

## Wizard: tiap bagian disimpan sendiri

Ini yang membuat tombol **Simpan Draft** dan **Selanjutnya** pada mockup
`2_index_awal.html` bekerja: tiap bagian punya endpoint dan tabelnya sendiri,
jadi menyimpan langkah 2 tidak menyentuh langkah 1. Keduanya memanggil endpoint
yang sama — bedanya cuma apakah frontend lanjut pindah tab atau tidak.

```
PUT /permohonan/12/step-1   { nik, nama_lengkap, tgl_lahir, alamat, no_hp, email, … }
PUT /permohonan/12/step-2   { pendidikan_kode, instansi, jurusan, tahun_lulus, … }
POST /permohonan/12/step-3  { persyaratan_id, dokumen_uuid, nama_file_asli, ukuran_byte }
PUT /permohonan/12/step-4   { is_setuju: true }
POST /permohonan/12/submit
```

- Menyimpan bersifat **upsert**: memanggil `step-1` dua kali memperbarui baris
  yang sama, bukan membuat baris baru.
- `current_step` **hanya maju**. Pelamar yang kembali menyunting langkah 1
  tidak kehilangan posisinya di langkah 3.
- `updated_at` ikut ditulis tiap penyimpanan, supaya FE bisa menampilkan
  "tersimpan pukul …".
- **Kelengkapan tidak diperiksa per langkah**, hanya saat `submit` — justru
  itu gunanya draft. `submit` menyebut persis bagian mana yang kurang:
  `"Permohonan belum lengkap: Bagian 2: … belum diisi; Bagian 3: dokumen
  Kartu Tanda Penduduk belum diunggah"`.

### Langkah 3 dan service Dokumen

Yang dicatat di sini hanya **penunjuk** ke berkas: `dokumen_uuid` yang
diterbitkan service Dokumen setelah magic bytes-nya diperiksa. Filenya sendiri
tidak pernah lewat service ini.

Jenis dokumen yang dikirim harus memang diminta program itu (dicek ke
`GET /beasiswa/:id/persyaratan` di Master), dan ukurannya tidak boleh melewati
`max_size_kb` jenis dokumen tersebut. Unggah ulang jenis yang sama **menimpa**
barisnya dan mengembalikan `status_verifikasi` ke `BELUM_DIPERIKSA` — berkas
baru belum pernah dilihat verifikator.

### Antrean kerja internal

`GET /permohonan` menerima `tahap` sebagai pintasan: backend yang memetakannya
ke kumpulan status yang relevan, jadi tiap halaman internal tidak perlu
menghafal daftar statusnya sendiri.

| `tahap` | Status yang ikut | Dipakai halaman |
|---|---|---|
| `verifikasi` | `DIAJUKAN`, `DALAM_VERIFIKASI`, `REVISI` | Verifikator |
| `wawancara` | `LULUS_ADMIN`, `DALAM_WAWANCARA`, `LULUS_WAWANCARA`, `TIDAK_LULUS_WAWANCARA` | Lembaga Seleksi |
| `hasil` | `LULUS_WAWANCARA`, `DITERIMA`, `TIDAK_DITERIMA` | Admin — Hasil Seleksi |

Filter `status` tetap bisa dipakai bersamaan dan **diiriskan** dengan tahapnya:
meminta status di luar tahap yang sedang dibuka menghasilkan daftar kosong,
bukan diam-diam diabaikan. `DRAFT` tidak pernah ikut, apa pun filternya.

Tiap baris membawa `pendaftar` (`nama_lengkap`, `nik`) hasil join ke biodata,
jadi tabel antrean tidak perlu memanggil detail satu per satu.

## Rekap dashboard

`GET /dashboard/statistik` mengembalikan `per_status` (kesebelas status — yang
kosong tetap muncul bernilai 0, supaya kartu di dashboard tidak hilang-timbul
mengikuti isi data), `ringkas` untuk kartu-kartu itu, dan `per_beasiswa`.

`per_beasiswa` dihitung dalam satu query, bukan dengan memanggil endpoint ini
sekali per program dari frontend. Nama programnya diambil dari snapshot
`beasiswa_nama`, jadi tidak perlu memanggil service Master.

Di dalamnya, **`lolos_admin` menghitung yang pernah lolos** — termasuk yang
sudah lanjut ke wawancara dan seterusnya. Kalau hanya menghitung `LULUS_ADMIN`,
angkanya justru menyusut setiap kali ada peserta yang maju ke tahap berikutnya.
Kuota tidak ada di sini karena itu milik service Master; frontend yang
menggabungkan keduanya.

## Alur seleksi

**Seleksi administrasi** menerima `DIAJUKAN` maupun `DALAM_VERIFIKASI`. Kalau
masih `DIAJUKAN`, perpindahan `DIAJUKAN → DALAM_VERIFIKASI` dicatat lebih dulu,
jadi riwayatnya tetap menunjukkan permohonan itu sempat diambil sebelum
diputus — verifikator cukup menekan satu tombol.

| Keputusan | Status jadi | Efek |
|---|---|---|
| `DISETUJUI` | `LULUS_ADMIN` | lanjut ke wawancara |
| `DITOLAK` | `DITOLAK_ADMIN` | final |
| `REVISI` | `REVISI` | **dibuka lagi** supaya pelamar bisa memperbaiki |

Checklist per dokumen ikut memperbarui `permohonan_dokumen.status_verifikasi`,
supaya pelamar tahu berkas mana yang harus diganti tanpa membaca seluruh
riwayat. `DITOLAK` dan `REVISI` **wajib disertai catatan** — tanpa itu pelamar
tidak tahu apa yang salah.

**Wawancara** menghitung `nilai_total` sendiri sebagai rata-rata berbobot
`Σ(skor×bobot) / Σbobot`, dibulatkan 2 desimal. Angkanya **tidak diterima dari
client**, jadi tidak mungkin berbeda dari rincian aspeknya.

**Hasil akhir** hanya menerima permohonan berstatus `LULUS_WAWANCARA`.

## Keamanan

**Anti-IDOR.** Permohonan milik orang lain dibalas **404, bukan 403** —
membedakan keduanya justru memberi tahu penebak id bahwa permohonan itu ada.
Role saja tidak cukup: seorang `APPLICANT` yang sah tetap diperiksa
kepemilikannya di service, bukan hanya di router.

**Identitas tidak pernah dari body.** `user_id` diambil dari klaim `uid` token
(nanti dari header `X-User-Id` yang di-inject Gateway). Kalau boleh dikirim
client, siapa pun bisa mendaftar atas nama orang lain. Token tanpa klaim `uid`
ditolak `IDENTITAS_TIDAK_LENGKAP`.

**Isian wizard hanya boleh disentuh pemiliknya** — admin sekalipun tidak bisa
mengubah jawaban pelamar.

**`is_locked` selalu turunan status**, tidak pernah diisi manual. Semua
perubahan status lewat satu pintu (`helpers/pindahStatus.js`) yang sekaligus
memvalidasi transisi terhadap state machine (ilegal → HTTP 409) dan menulis
`permohonan_status_history` **dalam transaksi yang sama** — jadi tidak ada
perpindahan tanpa jejak.

**Daftar untuk internal menyembunyikan `DRAFT`.** Itu isian yang belum dikirim
pemiliknya, jadi belum layak dibaca verifikator.

## Hubungan ke service Master

`helpers/master.js` memanggil Master lewat HTTP dan **meneruskan token
pemanggil apa adanya**, bukan kredensial khusus service. Efeknya penting:
aturan siapa boleh melihat program apa tetap ditegakkan Master. Applicant hanya
bisa membaca program `AKTIF`, jadi ia otomatis tidak bisa membuat permohonan
untuk program `DRAFT` — tanpa pemeriksaan tambahan di sini. Masa pendaftaran
(`tgl_buka`/`tgl_tutup`) diperiksa saat membuat permohonan.

Kredensial MySQL ada di `config/config.json` (mengikuti pola service RBAC dan
Master); `.env` hanya berisi konfigurasi aplikasi.

## Tabel

Sesuai `desain-database-beasiswa.md` bagian 3. Dibuat dengan
`npx sequelize model:create --name ... --attributes ...` lalu disesuaikan
tangan (ENUM, `BIGINT UNSIGNED`, primary key, foreign key, index) karena
generator hanya bisa membuat kolom bertipe sederhana.

| Tabel | Isi |
|---|---|
| `permohonan` | induk: kode, pemilik, program, status, posisi wizard |
| `permohonan_biodata` | wizard 1 — data diri & kontak |
| `permohonan_pendidikan` | wizard 2 — pendidikan & pekerjaan |
| `permohonan_dokumen` | wizard 3 — penunjuk berkas di service Dokumen |
| `permohonan_persetujuan` | wizard 4 — lembar persetujuan |
| `verifikasi_administrasi` | putusan verifikator (histori, banyak putaran) |
| `verifikasi_checklist` | rincian per dokumen dari satu putaran verifikasi |
| `seleksi_wawancara` | penilaian Lembaga Seleksi |
| `penilaian_detail` | aspek penilaian wawancara (skor × bobot) |
| `hasil_seleksi` | penetapan akhir oleh admin |
| `permohonan_status_history` | jejak tiap perpindahan status |
| `sequence_counter` | sumber nomor urut per tahun untuk kode permohonan |

### Yang perlu diketahui tentang bentuknya

**Tiap bagian wizard tabelnya sendiri**, dengan `permohonan_id` sebagai primary
key sekaligus foreign key (`permohonan_biodata`, `permohonan_pendidikan`,
`permohonan_persetujuan`, `hasil_seleksi`). Bentuk ini yang memungkinkan
autosave per section: menyimpan langkah 2 tidak menyentuh langkah 1.

**Menghapus permohonan menghapus seluruh turunannya** (`CASCADE`) — termasuk
checklist dan detail penilaian lewat induknya masing-masing.

**Kolom waktunya tidak seragam**, mengikuti DDL:

| Tabel | Kolom waktu |
|---|---|
| `permohonan` | `created_at` + `updated_at` |
| `permohonan_biodata`, `permohonan_pendidikan` | `updated_at` saja |
| `permohonan_status_history` | `created_at` saja (baris riwayat tak pernah diubah) |
| `permohonan_dokumen` | `uploaded_at` |
| `verifikasi_administrasi` | `verified_at` |
| `seleksi_wawancara` | `submitted_at` |
| `hasil_seleksi` | `ditetapkan_at` |
| `permohonan_persetujuan`, `verifikasi_checklist`, `penilaian_detail`, `sequence_counter` | tidak ada |

**Snapshot data yang harus abadi.** `beasiswa_nama`, `persyaratan_nama`,
`verifikator_nama`, dan `penilai_nama` disalin ke tabel transaksi. Kalau master
atau akun penggunanya kelak diubah, histori permohonan tetap menunjukkan yang
berlaku saat itu.

**Tidak ada foreign key lintas database.** `user_id`, `beasiswa_id`,
`persyaratan_id`, dan `dokumen_uuid` adalah *logical reference* ke service lain;
konsistensinya dijaga di level aplikasi.

**`permohonan_status_history.status_ke` sengaja `VARCHAR`, bukan `ENUM`** —
riwayat harus tetap terbaca apa adanya walau daftar status kelak berubah.

Dua penyimpangan kecil dari DDL, keduanya karena keterbatasan tipe Sequelize:
`tahun_lulus` memakai `SMALLINT` (DDL menulis `YEAR`), dan `current_step`
memakai `TINYINT` tanpa lebar tampilan. Rentang nilainya dijaga validator.

## State machine status

`helpers/statusPermohonan.js` memegang daftar status, tabel transisi, dan
turunannya. **Migration menyimpan salinan bekunya sendiri**: migration yang
sudah jalan tidak boleh berubah isinya hanya karena helper disunting.

```
DRAFT ──submit──> DIAJUKAN ──ambil──> DALAM_VERIFIKASI
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
                 REVISI              DITOLAK_ADMIN         LULUS_ADMIN
                    │                  (final)                  │
              user perbaiki                              DALAM_WAWANCARA
                    │                                            │
                    └──submit──> DIAJUKAN            ┌───────────┴───────────┐
                                                     ▼                       ▼
                                              LULUS_WAWANCARA        TIDAK_LULUS_WAWANCARA
                                                     │                    (final)
                                              ┌──────┴──────┐
                                              ▼             ▼
                                          DITERIMA     TIDAK_DITERIMA
```

- `bolehPindah(dari, ke)` — transisi ilegal nantinya dibalas HTTP 409.
- `terkunci(status)` — `is_locked` **selalu turunan status**, jangan diisi
  manual. Data hanya boleh diubah applicant saat `DRAFT` atau `REVISI`.
- Tiap perpindahan wajib dicatat ke `permohonan_status_history` **dalam
  transaksi yang sama** dengan perubahan statusnya.

## Kode permohonan

`PRM-{tahun}-{6 digit}` → `PRM-2026-000001`. Nomornya diambil dari
`sequence_counter` dengan `SELECT … FOR UPDATE` (`helpers/nomorUrut.js`),
sama seperti kode beasiswa di service Master — hanya lebar digitnya berbeda
(6, bukan 3). Pengambilan nomor dan penyimpanan barisnya harus satu transaksi.

## Yang belum dikerjakan

- **`GET /export/excel`** (peserta lulus wawancara) belum ada — butuh library
  seperti `exceljs`. Sementara, halaman Hasil Seleksi di FE mengunduh CSV
  ber-BOM UTF-8 yang dirakit di browser (bisa dibuka Excel), dan hanya memuat
  baris pada halaman yang sedang tampil.
- **Nama pelaku pada snapshot masih berupa email.** `verifikator_nama` dan
  `penilai_nama` diisi dari token, dan token hanya membawa `email`, bukan
  `nama`. Perbaikan yang benar: RBAC menambahkan klaim `nama` ke access token —
  itu perubahan kontrak lintas service, jadi belum dikerjakan di sini.
- Seluruh halaman FE yang memakainya sudah tersambung: peserta, verifikator,
  lembaga seleksi, dan admin (dashboard + hasil seleksi).
- Belum ada Dockerfile.
- `config/config.json` masih hardcode password MySQL dan ikut ter-commit —
  utang teknis yang sama dengan service RBAC dan Master.

### Penyimpangan dari mockup

Mockup `2_index_awal.html` punya isian **Provinsi / Kabupaten / Kecamatan /
Kelurahan** yang tidak ada di DDL — `permohonan_biodata` hanya punya `alamat`
bertipe TEXT. Sampai service Master menyediakan data wilayah, alamat disimpan
sebagai satu teks. Begitu juga "Pekerjaan Saat Ini" yang di mockup berupa teks
bebas, sedangkan DDL memisahkannya jadi `pekerjaan_kode` +
`nama_tempat_kerja`.
#   b i t _ b e _ t r a n s a k s i  
 