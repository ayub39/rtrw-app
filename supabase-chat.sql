-- ============================================================
--  LaporPakRT/RW — MIGRASI FITUR CHAT
-- ------------------------------------------------------------
--  Tambahan tabel utk:
--   1) ronda_chat : diskusi/koordinasi per jadwal (ronda dll),
--                   terlihat oleh semua anggota organisasi.
--   2) chat_rt    : chat langsung & privat warga <-> pengurus,
--                   1 thread per warga (dikunci RLS).
--
--  JALANKAN SETELAH supabase-schema.sql (butuh fungsi
--  current_org_id(), is_pengurus(), set_org_id()).
--  Aman dijalankan ulang (idempotent).
--  Supabase > SQL Editor > New query > tempel semua > Run.
-- ============================================================

-- ---------- 1) DISKUSI RONDA / JADWAL ----------
create table if not exists ronda_chat (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisasi(id) on delete cascade,
  "jadwalId" uuid references jadwal(id) on delete cascade,
  pengirim text,
  "pengirimId" uuid,
  role text,
  pesan text not null,
  "createdAt" timestamptz default now()
);
create index if not exists ronda_chat_jadwal_idx on ronda_chat("jadwalId");
create index if not exists ronda_chat_org_idx on ronda_chat(org_id);

-- ---------- 2) CHAT WARGA <-> PENGURUS ----------
create table if not exists chat_rt (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisasi(id) on delete cascade,
  "wargaId" uuid,            -- pemilik thread = id profil warga (auth.uid)
  "wargaNama" text,
  pengirim text,
  "pengirimId" uuid,
  dari text,                 -- 'warga' | 'pengurus'
  pesan text not null,
  "createdAt" timestamptz default now()
);
create index if not exists chat_rt_warga_idx on chat_rt("wargaId");
create index if not exists chat_rt_org_idx on chat_rt(org_id);

-- ---------- AUTO org_id (pakai fungsi yg sudah ada) ----------
drop trigger if exists trg_set_org_id on ronda_chat;
create trigger trg_set_org_id before insert on ronda_chat for each row execute function set_org_id();
drop trigger if exists trg_set_org_id on chat_rt;
create trigger trg_set_org_id before insert on chat_rt for each row execute function set_org_id();

-- ---------- RLS: ronda_chat (grup, semua anggota org) ----------
alter table ronda_chat enable row level security;
drop policy if exists ronda_chat_select on ronda_chat;
drop policy if exists ronda_chat_insert on ronda_chat;
drop policy if exists ronda_chat_delete on ronda_chat;
create policy ronda_chat_select on ronda_chat for select
  using (org_id = current_org_id());
create policy ronda_chat_insert on ronda_chat for insert
  with check (org_id = current_org_id());
create policy ronda_chat_delete on ronda_chat for delete
  using (org_id = current_org_id() and (is_pengurus() or "pengirimId" = auth.uid()));

-- ---------- RLS: chat_rt (privat: warga lihat thread sendiri; pengurus lihat semua) ----------
alter table chat_rt enable row level security;
drop policy if exists chat_rt_select on chat_rt;
drop policy if exists chat_rt_insert on chat_rt;
drop policy if exists chat_rt_delete on chat_rt;
create policy chat_rt_select on chat_rt for select
  using (org_id = current_org_id() and ("wargaId" = auth.uid() or is_pengurus()));
create policy chat_rt_insert on chat_rt for insert
  with check (org_id = current_org_id() and (is_pengurus() or "wargaId" = auth.uid()));
create policy chat_rt_delete on chat_rt for delete
  using (org_id = current_org_id() and (is_pengurus() or "pengirimId" = auth.uid()));

-- ---------- GRANT (idempotent, aman) ----------
grant select, insert, update, delete on ronda_chat to authenticated;
grant select, insert, update, delete on chat_rt to authenticated;

-- selesai. Jika PostgREST belum mengenali tabel baru, jalankan:
--   notify pgrst, 'reload schema';
