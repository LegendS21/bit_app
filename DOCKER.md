# Docker untuk Aplikasi Beasiswa Pelatihan

Panduan untuk yang **belum pernah memakai Docker sama sekali**. Ditulis khusus
untuk proyek ini, bukan tutorial umum.

---

## 1. Kenapa proyek ini butuh Docker

Sekarang, untuk menjalankan aplikasi ini Anda harus membuka **6 terminal**:

```
terminal 1 → BIT_BE_RBAC       npm run dev   (port 3001)
terminal 2 → BIT_BE_MASTER     npm run dev   (port 3002)
terminal 3 → BIT_BE_TRANSAKSI  npm run dev   (port 3003)
terminal 4 → BIT_BE_DOKUMEN    npm run dev   (port 3004)
terminal 5 → BIT_FE            npm run dev   (port 5173)
terminal 6 → MySQL & PostgreSQL harus sudah terpasang di Windows
```

Ditambah: MySQL harus versi yang cocok, PostgreSQL harus terpasang terpisah, dan
ClamAV (pemindai virus untuk service Dokumen) belum terpasang sama sekali.

Dengan Docker, semuanya jadi **satu perintah**:

```powershell
docker compose up
```

Dan di mesin mana pun hasilnya sama persis — tidak ada lagi "di laptop saya
jalan, di laptop Anda tidak".

Petunjuk penilaian juga memintanya secara eksplisit: *tiap repo punya Dockerfile
sendiri, orkestrasi Docker Compose atau K8s, tiap container yang menyimpan data
wajib pointing ke persistent volume.*

---

## 2. Empat istilah yang perlu Anda pahami

Cukup empat. Sisanya bisa menyusul.

### Image — "resep"

Cetakan berisi sistem operasi kecil + Node.js + kode aplikasi Anda. Sifatnya
mati, tidak berjalan. Analoginya **file installer**.

### Container — "yang berjalan"

Image yang dinyalakan. Satu image bisa dinyalakan jadi banyak container.
Analoginya **program yang sedang jalan**.

Yang penting dipahami: **container itu sekali pakai.** Kalau dihapus, semua
perubahan di dalamnya hilang — termasuk isi database. Itu sebabnya ada volume.

### Volume — "penyimpanan yang tidak ikut hilang"

Folder yang hidupnya di luar container. Container boleh dihapus dan dibuat
ulang, isinya tetap ada.

Di proyek ini **wajib ada tiga volume**:

| Volume | Isi | Kalau hilang |
|---|---|---|
| `mysql_data` | db_rbac, db_master, db_transaksi | semua user, program, permohonan hilang |
| `postgres_data` | db_dokumen | metadata berkas hilang |
| `storage_dokumen` | file KTP/ijazah yang diunggah | berkas peserta hilang |

### Dockerfile & docker-compose.yml — "resep" dan "daftar resep"

- **Dockerfile** — cara membangun *satu* image. Satu file per repo service.
- **docker-compose.yml** — daftar semua container yang harus jalan bersama,
  beserta jaringan, volume, dan urutan nyalanya. Satu file untuk semua.

---

## 3. Yang akan dijalankan nanti

Delapan container:

```
                        ┌──────────────────────────────┐
   Browser Anda  ────►  │  bit_fe          :5173       │   satu-satunya yang
                        │  (nginx + hasil build React) │   dibuka ke luar
                        └───────────────┬──────────────┘
                                        │  jaringan internal Docker
      ┌───────────────┬─────────────────┼─────────────────┬──────────────┐
      ▼               ▼                 ▼                 ▼              ▼
 bit_be_rbac    bit_be_master    bit_be_transaksi   bit_be_dokumen    clamav
   :3001            :3002             :3003              :3004         :3310
      │               │                 │                 │              ▲
      └───────────────┴────────┬────────┘                 ├──────────────┘
                               ▼                          ▼
                         mysql :3306                postgres :5432
                        (volume data)               (volume data)
                                                          +
                                                  volume /storage
```

Poin pentingnya: **hanya `bit_fe` yang portnya dibuka ke Windows.** Keempat
service backend dan kedua database hanya bisa dihubungi dari dalam jaringan
Docker — itulah "private subnet" yang diminta petunjuk penilaian.

---

## 4. Kondisi saat ini di mesin Anda

Sudah saya cek:

| Hal | Status |
|---|---|
| Docker CLI | ✅ terpasang, versi 29.6.2 |
| Docker Compose | ✅ terpasang, versi v5.3.1 |
| Docker Desktop | ⚠️ **belum berjalan** (daemon-nya mati) |
| Dockerfile di tiap repo | ❌ belum ada |
| `docker-compose.yml` | ❌ belum ada |

