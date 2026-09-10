require("dotenv").config();

const express = require("express");
const cors = require("cors");

const router = require("./routes/index.js");
const handleError = require("./middlewares/err.js");
const { globalLimiter } = require("./middlewares/rateLimit.js");
const { sequelize } = require("./models");

const app = express();
const port = process.env.PORT || 3002;

// Service ini berjalan di belakang API Gateway. Nilai 1 = percaya satu hop
// proxy saja, supaya rate limit membaca IP asli tanpa bisa dipalsukan lewat
// header X-Forwarded-For dari luar.
app.set("trust proxy", Number(process.env.TRUST_PROXY || 1));
app.disable("x-powered-by");

const originDiizinkan = (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

const modeDev = process.env.NODE_ENV !== "production";
// Vite kadang pindah port sendiri kalau 5173 sedang dipakai. Di development
// semua origin localhost diterima supaya tidak terlihat seperti "server mati" —
// browser melaporkan blokir CORS sebagai network error biasa. Di produksi
// hanya CORS_ORIGIN yang berlaku.
const LOCALHOST = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(cors({
    origin(origin, callback) {
        // origin undefined = request non-browser (curl/Postman/health check).
        if (!origin || originDiizinkan.includes(origin)) return callback(null, true);
        if (modeDev && LOCALHOST.test(origin)) return callback(null, true);
        callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Batas 1mb: service ini tidak menerima upload — dokumen ditangani
// service Dokumen.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(globalLimiter);

app.use(router);
app.use(handleError);

async function mulai() {
    try {
        await sequelize.authenticate();
        console.log("🗄️  Koneksi database OK");
    } catch (error) {
        console.error("❌ Gagal terhubung ke database:", error.message);
        process.exit(1);
    }

    app.listen(port, () => {
        console.log(`🚀 Server running at http://localhost:${port}`);
        console.log(`📋 Health check: http://localhost:${port}/health`);
    });
}

mulai();

module.exports = app;
