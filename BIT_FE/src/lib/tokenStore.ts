/**
 * Penyimpan access token — sengaja hanya di memori, bukan localStorage.
 *
 * Access token yang ditaruh di localStorage bisa dibaca skrip apa pun yang
 * berhasil disuntikkan ke halaman (XSS). Karena umurnya cuma 15 menit dan
 * sesi dipulihkan lewat cookie refresh yang HttpOnly, tidak ada alasan
 * menuliskannya ke storage yang bisa dibaca JavaScript.
 *
 * Konsekuensinya: refresh halaman menghapus token dari memori, lalu
 * `muatSesi()` menerbitkannya lagi dari cookie refresh.
 */

let accessToken: string | null = null;

/** Dipanggil api.ts saat sesi tidak bisa dipulihkan lagi (refresh gagal). */
let onSesiHabis: (() => void) | null = null;

export function ambilToken() {
  return accessToken;
}

export function simpanToken(token: string | null) {
  accessToken = token;
}

export function daftarkanSesiHabis(handler: () => void) {
  onSesiHabis = handler;
}

export function picuSesiHabis() {
  accessToken = null;
  onSesiHabis?.();
}
