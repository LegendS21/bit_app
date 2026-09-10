/**
 * Teks statis landing page publik.
 *
 * Daftar programnya **tidak lagi di sini** — landing memanggil
 * `GET /beasiswa/publik` di service Master (lihat `features/beasiswa`).
 *
 * Yang tersisa di berkas ini sengaja tetap statis: keduanya penjelasan umum
 * tentang cara mendaftar, bukan data yang dikelola admin lewat aplikasi.
 * `SYARAT_BERKAS` adalah gambaran umum berkas yang lazim diminta; daftar
 * dokumen yang mengikat untuk sebuah program diambil dari master persyaratan
 * dan ditampilkan pada dialog detail tiap program.
 */

export const SYARAT_BERKAS = [
  {
    nama: "Kartu Tanda Penduduk (KTP)",
    keterangan: "Identitas resmi yang mencantumkan NIK yang valid.",
    icon: "id",
  },
  {
    nama: "Kartu Keluarga (KK)",
    keterangan: "Dokumen verifikasi data domisili dan keluarga.",
    icon: "family",
  },
  {
    nama: "Ijazah Terakhir",
    keterangan: "Ijazah pendidikan formal sesuai kualifikasi program.",
    icon: "diploma",
  },
  {
    nama: "Surat Rekomendasi / Keterangan",
    keterangan: "Surat keterangan kerja atau rekomendasi dari instansi/sekolah.",
    icon: "letter",
  },
] as const;

export const ALUR_PENDAFTARAN = [
  {
    judul: "Registrasi Akun",
    isi: "Buat akun menggunakan NIK & email aktif untuk menerima kredensial login.",
  },
  {
    judul: "Pengisian Formulir (4 Tahap)",
    isi: "Lengkapi data diri, pendidikan/pekerjaan, unggah berkas, dan pernyataan keabsahan.",
  },
  {
    judul: "Seleksi Administrasi & Wawancara",
    isi: "Pantau status seleksi secara realtime melalui dashboard akun Anda.",
  },
  {
    judul: "Pengumuman Kelulusan",
    isi: "Peserta yang lulus seleksi wawancara berhak mengikuti pelatihan.",
  },
];
