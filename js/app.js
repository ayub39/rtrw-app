// ============================================================
//  SiWarga - Aplikasi Layanan RT/RW (PWA)
// ============================================================
const CFG = window.APP_CONFIG;
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rupiah = (n) => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
const tgl = (iso) => { try { return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return '-'; } };
const tglHari = (d) => { try { return new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { return d; } };
const toast = (msg) => {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(window.__t); window.__t = setTimeout(() => t.classList.remove('show'), 2600);
};

// ---------- SESSION ----------
const Session = {
  get() { try { return JSON.parse(localStorage.getItem('siwarga:session')); } catch (e) { return null; } },
  set(u) { localStorage.setItem('siwarga:session', JSON.stringify(u)); },
  clear() { localStorage.removeItem('siwarga:session'); }
};
const Voted = {
  all() { try { return JSON.parse(localStorage.getItem('siwarga:voted') || '[]'); } catch (e) { return []; } },
  has(id) { return this.all().includes(id); },
  add(id) { const a = this.all(); a.push(id); localStorage.setItem('siwarga:voted', JSON.stringify(a)); }
};

function badge(status) {
  const map = {
    'Baru': 'blue', 'Menunggu': 'orange', 'Belum': 'red', 'Diproses': 'orange', 'Dibuka': 'green',
    'Selesai': 'green', 'Lunas': 'green', 'Ditolak': 'red', 'Disetujui': 'green', 'Ditutup': 'gray'
  };
  return `<span class="badge ${map[status] || 'gray'}">${esc(status)}</span>`;
}
function statusButtons(coll, id, states) {
  return `<div class="actions">${states.map((s) => `<button class="btn ghost mini" data-set="${coll}:${id}:${s}">${s}</button>`).join('')}</div>`;
}
function emptyState(msg) { return `<div class="empty">${esc(msg)}</div>`; }
function delBtn(coll, id) { return `<div class="actions"><button class="btn ghost danger" data-del="${coll}:${id}">Hapus</button></div>`; }

// ============================================================
//  REGISTRY MODUL
// ============================================================
const VIEWS = {
  beranda: { label: 'Beranda', icon: '🏠' },
  lapor: { label: 'Lapor Masalah', icon: '📋' },
  bantuan: { label: 'Minta Bantuan', icon: '🆘' },
  pengumuman: { label: 'Pengumuman', icon: '📢' },
  warga: { label: 'Data Warga', icon: '👥' },
  surat: { label: 'Layanan Surat', icon: '✉️' },
  jadwal: { label: 'Jadwal & Ronda', icon: '📅' },
  kontak: { label: 'Kontak Penting', icon: '📇' },
  polling: { label: 'Polling Warga', icon: '🗳️' },
  notifikasi: { label: 'Notifikasi', icon: '🔔' },
  menu: { label: 'Menu', icon: '☰' }
};
const TABS = ['beranda', 'lapor', 'surat', 'pengumuman', 'menu'];
const MENU_ITEMS = ['lapor', 'bantuan', 'surat', 'jadwal', 'pengumuman', 'warga', 'kontak', 'polling', 'notifikasi'];

// ============================================================
//  VIEWS
// ============================================================
const Views = {
  // ---------- DASHBOARD ----------
  async beranda(user) {
    const [lap, ban, sur, peng] = await Promise.all([
      DB.list('laporan'), DB.list('bantuan'), DB.list('surat'), DB.list('pengumuman')
    ]);
    const jam = new Date().getHours();
    const sapa = jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';
    const stat = (label, val, icon, tone, nav) => `
      <button class="stat" data-tone="${tone}" data-nav="${nav}"><div class="stat-ic">${icon}</div>
      <div><div class="stat-val">${val}</div><div class="stat-lbl">${label}</div></div></button>`;
    const pinned = peng.filter((p) => p.pinned)[0] || peng[0];
    const myCount = await countMine(user.nama);
    return `
      <div class="hero-card"><div class="hero-greet">
        <div><span class="hero-hi">${sapa},</span><strong class="hero-name">${esc(user.nama)} 👋</strong>
        <div class="hero-loc">📍 ${esc(CFG.WILAYAH.nama)}</div></div>
        <span class="hero-role">${user.role === 'pengurus' ? '🛡️ Pengurus' : '👤 Warga'}</span>
      </div></div>
      <div class="section-title">Ringkasan</div>
      <div class="stat-grid">
        ${stat('Laporan aktif', lap.filter((x) => x.status !== 'Selesai').length, '📋', 'orange', 'lapor')}
        ${stat('Minta bantuan', ban.filter((x) => x.status !== 'Selesai').length, '🆘', 'red', 'bantuan')}
        ${stat('Surat menunggu', sur.filter((x) => x.status === 'Menunggu').length, '✉️', 'blue', 'surat')}
        ${stat('Notifikasi saya', myCount, '🔔', 'green', 'notifikasi')}
      </div>
      ${pinned ? `<div class="section-title">📢 Pengumuman Terbaru</div>
      <div class="card"><div class="card-body"><strong>${esc(pinned.judul)}</strong>
      <p class="muted">${esc(pinned.isi)}</p><small class="muted">${tgl(pinned.createdAt)}</small></div></div>` : ''}
      <div class="section-title">Akses Cepat</div>
      <div class="quick-grid">
        <button class="quick" data-nav="lapor"><span class="q-ic">📋</span><span>Lapor Masalah</span></button>
        <button class="quick" data-nav="bantuan"><span class="q-ic">🆘</span><span>Minta Bantuan</span></button>
        <button class="quick" data-nav="surat"><span class="q-ic">✉️</span><span>Ajukan Surat</span></button>
        <button class="quick" data-nav="jadwal"><span class="q-ic">📅</span><span>Jadwal & Ronda</span></button>
        <button class="quick" data-nav="polling"><span class="q-ic">🗳️</span><span>Polling Warga</span></button>
        <button class="quick" data-nav="kontak"><span class="q-ic">📇</span><span>Kontak Penting</span></button>
      </div>`;
  },

  // ---------- MENU (semua modul) ----------
  async menu(user) {
    const items = MENU_ITEMS.map((id) => `
      <button class="quick" data-nav="${id}"><span class="q-ic">${VIEWS[id].icon}</span><span>${VIEWS[id].label}</span></button>`).join('');
    return `<div class="section-title">Semua Layanan</div><div class="quick-grid">${items}</div>
      <div class="card"><div class="card-body profile-row">
        <div class="avatar big">${esc((user.nama || 'U')[0].toUpperCase())}</div>
        <div><strong>${esc(user.nama)}</strong><div class="muted">${user.role === 'pengurus' ? 'Pengurus RT/RW' : 'Warga'}${user.email ? ' • ' + esc(user.email) : ''}</div></div>
        <button class="btn ghost danger" id="btn-logout">Keluar</button>
      </div></div>`;
  },

  // ---------- LAPOR MASALAH ----------
  async lapor(user) {
    const role = user.role; const rows = await DB.list('laporan');
    const kategori = ['Fasilitas Umum', 'Kebersihan', 'Keamanan', 'Jalan Rusak', 'Banjir', 'Lainnya'];
    const form = `
      <form id="f-lapor" class="form card"><div class="card-body">
        <h3>Buat Laporan Baru</h3>
        <label>Judul masalah<input name="judul" required placeholder="cth: Jalan berlubang di gang 2"></label>
        <label>Kategori<select name="kategori">${kategori.map((k) => `<option>${k}</option>`).join('')}</select></label>
        <label>Lokasi<input name="lokasi" placeholder="cth: RT 01 dekat masjid"></label>
        <label>Deskripsi<textarea name="deskripsi" rows="3" required placeholder="Jelaskan detail masalahnya..."></textarea></label>
        <button class="btn primary" type="submit">Kirim Laporan</button>
      </div></form>`;
    const list = rows.map((r) => `
      <div class="card"><div class="card-body">
        <div class="row-between"><strong>${esc(r.judul)}</strong>${badge(r.status)}</div>
        <div class="chips"><span class="chip">${esc(r.kategori)}</span><span class="chip">📍 ${esc(r.lokasi || '-')}</span></div>
        <p class="muted">${esc(r.deskripsi)}</p>
        <small class="muted">Oleh ${esc(r.pelapor)} • ${tgl(r.createdAt)}</small>
        ${role === 'pengurus' ? statusButtons('laporan', r.id, ['Baru', 'Diproses', 'Selesai']) : ''}
      </div></div>`).join('') || emptyState('Belum ada laporan.');
    return form + `<div class="section-title">Daftar Laporan</div>` + list;
  },

  // ---------- MINTA BANTUAN ----------
  async bantuan(user) {
    const role = user.role; const rows = await DB.list('bantuan');
    const jenis = ['Darurat / Medis', 'Keamanan', 'Kesehatan', 'Sosial', 'Bencana', 'Lainnya'];
    const form = `
      <div class="callout red"><div>🚨</div><div><strong>Darurat?</strong> Hubungi <a href="tel:${esc(CFG.WILAYAH.kontakDarurat)}">${esc(CFG.WILAYAH.kontakDarurat)}</a> atau ketua RT setempat.</div></div>
      <form id="f-bantuan" class="form card"><div class="card-body">
        <h3>Permintaan Bantuan</h3>
        <label>Jenis bantuan<select name="jenis">${jenis.map((k) => `<option>${k}</option>`).join('')}</select></label>
        <label>Tingkat urgensi<select name="urgensi"><option>Rendah</option><option selected>Sedang</option><option>Tinggi</option></select></label>
        <label>Deskripsi<textarea name="deskripsi" rows="3" required placeholder="Jelaskan bantuan yang dibutuhkan..."></textarea></label>
        <button class="btn primary" type="submit">Kirim Permintaan</button>
      </div></form>`;
    const list = rows.map((r) => `
      <div class="card"><div class="card-body">
        <div class="row-between"><strong>${esc(r.jenis)}</strong>${badge(r.status)}</div>
        <div class="chips"><span class="chip urg-${esc((r.urgensi || '').toLowerCase())}">Urgensi: ${esc(r.urgensi)}</span></div>
        <p class="muted">${esc(r.deskripsi)}</p>
        <small class="muted">Oleh ${esc(r.pemohon)} • ${tgl(r.createdAt)}</small>
        ${role === 'pengurus' ? statusButtons('bantuan', r.id, ['Baru', 'Diproses', 'Selesai']) : ''}
      </div></div>`).join('') || emptyState('Belum ada permintaan bantuan.');
    return form + `<div class="section-title">Daftar Permintaan</div>` + list;
  },

  // ---------- PENGUMUMAN ----------
  async pengumuman(user) {
    const role = user.role; const rows = await DB.list('pengumuman');
    const form = role === 'pengurus' ? `
      <form id="f-peng" class="form card"><div class="card-body">
        <h3>Buat Pengumuman</h3>
        <label>Judul<input name="judul" required></label>
        <label>Kategori<select name="kategori"><option>Info</option><option>Kegiatan</option><option>Penting</option><option>Keuangan</option></select></label>
        <label>Isi<textarea name="isi" rows="3" required></textarea></label>
        <label class="check"><input type="checkbox" name="pinned"> Sematkan di beranda</label>
        <button class="btn primary" type="submit">Terbitkan</button>
      </div></form>` : '';
    const list = rows.map((r) => `
      <div class="card"><div class="card-body">
        <div class="row-between"><strong>${r.pinned ? '📌 ' : ''}${esc(r.judul)}</strong><span class="chip">${esc(r.kategori)}</span></div>
        <p class="muted">${esc(r.isi)}</p>
        <small class="muted">${esc(r.author || 'Pengurus')} • ${tgl(r.createdAt)}</small>
        ${role === 'pengurus' ? delBtn('pengumuman', r.id) : ''}
      </div></div>`).join('') || emptyState('Belum ada pengumuman.');
    return form + `<div class="section-title">Semua Pengumuman</div>` + list;
  },

  // ---------- DATA WARGA ----------
  async warga(user) {
    const role = user.role; const rows = await DB.list('warga');
    const totalAnggota = rows.reduce((s, r) => s + (Number(r.jmlAnggota) || 0), 0);
    const head = `<div class="stat-grid">
      <div class="stat" data-tone="blue"><div class="stat-ic">🏠</div><div><div class="stat-val">${rows.length}</div><div class="stat-lbl">Kepala Keluarga</div></div></div>
      <div class="stat" data-tone="green"><div class="stat-ic">👥</div><div><div class="stat-val">${totalAnggota}</div><div class="stat-lbl">Total Jiwa</div></div></div>
    </div>`;
    const form = role === 'pengurus' ? `
      <form id="f-warga" class="form card"><div class="card-body">
        <h3>Tambah Data Warga</h3>
        <label>Nama lengkap<input name="nama" required></label>
        <div class="grid-2"><label>NIK<input name="nik" inputmode="numeric"></label><label>No. KK<input name="kk" inputmode="numeric"></label></div>
        <label>Alamat<input name="alamat"></label>
        <div class="grid-2"><label>RT<input name="rt"></label><label>RW<input name="rw"></label></div>
        <div class="grid-2"><label>No. Telp<input name="telp" inputmode="tel"></label><label>Jml anggota<input name="jmlAnggota" type="number" min="1" value="1"></label></div>
        <label>Status<select name="status"><option>Tetap</option><option>Kontrak</option><option>Kost</option></select></label>
        <button class="btn primary" type="submit">Simpan</button>
      </div></form>` : `<div class="callout blue"><div>ℹ️</div><div>Data warga dikelola oleh pengurus RT/RW.</div></div>`;
    const list = rows.map((r) => `
      <div class="card"><div class="card-body">
        <div class="row-between"><strong>${esc(r.nama)}</strong><span class="chip">RT ${esc(r.rt)}/RW ${esc(r.rw)}</span></div>
        <div class="kv"><span>NIK</span><b>${esc(r.nik || '-')}</b></div>
        <div class="kv"><span>Alamat</span><b>${esc(r.alamat || '-')}</b></div>
        <div class="kv"><span>Anggota</span><b>${esc(r.jmlAnggota || '-')} jiwa</b></div>
        <div class="chips"><span class="chip">${esc(r.status)}</span>${r.telp ? `<a class="chip link" href="tel:${esc(r.telp)}">📞 ${esc(r.telp)}</a>` : ''}</div>
        ${role === 'pengurus' ? delBtn('warga', r.id) : ''}
      </div></div>`).join('') || emptyState('Belum ada data warga.');
    return head + form + `<div class="section-title">Daftar Warga</div>` + list;
  },

  // ---------- LAYANAN SURAT ----------
  async surat(user) {
    const role = user.role; const rows = await DB.list('surat');
    const jenis = [
      'Surat Pengantar RT', 'Surat Pengantar RW', 'Cap / Legalisir RT', 'Surat Domisili',
      'Surat Keterangan Tidak Mampu (SKTM)', 'Surat Pengantar KTP', 'Surat Pengantar KK',
      'Surat Keterangan Usaha', 'Surat Izin Keramaian', 'Surat Pengantar Nikah (N1-N4)',
      'Surat Pengantar SKCK', 'Surat Pindah Domisili', 'Surat Keterangan Kelahiran',
      'Surat Keterangan Kematian', 'Surat Keterangan Belum Menikah', 'Lainnya'
    ];
    const form = `
      <form id="f-surat" class="form card"><div class="card-body">
        <h3>Ajukan Surat / Layanan</h3>
        <label>Jenis layanan<select name="jenis">${jenis.map((k) => `<option>${k}</option>`).join('')}</select></label>
        <label>Keperluan<textarea name="keperluan" rows="2" required placeholder="cth: untuk pendaftaran sekolah anak"></textarea></label>
        <button class="btn primary" type="submit">Kirim Pengajuan</button>
      </div></form>`;
    const list = rows.map((r) => `
      <div class="card"><div class="card-body"><div class="row-between"><strong>${esc(r.jenis)}</strong>${badge(r.status)}</div>
      <p class="muted">${esc(r.keperluan)}</p><small class="muted">Oleh ${esc(r.pemohon)} • ${tgl(r.createdAt)}</small>
      ${role === 'pengurus' ? statusButtons('surat', r.id, ['Menunggu', 'Disetujui', 'Ditolak', 'Selesai']) : ''}
      </div></div>`).join('') || emptyState('Belum ada pengajuan.');
    return form + `<div class="section-title">Riwayat Pengajuan</div>` + list;
  },

  // ---------- JADWAL & RONDA ----------
  async jadwal(user) {
    const role = user.role; const rows = (await DB.list('jadwal')).sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));
    const form = role === 'pengurus' ? `
      <form id="f-jadwal" class="form card"><div class="card-body">
        <h3>Tambah Jadwal</h3>
        <label>Judul kegiatan<input name="judul" required placeholder="cth: Ronda malam RT 02"></label>
        <label>Tipe<select name="tipe"><option>Ronda</option><option>Kegiatan</option><option>Rapat</option><option>Kerja Bakti</option><option>Lainnya</option></select></label>
        <div class="grid-2"><label>Tanggal<input name="tanggal" type="date" required></label><label>Waktu<input name="waktu" type="time"></label></div>
        <label>Lokasi<input name="lokasi"></label>
        <label>Petugas / peserta<input name="petugas" placeholder="cth: Budi, Andi"></label>
        <button class="btn primary" type="submit">Simpan Jadwal</button>
      </div></form>` : '';
    const tipeIcon = { Ronda: '🔦', Kegiatan: '🎉', Rapat: '📝', 'Kerja Bakti': '🧹' };
    const list = rows.map((r) => `
      <div class="card"><div class="card-body">
        <div class="row-between"><strong>${tipeIcon[r.tipe] || '📅'} ${esc(r.judul)}</strong><span class="chip">${esc(r.tipe)}</span></div>
        <div class="kv"><span>Waktu</span><b>${tglHari(r.tanggal)}${r.waktu ? ', ' + esc(r.waktu) : ''}</b></div>
        ${r.lokasi ? `<div class="kv"><span>Lokasi</span><b>${esc(r.lokasi)}</b></div>` : ''}
        ${r.petugas ? `<div class="kv"><span>Petugas</span><b>${esc(r.petugas)}</b></div>` : ''}
        ${role === 'pengurus' ? delBtn('jadwal', r.id) : ''}
      </div></div>`).join('') || emptyState('Belum ada jadwal.');
    return form + `<div class="section-title">Jadwal Mendatang</div>` + list;
  },

  // ---------- KONTAK PENTING ----------
  async kontak(user) {
    const role = user.role; const rows = await DB.list('kontak');
    const form = role === 'pengurus' ? `
      <form id="f-kontak" class="form card"><div class="card-body">
        <h3>Tambah Kontak</h3>
        <label>Nama<input name="nama" required></label>
        <label>Peran / keterangan<input name="peran" placeholder="cth: Ketua RT 03"></label>
        <label>No. Telp<input name="telp" inputmode="tel" required></label>
        <label>Kategori<select name="kategori"><option>RT/RW</option><option>Kesehatan</option><option>Keamanan</option><option>Darurat</option><option>Lainnya</option></select></label>
        <button class="btn primary" type="submit">Simpan Kontak</button>
      </div></form>` : '';
    const icon = { 'RT/RW': '🏘️', Kesehatan: '🏥', Keamanan: '🛡️', Darurat: '🚨', Lainnya: '📞' };
    const list = rows.map((r) => `
      <div class="card"><div class="card-body contact-row">
        <div class="c-ic">${icon[r.kategori] || '📞'}</div>
        <div class="c-info"><strong>${esc(r.nama)}</strong><div class="muted">${esc(r.peran || r.kategori)}</div></div>
        <a class="btn ghost" href="tel:${esc(r.telp)}">📞 Telp</a>
      </div>${role === 'pengurus' ? `<div class="card-body pt0">${delBtn('kontak', r.id)}</div>` : ''}</div>`).join('') || emptyState('Belum ada kontak.');
    return form + `<div class="section-title">Direktori Kontak</div>` + list;
  },

  // ---------- POLLING WARGA ----------
  async polling(user) {
    const role = user.role; const rows = await DB.list('polling');
    const form = role === 'pengurus' ? `
      <form id="f-polling" class="form card"><div class="card-body">
        <h3>Buat Polling</h3>
        <label>Pertanyaan<input name="judul" required placeholder="cth: Setuju kerja bakti tiap Minggu?"></label>
        <label>Pilihan 1<input name="o1" required></label>
        <label>Pilihan 2<input name="o2" required></label>
        <label>Pilihan 3 (opsional)<input name="o3"></label>
        <label>Pilihan 4 (opsional)<input name="o4"></label>
        <button class="btn primary" type="submit">Terbitkan Polling</button>
      </div></form>` : '';
    const list = rows.map((r) => {
      const total = (r.opsi || []).reduce((s, o) => s + (o.votes || 0), 0);
      const voted = Voted.has(r.id) || r.status === 'Ditutup';
      const bars = (r.opsi || []).map((o, i) => {
        const pct = total ? Math.round((o.votes || 0) / total * 100) : 0;
        return `<button class="poll-opt" ${voted ? 'disabled' : ''} data-vote="${r.id}:${i}">
          <div class="poll-bar" style="--pct:${pct}%"></div>
          <span class="poll-txt">${esc(o.text)}</span><span class="poll-pct">${voted ? pct + '%' : 'Pilih'}</span></button>`;
      }).join('');
      return `<div class="card"><div class="card-body">
        <div class="row-between"><strong>${esc(r.judul)}</strong>${badge(r.status)}</div>
        <div class="poll">${bars}</div>
        <small class="muted">${total} suara • ${tgl(r.createdAt)}</small>
        ${role === 'pengurus' ? `<div class="actions">${r.status === 'Dibuka' ? `<button class="btn ghost mini" data-set="polling:${r.id}:Ditutup">Tutup</button>` : `<button class="btn ghost mini" data-set="polling:${r.id}:Dibuka">Buka lagi</button>`}<button class="btn ghost danger mini" data-del="polling:${r.id}">Hapus</button></div>` : ''}
      </div></div>`;
    }).join('') || emptyState('Belum ada polling.');
    return form + `<div class="section-title">Polling Aktif</div>` + list;
  },

  // ---------- NOTIFIKASI / STATUS SAYA ----------
  async notifikasi(user) {
    const [lap, ban, sur, peng] = await Promise.all([DB.list('laporan'), DB.list('bantuan'), DB.list('surat'), DB.list('pengumuman')]);
    const mine = [
      ...lap.filter((x) => x.pelapor === user.nama).map((x) => ({ t: 'Laporan', label: x.judul, status: x.status, at: x.createdAt, ic: '📋' })),
      ...ban.filter((x) => x.pemohon === user.nama).map((x) => ({ t: 'Bantuan', label: x.jenis, status: x.status, at: x.createdAt, ic: '🆘' })),
      ...sur.filter((x) => x.pemohon === user.nama).map((x) => ({ t: 'Surat', label: x.jenis, status: x.status, at: x.createdAt, ic: '✉️' }))
    ].sort((a, b) => (b.at || '').localeCompare(a.at || ''));
    const mineList = mine.map((m) => `
      <div class="card"><div class="card-body"><div class="row-between"><strong>${m.ic} ${esc(m.label)}</strong>${badge(m.status)}</div>
      <small class="muted">${esc(m.t)} • ${tgl(m.at)}</small></div></div>`).join('') || emptyState('Belum ada pengajuan atas nama Anda.');
    const info = peng.slice(0, 5).map((p) => `
      <div class="card"><div class="card-body"><strong>📢 ${esc(p.judul)}</strong><p class="muted">${esc(p.isi)}</p><small class="muted">${tgl(p.createdAt)}</small></div></div>`).join('') || emptyState('Belum ada info.');
    return `<div class="callout blue"><div>🔔</div><div>Pantau status laporan, bantuan, dan surat yang Anda ajukan di sini.</div></div>
      <div class="section-title">Status Pengajuan Saya</div>${mineList}
      <div class="section-title">Info Terbaru</div>${info}`;
  }
};

