# Panduan Deploy Mode Instance (Opsi B — backend terpisah)

Mode **instance** = 1 salinan aplikasi khusus untuk **1 klien**, dengan
project **Supabase milik klien sendiri** (data benar-benar terpisah dari
backend SaaS-mu). Kode aplikasinya **sama** dengan versi SaaS — yang membedakan
hanya isi `js/config.js`.

> Untuk versi SaaS (banyak RT/RW dalam 1 backend), lihat skema utama
> `supabase-schema.sql`. Mode diatur lewat `MODE` di `js/config.js`
> (`'saas'` atau `'instance'`).

---

## Ringkasan alur

1. Buat project Supabase baru untuk klien.
2. Jalankan semua SQL (urutan di bawah).
3. Seed 1 organisasi instance + lisensi.
4. Buat akun pengurus & tautkan sebagai owner.
5. (Opsional) Setup Web Push per-project.
6. Salin `config.instance.example.js` → `js/config.js`, isi nilai klien.
7. Deploy ke hosting klien.

---

## 1. Buat project Supabase klien

- Buka https://supabase.com/dashboard → **New project**.
- Catat **Project URL** dan **anon/publishable key**
  (Settings → API). Ini dipakai di `config.js`.

## 2. Jalankan SQL (SQL Editor → New query)

Jalankan **berurutan**, satu per satu:

1. `supabase-schema.sql`
2. `supabase-privasi.sql`
3. `supabase-push.sql`
4. `supabase-darurat.sql`
5. `supabase-auto-push.sql`
6. `supabase-instance.sql`
7. `supabase-instance-seed.sql`

> Di `supabase-schema.sql` ada fungsi `is_platform_admin()` berisi daftar
> email admin platform. Pastikan emailmu ada di situ kalau mau bisa memakai
> `cabut_lisensi()` / `set_instance_lisensi()` dari sisi klien.

## 3. Seed organisasi instance + lisensi

Di SQL Editor:

```sql
select * from seed_instance('RW 07 Melati', 'RW', 'RW07MLT', null, 365);
```

- Arg ke-4 `null` → sistem buatkan kunci lisensi acak.
- Arg ke-5 `365` → lisensi berlaku 365 hari (`null` = tanpa kadaluarsa).
- **Salin nilai kolom `lisensiKey`** dari hasilnya — dipakai di `config.js`.

## 4. Akun pengurus (owner)

Akun login harus dibuat dulu, lalu ditautkan ke organisasi:

**a. Buat akun** — pilih salah satu:
- Supabase Dashboard → **Authentication → Add user** (isi email + password), atau
- Suruh pengurus **sign up** lewat halaman login app (mereka akan masuk ke
  status “Akun Belum Terdaftar” — itu wajar, lanjut ke langkah b).

**b. Tautkan sebagai owner** (SQL Editor):

```sql
select * from tautkan_pengurus('ketua@rw07.id', 'RW07MLT', 'Pak Ketua RW 07');
```

Warga lain cukup daftar lewat tombol **“Gabung dengan kode RT/RW”** memakai
kode org (mis. `RW07MLT`).

## 5. (Opsional) Web Push per-project

Push notification butuh konfigurasi per project Supabase:

1. Generate VAPID: `npx web-push generate-vapid-keys`.
2. `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:...`
   pada project klien.
3. Deploy edge function: `supabase functions deploy kirim-push --project-ref <ref-klien>`.
4. Tempel **VAPID PUBLIC key** ke `config.js` (`VAPID_PUBLIC_KEY`).

## 6. Konfigurasi `js/config.js`

Salin `js/config.instance.example.js` menjadi `js/config.js`, lalu isi:

- `SUPABASE_URL` & `SUPABASE_ANON_KEY` → dari project Supabase klien.
- `MODE: 'instance'`.
- `INSTANCE.LISENSI_KEY` → dari hasil `seed_instance` (langkah 3).
- `INSTANCE.ORG_KODE` → kode org (mis. `RW07MLT`).
- `VAPID_PUBLIC_KEY` → (kalau pakai push) public key project klien.
- `WILAYAH` & `SURAT` → identitas/kop surat klien (boleh juga diatur dari
  menu Pengaturan setelah login).

## 7. Deploy

Deploy folder repo ke hosting klien (Cloudflare Pages / GitHub Pages / Netlify):

- Build command: **kosong** (statis).
- Output directory: **/** (root).
- Pastikan `js/config.js` yang ter-deploy adalah versi instance klien.

Buka aplikasi → `js/instance.js` akan memvalidasi lisensi ke backend klien.
Lisensi valid → app jalan. Lisensi dicabut/kadaluarsa → app terkunci.

---

## Mengelola lisensi setelah live

Dari backend klien (SQL Editor, atau via RPC kalau emailmu admin platform):

- **Nonaktifkan** (klien berhenti / nunggak):
  ```sql
  select * from cabut_lisensi('<org_id>');
  ```
- **Aktifkan lagi / perpanjang**:
  ```sql
  select * from set_instance_lisensi('<org_id>', '<lisensiKey>', 365);
  ```

> Catatan: pada Opsi B, kendali lisensi ada di backend klien. Selama kamu
> tetap pegang akses owner project Supabase klien, kill-switch tetap di
> tanganmu. Kalau akses project diserahkan penuh ke klien, mereka bisa
> mengubah lisensinya sendiri.
