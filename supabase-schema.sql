-- ============================================================
--  SiWarga - Skema Database (Supabase / PostgreSQL)
--  Jalankan di Supabase Studio > SQL Editor
-- ============================================================

-- Aktifkan ekstensi UUID
create extension if not exists "pgcrypto";

-- Helper: kolom standar
-- Semua tabel punya: id (uuid), "createdAt" (timestamptz)

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
  "createdAt" timestamptz default now()
);

create table if not exists laporan (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  kategori text,
  deskripsi text,
  lokasi text,
  status text default 'Baru',
  pelapor text,
  "createdAt" timestamptz default now()
);

create table if not exists bantuan (
  id uuid primary key default gen_random_uuid(),
  jenis text,
  deskripsi text,
  urgensi text default 'Sedang',
  status text default 'Baru',
  pemohon text,
  "createdAt" timestamptz default now()
);

create table if not exists pengumuman (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  isi text,
  kategori text default 'Info',
  author text,
  pinned boolean default false,
  "createdAt" timestamptz default now()
);

create table if not exists surat (
  id uuid primary key default gen_random_uuid(),
  jenis text,
  keperluan text,
  status text default 'Menunggu',
  pemohon text,
  "createdAt" timestamptz default now()
);

create table if not exists iuran (
  id uuid primary key default gen_random_uuid(),
  "wargaNama" text,
  bulan text,
  jumlah numeric default 0,
  status text default 'Belum',
  metode text default '-',
  "createdAt" timestamptz default now()
);

create table if not exists kas (
  id uuid primary key default gen_random_uuid(),
  tipe text check (tipe in ('masuk','keluar')),
  keterangan text,
  jumlah numeric default 0,
  "createdAt" timestamptz default now()
);

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

create table if not exists kontak (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  peran text,
  telp text,
  kategori text default 'Lainnya',
  "createdAt" timestamptz default now()
);

create table if not exists polling (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  opsi jsonb default '[]',
  status text default 'Dibuka',
  author text,
  "createdAt" timestamptz default now()
);

-- ============================================================
--  Row Level Security (RLS)
--  CATATAN: kebijakan di bawah memperbolehkan akses publik via anon key
--  agar mode demo langsung jalan. Untuk produksi, ganti dengan
--  kebijakan berbasis auth (mis. hanya pengurus boleh menulis).
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['warga','laporan','bantuan','pengumuman','surat','iuran','kas','jadwal','kontak','polling']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "public_all" on %I;', t);
    execute format('create policy "public_all" on %I for all using (true) with check (true);', t);
  end loop;
end $$;
