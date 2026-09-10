require("dotenv").config();

const express = require("express");
const cors = require("cors");

const router = require("./routes/index.js");
const handleError = require("./middlewares/err.js");
const { globalLimiter } = require("./middlewares/rateLimit.js");
const { PETA_LAYANAN } = require("./config/layanan.js");

const app = express();
const port = process.env.PORT || 3000;

// Gateway adalah container terluar. Nilai 1 = percaya satu hop proxy saja
// (mis. nginx/ingress di depannya), supaya X-Forwarded-For tidak bisa
// dipalsukan dari luar untuk mengelabui rate limit.
app.set("trust proxy", Number(process.env.TRUST_PROXY || 1));
app.disable("x-powered-by");

/* ------------------------------------------------------------------ *
 * PENTING: gateway sengaja TIDAK memakai express.json().
 *
 * Body request tidak boleh dibaca di sini. Begitu stream-nya habis
 * terbaca, unggahan multipart ke service Dokumen akan menggantung dan
 * request POST biasa akan terkirim dengan body kosong. Gateway hanya
 * meneruskan byte apa adanya.
 * ------------------------------------------------------------------ */

/**
 * Buang header identitas yang datang dari luar.
 *
 * Tanpa ini, siapa pun bisa mengirim `X-User-Id: 1` dan menyamar jadi admin,
 * karena service di belakang mempercayai header dari gateway. Nilainya baru
 * dipasang ulang setelah token benar-benar diverifikasi.
 */
app.use((req, res, next) => {
  delete req.headers["x-user-id"];
  delete req.headers["x-user-uuid"];
  delete req.headers["x-user-email"];
  delete req.headers["x-user-roles"];
  next();
});

// CORS dibatasi ke domain frontend saja, sesuai petunjuk. Dalam susunan
// normal FE dilayani dari origin yang sama sehingga tidak ada preflight
// sama sekali; ini berlaku saat FE dijalankan `npm run dev` di :5173.
const originDiizinkan = (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

const modeDev = process.env.NODE_ENV !== "production";
const LOCALHOST = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(cors({
    origin(origin, callback) {
        if (!origin || originDiizinkan.includes(origin)) return callback(null, true);
        if (modeDev && LOCALHOST.test(origin)) return callback(null, true);
        callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(globalLimiter);
app.use(router);
app.use(handleError);

app.listen(port, () => {
    console.log(`🚪 API Gateway berjalan di http://localhost:${port}`);
    console.log(`📋 Health check: http://localhost:${port}/health`);
    console.log("🔀 Peta rute:");
    for (const [segmen, target] of Object.entries(PETA_LAYANAN)) {
        console.log(`   /api/${segmen}`.padEnd(24) + `→ ${target}/${segmen}`);
    }
    console.log(`   (sisanya)`.padEnd(24) + `→ ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
});

module.exports = app;