Jadi peralatannya sudah ada. Yang belum ada adalah file-file resepnya.

---

## 5. Yang harus Anda lakukan

### Langkah 1 — nyalakan Docker Desktop

Buka **Docker Desktop** dari Start Menu, tunggu sampai ikon paus di taskbar
berhenti berkedip. Lalu pastikan di terminal:

```powershell
docker info
```

Kalau keluar keterangan panjang tanpa error, Docker siap. Kalau muncul
`failed to connect to the docker API`, artinya Docker Desktop belum benar-benar
menyala.

> Docker Desktop di Windows butuh **WSL 2**. Kalau saat dibuka ia meminta
> memasang WSL, ikuti saja dan restart komputer.

### Langkah 2 — minta saya membuat file resepnya

File yang belum ada dan perlu dibuat:

| File | Letak | Isi |
|---|---|---|
| `Dockerfile` | tiap repo BE (4 file) | cara membangun image service Node.js |
| `Dockerfile` | `BIT_FE/` | build React lalu sajikan hasilnya lewat nginx |
| `nginx.conf` | `BIT_FE/` | supaya refresh di `/peserta` tidak jadi 404 |
| `.dockerignore` | tiap repo (5 file) | supaya `node_modules` tidak ikut disalin |
| `docker-compose.yml` | root proyek | daftar kedelapan container + volume |
| `.env` | root proyek | password database, dipakai compose |

Saya bisa membuat semuanya. Tapi sebelum itu ada beberapa hal di kode yang
**harus diubah dulu**, kalau tidak container-nya akan menyala tapi tidak bisa
saling terhubung. Itu bagian berikutnya.

### Langkah 3 — perbaiki yang menghalangi (ini yang penting)

Ada empat hal. Semuanya nyata, bukan teori.

#### (a) `localhost` di dalam container bukan komputer Anda

Ini kesalahpahaman nomor satu bagi yang baru memakai Docker.

Tiap container punya "localhost"-nya sendiri. Kalau service Transaksi mencari
`http://localhost:3002` untuk menghubungi Master, ia mencari di **dalam dirinya
sendiri** — dan tidak menemukan apa-apa.

Di dalam Docker, alamatnya jadi **nama service**:

```diff
- MASTER_BASE_URL=http://localhost:3002
+ MASTER_BASE_URL=http://bit_be_master:3002
```

Yang perlu diubah: `RBAC_JWKS_URL`, `MASTER_BASE_URL`, `TRANSAKSI_BASE_URL`,
dan `CLAMAV_HOST`. Kabar baiknya, semuanya sudah berupa variabel `.env` — jadi
tidak ada kode yang perlu disentuh, cukup nilainya.

#### (b) `config/config.json` masih mengunci alamat & password database

Keempat service backend menyimpan kredensial database seperti ini:

```json
{ "host": "127.0.0.1", "password": "mysql", "database": "db_rbac" }
```

Di dalam Docker, host-nya harus `mysql` (nama container), bukan `127.0.0.1`.
Karena nilainya ditulis mati di file, tidak ada cara mengubahnya dari luar.

Ini utang teknis yang sudah lama tercatat di `CLAUDE.md`, dan Docker membuatnya
benar-benar menghalangi. Perbaikannya: ganti `config/config.json` jadi
`config/config.js` yang membaca `.env`.

> Ini juga sekaligus menutup masalah keamanan: sekarang password MySQL
> ikut ter-commit ke git.

#### (c) Frontend menempelkan alamat API saat **build**, bukan saat jalan

Vite mengganti `import.meta.env.VITE_API_URL` menjadi teks biasa ketika
`npm run build` dijalankan. Jadi alamat API "terbakar" ke dalam file JavaScript
hasil build — mengubah `.env` setelahnya tidak berpengaruh sama sekali.

Ada dua jalan keluar:

1. **Kirim alamatnya sebagai build argument** saat image FE dibangun. Sederhana,
   tapi image-nya jadi terikat ke satu alamat.
2. **Pakai path relatif + reverse proxy.** FE memanggil `/api/rbac/...`, lalu
   nginx (atau Gateway) meneruskannya ke container yang benar. Lebih rapi, dan
   ini yang sejalan dengan rencana API Gateway.

Saya sarankan nomor 2, karena toh Gateway memang harus dibuat.

#### (d) API Gateway belum ada

Petunjuk penilaian meminta: *"Service internal di private subnet — hanya Gateway
yang expose port ke host"*.

