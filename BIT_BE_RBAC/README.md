# bit_be_rbac — Autentikasi (access & refresh token)

Service RBAC: Express 5 + Sequelize + MySQL (`db_rbac`). Port default `3001`.

## Menjalankan

```powershell
npm install
copy .env.example .env    # lalu sesuaikan
npm run db:migrate
npm run db:seed           # 4 role + satu akun per aktor
npm run dev
```

Akun hasil seeder (email & password bisa diubah lewat `.env`):

| Aktor | Email | Password |
|---|---|---|
| Admin | `admin@bit.test` | `Admin#12345` |
| Verifikator | `verifikator@bit.test` | `Verifikator#12345` |
| Lembaga Seleksi | `seleksi@bit.test` | `Seleksi#12345` |
| Calon Peserta | `peserta@bit.test` | `Peserta#12345` |

Seeder-nya idempoten — aman dijalankan ulang, baris yang sudah ada dilewati.
`npm run db:seed:undo` menghapus keempat akun beserta role-nya.

Pasangan kunci RS256 dibuat otomatis di `keys/` saat boot pertama (folder ini
sudah masuk `.gitignore`). Di produksi pasang kunci sendiri lewat secret/volume —
kalau container di-recreate tanpa volume, kuncinya berubah dan semua access
token yang beredar langsung invalid.

## Endpoint

| Method | Path | Auth | Keterangan |
|---|---|---|---|
| GET | `/health` | — | status service |
| GET | `/.well-known/jwks.json` | — | public key RS256 untuk Gateway |
| POST | `/auth/login` | — | terbitkan access + refresh token |
| POST | `/auth/refresh` | cookie | rotasi refresh token |
| POST | `/auth/logout` | cookie | cabut sesi ini |
| POST | `/auth/logout-all` | Bearer | cabut semua sesi user |
| GET | `/auth/me` | Bearer | profil + roles |
| GET | `/users` | Bearer **ADMIN** | daftar user (cari, filter, halaman) |
| POST | `/users` | Bearer **ADMIN** | tambah user |
| GET | `/users/:uuid` | Bearer **ADMIN** | detail user |
| PUT | `/users/:uuid` | Bearer **ADMIN** | ubah user |
| DELETE | `/users/:uuid` | Bearer **ADMIN** | hapus user (soft delete) |
| GET | `/roles` | Bearer **ADMIN** | daftar role + jumlah user + menu yang boleh dilihat |
| POST | `/roles` | Bearer **ADMIN** | tambah role |
| GET | `/roles/:id` | Bearer **ADMIN** | detail role |
| PUT | `/roles/:id` | Bearer **ADMIN** | ubah role |
| DELETE | `/roles/:id` | Bearer **ADMIN** | hapus role |
| GET | `/roles/:id/akses-menu` | Bearer **ADMIN** | seluruh menu + flag akses role ini |
| PUT | `/roles/:id/akses-menu` | Bearer **ADMIN** | simpan hak akses menu |
| GET | `/menus` | Bearer **ADMIN** | struktur menu, terurut sesuai sidebar |
| POST | `/menus` | Bearer **ADMIN** | tambah menu |
| GET | `/menus/:id` | Bearer **ADMIN** | detail menu |
| PUT | `/menus/:id` | Bearer **ADMIN** | ubah menu |
| DELETE | `/menus/:id` | Bearer **ADMIN** | hapus menu |

### POST /auth/login

```json
{ "email": "admin@bit.test", "password": "Admin#12345" }
```

Response `200` — refresh token **tidak ada di body**, hanya di cookie
`refresh_token` (`HttpOnly; SameSite=Strict; Path=/`, `Secure` saat produksi):

```json
{
  "message": "Login berhasil",
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": { "uuid": "...", "nama": "...", "email": "...", "roles": ["ADMIN"] }
  }
}
```

Kode error: `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`,
`403 ACCOUNT_INACTIVE`, `423 ACCOUNT_LOCKED`, `429 LOGIN_RATE_LIMITED`.

### POST /auth/refresh

Tanpa body — token dibaca dari cookie. (Klien non-browser boleh mengirim
`{ "refresh_token": "..." }` di body.) Response sama seperti login, dan cookie
diganti dengan token baru.

## CRUD Users (khusus ADMIN)

User dialamatkan dengan **uuid**, bukan id urut, supaya tidak bisa ditebak.
Guard `authentication + isAdmin` dipasang di level router, jadi tidak ada endpoint
yang lolos karena lupa dipasangi satu per satu.

### GET /users

Query: `q` (cari nama/email), `role` (kode role), `tipe` (`INTERNAL`/`APPLICANT`),
`status` (`aktif`/`nonaktif`), `page` (default 1), `limit` (default 10, maks 100).

```json
{
  "data": [{ "uuid": "...", "nama": "...", "email": "...", "no_hp": null,
             "tipe_user": "INTERNAL", "is_active": true, "last_login_at": null,
             "roles": [{ "id": 15, "kode": "VERIFIKATOR", "nama": "Verifikator" }],
             "created_at": "..." }],
  "meta": { "total": 3, "page": 1, "limit": 10, "total_halaman": 1 }
}
```

