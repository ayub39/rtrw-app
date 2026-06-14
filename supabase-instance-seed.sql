-- ============================================================
--  LaporPakRT/RW  -  SEEDER MODE INSTANCE (Opsi B: backend sendiri)
-- ------------------------------------------------------------
--  Dipakai SEKALI per backend Supabase milik klien, dijalankan di
--  SQL Editor (sebagai superuser). Fungsi-fungsi ini SENGAJA tidak
--  di-grant ke 'authenticated'/'anon' -> hanya bisa dari SQL Editor.
--
--  Jalankan SETELAH semua SQL lain (schema, privasi, push, darurat,
--  auto-push, instance). Lihat INSTANCE-SETUP.md untuk urutannya.
-- ============================================================

-- 1) Buat (atau aktifkan) 1 organisasi dalam mode instance + lisensi.
--    Jika p_lisensi kosong -> dibuatkan kunci acak.
--    Contoh:
--      select * from seed_instance('RW 07 Melati','RW','RW07MLT', null, 365);
--    Lihat kolom "lisensiKey" pada hasilnya -> tempel ke config klien.
create or replace function seed_instance(
  p_nama text, p_jenis text, p_kode text,
  p_lisensi text default null, p_hari int default null
) returns organisasi language plpgsql security definer set search_path = public as $$
declare org organisasi; v_key text;
begin
  v_key := nullif(trim(coalesce(p_lisensi,'')), '');
  if v_key is null then
    v_key := 'LPRT-INST-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,16));
  end if;
  insert into organisasi(nama, jenis, kode, mode, status, "lisensiKey", "langgananBerakhir")
    values (p_nama, coalesce(p_jenis,'RW'), p_kode, 'instance', 'aktif', v_key,
            case when p_hari is not null then now() + (p_hari || ' days')::interval else null end)
  on conflict (kode) do update
    set nama = excluded.nama,
        jenis = excluded.jenis,
        mode = 'instance',
        status = 'aktif',
        "lisensiKey" = excluded."lisensiKey",
        "langgananBerakhir" = excluded."langgananBerakhir"
  returning * into org;
  return org;
end $$;

-- 2) Tautkan akun pengurus (owner) ke organisasi.
--    Akun auth-nya HARUS sudah ada (sign up via app, atau
--    Supabase Dashboard > Authentication > Add user).
--    Contoh:
--      select * from tautkan_pengurus('ketua@rw07.id','RW07MLT','Pak Ketua RW 07');
create or replace function tautkan_pengurus(p_email text, p_kode text, p_nama text default null)
returns profiles language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_org uuid; prof profiles;
begin
  select id into v_uid from auth.users where lower(email) = lower(p_email) limit 1;
  if v_uid is null then
    raise exception 'Akun email % belum ada. Buat dulu (sign up di app / Supabase Auth).', p_email;
  end if;
  select id into v_org from organisasi where kode = p_kode;
  if v_org is null then raise exception 'Organisasi kode % tidak ditemukan', p_kode; end if;
  insert into profiles(id, org_id, nama, role)
    values (v_uid, v_org, coalesce(nullif(trim(coalesce(p_nama,'')),''), split_part(p_email,'@',1)), 'owner')
  on conflict (id) do update set org_id = excluded.org_id, role = 'owner', nama = excluded.nama
  returning * into prof;
  return prof;
end $$;

-- (Fungsi ini sengaja TIDAK di-grant ke authenticated/anon.)
