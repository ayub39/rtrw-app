-- ============================================================
--  LaporPakRT/RW — AUTO PUSH NOTIFICATION
-- ------------------------------------------------------------
--  Otomatis kirim Web Push ke seluruh anggota organisasi saat:
--    * ada PENGUMUMAN baru
--    * ada DARURAT (SOS) baru
--  Pakai pg_net (net.http_post) untuk memanggil Edge Function
--  kirim-push secara async (tidak memperlambat INSERT).
--
--  JALANKAN SETELAH: supabase-schema.sql, supabase-push.sql,
--  dan supabase-darurat.sql. Aman dijalankan ulang (idempotent).
--  Supabase > SQL Editor > New query > tempel > Run.
-- ============================================================

-- pg_net: memungkinkan database melakukan HTTP request
create extension if not exists pg_net;

-- ------------------------------------------------------------
--  PENGUMUMAN baru -> push ke se-organisasi
-- ------------------------------------------------------------
create or replace function notify_push_pengumuman()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://wxarcipfpqocpeonxyzj.supabase.co/functions/v1/kirim-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_zo56i9sY8NyVuvyNZKH6ow_pDj5PrB9'
    ),
    body := jsonb_build_object(
      'org_id', new.org_id,
      'title', '📢 ' || coalesce(new.judul, 'Pengumuman baru'),
      'body', left(coalesce(new.isi, ''), 180),
      'url', '/'
    )
  );
  return new;
end $$;

drop trigger if exists trg_notify_push_pengumuman on pengumuman;
create trigger trg_notify_push_pengumuman
  after insert on pengumuman
  for each row execute function notify_push_pengumuman();

-- ------------------------------------------------------------
--  DARURAT (SOS) baru -> push ke se-organisasi
-- ------------------------------------------------------------
create or replace function notify_push_darurat()
returns trigger language plpgsql security definer set search_path = public as $$
declare label text;
begin
  label := case new.tipe
    when 'maling'    then 'Maling'
    when 'kebakaran' then 'Kebakaran'
    when 'medis'     then 'Medis'
    when 'bencana'   then 'Bencana'
    else 'Darurat'
  end;
  perform net.http_post(
    url := 'https://wxarcipfpqocpeonxyzj.supabase.co/functions/v1/kirim-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_zo56i9sY8NyVuvyNZKH6ow_pDj5PrB9'
    ),
    body := jsonb_build_object(
      'org_id', new.org_id,
      'title', '🚨 DARURAT: ' || label,
      'body', coalesce(new.pengirim, 'Warga') || ' butuh bantuan'
              || coalesce(' di ' || nullif(coalesce(new.alamat, new.lokasi), ''), '')
              || coalesce('. ' || new.pesan, ''),
      'url', '/'
    )
  );
  return new;
end $$;

drop trigger if exists trg_notify_push_darurat on darurat;
create trigger trg_notify_push_darurat
  after insert on darurat
  for each row execute function notify_push_darurat();

-- ------------------------------------------------------------
--  Catatan:
--  * Jika fungsi net.* belum dikenali, aktifkan pg_net dari
--    Dashboard > Database > Extensions > pg_net, lalu Run ulang.
--  * Trigger ini server-side: walau frontend hanya INSERT data,
--    push tetap terkirim otomatis ke semua langganan org.
-- ------------------------------------------------------------
