-- ============================================================
--  LaporPakRT/RW — WEB PUSH: tabel langganan (push_sub)
-- ------------------------------------------------------------
--  Nyimpen Web Push subscription tiap user. Edge Function
--  'kirim-push' (service role) baca tabel ini buat ngirim push.
--  Idempotent. Jalankan SETELAH supabase-schema.sql.
-- ============================================================
create table if not exists push_sub (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisasi(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  "createdAt" timestamptz default now()
);
create index if not exists push_sub_org_idx on push_sub(org_id);
create index if not exists push_sub_user_idx on push_sub(user_id);

-- isi org_id + user_id otomatis dari user yang login (before insert)
create or replace function set_push_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is null then new.user_id := auth.uid(); end if;
  if new.org_id is null then new.org_id := current_org_id(); end if;
  return new;
end $$;
grant execute on function set_push_owner() to authenticated;

drop trigger if exists trg_set_push_owner on push_sub;
create trigger trg_set_push_owner before insert on push_sub for each row execute function set_push_owner();

alter table push_sub enable row level security;
drop policy if exists push_sel on push_sub;
drop policy if exists push_ins on push_sub;
drop policy if exists push_upd on push_sub;
drop policy if exists push_del on push_sub;
-- user kelola langganannya sendiri; pengurus boleh lihat se-organisasi
create policy push_sel on push_sub for select using (user_id = auth.uid() or (org_id = current_org_id() and is_pengurus()));
create policy push_ins on push_sub for insert with check (user_id = auth.uid());
create policy push_upd on push_sub for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_del on push_sub for delete using (user_id = auth.uid() or (org_id = current_org_id() and is_pengurus()));

notify pgrst, 'reload schema';
