// ============================================================
//  TEMPLATE CONFIG - DEPLOYMENT MODE INSTANCE (Opsi B)
// ------------------------------------------------------------
//  Salin file ini menjadi js/config.js pada deployment milik 1 klien.
//  Tiap klien punya project Supabase SENDIRI -> ganti SUPABASE_URL,
//  SUPABASE_ANON_KEY, dan LISENSI_KEY sesuai backend & lisensi klien.
//  Lihat INSTANCE-SETUP.md untuk langkah lengkap.
// ============================================================

window.APP_CONFIG = {
  APP_NAME: 'LaporPakRT',

  BACKEND: 'supabase',
  // >>> GANTI: URL & anon key project Supabase KHUSUS klien ini <<<
  SUPABASE_URL: 'https://XXXXXXXXXXXX.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_GANTI_DENGAN_ANON_KEY_KLIEN',

  // Kode admin tetap dipakai internal; di mode instance opsi Admin
  // disembunyikan dari layar login.
  ADMIN_REG_CODE: 'LPRT-ADMIN-2026',

  // ----------------------------------------------------------
  //  MODE INSTANCE (dikunci ke 1 organisasi via lisensi)
  // ----------------------------------------------------------
  MODE: 'instance',

  INSTANCE: {
    // >>> GANTI: kunci dari hasil seed_instance(...) di backend klien <<<
    LISENSI_KEY: 'LPRT-INST-XXXXXXXXXXXXXXXX',
    ORG_KODE: 'RW07MLT',                       // (opsional) kode org klien
    CONTACT: 'mailto:ayubsobhe@gmail.com'       // kontak utk aktivasi/perpanjang
  },

  // >>> GANTI: VAPID PUBLIC key project Supabase klien (push per-project) <<<
  VAPID_PUBLIC_KEY: 'GANTI_DENGAN_VAPID_PUBLIC_KEY_KLIEN',

  PENGURUS: [],

  WILAYAH: {
    nama: 'RW 07 / Kelurahan Melati',
    kontakDarurat: '112',
    iuranBulanan: 25000
  },

  SURAT: {
    KOP: {
      badan: 'PEMERINTAH KOTA ...',
      namaLembaga: 'RUKUN WARGA 07 (RW 07)',
      kelurahan: 'Kelurahan Melati',
      kecamatan: 'Kecamatan ...',
      kabkota: 'Kota ...',
      alamat: 'Alamat sekretariat RW',
      kontak: 'Kode Pos ..... • Telp. ....',
      logoUrl: '',
      capUrl: ''
    },
    KETUA_RT: { nama: 'Ketua RT', jabatan: 'Ketua RT' },
    KETUA_RW: { nama: 'Ketua RW 07', jabatan: 'Ketua RW 07' },
    DUA_TANDA_TANGAN: true
  }
};
