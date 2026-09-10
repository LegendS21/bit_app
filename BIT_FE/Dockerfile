# syntax=docker/dockerfile:1

# ---------- Tahap 1: build ----------
# Tahap ini punya Node, TypeScript, dan seluruh devDependencies. Semuanya
# dibuang di tahap 2 — yang dikirim ke server hanya HTML/CSS/JS hasil build,
# sehingga image akhir tinggal puluhan MB, bukan ratusan.
FROM node:24-alpine AS build

WORKDIR /app

# Vite memanggang nilai VITE_* ke dalam bundel saat BUILD, bukan saat container
# jalan — mengubah environment container setelah image jadi tidak berpengaruh.
#
# Karena itu nilainya dibiarkan RELATIF (`/api`): bundel tidak terikat ke host
# mana pun, dan image yang sama bisa dipakai di laptop maupun di server tanpa
# build ulang. Yang memilah tujuan tiap request adalah API Gateway.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./

# Tanpa --omit=dev: vite dan typescript ada di devDependencies dan justru
# dibutuhkan untuk menjalankan `npm run build`.
RUN npm ci

COPY . .

# Menjalankan `tsc -b && vite build` sesuai script di package.json. Kalau ada
# error TypeScript, build image gagal di sini — itu memang disengaja, supaya
# kode yang tidak lolos type-check tidak pernah sampai ke server.
RUN npm run build

# ---------- Tahap 2: sajikan ----------
FROM nginx:1.29-alpine AS runtime

# Config bawaan diganti total oleh milik kita, yang paham routing React.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Hanya folder dist yang ikut. Kode sumber, node_modules, dan seluruh
# toolchain build ditinggal di tahap 1.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
