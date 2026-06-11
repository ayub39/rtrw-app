// ============================================================
//  KONFIGURASI APLIKASI, BACKEND, & DEFAULT
// ============================================================
//  MODE SaaS (multi-tenant): BACKEND = 'supabase'.
//  Login/daftar ditangani js/auth.js memakai Supabase Auth + RLS.
//  Tiap RT/RW = 1 organisasi (tenant). Warga daftar GRATIS via kode.
//
//  Nilai WILAYAH / SURAT / PENGURUS di bawah hanya DEFAULT/fallback;
//  saat login, konfigurasi asli diambil dari data organisasi di DB.
// ============================================================

window.APP_CONFIG = {
  APP_NAME: 'LaporPakRT',

  BACKEND: 'supabase', // 'local' | 'supabase'
  SUPABASE_URL: 'https://wxarcipfpqocpeonxyzj.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_zo56i9sY8NyVuvyNZKH6ow_pDj5PrB9',

  // Kode rahasia yang hanya diketahui SUPER ADMIN. Wajib dimasukkan saat
  // mendaftarkan RT/RW baru. GANTI nilainya & jangan dibagikan ke publik.
  ADMIN_REG_CODE: 'LPRT-ADMIN-2026',

  // Fallback pengurus (mode lokal saja; di SaaS pakai akun Supabase)
  PENGURUS: [
    { nama: 'Admin RW 05', nik: '3201000000000001', email: 'admin@rw05.id', pass: 'admin123', jabatan: 'Ketua RW' },
    { nama: 'Ketua RT 01', nik: '3201000000000002', email: 'rt01@rw05.id', pass: 'rt01pass', jabatan: 'Ketua RT 01' }
  ],

  // Identitas wilayah (default; ditimpa data organisasi saat login)
  WILAYAH: {
    nama: 'RW 05 / Kelurahan Sukamaju',
    kontakDarurat: '112',
    iuranBulanan: 25000
  },

  // Kop surat / penandatangan (default; ditimpa data organisasi saat login)
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