### POST /users · PUT /users/:uuid

```json
{ "nama": "Budi", "email": "budi@beasiswa.go.id", "password": "Rahasia123",
  "no_hp": "0812...", "roles": ["VERIFIKATOR"], "is_active": true }
```

Pada PUT semua kolom opsional; `password` hanya dikirim kalau memang diganti.
`tipe_user` **tidak diterima dari client** — diturunkan dari role supaya tidak
pernah bentrok. Role internal tidak boleh digabung dengan `APPLICANT`.

### Ganti password sendiri

Mengganti password **akun sendiri** wajib menyertakan `password_lama`, dan
diverifikasi dengan argon2 (`PASSWORD_LAMA_WAJIB`, `PASSWORD_LAMA_SALAH`).
Admin yang mengganti password orang lain tidak diminta ini — ia memang tidak
tahu password orang tersebut, dan pemiliknya otomatis terlempar keluar.

### Aturan pengaman

- Admin tidak bisa menghapus, menonaktifkan, atau mencabut role Administrator
  milik akunnya sendiri (`SELF_DELETE`, `SELF_DEACTIVATE`, `SELF_ROLE_CHANGE`).
- Administrator aktif terakhir tidak bisa dihapus/dinonaktifkan (`LAST_ADMIN`).
- Sesi dicabut **sehemat mungkin**, karena pencabutan berarti user terlempar ke
  halaman login. Hanya terjadi saat: ganti password, akun dinonaktifkan, akun
  dihapus, atau role **orang lain** berubah. Menyimpan perubahan nama/email, dan
  perubahan role pada akun sendiri, tidak mencabut sesi — role di token yang
  lama tersegarkan sendiri pada refresh berikutnya (paling lama 15 menit).
- DELETE = soft delete (`deleted_at`). Emailnya tetap dianggap terpakai, jadi
  pendaftaran ulang dengan email sama ditolak `409` dengan pesan yang jelas.
- Setiap perubahan tercatat di `audit_log` (`CREATE_USER`, `UPDATE_USER`, `DELETE_USER`).

## Role & Akses Menu (khusus ADMIN)

Struktur menu portal internal di-seed lewat `npm run db:seed` (mengikuti sidebar
`InternalLayout` di BIT_FE) beserta hak akses awal: ADMIN penuh, Verifikator dan
Lembaga Seleksi hanya menu kerjanya.

### GET /roles/:id/akses-menu

Mengembalikan **seluruh** menu, termasuk yang belum diberi akses (semua flag
`false`), supaya frontend tinggal merender daftar centang tanpa menggabungkan
sendiri:

```json
{ "role": { "id": 14, "kode": "ADMIN", "nama": "Administrator", "bawaan_sistem": true },
  "menus": [{ "menu_id": 1, "parent_id": null, "kode": "VERIFIKASI_ADMIN",
              "nama": "Verifikasi Seleksi Administrasi", "path": "/verifikator",
              "can_view": true, "can_create": false, "can_update": true, "can_delete": false }] }
```

### PUT /roles/:id/akses-menu

Body `{ "akses": [{ "menu_id": 1, "can_view": true, "can_update": true }] }` —
**mengganti seluruh** hak akses role itu. Baris yang semua flag-nya `false` tidak
disimpan; ketiadaan baris sudah berarti tidak punya akses. `can_create`,
`can_update`, atau `can_delete` yang menyala otomatis memaksa `can_view` true —
aksi itu tidak masuk akal tanpa bisa membuka menunya.

### Penegakan hak akses

Centang di Setting Akses bukan sekadar catatan — `middlewares/izinMenu.js`
membacanya di setiap request. Tiap rute dipasangi menu dan aksinya:

| Rute | Menu | Aksi |
|---|---|---|
| `GET /users` | `SETTING_USERS` | `view` |
| `POST /users` | `SETTING_USERS` | `create` |
| `PUT /users/:uuid` | `SETTING_USERS` | `update` |
| `DELETE /users/:uuid` | `SETTING_USERS` | `delete` |
| `GET /roles` | `SETTING_ROLE` **atau** `SETTING_USERS` | `view` |
| mutasi `/roles` | `SETTING_ROLE` | sesuai aksinya |
| `/menus` | `SETTING_MENU` | sesuai aksinya |

Ditolak `403 MENU_ACCESS_DENIED`. `isAdmin` tetap dipasang: cek role menjawab
"siapa dia", cek menu menjawab "boleh apa dia di layar ini".

`GET /roles` menerima izin dari salah satu dari dua menu karena daftar role juga
mengisi dropdown "Role System" di halaman user.

### Aturan pengaman

- ADMIN **tidak bisa mencabut hak Lihat/Ubah-nya sendiri** atas menu
  `SETTING_ROLE` (`ADMIN_TERKUNCI`). Tanpa penjaga ini, satu kali salah centang
  membuat halaman pengaturan akses tidak bisa dibuka lagi oleh siapa pun, dan
  tidak ada jalan membatalkannya lewat aplikasi.