async function countMine(nama) {
  const [lap, ban, sur] = await Promise.all([DB.list('laporan'), DB.list('bantuan'), DB.list('surat')]);
  return lap.filter((x) => x.pelapor === nama).length + ban.filter((x) => x.pemohon === nama).length + sur.filter((x) => x.pemohon === nama).length;
}

// ============================================================
//  ROUTER
// ============================================================
async function render(viewId) {
  const user = Session.get();
  if (!user) return renderLogin();
  const view = VIEWS[viewId] ? viewId : 'beranda';
  localStorage.setItem('siwarga:lastView', view);
  const activeTab = TABS.includes(view) ? view : 'menu';

  $('#app').innerHTML = `
    <header class="topbar">
      <div><div class="tb-title">${VIEWS[view].icon} ${esc(VIEWS[view].label)}</div>
      <div class="tb-sub">${esc(CFG.WILAYAH.nama)}</div></div>
      <button class="avatar" id="btn-profile" title="${esc(user.nama)}">${esc((user.nama || 'U')[0].toUpperCase())}</button>
    </header>
    <main class="content" id="content"><div class="loading">Memuat…</div></main>
    <nav class="tabbar">${TABS.map((id) => `<button class="tab ${id === activeTab ? 'active' : ''}" data-nav="${id}"><span>${VIEWS[id].icon}</span><small>${VIEWS[id].label}</small></button>`).join('')}</nav>`;

  $('#content').innerHTML = await Views[view](user);
  bindForms(view);
}

