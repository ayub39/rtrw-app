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
  }
};
