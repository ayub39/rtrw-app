-- ============================================================
--  LaporPakRT / LaporPakRW  -  MODE INSTANCE (lisensi per-klien)
--  Tambahan RPC untuk validasi & aktivasi lisensi instance.
--  Jalankan SETELAH supabase-schema.sql. Aman diulang (idempotent).
--
--  Model:
--   * SaaS    : banyak RT/RW dalam 1 backend, bayar langganan.
--   * Instance: 1 deployment khusus 1 klien, dikunci 'lisensiKey'.
--               Penjual menyetel mode='instance' + lisensiKey via
--               set_instance_lisensi(), lalu menaruh kunci itu di
--               js/config.js milik deployment klien tsb.
-- ============================================================

-- Validasi lisensi (dipanggil saat boot oleh js/instance.js, pakai anon key).
create or replace function cek_lisensi(p_key text)
returns table(
  id uuid, nama text, kode text, jenis text, mode text,
  status text, plan text, "langgananBerakhir" timestamptz,
  valid boolean, pesan text
) language plpgsql security definer set search_path = public as $$
declare org organisasi;
begin
  if p_key is null or length(trim(p_key)) = 0 then
    return query select null::uuid, null::text, null::text, null::text, null::text,
      null::text, null::text, null::timestamptz, false, 'Kunci lisensi kosong';
    return;
  end if;
  select * into org from organisasi
    where "lisensiKey" = p_key and mode = 'instance' limit 1;
  if org.id is null then
    return query select null::uuid, null::text, null::text, null::text, null::text,
      null::text, null::text, null::timestamptz, false, 'Lisensi tidak ditemukan';
    return;
  end if;
  if org.status in ('nonaktif','suspended') then
    return query select org.id, org.nama, org.kode, org.jenis, org.mode,
      org.status, org.plan, org."langgananBerakhir", false, 'Lisensi dinonaktifkan';
    return;
  end if;
  if org."langgananBerakhir" is not null and org."langgananBerakhir" < now() then
    return query select org.id, org.nama, org.kode, org.jenis, org.mode,
      org.status, org.plan, org."langgananBerakhir", false, 'Lisensi kadaluarsa';
    return;
  end if;
  return query select org.id, org.nama, org.kode, org.jenis, org.mode,
    org.status, org.plan, org."langgananBerakhir", true, 'OK';
end $$;

grant execute on function cek_lisensi(text) to anon, authenticated;

-- Aktifkan / setel lisensi instance utk sebuah organisasi (khusus admin platform).
-- Jika p_key kosong, sistem membuatkan kunci acak. Mengembalikan baris organisasi
-- (lihat kolom "lisensiKey" utk kunci yang dipakai di config klien).
create or replace function set_instance_lisensi(p_org_id uuid, p_key text default null, p_hari int default null)
returns organisasi language plpgsql security definer set search_path = public as $$
declare org organisasi; v_key text;
begin
  if not is_platform_admin() then raise exception 'Akses ditolak: khusus admin platform'; end if;
  v_key := nullif(trim(coalesce(p_key,'')), '');
  if v_key is null then
    v_key := 'LPRT-INST-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,16));
  end if;
  update organisasi
     set mode = 'instance',
         "lisensiKey" = v_key,
         status = 'aktif',
         "langgananBerakhir" = case when p_hari is not null then now() + (p_hari || ' days')::interval else "langgananBerakhir" end
   where id = p_org_id
   returning * into org;
  if org.id is null then raise exception 'Organisasi tidak ditemukan'; end if;
  return org;
end $$;

grant execute on function set_instance_lisensi(uuid, text, int) to authenticated;

-- Nonaktifkan lisensi (mis. klien berhenti / belum perpanjang) - admin platform.
create or replace function cabut_lisensi(p_org_id uuid)
returns organisasi language plpgsql security definer set search_path = public as $$
declare org organisasi;
begin
  if not is_platform_admin() then raise exception 'Akses ditolak: khusus admin platform'; end if;
  update organisasi set status = 'nonaktif' where id = p_org_id returning * into org;
  if org.id is null then raise exception 'Organisasi tidak ditemukan'; end if;
  return org;
end $$;

grant execute on function cabut_lisensi(uuid) to authenticated;