function renderLogin() {
  $('#app').innerHTML = `
    <div class="login"><div class="login-card">
      <div class="brand"><div class="logo">🏘️</div><h1>SiWarga</h1><p>Layanan digital RT/RW</p></div>
      <form id="f-login">
        <label>Nama Anda<input name="nama" required placeholder="Nama lengkap"></label>
        <label>NIK<input name="nik" required inputmode="numeric" maxlength="16" placeholder="16 digit NIK (sesuai KTP)"></label>
        <label>Email<input name="email" type="email" required placeholder="email@contoh.com"></label>
        <label>Masuk sebagai</label>
        <div class="role-pick">
          <label class="role-opt"><input type="radio" name="role" value="warga" checked><span>👤 Warga</span></label>
          <label class="role-opt"><input type="radio" name="role" value="pengurus"><span>🛡️ Pengurus</span></label>
        </div>
        <button class="btn primary block" type="submit">Daftar / Masuk</button>
      </form>
      <p class="login-note">Mode demo — data tersimpan di perangkat Anda.${DB.backend === 'supabase' ? ' Terhubung Supabase.' : ''}</p>
    </div></div>`;
  $('#f-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const nik = (fd.get('nik') || '').trim();
    const email = (fd.get('email') || '').trim();
    if (!/^\d{16}$/.test(nik)) { toast('NIK harus 16 digit angka'); return; }
    Session.set({ nama: fd.get('nama').trim(), nik, email, role: fd.get('role') });
    toast('Selamat datang, ' + fd.get('nama'));
    render('beranda');
  });
}

