# BIT_BE_GATEWAY

API Gateway — **satu-satunya pintu masuk publik** ke sistem beasiswa pelatihan.
Tidak punya database dan tidak menyimpan apa pun.

## Tugasnya

1. **Memverifikasi access token** sebelum request diteruskan ke service.
2. **Meneruskan identitas** hasil verifikasi lewat header `X-User-*`.
3. **Membatasi CORS** ke domain frontend saja.
4. **Rate limit** ~100 request/menit, dan jauh lebih ketat untuk login.
5. **Menyajikan aplikasi React** — request yang bukan `/api` diteruskan ke nginx.

Karena gateway yang menyajikan FE sekaligus API, keduanya berbagi satu origin:
tidak ada preflight CORS dan cookie refresh token tetap first-party.

## Peta rute

Segmen pertama setelah `/api` menentukan tujuannya. Rute di dalam service
**tidak berubah sama sekali** — gateway hanya memasang dan melepas `/api`.

| Dari browser | Diteruskan ke | Service |
|---|---|---|
| `/api/auth/*` | `/auth/*` | RBAC :3001 |
| `/api/users/*` | `/users/*` | RBAC |
| `/api/roles/*` | `/roles/*` | RBAC |
| `/api/menus/*` | `/menus/*` | RBAC |
| `/api/.well-known/jwks.json` | idem | RBAC |
| `/api/beasiswa/*` | `/beasiswa/*` | Master :3002 |
| `/api/persyaratan/*` | `/persyaratan/*` | Master |
| `/api/permohonan/*` | `/permohonan/*` | Transaksi :3003 |
| `/api/dashboard/*` | `/dashboard/*` | Transaksi |
| `/api/dokumen/*` | `/dokumen/*` | Dokumen :3004 |
| selain itu | apa adanya | Frontend (nginx) |

Petanya ada di `config/layanan.js`. Menambah rute baru di sebuah service tidak
perlu mengubah gateway, **kecuali** kalau prefix teratasnya baru.

## Jalur yang boleh tanpa token

Hanya tujuh, didefinisikan sebagai regex terikat awal-akhir di
`config/layanan.js`:

- `POST /api/auth/register` — pendaftaran mandiri calon peserta; RBAC yang
  memaksa role `APPLICANT`, tidak ada jalan dari sini ke akun internal
- `POST /api/auth/login` — memang belum punya token
- `POST /api/auth/refresh`, `POST /api/auth/logout` — diautentikasi lewat
  cookie HttpOnly, justru dipanggil saat access token sudah kedaluwarsa
- `GET /api/.well-known/jwks.json` — public key, memang untuk umum
- `GET /api/beasiswa/publik` — katalog program di landing page, dibuka
  pengunjung yang belum punya akun. Terikat `$`, jadi `/api/beasiswa` dan
  `/api/beasiswa/publik/17` **tetap** menuntut token
- `GET /api/dokumen/public/:token` — presigned link; otorisasinya melekat
  pada tokennya sendiri (sekali pakai, berbatas waktu, terikat satu user)

Selain itu wajib `Authorization: Bearer <access token>`.

## Header identitas

Setelah token diverifikasi, gateway memasang:

| Header | Isi |
|---|---|
| `X-User-Id` | klaim `uid` — id numerik `db_rbac.users.id` |
| `X-User-Uuid` | klaim `sub` |
| `X-User-Email` | klaim `email` |
| `X-User-Roles` | klaim `roles`, dipisah koma |

Keempatnya **dibuang lebih dulu** dari request yang masuk (`app.js`). Tanpa itu
siapa pun bisa mengirim `X-User-Id: 1` dan menyamar jadi admin.

Service di belakang tetap memverifikasi token sendiri — gateway bukan
satu-satunya lapisan.

## Catatan implementasi

**Tidak ada body parser.** Gateway meneruskan byte apa adanya. Begitu body
dibaca di sini, unggahan multipart ke service Dokumen akan menggantung dan
POST biasa terkirim dengan body kosong.

## Menjalankan

```powershell
npm install
Copy-Item .env.example .env   # lalu sesuaikan
npm run dev                   # atau: npm start
```

Butuh keempat service sudah menyala. Cek: `GET http://localhost:3000/health`.

Di Docker, seluruh nilai environment diisi `docker-compose.yml` dan gateway
adalah satu-satunya container yang menerbitkan port (`8080:3000`).
