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
# --omit=dev membuang devDependencies; sequelize-cli tetap ikut karena ia
# terdaftar di dependencies dan dipakai untuk migrasi saat container start.
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# chmod +x wajib: repo ini dikerjakan dari Windows yang tidak menyimpan bit
# executable, jadi tanpa baris ini entrypoint ditolak "permission denied".
RUN chmod +x /app/docker-entrypoint.sh && chown -R node:node /app

# Jangan jalan sebagai root: kalau ada celah RCE, penyerang hanya dapat hak
# user biasa di dalam container.
USER node

ENV NODE_ENV=production
EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3002)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--", "/app/docker-entrypoint.sh"]
CMD ["node", "app.js"]
