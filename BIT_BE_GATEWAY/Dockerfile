# syntax=docker/dockerfile:1

# Versi dikunci (bukan :latest) supaya build hari ini dan build bulan depan
# menghasilkan image yang sama. 24 = jalur LTS, sesuai Node di mesin dev.
FROM node:24-alpine

RUN apk add --no-cache tini

WORKDIR /app

# package*.json disalin lebih dulu, terpisah dari kode. Selama daftar
# dependensi tidak berubah, Docker memakai ulang layer `npm ci` dari cache
# sehingga build ulang setelah edit kode hanya butuh beberapa detik.
COPY package*.json ./

# `npm ci` (bukan `npm install`) memasang persis versi di package-lock.json.
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# Jangan jalan sebagai root: kalau ada celah RCE, penyerang hanya dapat hak
# user biasa di dalam container. Ini penting justru karena gateway adalah
# satu-satunya container yang terbuka ke luar.
RUN chown -R node:node /app
USER node

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# tini jadi PID 1 supaya `docker compose down` diteruskan ke Node sebagai
# SIGTERM — tanpa ini container butuh 10 detik sebelum dimatikan paksa.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "app.js"]
