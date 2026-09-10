#!/bin/sh
set -e

# `depends_on` di compose hanya menunggu container database HIDUP, bukan
# menunggu databasenya SIAP menerima koneksi. Selisih beberapa detik itu cukup
# untuk membuat service mati saat start. Karena itu migrasi diulang sampai
# database benar-benar menjawab, bukan langsung menyerah di percobaan pertama.
if [ "${JALANKAN_MIGRASI:-true}" = "true" ]; then
  echo "⏳ Menjalankan migrasi database..."
  percobaan=0
  until npx --no-install sequelize-cli db:migrate; do
    percobaan=$((percobaan + 1))
    if [ "$percobaan" -ge 30 ]; then
      echo "❌ Migrasi tetap gagal setelah $percobaan percobaan. Container berhenti."
      exit 1
    fi
    echo "   Database belum siap, mengulang dalam 2 detik ($percobaan/30)..."
    sleep 2
  done
  echo "✅ Migrasi selesai."
fi

# `exec` supaya Node menggantikan shell ini sebagai proses utama. Tanpa ini,
# SIGTERM dari `docker compose down` berhenti di shell dan tidak pernah sampai
# ke Node, sehingga container selalu dimatikan paksa setelah timeout.
exec "$@"