Sekarang FE memanggil keempat service langsung. Kalau begitu, keempatnya harus
membuka port ke Windows — dan poin penilaian itu tidak terpenuhi.

`BIT_BE_GATEWAY` sudah tercatat sebagai pekerjaan yang belum dikerjakan.
Sebaiknya dibuat **sebelum** Docker difinalkan, karena ia yang menentukan
bentuk jaringannya.

### Langkah 4 — jalankan

Setelah semua file ada:

```powershell
cd "C:\PT. Bentang Inspirasi Teknologi"
docker compose up --build
```

Pertama kali akan lama (5–15 menit) karena Docker mengunduh image dasar Node,
MySQL, PostgreSQL, dan ClamAV. Berikutnya cepat.

Buka `http://localhost:5173`. Selesai.

---

## 6. Urutan pengerjaan yang saya sarankan

Jangan kerjakan semuanya sekaligus. Urutannya:

1. **`config/config.js` untuk keempat service** — wajib, dan berguna walau tanpa
   Docker (password tidak lagi ter-commit).
2. **Buat `BIT_BE_GATEWAY`** — menentukan bentuk jaringan Docker nanti.
3. **Arahkan FE ke Gateway** — satu alamat saja, bukan empat.
4. **Dockerfile tiap repo** — mulai dari satu service dulu, misalnya RBAC.
   Pastikan ia jalan sendiri sebelum menambah yang lain.
5. **`docker-compose.yml`** — satukan semuanya.
6. **ClamAV** — nyalakan `CLAMAV_ENABLED=true` di service Dokumen. Baru setelah
   di Docker pemindaian virus benar-benar bisa dipakai.

Langkah 1–3 adalah pekerjaan kode biasa. Baru langkah 4 ke atas yang "Docker".

---

## 7. Perintah yang akan sering dipakai

```powershell
docker compose up --build      # bangun lalu jalankan semuanya
docker compose up -d           # jalankan di latar belakang
docker compose down            # matikan (volume TETAP aman)
docker compose down -v         # matikan + HAPUS volume → database kosong!
docker compose ps              # container apa saja yang hidup
docker compose logs -f rbac    # lihat log satu service, terus-menerus
docker compose restart rbac    # nyalakan ulang satu service
docker compose exec rbac sh    # masuk ke dalam container
```

> **Hati-hati dengan `down -v`.** Itu menghapus volume, artinya seluruh isi
> database dan berkas unggahan hilang. `down` saja aman.

---

## 8. Kalau ada masalah

| Gejala | Penyebab biasanya |
|---|---|
| `failed to connect to the docker API` | Docker Desktop belum menyala |
| Service jalan tapi `ECONNREFUSED` ke service lain | masih memakai `localhost`, bukan nama container |
| `ER_ACCESS_DENIED` ke MySQL | password di compose beda dengan yang dipakai service |
| Backend mati saat pertama nyala | database belum siap; perlu `healthcheck` + `depends_on` di compose |
| Halaman putih di `/peserta` setelah refresh | nginx belum diarahkan ke `index.html` (SPA fallback) |
| Perubahan kode tidak muncul | image belum dibangun ulang → `docker compose up --build` |
| Data hilang setelah restart | volume belum dipasang untuk container database |

Melihat penyebab sebenarnya selalu lewat log:

```powershell
docker compose logs -f nama_service
```

---

## 9. Yang perlu diingat

- **Container hilang itu normal.** Yang tidak boleh hilang adalah volume.
- **Satu container satu tugas.** Jangan menaruh MySQL dan Node.js di container
  yang sama.
- **Jangan pernah menaruh password asli di Dockerfile.** Dockerfile ikut
  ter-commit; password lewat `.env` yang di-*gitignore*.
- **`.dockerignore` itu wajib.** Tanpa itu, `node_modules` Windows Anda ikut
  tersalin ke dalam image Linux dan biasanya langsung rusak.
- **Tiap repo punya Dockerfile-nya sendiri**, karena tiap repo adalah git repo
  terpisah. Sedangkan `docker-compose.yml` ada di root — dan root **bukan** git
  repo, jadi file itu tidak ikut ter-commit ke mana pun. Simpan salinannya.

---

## 10. Langkah berikutnya

Bilang saja mana yang mau dikerjakan lebih dulu:

- "kerjakan config.js untuk keempat service" → menghapus utang teknis, wajib
  untuk Docker
- "buatkan API Gateway" → menentukan bentuk jaringan Docker
- "buatkan Dockerfile-nya" → kalau ingin langsung mencoba, walau belum ideal

Untuk alur perekaman video demo, lihat `ALUR-VIDEO-DEMO.md`.
