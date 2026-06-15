-- ============================================================
--  LaporPakRT/RW — AUTO PUSH NOTIFICATION (semua event)
-- ------------------------------------------------------------
--  Otomatis kirim Web Push saat ada aktivitas baru:
--    SE-ORGANISASI (semua warga):
--      * PENGUMUMAN baru
--      * DARURAT (SOS) baru
--      * JADWAL baru (ronda/kegiatan)
--      * POLLING baru
--    KE PENGURUS saja (laporan masuk dari warga):
--      * LAPORAN baru
--      * BANTUAN baru
--      * SURAT (pengajuan) baru
--
--  Getar diatur oleh channel notifikasi Android; service worker
--  sudah menyertakan pola getar di tiap notifikasi.
--
--  Pakai pg_net (net.http_post) untuk memanggil Edge Function
--  kirim-push secara async (tidak memperlambat INSERT).
--
--  JALANKAN SETELAH: supabase-schema.sql, supabase-push.sql,
--  supabase-darurat.sql. Aman dijalankan ulang (idempotent).
--  Supabase > SQL Editor > New query > tempel > Run.
-- ============================================================

create extension if not exists pg_net;

-- Endpoint + key Edge Function kirim-push (ganti bila project beda)
-- dipakai oleh helper di bawah.

-- ------------------------------------------------------------
--  HELPER: kirim push ke SELURUH organisasi
-- ------------------------------------------------------------
create or replace function _push_org(p_org uuid, p_title text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_org is null then return; end if;
  perform net.http_post(
    url := 'https://wxarcipfpqocpeonxyzj.supabase.co/functions/v1/kirim-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_zo56i9sY8NyVuvyNZKH6ow_pDj5PrB9'
    ),
    body := jsonb_build_object('org_id', p_org, 'title', p_title, 'body', p_body, 'url', '/')
  );
end $$;

-- ------------------------------------------------------------
--  HELPER: kirim push hanya ke PENGURUS/owner organisasi
-- ------------------------------------------------------------
create or replace function _push_pengurus(p_org uuid, p_title text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if p_org is null then return; end if;
  for r in select id from profiles where org_id = p_org and role in ('owner','pengurus') loop
    perform net.http_post(
      url := 'https://wxarcipfpqocpeonxyzj.supabase.co/functions/v1/kirim-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer sb_publishable_zo56i9sY8NyVuvyNZKH6ow_pDj5PrB9'
      ),
      body := jsonb_build_object('user_id', r.id, 'title', p_title, 'body', p_body, 'url', '/')
    );
  end loop;
end $$;

-- ============================================================
--  SE-ORGANISASI
-- ============================================================

-- PENGUMUMAN baru
create or replace function notify_push_pengumuman()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform _push_org(new.org_id,
    '📢 ' || coalesce(new.judul, 'Pengumuman baru'),
    left(coalesce(new.isi, ''), 180));
  return new;
end $$;
drop trigger if exists trg_notify_push_pengumuman on pengumuman;
create trigger trg_notify_push_pengumuman
  after insert on pengumuman for each row execute function notify_push_pengumuman();

-- DARURAT (SOS) baru
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
  perform _push_org(new.org_id,
    '🚨 DARURAT: ' || label,
    coalesce(new.pengirim, 'Warga') || ' butuh bantuan'
      || coalesce(' di ' || nullif(coalesce(new.alamat, new.lokasi), ''), '')
      || coalesce('. ' || new.pesan, ''));
  return new;
end $$;
drop trigger if exists trg_notify_push_darurat on darurat;
create trigger trg_notify_push_darurat
  after insert on darurat for each row execute function notify_push_darurat();

-- JADWAL baru (ronda / kegiatan)
create or replace function notify_push_jadwal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform _push_org(new.org_id,
    '📅 ' || coalesce(new.judul, 'Jadwal baru'),
    trim(coalesce(nullif(new.tipe, '') || ' • ', '')
      || btrim(coalesce(new.tanggal::text, '') || ' ' || coalesce(new.waktu, ''))
      || coalesce(' di ' || nullif(new.lokasi, ''), '')));
  return new;
end $$;
drop trigger if exists trg_notify_push_jadwal on jadwal;
create trigger trg_notify_push_jadwal
  after insert on jadwal for each row execute function notify_push_jadwal();

-- POLLING baru
create or replace function notify_push_polling()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform _push_org(new.org_id,
    '🗳️ Polling baru',
    coalesce(new.judul, 'Ada polling baru') || ' — ayo ikut voting');
  return new;
end $$;
drop trigger if exists trg_notify_push_polling on polling;
create trigger trg_notify_push_polling
  after insert on polling for each row execute function notify_push_polling();

-- ============================================================
--  KE PENGURUS SAJA
-- ============================================================

-- LAPORAN baru
create or replace function notify_push_laporan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform _push_pengurus(new.org_id,
    '📝 Laporan baru',
    coalesce(new.pelapor, 'Warga') || ': ' || coalesce(new.judul, '(tanpa judul)')
      || coalesce(' [' || nullif(new.kategori, '') || ']', ''));
  return new;
end $$;
drop trigger if exists trg_notify_push_laporan on laporan;
create trigger trg_notify_push_laporan
  after insert on laporan for each row execute function notify_push_laporan();

-- BANTUAN baru
create or replace function notify_push_bantuan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform _push_pengurus(new.org_id,
    '🆘 Permintaan bantuan',
    coalesce(new.pemohon, 'Warga') || ': ' || coalesce(new.jenis, 'butuh bantuan')
      || coalesce(' (' || nullif(new.urgensi, '') || ')', ''));
  return new;
end $$;
drop trigger if exists trg_notify_push_bantuan on bantuan;
create trigger trg_notify_push_bantuan
  after insert on bantuan for each row execute function notify_push_bantuan();

-- SURAT (pengajuan) baru
create or replace function notify_push_surat()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform _push_pengurus(new.org_id,
    '📄 Pengajuan surat',
    coalesce(new.pemohon, 'Warga') || ': ' || coalesce(new.jenis, 'surat')
      || coalesce(' — ' || nullif(new.keperluan, ''), ''));
  return new;
end $$;
drop trigger if exists trg_notify_push_surat on surat;
create trigger trg_notify_push_surat
  after insert on surat for each row execute function notify_push_surat();

-- ------------------------------------------------------------
--  Catatan:
--  * Jika fungsi net.* belum dikenali, aktifkan pg_net dari
--    Dashboard > Database > Extensions > pg_net, lalu Run ulang.
--  * Laporan/bantuan/surat dikirim ke PENGURUS (role owner/pengurus).
--  * Pengumuman/darurat/jadwal/polling dikirim ke SEMUA anggota org.
--  * Getar mengikuti setelan channel notifikasi Android di tiap HP.
-- ------------------------------------------------------------
