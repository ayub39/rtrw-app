# 🏘️ SiWarga — Aplikasi Layanan RT/RW (PWA)

Progressive Web App untuk membantu kelancaran layanan tingkat **RT/RW**: lapor masalah, minta bantuan/darurat, pengumuman, data warga, iuran & kas, serta pengajuan surat. Bisa di-_install_ di HP layaknya aplikasi native, dan bekerja offline (app shell).

## ✨ Fitur

| Modul | Warga | Pengurus |
|---|---|---|
| 📋 Lapor masalah (jalan rusak, sampah, dll) | Buat & pantau | Ubah status |
| 🆘 Minta bantuan / darurat | Ajukan | Tindak lanjut |
| 📢 Pengumuman & info | Lihat | Buat / hapus |
| 👥 Data warga / KK | Lihat ringkas | Kelola penuh |
| 💰 Iuran & kas | Lihat status | Catat iuran & transaksi |
| ✉️ Pengajuan surat (pengantar RT/RW, cap, domisili, SKTM, dll) | Ajukan | Setujui / tolak |
| 📅 Jadwal & ronda | Lihat | Kelola |
| 📇 Kontak penting (RT/RW, faskes, darurat) | Lihat & telepon | Kelola |
| 🗳️ Polling / voting warga | Memilih | Buat / tutup |
| 🔔 Notifikasi & status pengajuan saya | Pantau | — |

Plus: dashboard ringkas, menu semua layanan, dua peran (Warga & Pengurus), desain mobile-first, instalable (PWA).

## 🚀 Cara menjalankan

Karena ini PWA, butuh diakses lewat HTTP (bukan dibuka langsung sebagai file).

```bash
# dari dalam folder rtrw-app
python3 -m http.server 8080
# lalu buka http://localhost:8080
```

Atau deploy gratis ke **GitHub Pages / Netlify / Vercel** (lihat di bawah).

## 💾 Penyimpanan data

Default: **mode lokal** (`localStorage`) — langsung jalan tanpa setup, cocok untuk uji coba. Data contoh otomatis dibuat saat pertama dibuka.

### Upgrade ke backend beneran (Supabase)
1. Buat project gratis di <https://supabase.com>.
2. Buka **SQL Editor**, jalankan isi file [`supabase-schema.sql`](./supabase-schema.sql).
3. Buka **Project Settings → API**, salin `Project URL` dan `anon public key`.
4. Edit [`js/config.js`](./js/config.js):
   ```js
   BACKEND: 'supabase',
   SUPABASE_URL: 'https://xxxx.supabase.co',
   SUPABASE_ANON_KEY: 'eyJhbGci...'
   ```
5. Refresh aplikasi — data kini tersimpan di cloud & bisa diakses banyak perangkat.

> Catatan keamanan: skema demo memakai kebijakan RLS publik agar cepat jalan. Untuk produksi, batasi penulisan hanya untuk pengurus melalui Supabase Auth.

## 📦 Struktur

```
rtrw-app/
├─ index.html              # shell aplikasi
├─ styles.css              # desain mobile-first
├─ manifest.webmanifest    # metadata PWA
├─ sw.js                   # service worker (offline)
├─ supabase-schema.sql     # skema database
├─ icons/                  # ikon aplikasi (SVG)
└─ js/
   ├─ config.js            # konfigurasi backend & wilayah
   ├─ db.js                # data layer (local / supabase)
   └─ app.js               # logika & tampilan
```

## ☁️ Deploy & push ke GitHub

```bash
cd rtrw-app
git init
git add .
git commit -m "feat: aplikasi layanan RT/RW (PWA)"
git branch -M main
git remote add origin https://github.com/ayub39/rtrw-app.git
git push -u origin main
```

Lalu aktifkan **GitHub Pages** (Settings → Pages → Branch: `main` /root). Aplikasi langsung online & bisa di-install.

## 🛠️ Kustomisasi
Ubah nama wilayah, kontak darurat, dan nominal iuran di `js/config.js` bagian `WILAYAH`.

---
Dibuat sebagai titik awal — silakan kembangkan sesuai kebutuhan RT/RW Anda. 🙌