// ============================================================
//  FORM HANDLERS
// ============================================================
function formData(form) { return Object.fromEntries(new FormData(form).entries()); }
function bindForms(view) {
  const user = Session.get();
  const onSubmit = (sel, coll, build, msg) => {
    const f = $(sel); if (!f) return;
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      await DB.add(coll, build(formData(f)));
      toast(msg); render(view);
    });
  };
  onSubmit('#f-lapor', 'laporan', (d) => ({ ...d, status: 'Baru', pelapor: user.nama }), 'Laporan terkirim ✅');
  onSubmit('#f-bantuan', 'bantuan', (d) => ({ ...d, status: 'Baru', pemohon: user.nama }), 'Permintaan terkirim ✅');
  onSubmit('#f-surat', 'surat', (d) => ({ ...d, status: 'Menunggu', pemohon: user.nama }), 'Pengajuan terkirim ✅');
  onSubmit('#f-peng', 'pengumuman', (d) => ({ ...d, pinned: !!d.pinned, author: user.nama }), 'Pengumuman terbit ✅');
  onSubmit('#f-warga', 'warga', (d) => ({ ...d, jmlAnggota: Number(d.jmlAnggota) || 1 }), 'Data warga tersimpan ✅');
  onSubmit('#f-jadwal', 'jadwal', (d) => ({ ...d }), 'Jadwal tersimpan ✅');
  onSubmit('#f-kontak', 'kontak', (d) => ({ ...d }), 'Kontak tersimpan ✅');
  onSubmit('#f-polling', 'polling', (d) => ({
    judul: d.judul, status: 'Dibuka', author: user.nama,
    opsi: [d.o1, d.o2, d.o3, d.o4].filter((x) => x && x.trim()).map((t) => ({ text: t.trim(), votes: 0 }))
  }), 'Polling terbit ✅');
}

