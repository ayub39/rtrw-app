// ============================================================
//  DATA LAYER
//  Abstraksi penyimpanan: 'local' (localStorage) atau 'supabase'.
//  Semua modul memanggil DB.list / DB.add / DB.update / DB.remove
//  jadi pindah backend cukup ubah config.js.
// ============================================================
(function () {
  const cfg = window.APP_CONFIG || { BACKEND: 'local' };
  const PREFIX = 'siwarga:';
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------- LOCAL ADAPTER ----------
  const local = {
    _read(coll) {
      try { return JSON.parse(localStorage.getItem(PREFIX + coll) || '[]'); }
      catch (e) { return []; }
    },
    _write(coll, rows) { localStorage.setItem(PREFIX + coll, JSON.stringify(rows)); },
    async list(coll) {
      return this._read(coll).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    },
    async add(coll, row) {
      const rows = this._read(coll);
      const rec = Object.assign({ id: uid(), createdAt: new Date().toISOString() }, row);
      rows.push(rec);
      this._write(coll, rows);
      return rec;
    },
    async update(coll, id, patch) {
      const rows = this._read(coll);
      const i = rows.findIndex((r) => r.id === id);
      if (i >= 0) { rows[i] = Object.assign({}, rows[i], patch); this._write(coll, rows); return rows[i]; }
      return null;
    },
    async remove(coll, id) {
      this._write(coll, this._read(coll).filter((r) => r.id !== id));
      return true;
    }
  };

  // ---------- SUPABASE ADAPTER (PostgREST, tanpa library) ----------
  const sb = {
    _h() {
      return {
        apikey: cfg.SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + (window.SIWARGA_TOKEN || cfg.SUPABASE_ANON_KEY),
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      };
    },
    _url(coll, q) { return cfg.SUPABASE_URL + '/rest/v1/' + coll + (q || ''); },
    async list(coll) {
      const r = await fetch(this._url(coll, '?select=*&order=createdAt.desc'), { headers: this._h() });
      return r.ok ? r.json() : [];
    },
    async add(coll, row) {
      const rec = Object.assign({ createdAt: new Date().toISOString() }, row);
      const r = await fetch(this._url(coll), { method: 'POST', headers: this._h(), body: JSON.stringify(rec) });
      const d = await r.json();
      return Array.isArray(d) ? d[0] : d;
    },
    async update(coll, id, patch) {
      const r = await fetch(this._url(coll, '?id=eq.' + id), { method: 'PATCH', headers: this._h(), body: JSON.stringify(patch) });
      const d = await r.json();
      return Array.isArray(d) ? d[0] : d;
    },
    async remove(coll, id) {
      await fetch(this._url(coll, '?id=eq.' + id), { method: 'DELETE', headers: this._h() });
      return true;
    }
  };

  const adapter = cfg.BACKEND === 'supabase' ? sb : local;

  window.DB = {
    backend: cfg.BACKEND,
    list: (c) => adapter.list(c),
    add: (c, row) => adapter.add(c, row),
    update: (c, id, patch) => adapter.update(c, id, patch),
    remove: (c, id) => adapter.remove(c, id),

    // Seed data contoh saat pertama kali dibuka (mode lokal saja)
    async seedIfEmpty() {
      if (cfg.BACKEND !== 'local') return;
      if (localStorage.getItem(PREFIX + 'seeded')) return;
      localStorage.setItem(PREFIX + 'seeded', '1');

      const now = Date.now();
      const iso = (d) => new Date(now - d * 86400000).toISOString();

      const warga = [
        { nama: 'Budi Santoso', nik: '3201010101900001', kk: '3201010101900000', alamat: 'Jl. Melati No. 12', rt: '01', rw: '05', telp: '081200000001', status: 'Tetap', jmlAnggota: 4 },
        { nama: 'Siti Aminah', nik: '3201010101920002', kk: '3201010101920000', alamat: 'Jl. Mawar No. 8', rt: '02', rw: '05', telp: '081200000002', status: 'Tetap', jmlAnggota: 3 },
        { nama: 'Andi Wijaya', nik: '3201010101880003', kk: '3201010101880000', alamat: 'Jl. Kenanga No. 3', rt: '01', rw: '05', telp: '081200000003', status: 'Kontrak', jmlAnggota: 2 }
      ];
      for (const w of warga) await local.add('warga', w);

      const pengumuman = [
        { judul: 'Kerja Bakti Minggu Pagi', isi: 'Mohon partisipasi seluruh warga untuk kerja bakti membersihkan selokan, Minggu pukul 07.00 di pos RW.', kategori: 'Kegiatan', author: 'Pengurus RW', pinned: true, createdAt: iso(1) },
        { judul: 'Jadwal Pengambilan Sampah Berubah', isi: 'Mulai pekan ini pengambilan sampah jadi Senin, Rabu, Jumat pukul 06.00.', kategori: 'Info', author: 'Pengurus RW', pinned: false, createdAt: iso(3) }
      ];
      for (const p of pengumuman) await local.add('pengumuman', p);

      await local.add('laporan', { judul: 'Lampu jalan mati', kategori: 'Fasilitas Umum', deskripsi: 'Lampu di depan gang 3 sudah mati 3 hari.', lokasi: 'Gang 3 RT 01', status: 'Diproses', pelapor: 'Budi Santoso', createdAt: iso(2) });
      await local.add('bantuan', { jenis: 'Kesehatan', deskripsi: 'Ada warga lansia perlu diantar ke puskesmas.', urgensi: 'Sedang', pemohon: 'Siti Aminah', status: 'Baru', createdAt: iso(1) });
      await local.add('surat', { jenis: 'Surat Domisili', keperluan: 'Pendaftaran sekolah anak', pemohon: 'Andi Wijaya', status: 'Menunggu', createdAt: iso(1) });

      const bulan = new Date().toISOString().slice(0, 7);
      await local.add('iuran', { wargaNama: 'Budi Santoso', bulan, jumlah: 25000, status: 'Lunas', metode: 'Tunai', createdAt: iso(2) });
      await local.add('iuran', { wargaNama: 'Siti Aminah', bulan, jumlah: 25000, status: 'Belum', metode: '-', createdAt: iso(2) });
      await local.add('kas', { tipe: 'masuk', keterangan: 'Iuran bulan ini', jumlah: 25000, createdAt: iso(2) });
      await local.add('kas', { tipe: 'keluar', keterangan: 'Beli lampu jalan', jumlah: 75000, createdAt: iso(1) });
      await local.add('kas', { tipe: 'masuk', keterangan: 'Saldo awal kas', jumlah: 500000, createdAt: iso(10) });

      const day = (d) => new Date(now + d * 86400000).toISOString().slice(0, 10);
      await local.add('jadwal', { judul: 'Ronda Malam RT 01', tipe: 'Ronda', tanggal: day(1), waktu: '22:00', lokasi: 'Pos Kamling RT 01', petugas: 'Budi, Andi, Joko', createdAt: iso(1) });
      await local.add('jadwal', { judul: 'Posyandu Balita', tipe: 'Kegiatan', tanggal: day(3), waktu: '08:00', lokasi: 'Balai RW 05', petugas: 'Kader PKK', createdAt: iso(1) });
      await local.add('jadwal', { judul: 'Rapat Pengurus Bulanan', tipe: 'Rapat', tanggal: day(5), waktu: '19:30', lokasi: 'Rumah Ketua RW', petugas: 'Seluruh pengurus', createdAt: iso(1) });

      await local.add('kontak', { nama: 'Ketua RW 05', peran: 'Bpk. Hadi', telp: '081200000010', kategori: 'RT/RW', createdAt: iso(9) });
      await local.add('kontak', { nama: 'Ketua RT 01', peran: 'Bpk. Slamet', telp: '081200000011', kategori: 'RT/RW', createdAt: iso(9) });
      await local.add('kontak', { nama: 'Puskesmas Sukamaju', peran: 'Layanan kesehatan', telp: '0217000000', kategori: 'Kesehatan', createdAt: iso(9) });
      await local.add('kontak', { nama: 'Pos Kamling', peran: 'Keamanan lingkungan', telp: '081200000012', kategori: 'Keamanan', createdAt: iso(9) });
      await local.add('kontak', { nama: 'Pemadam Kebakaran', peran: 'Darurat', telp: '113', kategori: 'Darurat', createdAt: iso(9) });
      await local.add('kontak', { nama: 'Ambulans / Gawat Darurat', peran: 'Darurat medis', telp: '119', kategori: 'Darurat', createdAt: iso(9) });

      await local.add('polling', { judul: 'Setuju iuran keamanan naik jadi Rp30.000/bulan?', opsi: [{ text: 'Setuju', votes: 8 }, { text: 'Tidak setuju', votes: 3 }, { text: 'Abstain', votes: 1 }], status: 'Dibuka', author: 'Pengurus RW', createdAt: iso(2) });
      await local.add('polling', { judul: 'Pilih tema acara 17 Agustus tahun ini', opsi: [{ text: 'Lomba tradisional', votes: 12 }, { text: 'Jalan sehat', votes: 7 }, { text: 'Bazar kuliner', votes: 9 }], status: 'Dibuka', author: 'Pengurus RW', createdAt: iso(4) });
    }
  };
})();
