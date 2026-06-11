-- ============================================================
--  LaporPakRT / LaporPakRW  -  SKEMA MULTI-TENANT (SaaS + Instance)
--  Supabase Auth + Row Level Security (RLS)
-- ------------------------------------------------------------
--  Model:
--   * organisasi = 1 RT/RW pelanggan (tenant). HANYA org yang bayar.
--   * profiles   = identitas tiap user login (1:1 dgn auth.users),
--                  menempel ke 1 organisasi + punya role.
--   * Warga daftar GRATIS & gabung ke org lewat "kode".
--   * Semua tabel data punya org_id; RLS mengunci akses per-org
--     berdasar user yang LOGIN (bukan filter frontend) -> aman.
--
--  Cara pakai:
--   1. Supabase > SQL Editor > New query > tempel semua > Run.
--   2. Aman dijalankan ulang (idempotent).
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
--  ORGANISASI  (tenant / pelanggan RT-RW)
-- ============================================================
create table if not exists organisasi (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kode text unique not null,                 -- kode unik utk warga bergabung
  jenis text default 'RW',                   -- 'RT' | 'RW'
  -- konfigurasi kop surat (per-org, diatur dari menu Pengaturan)
  "kopBadan" text,
  "kopLembaga" text,
  "kopKelurahan" text,
  "kopKecamatan" text,
  "kopKabkota" text,
  "kopAlamat" text,
  "kopKontak" text,
  "logoUrl" text,
  "capUrl" text,
  "ketuaRtNama" text,
  "ketuaRtJabatan" text,
  "ketuaRwNama" text,
  "ketuaRwJabatan" text,
  "duaTandaTangan" boolean default true,
  -- langganan / lisensi
  mode text default 'saas',                  -- 'saas' | 'instance'
  status text default 'pending',             -- 'pending'|'trial'|'aktif'|'nonaktif'|'suspended'
  plan text default 'basic',
  "trialBerakhir" timestamptz,
  "langgananBerakhir" timestamptz,
  "lisensiKey" text,                         -- utk versi instance (sekali bayar)
  "ownerId" uuid,
  "createdAt" timestamptz default now()
);
create index if not exists organisasi_kode_idx on organisasi(kode);

-- ============================================================
--  PROFILES  (1:1 dgn auth.users)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references organisasi(id) on delete cascade,
  nama text,
  role text default 'warga',                 -- 'owner'|'pengurus'|'warga'
  jabatan text,
  nik text,
  telp text,
  "createdAt" timestamptz default now()
);
create index if not exists profiles_org_idx on profiles(org_id);

-- ============================================================
--  TABEL DATA (semua punya org_id)
-- ============================================================
create table if not exists warga (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisasi(id) on delete cascade,
  nama text not null,
  nik text, kk text, alamat text, rt text, rw text, telp text,
  status text default 'Tetap',
  "jmlAnggota" int default 1,
  ttl text, kelamin text, pekerjaan text, agama text,
  "statusKawin" text, kewarganegaraan text,
  "createdAt" timestamptz default now()
);

create table if not exists laporan (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisasi(id) on delete cascade,
  judul text not null, kategori text, deskripsi text, lokasi text,
  status text default 'Baru', pelapor text, "pemohonNik" text,
  catatan jsonb default '[]'::jsonb,
  "createdAt" timestamptz default now()
);

create table if not exists bantuan (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisasi(id) on delete cascade,
  jenis text, deskripsi text, urgensi text default 'Sedang',
  status text default 'Baru', pemohon text, "pemohonNik" text,
  catatan jsonb default '[]'::jsonb,
  "createdAt" timestamptz default now()
);

create table if not exists pengumuman (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisasi(id) on delete cascade,
  judul text not null, isi text, kategori text default 'Info',
  author text, pinned boolean default false,
  "createdAt" timestamptz default now()
);

create table if not exists surat (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisasi(id) on delete cascade,
  jenis text, keperluan text, status text default 'Menunggu',
  pemohon text, "pemohonNik" text, "pemohonEmail" text,
  catatan jsonb default '[]'::jsonb,
  nomor text, "approverNama" text, "approverJabatan" text,
  "createdAt" timestamptz default now()
);

create table if not exists iuran (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisasi(id) on delete cascade,
  "wargaNama" text, bulan text, jumlah numeric default 0,
  status text default 'Belum', metode text default '-',
  "createdAt" timestamptz default now()
);

create table if not exists kas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisasi(id) on delete cascade,
  tipe text check (tipe in ('masuk','keluar')), keterangan text,
  jumlah numeric default 0,
  "createdAt" timestamptz default now()
);

create table if not exists jadwal (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisasi(id) on delete cascade,
  judul text not null, tipe text, tanggal date, waktu text,
  lokasi text, petugas text,
  "createdAt" timestamptz default now()
);

create table if not exists kontak (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisasi(id) on delete cascade,
  nama text not null, peran text, telp text,
  kategori text default 'Lainnya',
  "createdAt" timestamptz default now()
);

create table if not exists polling (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisasi(id) on delete cascade,
  judul text not null, opsi jsonb default '[]'::jsonb,
  status text default 'Dibuka', author text,
  "createdAt" timestamptz default now()
);

