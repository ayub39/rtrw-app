// ============================================================
//  KONFIGURASI BACKEND & AKSES
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
  BACKEND: 'local', // 'local' | 'supabase'
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-KEY',

  // Kode rahasia verifikasi pengurus. Hanya yang tahu kode ini bisa masuk
  // sebagai "Pengurus". GANTI dengan kode Anda sendiri & bagikan terbatas.
  // Kosongkan ('') untuk menonaktifkan verifikasi kode.
  PENGURUS_CODE: 'rw05-admin',

  // Identitas wilayah (boleh diubah pengurus)
  WILAYAH: {
    nama: 'RW 05 / Kelurahan Sukamaju',
    kontakDarurat: '112',
    iuranBulanan: 25000
  }
};
