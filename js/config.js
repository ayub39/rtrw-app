// ============================================================
//  KONFIGURASI APLIKASI, BACKEND, & DAFTAR PENGURUS
// ============================================================
//  Default: penyimpanan LOKAL (localStorage) -> langsung jalan tanpa setup.
//
//  Mengaktifkan backend beneran (Supabase) - data jadi online & bersama:
//   1. Buat project gratis di https://supabase.com
//   2. Buka SQL Editor, jalankan isi file `supabase-schema.sql`
//   3. Settings > API: salin Project URL + anon public key ke bawah
//   4. Ubah BACKEND menjadi 'supabase'
// ============================================================

window.APP_CONFIG = {
  // Nama aplikasi. Ganti ke 'LaporPakRW' kalau dipakai untuk tingkat RW,
  // atau biarkan 'LaporPakRT' untuk tingkat RT. Bebas disesuaikan kebutuhan.
  APP_NAME: 'LaporPakRT',

  BACKEND: 'local', // 'local' | 'supabase'
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-KEY',

  // ----------------------------------------------------------
  //  DAFTAR PENGURUS / RT / RW  (INPUT MANUAL OLEH ADMIN)
  // ----------------------------------------------------------
  //  Warga mendaftar sendiri lewat aplikasi (NIK + email + password),
  //  lalu login memakai email + password.
  //
  //  Pengurus TIDAK bisa daftar sendiri - akun pengurus diinput manual
  //  di sini (mode lokal) ATAU di tabel `pengurus` pada Supabase (mode
  //  online). Pengurus login memakai email + password di bawah ini.
  //
  //  Tambahkan tiap pengurus sebagai satu objek:
  //    { nama, nik (16 digit), email, pass (password login), jabatan }
  PENGURUS: [
    { nama: 'Admin RW 05', nik: '3201000000000001', email: 'admin@rw05.id', pass: 'admin123', jabatan: 'Ketua RW' },
    { nama: 'Ketua RT 01', nik: '3201000000000002', email: 'rt01@rw05.id', pass: 'rt01pass', jabatan: 'Ketua RT 01' }
  ],

  // Identitas wilayah (boleh diubah pengurus)
  WILAYAH: {
    nama: 'RW 05 / Kelurahan Sukamaju',
    kontakDarurat: '112',
    iuranBulanan: 25000
  },

  // ----------------------------------------------------------
  //  KOP SURAT, CAP/STEMPEL, & PENANDATANGAN (untuk PDF surat)
  // ----------------------------------------------------------
  //  Semua bagian di bawah ini dipakai saat membuat PDF surat dan
  //  BEBAS DIGANTI kapan saja sesuai data RT/RW Anda.
  //  - Isi alamat, kelurahan, kecamatan, kota sesuai wilayah.
  //  - logoUrl  : URL gambar logo (mis. logo kelurahan). Kosongkan ('')
  //               kalau belum punya -> kop tetap tampil tanpa logo.
  //  - capUrl   : URL gambar cap/stempel (PNG transparan). Kosongkan
  //               ('') kalau belum punya -> disediakan ruang stempel.
  //  - KETUA_RT / KETUA_RW : nama & jabatan penandatangan. Dipakai
  //               untuk blok tanda tangan + "Mengetahui".
  //  - DUA_TANDA_TANGAN : true = tampilkan TTD Ketua RT + Mengetahui
  //               Ketua RW; false = cukup satu penandatangan.
  SURAT: {
    KOP: {
      badan: 'PEMERINTAH KOTA SUKAMAJU',
      namaLembaga: 'RUKUN WARGA 05 (RW 05)',
      kelurahan: 'Kelurahan Sukamaju',
      kecamatan: 'Kecamatan Sukamaju',
      kabkota: 'Kota Sukamaju',
      alamat: 'Jl. Mawar No. 1, Sukamaju',
      kontak: 'Kode Pos 40123 • Telp. 0000-0000-0000',
      logoUrl: '',
      capUrl: ''
    },
    KETUA_RT: { nama: 'Ketua RT 01', jabatan: 'Ketua RT 01' },
    KETUA_RW: { nama: 'Admin RW 05', jabatan: 'Ketua RW 05' },
    DUA_TANDA_TANGAN: true
  }
};