// ============================================================
//  GLOBAL CLICK HANDLER
// ============================================================
document.addEventListener('click', async (e) => {
  const nav = e.target.closest('[data-nav]');
  if (nav) { render(nav.dataset.nav); return; }

  const vote = e.target.closest('[data-vote]');
  if (vote && !vote.disabled) {
    const [id, idx] = vote.dataset.vote.split(':');
    if (Voted.has(id)) { toast('Anda sudah memilih'); return; }
    const poll = (await DB.list('polling')).find((p) => p.id === id);
    if (poll && poll.status === 'Dibuka') {
      const opsi = poll.opsi.map((o, i) => i === Number(idx) ? { ...o, votes: (o.votes || 0) + 1 } : o);
      await DB.update('polling', id, { opsi });
      Voted.add(id); toast('Suara Anda tercatat ✅'); render('polling');
    }
    return;
  }
  const set = e.target.closest('[data-set]');
  if (set) {
    const [coll, id, status] = set.dataset.set.split(':');
    await DB.update(coll, id, { status }); toast('Status: ' + status);
    render(localStorage.getItem('siwarga:lastView')); return;
  }
  const del = e.target.closest('[data-del]');
  if (del) {
    const [coll, id] = del.dataset.del.split(':');
    if (confirm('Hapus data ini?')) { await DB.remove(coll, id); toast('Data dihapus'); render(localStorage.getItem('siwarga:lastView')); }
    return;
  }
  if (e.target.closest('#btn-logout') || e.target.closest('#btn-profile')) {
    if (e.target.closest('#btn-profile')) { render('menu'); return; }
    if (confirm('Keluar dari akun?')) { Session.clear(); render(); }
  }
});

// ============================================================
//  BOOTSTRAP
// ============================================================
(async function init() {
  await DB.seedIfEmpty();
  const last = localStorage.getItem('siwarga:lastView') || 'beranda';
  Session.get() ? render(last) : renderLogin();
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
})();