- Role bawaan sistem (`ADMIN`, `VERIFIKATOR`, `LEMBAGA_SELEKSI`, `APPLICANT`)
  tidak bisa dihapus, diganti kodenya, atau dinonaktifkan (`ROLE_SISTEM`) —
  kode-kode itu dipakai di payload JWT, guard route frontend, dan penentuan
  `tipe_user`. Nama dan keterangannya tetap bisa diubah.
- Role yang masih dipakai user tidak bisa dihapus (`ROLE_DIPAKAI`).
- Kode role dikunci formatnya: huruf kapital, angka, dan garis bawah.
- Tercatat di `audit_log`: `CREATE_ROLE`, `UPDATE_ROLE`, `DELETE_ROLE`,
  `UPDATE_ROLE_MENU_ACCESS`.

## Menu System (khusus ADMIN)

Struktur menu dibatasi **dua tingkat**, sama seperti yang dirender sidebar:
induk wajib menu tingkat atas, dan menu yang sudah punya submenu tidak bisa
dijadikan submenu milik menu lain. Tanpa batas ini menu bisa dibuat bersarang
lebih dalam dan tidak pernah tampil di mana pun.

`GET /menus` mengembalikan daftar datar tapi **sudah tersusun**: tiap submenu
menempel di bawah induknya, terurut `urutan` lalu `id` — jadi urutan yang dilihat
admin sama dengan urutan di sidebar. Tiap baris membawa `jumlah_anak` dan
`jumlah_role` (berapa role yang punya hak akses ke menu itu).

Menu tanpa `path` diperlakukan sebagai grup pembungkus, mis. "Data Master".

### Aturan pengaman

- Menu bawaan sistem (`SETTING_USERS`, `SETTING_ROLE`, `SETTING_MENU`) tidak bisa
  dihapus, diganti kodenya, atau dinonaktifkan (`MENU_SISTEM`). Ketiganya dipakai
  `izinMenu` sebagai penjaga endpoint — kalau hilang, guard-nya tidak menemukan
  baris apa pun dan seluruh halaman pengaturan ikut tertutup tanpa cara
  membatalkannya lewat aplikasi.
- Menu yang punya submenu tidak bisa dihapus (`MENU_PUNYA_ANAK`). Foreign key
  `menus.parent_id` memakai `ON DELETE CASCADE`, jadi tanpa penjaga ini submenunya
  ikut terhapus diam-diam.
- Menghapus menu ikut menghapus hak akses role atasnya (`role_menu_access`,
  lewat cascade). Jumlahnya dikembalikan di response sebagai `hak_akses_terhapus`
  dan dicatat di audit.
- Tercatat di `audit_log`: `CREATE_MENU`, `UPDATE_MENU`, `DELETE_MENU`.

## Cara kerja token

**Access token** — JWT RS256, umur 15 menit, dipakai di header
`Authorization: Bearer <token>`. Payload sesuai kontrak bersama:

```json
{ "sub": "user-uuid", "email": "...", "roles": ["APPLICANT"], "typ": "access",
  "iat": 0, "exp": 0, "iss": "bit-be-rbac", "aud": "bit-beasiswa" }
```

Header JWT membawa `kid` (thumbprint RFC 7638) yang cocok dengan `kid` di JWKS,
supaya Gateway bisa verifikasi lokal tanpa memanggil service ini tiap request.

Payload juga membawa `uid` (id numerik `users.id`) di luar kontrak dasar. Service
lain menyimpannya sebagai logical reference — mis. `db_master.beasiswa.created_by` —
dan tidak punya akses ke `db_rbac` untuk menerjemahkan uuid sendiri. Nantinya API
Gateway meneruskan nilai yang sama lewat header `X-User-Id`.

**Refresh token** — 48 byte acak (bukan JWT), umur 7 hari. Di DB yang disimpan
cuma SHA-256-nya; token mentah hanya ada di cookie milik user.

**Rotasi & reuse detection** — satu refresh token sekali pakai. Saat ditukar,
baris lama di-`revoked_at` dan `replaced_by` diisi hash penggantinya. Kalau
token yang sudah revoked dipakai lagi (tanda token bocor), **seluruh sesi user
dicabut** dan dicatat sebagai `REFRESH_REUSE_DETECTED` di `audit_log`.

**Penguncian akun** — 5 kali password salah → akun terkunci 15 menit
(`MAX_GAGAL_LOGIN`, `LAMA_KUNCI_MENIT`). Terpisah dari rate limit IP, jadi
serangan dari banyak IP tetap tertahan.

## Yang sudah dipenuhi dari checklist petunjuk

- Access token 15 menit + refresh token di HttpOnly cookie
- Cookie `SameSite=Strict` + JWT di header → proteksi CSRF
- Password argon2id; refresh token disimpan sebagai hash
- CORS dibatasi ke `CORS_ORIGIN`; rate limit 100 req/menit, login 5 per 15 menit
- Semua query lewat Sequelize (prepared statement) → aman dari SQLi
- Validasi input pakai zod; pesan error tidak membocorkan detail internal
- JWKS untuk verifikasi token di Gateway

Belum dikerjakan: register, verifikasi email, reset password, `/auth/me` belum
mengembalikan daftar menu sesuai role, dan Dockerfile.
