/**
 * Data contoh untuk **landing page publik saja**.
 *
 * Seluruh halaman lain sudah memakai API sungguhan. Isi berkas ini tinggal
 * sampai service Master menyediakan endpoint katalog terbuka — `/beasiswa`
 * sekarang masih menuntut token, sedangkan landing dibuka tanpa login.
 */

export type StatusProgram = "dibuka" | "segera-ditutup" | "ditutup";

export type Program = {
  id: string;
  nama: string;
  deskripsi: string;
  batasPendaftaran: string;
  metode: string;
  kuota: number;
  status: StatusProgram;
  persyaratanKhusus: string[];
  dokumenWajib: string[];
};

export const PROGRAM: Program[] = [
  {
    id: "PRG-001",
    nama: "Pelatihan Web Developer Specialist",
    deskripsi:
      "Mempelajari pengembangan aplikasi web modern berbasis Fullstack dari tingkat dasar hingga profesional.",
    batasPendaftaran: "30 September 2026",
    metode: "Daring (Online)",
    kuota: 100,
    status: "dibuka",
    persyaratanKhusus: [
      "Warga Negara Indonesia (WNI), usia 18 - 35 tahun.",
      "Pendidikan minimal SMA/SMK sederajat (diutamakan Rekayasa Perangkat Lunak/Informatika).",
      "Memiliki laptop/komputer pribadi dengan RAM minimal 8GB.",
    ],
    dokumenWajib: [
      "Scan KTP & Kartu Keluarga",
      "Scan Ijazah Terakhir",
      "Surat Rekomendasi/Keterangan Bebas Kerja/Kuliah",
    ],
  },
  {
    id: "PRG-002",
    nama: "Pelatihan Data Analyst & SQL",
    deskripsi:
      "Pelajari analisis data, visualisasi, serta pengelolaan database relational untuk kebutuhan industri digital.",
    batasPendaftaran: "15 Oktober 2026",
    metode: "Hybrid (Bandung)",
    kuota: 50,
    status: "dibuka",
    persyaratanKhusus: [
      "Warga Negara Indonesia (WNI), usia 18 - 35 tahun.",
      "Pendidikan minimal D3 semua jurusan.",
      "Memahami dasar matematika dan statistika.",
    ],
    dokumenWajib: [
      "Scan KTP & Kartu Keluarga",
      "Scan Ijazah Terakhir",
      "Surat Rekomendasi/Keterangan",
    ],
  },
  {
    id: "PRG-003",
    nama: "UI/UX Design & Prototyping",
    deskripsi:
      "Menguasai riset pengguna, pembuatan wireframe, hingga rancangan prototipe aplikasi yang efisien.",
    batasPendaftaran: "10 September 2026",
    metode: "Daring (Online)",
    kuota: 75,
    status: "segera-ditutup",
    persyaratanKhusus: [
      "Warga Negara Indonesia (WNI), usia 18 - 35 tahun.",
      "Pendidikan minimal SMA/SMK sederajat.",
      "Memiliki portofolio desain menjadi nilai tambah.",
    ],
    dokumenWajib: [
      "Scan KTP & Kartu Keluarga",
      "Scan Ijazah Terakhir",
      "Surat Rekomendasi/Keterangan",
    ],
  },
];

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
