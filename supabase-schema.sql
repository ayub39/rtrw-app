-- ============================================================
--  LaporPakRT / LaporPakRW - Skema Database (Supabase / PostgreSQL)
--  Cara pakai:
--    1. Buka project Supabase kamu > menu "SQL Editor"
--    2. Klik "New query", tempel SELURUH isi file ini
--    3. Klik "Run". Aman dijalankan ulang (idempotent).
--  Setelah ini, isi SUPABASE_URL + SUPABASE_ANON_KEY di js/config.js
--  dan set BACKEND: 'supabase'.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
--  WARGA  (termasuk akun warga yang daftar mandiri: email + pass)
-- ------------------------------------------------------------
create table if not exists warga (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  nik text,
  kk text,
  alamat text,
  rt text,
  rw text,
  telp text,
  status text default 'Tetap',
  "jmlAnggota" int default 1,
  -- akun login warga (registrasi mandiri)
  email text,
  pass text,
  -- data diri untuk keperluan cetak surat
  ttl text,
  kelamin text,
  pekerjaan text,
  agama text,
  "statusKawin" text,
  kewarganegaraan text,
  "createdAt" timestamptz default now()
);

-- ------------------------------------------------------------
--  PENGURUS  (akun RT/RW; bisa juga tetap dikelola lewat config.js)
-- ------------------------------------------------------------
create table if not exists pengurus (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  nik text,
  email text,
  pass text,
  jabatan text,
  "createdAt" timestamptz default now()
);

-- ------------------------------------------------------------
--  LAPORAN
-- ------------------------------------------------------------
create table if not exists laporan (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  kategori text,
  deskripsi text,
  lokasi text,
  status text default 'Baru',
  pelapor text,
  "pemohonNik" text,
  catatan jsonb default '[]'::jsonb,
  "createdAt" timestamptz default now()
);

-- ------------------------------------------------------------
--  BANTUAN
-- ------------------------------------------------------------
create table if not exists bantuan (
  id uuid primary key default gen_random_uuid(),
  jenis text,
  deskripsi text,
  urgensi text default 'Sedang',
  status text default 'Baru',
  pemohon text,
  "pemohonNik" text,
  catatan jsonb default '[]'::jsonb,
  "createdAt" timestamptz default now()
);

-- ------------------------------------------------------------
--  PENGUMUMAN
-- ------------------------------------------------------------
create table if not exists pengumuman (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  isi text,
  kategori text default 'Info',
  author text,
  pinned boolean default false,
  "createdAt" timestamptz default now()
);

-- ------------------------------------------------------------
--  SURAT  (layanan surat-menyurat + chat review + nomor + approver)
-- ------------------------------------------------------------
create table if not exists surat (
  id uuid primary key default gen_random_uuid(),
  jenis text,
  keperluan text,
  status text default 'Menunggu',
  pemohon text,
  "pemohonNik" text,
  "pemohonEmail" text,
  catatan jsonb default '[]'::jsonb,
  nomor text,
  "approverNama" text,
  "approverJabatan" text,
  "createdAt" timestamptz default now()
);

-- ------------------------------------------------------------
--  IURAN
-- ------------------------------------------------------------
create table if not exists iuran (
  id uuid primary key default gen_random_uuid(),
  "wargaNama" text,
  bulan text,
  jumlah numeric default 0,
  status text default 'Belum',
  metode text default '-',
  "createdAt" timestamptz default now()
);

-- ------------------------------------------------------------
--  KAS
-- ------------------------------------------------------------
create table if not exists kas (
  id uuid primary key default gen_random_uuid(),
  tipe text check (tipe in ('masuk','keluar')),
  keterangan text,
  jumlah numeric default 0,
  "createdAt" timestamptz default now()
);

-- ------------------------------------------------------------
--  JADWAL
-- ------------------------------------------------------------
create table if not exists jadwal (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  tipe text,
  tanggal date,
  waktu text,
  lokasi text,
  petugas text,
  "createdAt" timestamptz default now()
);

-- ------------------------------------------------------------
--  KONTAK
-- ------------------------------------------------------------
create table if not exists kontak (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  peran text,
  telp text,
  kategori text default 'Lainnya',
  "createdAt" timestamptz default now()
);

-- ------------------------------------------------------------
--  POLLING
-- ------------------------------------------------------------
create table if not exists polling (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  opsi jsonb default '[]'::jsonb,
  status text default 'Dibuka',
  author text,
  "createdAt" timestamptz default now()
);

-- ============================================================
--  UPGRADE AMAN: tambahkan kolom baru bila tabel sudah ada
--  (berguna kalau kamu pernah menjalankan skema versi lama)
-- ============================================================
alter table warga   add column if not exists email text;
alter table warga   add column if not exists pass text;
alter table warga   add column if not exists ttl text;
alter table warga   add column if not exists kelamin text;
alter table warga   add column if not exists pekerjaan text;
alter table warga   add column if not exists agama text;
alter table warga   add column if not exists "statusKawin" text;
alter table warga   add column if not exists kewarganegaraan text;

alter table laporan add column if not exists "pemohonNik" text;
alter table laporan add column if not exists catatan jsonb default '[]'::jsonb;

alter table bantuan add column if not exists "pemohonNik" text;
alter table bantuan add column if not exists catatan jsonb default '[]'::jsonb;

alter table surat   add column if not exists "pemohonNik" text;
alter table surat   add column if not exists "pemohonEmail" text;
alter table surat   add column if not exists catatan jsonb default '[]'::jsonb;
alter table surat   add column if not exists nomor text;
alter table surat   add column if not exists "approverNama" text;
alter table surat   add column if not exists "approverJabatan" text;

-- ============================================================
--  Row Level Security (RLS)
--  CATATAN: kebijakan di bawah mengizinkan akses publik via anon key
--  supaya app langsung jalan. Untuk produksi sebaiknya diganti
--  dengan kebijakan berbasis auth (mis. hanya pengurus boleh menulis).
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['warga','pengurus','laporan','bantuan','pengumuman','surat','iuran','kas','jadwal','kontak','polling']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "public_all" on %I;', t);
    execute format('create policy "public_all" on %I for all using (true) with check (true);', t);
  end loop;
end $$;
