// ============================================================
//  KONFIGURASI BACKEND
// ============================================================
//  Secara default aplikasi pakai penyimpanan LOKAL (localStorage)
//  sehingga langsung bisa dipakai & diuji tanpa setup apa pun.
//
//  Untuk mengaktifkan backend beneran (Supabase):
//   1. Buat project gratis di https://supabase.com
//   2. Jalankan SQL di file `supabase-schema.sql` lewat SQL Editor
//   3. Isi URL + anon key di bawah, lalu ubah BACKEND ke 'supabase'
// ============================================================

window.APP_CONFIG = {
  BACKEND: 'local', // 'local' | 'supabase'
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-KEY',

  // Identitas wilayah (boleh diubah pengurus)
  WILAYAH: {
    nama: 'RW 05 / Kelurahan Sukamaju',
    kontakDarurat: '112',
    iuranBulanan: 25000
  }
};
