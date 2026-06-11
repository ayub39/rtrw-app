-- ============================================================
--  LaporPakRT/RW — MIGRASI FITUR DARURAT (SOS)
-- ------------------------------------------------------------
--  Tabel darurat: peringatan darurat (maling, kebakaran,
--  medis, bencana) yang di-broadcast ke seluruh anggota org.
--  Siapa pun anggota boleh memicu (warga & pengurus).
--  Menyertakan otomatis nama, alamat & telp pelapor.
--
--  JALANKAN SETELAH supabase-schema.sql (butuh current_org_id(),
--  is_pengurus(), set_org_id()). Aman dijalankan ulang.
--  Supabase > SQL Editor > New query > tempel > Run.
-- ============================================================

create table if not exists darurat (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisasi(id) on delete cascade,
  tipe text not null,            -- 'maling'|'kebakaran'|'medis'|'bencana'|'lainnya'
  pengirim text,
  "pengirimId" uuid,
  telp text,
  alamat text,
  lokasi text,
  pesan text,
  status text default 'aktif',   -- 'aktif'|'selesai'
  "createdAt" timestamptz default now()
);
create index if not exists darurat_org_idx on darurat(org_id);
create index if not exists darurat_status_idx on darurat(status);

-- jaga-jaga utk tabel yang sudah terlanjur dibuat tanpa kolom ini
alter table darurat add column if not exists telp text;
alter table darurat add column if not exists alamat text;

-- auto org_id
drop trigger if exists trg_set_org_id on darurat;
create trigger trg_set_org_id before insert on darurat for each row execute function set_org_id();

-- RLS: semua anggota org boleh lihat & memicu; ubah/hapus oleh pengurus atau pemicu
alter table darurat enable row level security;
drop policy if exists darurat_select on darurat;
drop policy if exists darurat_insert on darurat;
drop policy if exists darurat_update on darurat;
drop policy if exists darurat_delete on darurat;
create policy darurat_select on darurat for select
  using (org_id = current_org_id());
create policy darurat_insert on darurat for insert
  with check (org_id = current_org_id());
create policy darurat_update on darurat for update
  using (org_id = current_org_id() and (is_pengurus() or "pengirimId" = auth.uid()))
  with check (org_id = current_org_id());
create policy darurat_delete on darurat for delete
  using (org_id = current_org_id() and (is_pengurus() or "pengirimId" = auth.uid()));

grant select, insert, update, delete on darurat to authenticated;

-- Jika tabel baru belum dikenali PostgREST, jalankan:
--   notify pgrst, 'reload schema';
