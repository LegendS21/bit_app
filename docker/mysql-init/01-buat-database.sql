-- Dijalankan otomatis oleh image MySQL, HANYA sekali saat volume data masih
-- kosong. Kalau nanti perlu diubah, volumenya harus dihapus dulu
-- (`docker compose down -v`) supaya skrip ini dieksekusi ulang.
--
-- Variabel MYSQL_DATABASE di compose hanya sanggup membuat SATU database,
-- sementara RBAC, Master, dan Transaksi punya database sendiri-sendiri.

CREATE DATABASE IF NOT EXISTS `db_rbac`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `db_master`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `db_transaksi`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
