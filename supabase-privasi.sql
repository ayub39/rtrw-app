-- ============================================================
--  LaporPakRT/RW — PRIVASI: surat (pengajuan) & bantuan (medis)
-- ------------------------------------------------------------
--  Hanya PEMBUAT baris (pemohon) + PENGURUS/OWNER yang bisa
--  melihat & mengubah. Warga lain TIDAK bisa melihat baris
--  milik warga lain.
--
--  Cara pakai: Supabase > SQL Editor > New query > tempel
--  semua > Run. Aman dijalankan ulang (idempotent).
--  Jalankan SETELAH supabase-schema.sql.
-- ============================================================

-- 1) Kolom pemilik baris
alter table surat   add column if not exists created_by uuid references auth.users(id);
alter table bantuan add column if not exists created_by uuid references auth.users(id);

-- 2) Isi otomatis created_by = user yang login (before insert)
--    Frontend tetap kirim data tanpa created_by; trigger yang isi.
create or replace function set_created_by()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end $$;
grant execute on function set_created_by() to authenticated;

-- 3) Pasang trigger + ganti policy permisif jadi policy privat
do $$
declare t text;
begin
  foreach t in array array['surat','bantuan']
  loop
    execute format('drop trigger if exists trg_set_created_by on %I;', t);
    execute format('create trigger trg_set_created_by before insert on %I for each row execute function set_created_by();', t);

    execute format('alter table %I enable row level security;', t);
    -- hapus policy lama (permisif & varian sebelumnya)
    execute format('drop policy if exists "public_all" on %I;', t);
    execute format('drop policy if exists "%1$s_org" on %1$s;', t);
    execute format('drop policy if exists "%1$s_sel" on %1$s;', t);
    execute format('drop policy if exists "%1$s_ins" on %1$s;', t);
    execute format('drop policy if exists "%1$s_upd" on %1$s;', t);
    execute format('drop policy if exists "%1$s_del" on %1$s;', t);

    -- SELECT: pengurus lihat semua; warga hanya miliknya
    execute format($f$create policy "%1$s_sel" on %1$s for select using (org_id = current_org_id() and (is_pengurus() or created_by = auth.uid()));$f$, t);
    -- INSERT: anggota org boleh menambah utk org-nya
    execute format($f$create policy "%1$s_ins" on %1$s for insert with check (org_id = current_org_id());$f$, t);
    -- UPDATE: pemilik atau pengurus
    execute format($f$create policy "%1$s_upd" on %1$s for update using (org_id = current_org_id() and (is_pengurus() or created_by = auth.uid())) with check (org_id = current_org_id());$f$, t);
    -- DELETE: pemilik atau pengurus
    execute format($f$create policy "%1$s_del" on %1$s for delete using (org_id = current_org_id() and (is_pengurus() or created_by = auth.uid()));$f$, t);
  end loop;
end $$;

-- Catatan: baris LAMA yang dibuat sebelum migrasi punya created_by = NULL,
-- jadi hanya pengurus yang bisa melihatnya (warga tidak). Ini wajar demi privasi.

-- Segarkan cache schema PostgREST
notify pgrst, 'reload schema';
