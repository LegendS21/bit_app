# Desain Database — Aplikasi Pendaftaran Beasiswa Pelatihan

Arsitektur: **database per service**. Tidak ada foreign key lintas database.
Relasi antar service disimpan sebagai *logical reference* (ID/kode disimpan, konsistensi dijaga di level aplikasi).

| Service | Database | Isi |
|---|---|---|
| RBAC | MySQL `db_rbac` | user, auth, role, menu, hak akses |
| Master | MySQL `db_master` | beasiswa, persyaratan, data referensi |
| Transaksi | MySQL `db_transaksi` | permohonan, verifikasi, wawancara, hasil |
| Dokumen | PostgreSQL `db_dokumen` | metadata file, log akses, token presigned |

---

## 0. Kontrak yang harus dikunci lebih dulu

### 0.1 Status permohonan (state machine)

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
                                           (final)       (final)
```

Aturan penting:
- Data hanya boleh diubah applicant saat status `DRAFT` atau `REVISI`.
- Di status lain permohonan **terkunci** (`is_locked = 1`).
- Setiap perpindahan status wajib dicatat di `permohonan_status_history`.

### 0.2 Payload JWT (dikeluarkan RBAC, diverifikasi Gateway)

```json
{
  "sub": "user-uuid",
  "email": "user@mail.com",
  "roles": ["APPLICANT"],
  "typ": "access",
  "iat": 1767225600,
  "exp": 1767226500
}
```
Algoritma RS256. Access token 15 menit. Refresh token di HttpOnly cookie, `SameSite=Strict`, disimpan **hash-nya** di DB.

### 0.3 Kode role

`ADMIN`, `VERIFIKATOR`, `LEMBAGA_SELEKSI`, `APPLICANT`

### 0.4 Format kode permohonan

`PRM-{YYYY}-{6 digit urut}` → `PRM-2026-000123`
Nomor urut per tahun, di-generate dari tabel `sequence_counter` dengan row lock (`SELECT ... FOR UPDATE`) supaya tidak bentrok saat request bersamaan.

---

## 1. Service RBAC — MySQL `db_rbac`

```sql
CREATE TABLE users (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid            CHAR(36) NOT NULL UNIQUE,
  nama            VARCHAR(150) NOT NULL,
  email           VARCHAR(150) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  no_hp           VARCHAR(20),
  tipe_user       ENUM('APPLICANT','INTERNAL') NOT NULL DEFAULT 'APPLICANT',
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  email_verified_at DATETIME NULL,
  last_login_at   DATETIME NULL,
  failed_attempt  INT NOT NULL DEFAULT 0,
  locked_until    DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME NULL,
  INDEX idx_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE roles (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode       VARCHAR(50) NOT NULL UNIQUE,   -- ADMIN, VERIFIKATOR, LEMBAGA_SELEKSI, APPLICANT
  nama       VARCHAR(100) NOT NULL,
  deskripsi  VARCHAR(255),
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE user_roles (
  user_id BIGINT UNSIGNED NOT NULL,
  role_id INT UNSIGNED NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE menus (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id  INT UNSIGNED NULL,
  kode       VARCHAR(80) NOT NULL UNIQUE,
  nama       VARCHAR(100) NOT NULL,
  path       VARCHAR(150),                  -- route frontend
  icon       VARCHAR(50),
  urutan     INT NOT NULL DEFAULT 0,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (parent_id) REFERENCES menus(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE role_menu_access (
  role_id    INT UNSIGNED NOT NULL,
  menu_id    INT UNSIGNED NOT NULL,
  can_view   TINYINT(1) NOT NULL DEFAULT 0,
  can_create TINYINT(1) NOT NULL DEFAULT 0,
  can_update TINYINT(1) NOT NULL DEFAULT 0,
  can_delete TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (role_id, menu_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE refresh_tokens (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64) NOT NULL UNIQUE,     -- SHA-256, JANGAN simpan token mentah
  expires_at  DATETIME NOT NULL,
  revoked_at  DATETIME NULL,
  replaced_by CHAR(64) NULL,                -- untuk rotasi token
  user_agent  VARCHAR(255),
  ip_address  VARCHAR(45),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_rt_user (user_id, revoked_at)
) ENGINE=InnoDB;

CREATE TABLE user_tokens (                  -- verifikasi email & reset password
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NOT NULL,
  tipe       ENUM('EMAIL_VERIFICATION','PASSWORD_RESET') NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at    DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE audit_log (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NULL,
  aksi        VARCHAR(80) NOT NULL,         -- LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, ...
  keterangan  VARCHAR(255),
  ip_address  VARCHAR(45),
  user_agent  VARCHAR(255),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user (user_id, created_at)
) ENGINE=InnoDB;
```

---

## 2. Service Master — MySQL `db_master`

```sql
CREATE TABLE beasiswa (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode          VARCHAR(50) NOT NULL UNIQUE,
  nama          VARCHAR(200) NOT NULL,
  deskripsi     TEXT,
  penyelenggara VARCHAR(150),
  kuota         INT NOT NULL DEFAULT 0,
  tgl_buka      DATE NOT NULL,
  tgl_tutup     DATE NOT NULL,
  status        ENUM('DRAFT','AKTIF','DITUTUP','ARSIP') NOT NULL DEFAULT 'DRAFT',
  created_by    BIGINT UNSIGNED,            -- logical ref ke db_rbac.users.id
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    DATETIME NULL,
  INDEX idx_beasiswa_status (status, tgl_buka, tgl_tutup)
) ENGINE=InnoDB;

CREATE TABLE persyaratan (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode           VARCHAR(50) NOT NULL UNIQUE,   -- KTP, KK, IJAZAH, SURAT_REKOMENDASI
  nama           VARCHAR(150) NOT NULL,
  deskripsi      TEXT,
  allowed_mime   VARCHAR(255) NOT NULL DEFAULT 'application/pdf,image/jpeg,image/png',
  max_size_kb    INT NOT NULL DEFAULT 2048,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE beasiswa_persyaratan (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  beasiswa_id    BIGINT UNSIGNED NOT NULL,
  persyaratan_id BIGINT UNSIGNED NOT NULL,
  is_wajib       TINYINT(1) NOT NULL DEFAULT 1,
  urutan         INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_bp (beasiswa_id, persyaratan_id),
  FOREIGN KEY (beasiswa_id) REFERENCES beasiswa(id) ON DELETE CASCADE,
  FOREIGN KEY (persyaratan_id) REFERENCES persyaratan(id)
) ENGINE=InnoDB;

CREATE TABLE ref_pendidikan (
  id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode   VARCHAR(20) NOT NULL UNIQUE,   -- SD, SMP, SMA, D3, S1, S2, S3
  nama   VARCHAR(50) NOT NULL,
  urutan INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE ref_pekerjaan (
  id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode VARCHAR(30) NOT NULL UNIQUE,
  nama VARCHAR(100) NOT NULL
) ENGINE=InnoDB;
```

---

## 3. Service Transaksi — MySQL `db_transaksi`

```sql
CREATE TABLE permohonan (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode_permohonan   VARCHAR(30) NOT NULL UNIQUE,      -- PRM-2026-000123
  user_id           BIGINT UNSIGNED NOT NULL,         -- logical ref db_rbac.users.id
  user_uuid         CHAR(36) NOT NULL,
  beasiswa_id       BIGINT UNSIGNED NOT NULL,         -- logical ref db_master.beasiswa.id
  beasiswa_nama     VARCHAR(200) NOT NULL,            -- snapshot, agar histori tidak berubah
  status            ENUM('DRAFT','DIAJUKAN','DALAM_VERIFIKASI','REVISI',
                         'DITOLAK_ADMIN','LULUS_ADMIN','DALAM_WAWANCARA',
                         'LULUS_WAWANCARA','TIDAK_LULUS_WAWANCARA',
                         'DITERIMA','TIDAK_DITERIMA') NOT NULL DEFAULT 'DRAFT',
  current_step      TINYINT NOT NULL DEFAULT 1,       -- 1..4 posisi wizard
  is_locked         TINYINT(1) NOT NULL DEFAULT 0,
  submitted_at      DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_beasiswa (user_id, beasiswa_id),  -- 1 user 1 permohonan per beasiswa
  INDEX idx_status (status, submitted_at)
) ENGINE=InnoDB;

-- Bagian 1 wizard: Data Diri & Kontak
CREATE TABLE permohonan_biodata (
  permohonan_id BIGINT UNSIGNED PRIMARY KEY,
  nik           CHAR(16) NOT NULL,
  nama_lengkap  VARCHAR(150) NOT NULL,
  tempat_lahir  VARCHAR(100),
  tgl_lahir     DATE NOT NULL,
  jenis_kelamin ENUM('L','P'),
  alamat        TEXT NOT NULL,
  no_hp         VARCHAR(20) NOT NULL,
  no_hp_alt     VARCHAR(20),
  email         VARCHAR(150) NOT NULL,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (permohonan_id) REFERENCES permohonan(id) ON DELETE CASCADE,
  INDEX idx_nik (nik)
) ENGINE=InnoDB;

-- Bagian 2 wizard: Latar Belakang Pendidikan & Pekerjaan
CREATE TABLE permohonan_pendidikan (
  permohonan_id      BIGINT UNSIGNED PRIMARY KEY,
  pendidikan_kode    VARCHAR(20) NOT NULL,       -- logical ref db_master.ref_pendidikan.kode
  instansi           VARCHAR(200) NOT NULL,
  jurusan            VARCHAR(150),
  tahun_lulus        YEAR,
  pekerjaan_kode     VARCHAR(30),
  nama_tempat_kerja  VARCHAR(200),
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (permohonan_id) REFERENCES permohonan(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Bagian 3 wizard: pointer ke file di Service Dokumen (file-nya TIDAK di sini)
CREATE TABLE permohonan_dokumen (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  permohonan_id     BIGINT UNSIGNED NOT NULL,
  persyaratan_id    BIGINT UNSIGNED NOT NULL,   -- logical ref db_master.persyaratan.id
  persyaratan_nama  VARCHAR(150) NOT NULL,      -- snapshot
  dokumen_uuid      CHAR(36) NOT NULL,          -- logical ref db_dokumen.dokumen.id
  nama_file_asli    VARCHAR(255) NOT NULL,
  ukuran_byte       BIGINT NOT NULL,
  status_verifikasi ENUM('BELUM_DIPERIKSA','SESUAI','TIDAK_SESUAI') NOT NULL DEFAULT 'BELUM_DIPERIKSA',
  catatan           TEXT,
  uploaded_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pd (permohonan_id, persyaratan_id),
  FOREIGN KEY (permohonan_id) REFERENCES permohonan(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Bagian 4 wizard: Lembar Persetujuan
CREATE TABLE permohonan_persetujuan (
  permohonan_id BIGINT UNSIGNED PRIMARY KEY,
  is_setuju     TINYINT(1) NOT NULL DEFAULT 0,
  disetujui_at  DATETIME NULL,
  ip_address    VARCHAR(45),
  FOREIGN KEY (permohonan_id) REFERENCES permohonan(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE verifikasi_administrasi (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  permohonan_id    BIGINT UNSIGNED NOT NULL,
  verifikator_id   BIGINT UNSIGNED NOT NULL,   -- logical ref db_rbac.users.id
  verifikator_nama VARCHAR(150) NOT NULL,      -- snapshot
  keputusan        ENUM('DISETUJUI','DITOLAK','REVISI') NOT NULL,
  catatan          TEXT,
  verified_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (permohonan_id) REFERENCES permohonan(id) ON DELETE CASCADE,
  INDEX idx_va_permohonan (permohonan_id, verified_at)
) ENGINE=InnoDB;   -- histori: 1 permohonan bisa punya banyak putaran verifikasi

CREATE TABLE verifikasi_checklist (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  verifikasi_id         BIGINT UNSIGNED NOT NULL,
  permohonan_dokumen_id BIGINT UNSIGNED NOT NULL,
  is_sesuai             TINYINT(1) NOT NULL,
  catatan               VARCHAR(500),
  FOREIGN KEY (verifikasi_id) REFERENCES verifikasi_administrasi(id) ON DELETE CASCADE,
  FOREIGN KEY (permohonan_dokumen_id) REFERENCES permohonan_dokumen(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE seleksi_wawancara (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  permohonan_id    BIGINT UNSIGNED NOT NULL,
  penilai_id       BIGINT UNSIGNED NOT NULL,   -- logical ref db_rbac.users.id
  penilai_nama     VARCHAR(150) NOT NULL,
  tgl_wawancara    DATE,
  nilai_total      DECIMAL(5,2),
  hasil            ENUM('LULUS','TIDAK_LULUS') NOT NULL,
  catatan          TEXT,
  submitted_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (permohonan_id) REFERENCES permohonan(id) ON DELETE CASCADE,
  INDEX idx_sw_permohonan (permohonan_id)
) ENGINE=InnoDB;

CREATE TABLE penilaian_detail (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  wawancara_id BIGINT UNSIGNED NOT NULL,
  aspek        VARCHAR(100) NOT NULL,
  skor         DECIMAL(5,2) NOT NULL,
  bobot        DECIMAL(5,2) NOT NULL DEFAULT 1,
  catatan      VARCHAR(255),
  FOREIGN KEY (wawancara_id) REFERENCES seleksi_wawancara(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE hasil_seleksi (
  permohonan_id  BIGINT UNSIGNED PRIMARY KEY,
  status_akhir   ENUM('DITERIMA','TIDAK_DITERIMA') NOT NULL,
  ditetapkan_oleh BIGINT UNSIGNED NOT NULL,
  ditetapkan_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  catatan        TEXT,
  FOREIGN KEY (permohonan_id) REFERENCES permohonan(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE permohonan_status_history (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  permohonan_id BIGINT UNSIGNED NOT NULL,
  status_dari   VARCHAR(30),
  status_ke     VARCHAR(30) NOT NULL,
  actor_id      BIGINT UNSIGNED,
  actor_role    VARCHAR(50),
  catatan       TEXT,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (permohonan_id) REFERENCES permohonan(id) ON DELETE CASCADE,
  INDEX idx_psh (permohonan_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE sequence_counter (
  nama       VARCHAR(50) NOT NULL,
  tahun      SMALLINT NOT NULL,
  last_value BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (nama, tahun)
) ENGINE=InnoDB;
```

---

## 4. Service Dokumen — PostgreSQL `db_dokumen`

```sql
CREATE TYPE scan_status_enum AS ENUM ('PENDING','CLEAN','INFECTED','ERROR');

CREATE TABLE dokumen (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_permohonan   VARCHAR(30) NOT NULL,
  owner_user_id     BIGINT NOT NULL,          -- logical ref db_rbac.users.id
  persyaratan_id    BIGINT NOT NULL,          -- logical ref db_master.persyaratan.id
  nama_file_asli    VARCHAR(255) NOT NULL,
  nama_file_simpan  VARCHAR(255) NOT NULL,    -- ktp_9b1deb4d-3b7d.pdf
  storage_path      TEXT NOT NULL,            -- /storage/PRM-2026-000123/ktp_9b1deb4d.pdf
  mime_type         VARCHAR(100) NOT NULL,    -- hasil deteksi magic bytes, BUKAN dari client
  mime_klaim_client VARCHAR(100),             -- untuk audit kalau ada usaha pemalsuan
  ukuran_byte       BIGINT NOT NULL,
  checksum_sha256   CHAR(64) NOT NULL,
  magic_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  scan_status       scan_status_enum NOT NULL DEFAULT 'PENDING',
  scan_engine       VARCHAR(50),              -- ClamAV + versi signature
  scanned_at        TIMESTAMPTZ,
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_dok_permohonan ON dokumen (kode_permohonan) WHERE deleted_at IS NULL;
CREATE INDEX idx_dok_owner      ON dokumen (owner_user_id);
CREATE UNIQUE INDEX uq_dok_checksum ON dokumen (kode_permohonan, checksum_sha256)
  WHERE deleted_at IS NULL;   -- cegah upload file identik berulang

CREATE TABLE dokumen_akses_log (
  id          BIGSERIAL PRIMARY KEY,
  dokumen_id  UUID NOT NULL REFERENCES dokumen(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL,
  user_role   VARCHAR(50),
  aksi        VARCHAR(20) NOT NULL,     -- VIEW, DOWNLOAD, UPLOAD, DELETE
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_log_dok ON dokumen_akses_log (dokumen_id, created_at DESC);

CREATE TABLE presigned_token (
  id         BIGSERIAL PRIMARY KEY,
  dokumen_id UUID NOT NULL REFERENCES dokumen(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  user_id    BIGINT NOT NULL,           -- token terikat ke 1 user saja
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pt_expiry ON presigned_token (expires_at);
```

---

## 5. Aturan lintas service

1. **Tidak ada FK antar database.** Kolom seperti `user_id`, `beasiswa_id`, `dokumen_uuid` hanya nilai; validasi dilakukan lewat API service pemilik data.
2. **Snapshot data yang harus abadi.** Nama beasiswa, nama verifikator, nama persyaratan disalin ke tabel transaksi. Kalau master diubah/dihapus, histori permohonan tetap benar.
3. **Soft delete di master.** Jangan hard-delete beasiswa/persyaratan yang sudah dipakai transaksi.
4. **File fisik hanya di Service Dokumen.** Service Transaksi cuma menyimpan `dokumen_uuid`. Akses file selalu lewat endpoint yang mengecek: apakah user ini pemilik permohonan, atau verifikator/lembaga seleksi/admin yang berwenang (proteksi IDOR).
5. **Validasi anti-IDOR.** Setiap query permohonan untuk role `APPLICANT` wajib difilter `WHERE user_id = :user_id_dari_token` — jangan pernah percaya ID dari URL.

---

## 6. Template prompt per service

Pakai potongan ini saat minta AI generate kodenya. Selalu sertakan bagian 0 (kontrak) + DDL service terkait.

### Prompt Service RBAC
```
Buatkan service RBAC (Node.js + Express + TypeScript, ORM Prisma, MySQL) untuk aplikasi
pendaftaran beasiswa pelatihan berarsitektur microservice.

Skema database: [tempel DDL bagian 1]

Endpoint yang dibutuhkan:
- POST /auth/register        : registrasi applicant + kirim email verifikasi
- POST /auth/verify-email
- POST /auth/login           : return access token (RS256, 15 menit) di body,
                               refresh token di HttpOnly + Secure + SameSite=Strict cookie
- POST /auth/refresh         : rotasi refresh token, token lama di-revoke
- POST /auth/logout
- GET  /auth/me              : profil + roles + menu yang boleh diakses
- CRUD /users, /roles, /menus, /role-menu-access  (khusus role ADMIN)

Ketentuan:
- Password di-hash pakai argon2id
- Refresh token disimpan sebagai SHA-256 hash, jangan pernah simpan token mentah
- JWT payload: [tempel bagian 0.2]
- Expose GET /.well-known/jwks.json agar API Gateway bisa verifikasi token secara lokal
- Semua query lewat Prisma (prepared statement), validasi input pakai zod
- Rate limit ketat di /auth/login (misal 5 percobaan per 15 menit per IP)
- Sertakan Dockerfile dan migration
```

### Prompt Service Transaksi
```
Buatkan service Transaksi (Node.js + Express + TypeScript, Prisma, MySQL).

Skema database: [tempel DDL bagian 3]
State machine status: [tempel bagian 0.1]

Endpoint:
- POST  /permohonan                       : buat draft (validasi 1 user 1 beasiswa)
- PUT   /permohonan/:id/step-1  (biodata)
- PUT   /permohonan/:id/step-2  (pendidikan & pekerjaan)
- POST  /permohonan/:id/step-3  (daftarkan dokumen_uuid hasil upload)
- PUT   /permohonan/:id/step-4  (persetujuan)
- POST  /permohonan/:id/submit            : DRAFT/REVISI -> DIAJUKAN, kunci data
- GET   /permohonan/saya                  : monitoring status untuk applicant
- GET   /permohonan                       : list untuk verifikator/admin (filter + pagination)
- POST  /permohonan/:id/verifikasi        : role VERIFIKATOR, keputusan DISETUJUI/DITOLAK/REVISI + checklist dokumen
- POST  /permohonan/:id/wawancara         : role LEMBAGA_SELEKSI, input penilaian + hasil
- POST  /permohonan/:id/hasil-akhir       : role ADMIN
- GET   /dashboard/statistik              : jumlah per status
- GET   /export/excel                     : peserta lulus wawancara

Ketentuan:
- Identitas user diambil dari header X-User-Id dan X-User-Roles yang di-inject API Gateway,
  JANGAN dari body request
- Setiap step disimpan terpisah (autosave per section), bukan sekali submit di akhir
- Tolak perubahan data kalau status bukan DRAFT atau REVISI (is_locked)
- Perpindahan status divalidasi terhadap state machine; transisi ilegal -> HTTP 409
- Setiap perubahan status dicatat ke permohonan_status_history dalam transaksi DB yang sama
- Filter anti-IDOR: role APPLICANT hanya boleh akses permohonan miliknya sendiri
- Generate kode_permohonan pakai sequence_counter dengan SELECT ... FOR UPDATE
```

### Prompt Service Dokumen
```
Buatkan service Dokumen (Node.js + Express + TypeScript, PostgreSQL) untuk upload
persyaratan beasiswa.

Skema database: [tempel DDL bagian 4]

Endpoint:
- POST /dokumen/upload            : multipart, field kode_permohonan + persyaratan_id
- GET  /dokumen/:uuid             : stream file setelah cek otorisasi
- POST /dokumen/:uuid/presigned   : buat URL sementara (expiry 5 menit, terikat user)
- GET  /dokumen/public/:token     : akses via presigned token
- DELETE /dokumen/:uuid           : soft delete, hanya pemilik & status masih DRAFT/REVISI

Ketentuan keamanan (WAJIB):
- Validasi magic bytes pakai file-type, JANGAN percaya ekstensi atau mimetype dari client
- Scan ClamAV (clamdscan) sebelum file dipindah ke storage final; INFECTED -> tolak & hapus
- Simpan di persistent volume /storage/{kode_permohonan}/, nama file di-rename jadi UUID
- Folder storage TIDAK boleh di-serve sebagai static directory
- Setiap akses file dicatat ke dokumen_akses_log
- Otorisasi: pemilik dokumen, atau role VERIFIKATOR/LEMBAGA_SELEKSI/ADMIN
- Batasi ukuran file dari konfigurasi persyaratan
- Sertakan Dockerfile (termasuk clamav) dan docker-compose volume mapping
```

### Prompt API Gateway
```
Buatkan API Gateway (Node.js + Express + http-proxy-middleware) untuk 4 microservice:
rbac-service:3001, master-service:3002, transaksi-service:3003, dokumen-service:3004.

Ketentuan:
- Satu-satunya container yang expose port ke publik; service lain di network internal Docker
- Verifikasi JWT RS256 secara lokal pakai JWKS dari rbac-service (cache 10 menit),
  jangan panggil RBAC di setiap request
- Setelah verifikasi, inject header X-User-Id, X-User-Uuid, X-User-Roles ke upstream,
  dan strip header tersebut kalau datang dari client (cegah spoofing)
- Whitelist route publik: /api/auth/login, /api/auth/register, /api/auth/refresh,
  /api/master/beasiswa (list beasiswa aktif)
- CORS: hanya origin frontend, credentials: true
- Rate limit global 100 request/menit per IP, lebih ketat di endpoint auth
- Helmet, request logging dengan correlation ID yang diteruskan ke upstream
- Body size limit, timeout upstream, dan circuit breaker sederhana
```

---

## 7. Checklist urutan pengerjaan

- [ ] Kunci kontrak: status, JWT payload, kode role, format response error
- [ ] 6 repo Git terpisah + docker-compose (network internal, hanya gateway expose port)
- [ ] Service RBAC: auth, JWKS, CRUD user/role/menu
- [ ] API Gateway: verifikasi token, proxy, CORS, rate limit
- [ ] Service Master: CRUD beasiswa & persyaratan
- [ ] Service Dokumen: upload, magic bytes, ClamAV, presigned URL, persistent volume
- [ ] Service Transaksi: wizard 4 tahap, verifikasi, wawancara, hasil, dashboard
- [ ] Frontend React TS: wizard bertahap, monitoring status, menu dinamis dari RBAC
- [ ] Hardening: uji IDOR tiap endpoint, uji upload file palsu, cek rate limit, cek CORS