-- Upgrade aman: tambahkan org_id bila tabel sudah ada dari skema lama
alter table warga      add column if not exists org_id uuid references organisasi(id) on delete cascade;
alter table laporan    add column if not exists org_id uuid references organisasi(id) on delete cascade;
alter table bantuan    add column if not exists org_id uuid references organisasi(id) on delete cascade;
alter table pengumuman add column if not exists org_id uuid references organisasi(id) on delete cascade;
alter table surat      add column if not exists org_id uuid references organisasi(id) on delete cascade;
alter table iuran      add column if not exists org_id uuid references organisasi(id) on delete cascade;
alter table kas        add column if not exists org_id uuid references organisasi(id) on delete cascade;
alter table jadwal     add column if not exists org_id uuid references organisasi(id) on delete cascade;
alter table kontak     add column if not exists org_id uuid references organisasi(id) on delete cascade;
alter table polling    add column if not exists org_id uuid references organisasi(id) on delete cascade;

-- ============================================================
--  HELPER FUNCTIONS
-- ============================================================
-- org_id milik user yang sedang login
create or replace function current_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select org_id from profiles where id = auth.uid()
$$;

-- apakah user yang login berperan pengurus/owner
create or replace function is_pengurus()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and role in ('owner','pengurus'))
$$;

-- ============================================================
--  RPC: pendaftaran organisasi (RT/RW) + warga bergabung
--  Dipanggil frontend lewat /rest/v1/rpc/<nama_fungsi>
-- ============================================================
-- RT/RW daftar -> bikin organisasi (status 'pending', trial 14 hari),
-- user jadi 'owner'. Kamu aktifkan manual: ubah status -> 'aktif'.
create or replace function buat_organisasi(p_nama text, p_jenis text, p_kode text, p_nama_pengguna text)
returns organisasi language plpgsql security definer set search_path = public as $$
declare org organisasi;
begin
  if auth.uid() is null then raise exception 'Harus login dulu'; end if;
  if exists(select 1 from organisasi where kode = p_kode) then
    raise exception 'Kode % sudah dipakai, pilih yang lain', p_kode;
  end if;
  insert into organisasi(nama, jenis, kode, "ownerId", status, "trialBerakhir")
    values (p_nama, coalesce(p_jenis,'RW'), p_kode, auth.uid(), 'trial', now() + interval '14 days')
    returning * into org;
  insert into profiles(id, org_id, nama, role)
    values (auth.uid(), org.id, p_nama_pengguna, 'owner')
    on conflict (id) do update set org_id = excluded.org_id, role = 'owner', nama = excluded.nama;
  return org;
end $$;

-- Warga gabung ke organisasi yang sudah ada via kode
create or replace function gabung_organisasi(p_kode text, p_nama text)
returns organisasi language plpgsql security definer set search_path = public as $$
declare org organisasi;
begin
  if auth.uid() is null then raise exception 'Harus login dulu'; end if;
  select * into org from organisasi where kode = p_kode;
  if org.id is null then raise exception 'Kode RT/RW tidak ditemukan'; end if;
  insert into profiles(id, org_id, nama, role)
    values (auth.uid(), org.id, p_nama, 'warga')
    on conflict (id) do update set org_id = excluded.org_id, nama = excluded.nama;
  return org;
end $$;

grant execute on function buat_organisasi(text,text,text,text) to authenticated;
grant execute on function gabung_organisasi(text,text) to authenticated;
grant execute on function current_org_id() to authenticated;
grant execute on function is_pengurus() to authenticated;

-- ============================================================
--  AUTO org_id  (trigger before insert)
-- ------------------------------------------------------------
--  Frontend (app.js) cukup kirim data tanpa org_id; trigger ini
--  mengisi org_id = current_org_id() milik user yang login.
--  Aman dgn RLS: nilai org_id dipastikan = org user, bukan dari klien.
-- ============================================================
create or replace function set_org_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.org_id is null then
    new.org_id := current_org_id();
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['warga','laporan','bantuan','pengumuman','surat','iuran','kas','jadwal','kontak','polling']
  loop
    execute format('drop trigger if exists trg_set_org_id on %I;', t);
    execute format('create trigger trg_set_org_id before insert on %I for each row execute function set_org_id();', t);
  end loop;
end $$;

-- ============================================================
--  RLS POLICIES
-- ============================================================
alter table organisasi enable row level security;
alter table profiles   enable row level security;

-- organisasi: anggota boleh lihat org-nya; pengurus boleh ubah
drop policy if exists org_select on organisasi;
drop policy if exists org_update on organisasi;
create policy org_select on organisasi for select using (id = current_org_id());
create policy org_update on organisasi for update using (id = current_org_id() and is_pengurus()) with check (id = current_org_id());

-- profiles: lihat profil se-organisasi; user kelola profil sendiri
drop policy if exists prof_select on profiles;
drop policy if exists prof_update on profiles;
drop policy if exists prof_insert on profiles;
create policy prof_select on profiles for select using (org_id = current_org_id() or id = auth.uid());
create policy prof_update on profiles for update using (id = auth.uid() or is_pengurus());
create policy prof_insert on profiles for insert with check (id = auth.uid());

-- tabel data: kunci penuh per-organisasi (anggota org boleh CRUD baris org-nya)
do $$
declare t text;
begin
  foreach t in array array['warga','laporan','bantuan','pengumuman','surat','iuran','kas','jadwal','kontak','polling']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "public_all" on %I;', t);
    execute format('drop policy if exists "%1$s_org" on %1$s;', t);
    execute format($f$create policy "%1$s_org" on %1$s for all using (org_id = current_org_id()) with check (org_id = current_org_id());$f$, t);
  end loop;
end $$;
