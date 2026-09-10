'use strict';

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const { PETA_LAYANAN, jalurPublik } = require('../config/layanan.js');
const authentication = require('../middlewares/authentication.js');
const { loginLimiter, registerLimiter, refreshLimiter } = require('../middlewares/rateLimit.js');

const router = express.Router();

/** Health check gateway sendiri; tidak diteruskan ke mana pun. */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'bit_be_gateway', waktu: new Date().toISOString() });
});

/* ------------------------------------------------------------------ *
 * 1. Rate limit khusus, dipasang sebelum gerbang auth
 *
 * Login & refresh tidak butuh token, jadi limiter-nya harus lebih dulu —
 * kalau tidak, brute force login tidak pernah tersentuh.
 * ------------------------------------------------------------------ */
router.use('/api/auth/register', registerLimiter);
router.use('/api/auth/login', loginLimiter);
router.use('/api/auth/refresh', refreshLimiter);

/* ------------------------------------------------------------------ *
 * 2. Gerbang autentikasi
 *
 * Inilah inti tugas gateway: token diperiksa DI SINI, sebelum request
 * menyentuh service mana pun. Hanya jalur di daftar publik yang boleh
 * lewat tanpa token.
 * ------------------------------------------------------------------ */
router.use('/api', (req, res, next) => {
  if (jalurPublik(req.path)) return next();
  return authentication(req, res, next);
});

/* ------------------------------------------------------------------ *
 * 3. Penerusan ke service
 * ------------------------------------------------------------------ */
function buatProxy(segmen, target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    // Menambah X-Forwarded-For/Proto. Service dipasang `trust proxy = 1`,
    // jadi IP yang tercatat di audit log adalah IP asli pengguna.
    xfwd: true,
    // Unggahan berkas bisa besar dan lambat; jangan diputus di tengah jalan.
    proxyTimeout: 120000,
    timeout: 120000,

    // Express sudah memotong prefix mount (`/api/dokumen`), jadi `path` di
    // sini tinggal sisanya (`/upload`). Service tidak tahu-menahu soal
    // `/api`, maka segmennya dipasang kembali: `/dokumen/upload`.
    //
    // Satu jebakan: kalau tidak ada sisa jalur sama sekali, Express memberi
    // `'/'`, bukan string kosong. Ditempel apa adanya hasilnya `/users/`
    // dan `/beasiswa/?tahun=2026` — query string pun ikut terdorong ke
    // belakang garis miring. Karena itu jalur dan query dipisah dulu.
    pathRewrite: (path) => {
      const pisah = path.indexOf('?');
      const jalur = pisah === -1 ? path : path.slice(0, pisah);
      const query = pisah === -1 ? '' : path.slice(pisah);
      const sisa = jalur === '/' ? '' : jalur;
      return `/${segmen}${sisa}${query}`;
    },

    on: {
      proxyReq: (proxyReq, req) => {
        // Identitas hasil verifikasi diteruskan sebagai header, sesuai
        // kontrak di CLAUDE.md. Header ini sudah dibersihkan dari request
        // masuk di app.js, jadi nilainya dijamin berasal dari token yang
        // baru saja diverifikasi gateway — bukan kiriman client.
        if (req.user) {
          if (req.user.id !== null && req.user.id !== undefined) {
            proxyReq.setHeader('X-User-Id', String(req.user.id));
          }
          if (req.user.uuid) proxyReq.setHeader('X-User-Uuid', req.user.uuid);
          if (req.user.email) proxyReq.setHeader('X-User-Email', req.user.email);
          if (req.user.roles && req.user.roles.length) {
            proxyReq.setHeader('X-User-Roles', req.user.roles.join(','));
          }
        }
      },

      error: (err, req, res) => {
        console.error(`Gagal meneruskan ke ${segmen} (${target}):`, err.message);
        if (res.headersSent || typeof res.status !== 'function') {
          try { res.destroy(); } catch { /* koneksi sudah putus */ }
          return;
        }
        res.status(502).json({
          message: `Layanan ${segmen} sedang tidak dapat dihubungi`,
          code: 'UPSTREAM_UNAVAILABLE'
        });
      }
    }
  });
}

for (const [segmen, target] of Object.entries(PETA_LAYANAN)) {
  router.use(`/api/${segmen}`, buatProxy(segmen, target));
}

/* ------------------------------------------------------------------ *
 * 4. `/api` yang tidak dikenali
 *
 * Harus dijawab di sini. Kalau dibiarkan jatuh ke proxy frontend di
 * bawah, permintaan API yang salah alamat akan dibalas halaman HTML —
 * menyesatkan saat debugging.
 * ------------------------------------------------------------------ */
router.use('/api', (req, res) => {
  res.status(404).json({
    message: `Route ${req.method} ${req.originalUrl} tidak ditemukan`,
    code: 'NOT_FOUND'
  });
});

/* ------------------------------------------------------------------ *
 * 5. Sisanya: aplikasi React
 *
 * Frontend dan API dilayani dari origin yang sama, jadi tidak ada preflight
 * CORS sama sekali dan cookie refresh token tetap first-party. (SameSite
 * sendiri dinilai per-domain, bukan per-port — jadi bukan itu alasannya.)
 * ------------------------------------------------------------------ */
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

router.use(
  createProxyMiddleware({
    target: FRONTEND_URL,
    changeOrigin: true,
    on: {
      error: (err, req, res) => {
        console.error('Gagal meneruskan ke frontend:', err.message);
        if (res.headersSent || typeof res.status !== 'function') {
          try { res.destroy(); } catch { /* koneksi sudah putus */ }
          return;
        }
        res.status(502).send('Frontend sedang tidak dapat dihubungi');
      }
    }
  })
);

module.exports = router;
