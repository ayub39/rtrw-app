// ============================================================
//  LaporPakRT / LaporPakRW - Aplikasi Layanan RT/RW (PWA)
// ============================================================
const CFG = window.APP_CONFIG;
try { document.title = (CFG.APP_NAME || 'Aplikasi') + ' — Layanan RT/RW'; } catch (e) {}
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
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

// ---------- THEME (dark mode) ----------
const Theme = {
  get() { return localStorage.getItem('siwarga:theme') || 'light'; },
  set(t) { localStorage.setItem('siwarga:theme', t); this.apply(); },
  toggle() { this.set(this.get() === 'dark' ? 'light' : 'dark'); },
  apply() {
    const t = this.get();
    document.documentElement.setAttribute('data-theme', t);
    const mc = document.querySelector('meta[name=theme-color]');
    if (mc) mc.setAttribute('content', t === 'dark' ? '#0b1220' : '#2563eb');
  }
};

// ---------- NOTIFICATIONS ----------
const Notif = {
  supported() { return 'Notification' in window; },
  async enable() {
    if (!this.supported()) { toast('Browser tidak mendukung notifikasi'); return false; }
    const p = await Notification.requestPermission();
    if (p === 'granted') { toast('Notifikasi diaktifkan ✅'); this.show(CFG.APP_NAME, 'Notifikasi berhasil diaktifkan.'); return true; }
    toast('Izin notifikasi ditolak'); return false;
  },
  show(title, body) {
    try {
      if (this.supported() && Notification.permission === 'granted' && navigator.serviceWorker) {
        navigator.serviceWorker.ready.then((reg) => reg.showNotification(title, { body, icon: './icons/icon.svg', badge: './icons/icon.svg' }));
      }
    } catch (e) {}
  }
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
function delBtn(coll, id) { return `<div class="actions"><button class="btn ghost danger" data-del="${coll}:${id}">Hapus</button></div>`; }

// ---------- EMPTY STATE (hidup) ----------
function emptyState(msg, icon) {
  return `<div class="empty"><span class="empty-ic">${ic(icon || 'clipboard')}</span><p>${esc(msg)}</p></div>`;
}

// ---------- SKELETON LOADING ----------
function skeleton(n) {
  n = n || 3;
  let s = '<div class="skel-wrap">';
  for (let i = 0; i < n; i++) s += '<div class="skel-card"><div class="skel-line w70"></div><div class="skel-line w95"></div><div class="skel-line w45"></div></div>';
  return s + '</div>';
}

// ---------- MODAL KONFIRMASI CUSTOM ----------
function confirmModal(msg, opts) {
  opts = opts || {};
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-overlay';
    wrap.innerHTML = `<div class="modal"><div class="modal-body">${esc(msg)}</div>
      <div class="modal-actions">
        <button class="btn ghost" data-mno>${esc(opts.cancelText || 'Batal')}</button>
        <button class="btn ${opts.danger ? 'danger' : 'primary'}" data-myes>${esc(opts.okText || 'Ya')}</button>
      </div></div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('show'));
    const close = (v) => { wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 200); resolve(v); };
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap || e.target.closest('[data-mno]')) return close(false);
      if (e.target.closest('[data-myes]')) return close(true);
    });
  });
}

// ---------- TOOLBAR PENCARIAN + FILTER ----------
function listToolbar(statuses) {
  const chips = statuses ? `<div class="filter-chips"><button class="fchip active" data-fstatus="">Semua</button>${statuses.map((s) => `<button class="fchip" data-fstatus="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : '';
  return `<div class="toolbar">
    <div class="search-wrap">${ic('search')}<input class="search-input" type="search" placeholder="Cari..." aria-label="Cari"></div>
    ${chips}
  </div>`;
}
function applyListFilter() {
  const tb = $('.toolbar'); const list = $('.list');
  if (!tb || !list) return;
  const inp = $('.search-input', tb);
  const q = (inp ? inp.value : '').trim().toLowerCase();
  const active = $('.fchip.active', tb);
  const st = active ? active.dataset.fstatus : '';
  if (tb.hasAttribute('data-rq') && !q) {
    $$('.card', list).forEach((c) => { c.style.display = 'none'; });
    const none0 = $('.list-none', list); if (none0) none0.remove();
    let pr = $('.list-prompt', list);
    if (!pr) { pr = document.createElement('div'); pr.className = 'empty list-prompt'; pr.innerHTML = `<span class="empty-ic">${ic('search')}</span><p>Ketik NIK atau nama warga untuk menampilkan datanya.</p>`; list.appendChild(pr); }
    return;
  }
  const pr0 = $('.list-prompt', list); if (pr0) pr0.remove();
  let shown = 0;
  $$('.card', list).forEach((c) => {
    const text = (c.dataset.text || '').toLowerCase();
    const status = c.dataset.status || '';
    const ok = (!q || text.indexOf(q) >= 0) && (!st || status === st);
    c.style.display = ok ? '' : 'none';
    if (ok) shown++;
  });
  let none = $('.list-none', list);
  if (shown === 0) {
    if (!none) { none = document.createElement('div'); none.className = 'empty list-none'; none.innerHTML = `<span class="empty-ic">${ic('search')}</span><p>Tidak ada hasil yang cocok.</p>`; list.appendChild(none); }
  } else if (none) { none.remove(); }
}
function wrapList(html, statuses) {
  return listToolbar(statuses) + `<div class="list">${html}</div>`;
}

// ============================================================
//  LINE ICONS (simple modern, satu gaya stroke)
// ============================================================
const ICON = {
  home: '<svg class="ic" viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>',
  clipboard: '<svg class="ic" viewBox="0 0 24 24"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>',
  lifebuoy: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/></svg>',
  megaphone: '<svg class="ic" viewBox="0 0 24 24"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
  users: '<svg class="ic" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  mail: '<svg class="ic" viewBox="0 0 24 24"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
  calendar: '<svg class="ic" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
  phone: '<svg class="ic" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  chart: '<svg class="ic" viewBox="0 0 24 24"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>',
  pie: '<svg class="ic" viewBox="0 0 24 24"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>',
  bell: '<svg class="ic" viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  menu: '<svg class="ic" viewBox="0 0 24 24"><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/></svg>',
  shield: '<svg class="ic" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  search: '<svg class="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  sun: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><line x1="12" x2="12" y1="2" y2="4"/><line x1="12" x2="12" y1="20" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" x2="4" y1="12" y2="12"/><line x1="20" x2="22" y1="12" y2="12"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/></svg>',
  moon: '<svg class="ic" viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/></svg>'
};
const ic = (n) => ICON[n] || '';

// ============================================================
//  REGISTRY MODUL
// ============================================================
const VIEWS = {
  beranda: { label: 'Beranda', icon: 'home' },
  lapor: { label: 'Lapor Masalah', icon: 'clipboard' },
  bantuan: { label: 'Minta Bantuan', icon: 'lifebuoy' },
  pengumuman: { label: 'Pengumuman', icon: 'megaphone' },
  warga: { label: 'Data Warga', icon: 'users' },
  surat: { label: 'Layanan Surat', icon: 'mail' },
  jadwal: { label: 'Jadwal & Ronda', icon: 'calendar' },
  kontak: { label: 'Kontak Penting', icon: 'phone' },
  polling: { label: 'Polling Warga', icon: 'chart' },
  statistik: { label: 'Statistik', icon: 'pie' },
  cariwarga: { label: 'Cari Warga', icon: 'search' },
  notifikasi: { label: 'Notifikasi', icon: 'bell' },
  menu: { label: 'Menu', icon: 'menu' }
};
const TABS_WARGA = ['beranda', 'lapor', 'surat', 'pengumuman', 'menu'];
const TABS_PENGURUS = ['beranda', 'surat', 'lapor', 'statistik', 'menu'];
const MENU_ITEMS = ['lapor', 'bantuan', 'surat', 'jadwal', 'pengumuman', 'warga', 'kontak', 'polling', 'notifikasi'];

// ============================================================
//  VIEWS
// ============================================================
const Views = {
  // ---------- DASHBOARD (router by role) ----------
  async beranda(user) {
    if (user.role === 'pengurus') return this._berandaPengurus(user);
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
        <span class="hero-role">👤 Warga</span>
      </div></div>
      <div class="section-title">Ringkasan</div>
      <div class="stat-grid">
        ${stat('Laporan aktif', lap.filter((x) => x.status !== 'Selesai').length, ic('clipboard'), 'orange', 'lapor')}
        ${stat('Minta bantuan', ban.filter((x) => x.status !== 'Selesai').length, ic('lifebuoy'), 'red', 'bantuan')}
        ${stat('Surat menunggu', sur.filter((x) => x.status === 'Menunggu').length, ic('mail'), 'blue', 'surat')}
        ${stat('Notifikasi saya', myCount, ic('bell'), 'green', 'notifikasi')}
      </div>
      ${pinned ? `<div class="section-title">📢 Pengumuman Terbaru</div>
      <div class="card"><div class="card-body"><strong>${esc(pinned.judul)}</strong>
      <p class="muted">${esc(pinned.isi)}</p><small class="muted">${tgl(pinned.createdAt)}</small></div></div>` : ''}
      <div class="section-title">Akses Cepat</div>
      <div class="quick-grid">
        <button class="quick" data-nav="lapor"><span class="q-ic">${ic('clipboard')}</span><span>Lapor Masalah</span></button>
        <button class="quick" data-nav="bantuan"><span class="q-ic">${ic('lifebuoy')}</span><span>Minta Bantuan</span></button>
        <button class="quick" data-nav="surat"><span class="q-ic">${ic('mail')}</span><span>Ajukan Surat</span></button>
        <button class="quick" data-nav="jadwal"><span class="q-ic">${ic('calendar')}</span><span>Jadwal & Ronda</span></button>
        <button class="quick" data-nav="polling"><span class="q-ic">${ic('chart')}</span><span>Polling Warga</span></button>
        <button class="quick" data-nav="kontak"><span class="q-ic">${ic('phone')}</span><span>Kontak Penting</span></button>
      </div>`;
  },

  // ---------- DASHBOARD PENGURUS (panel admin RT/RW) ----------
  async _berandaPengurus(user) {
    const [lap, ban, sur, war, peng] = await Promise.all([
      DB.list('laporan'), DB.list('bantuan'), DB.list('surat'), DB.list('warga'), DB.list('pengumuman')
    ]);
    const jam = new Date().getHours();
    const sapa = jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';
    const suratPending = sur.filter((x) => x.status === 'Menunggu');
    const laporBaru = lap.filter((x) => x.status === 'Baru');
    const banBaru = ban.filter((x) => x.status === 'Baru');
    const inbox = [
      ...suratPending.map((x) => ({ coll: 'surat', id: x.id, t: 'Surat', icon: 'mail', judul: x.jenis, sub: x.keperluan, oleh: x.pemohon, at: x.createdAt, states: ['Disetujui', 'Ditolak', 'Selesai'] })),
      ...banBaru.map((x) => ({ coll: 'bantuan', id: x.id, t: 'Bantuan', icon: 'lifebuoy', judul: x.jenis, sub: x.deskripsi, oleh: x.pemohon, at: x.createdAt, states: ['Diproses', 'Selesai'] })),
      ...laporBaru.map((x) => ({ coll: 'laporan', id: x.id, t: 'Laporan', icon: 'clipboard', judul: x.judul, sub: x.deskripsi, oleh: x.pelapor, at: x.createdAt, states: ['Diproses', 'Selesai'] }))
    ].sort((a, b) => (b.at || '').localeCompare(a.at || ''));
    const totalMasuk = inbox.length;
    const stat = (label, val, icon, tone, nav) => `
      <button class="stat" data-tone="${tone}" data-nav="${nav}"><div class="stat-ic">${icon}</div>
      <div><div class="stat-val">${val}</div><div class="stat-lbl">${label}</div></div></button>`;
    const inboxCards = inbox.length ? inbox.map((m) => `
      <div class="card"><div class="card-body">
        <div class="row-between"><strong><span class="inline-ic">${ic(m.icon)}</span> ${esc(m.judul)}</strong><span class="chip">${esc(m.t)}</span></div>
        ${m.sub ? `<p class="muted">${esc(m.sub)}</p>` : ''}
        <small class="muted">Dari ${esc(m.oleh || '-')} • ${tgl(m.at)}</small>
        ${statusButtons(m.coll, m.id, m.states)}
      </div></div>`).join('') : `<div class="callout green"><div>✅</div><div>Tidak ada pengajuan yang menunggu. Semua sudah ditangani.</div></div>`;
    return `
      <div class="hero-card"><div class="hero-greet">
        <div><span class="hero-hi">${sapa},</span><strong class="hero-name">${esc(user.nama)} 🛡️</strong>
        <div class="hero-loc">📍 ${esc(CFG.WILAYAH.nama)}${user.jabatan ? ' • ' + esc(user.jabatan) : ''}</div></div>
        <span class="hero-role">🛡️ Pengurus</span>
      </div></div>
      <div class="section-title">Perlu Ditindak</div>
      <div class="stat-grid">
        ${stat('Surat menunggu', suratPending.length, ic('mail'), 'blue', 'surat')}
        ${stat('Laporan baru', laporBaru.length, ic('clipboard'), 'orange', 'lapor')}
        ${stat('Bantuan baru', banBaru.length, ic('lifebuoy'), 'red', 'bantuan')}
        ${stat('Total warga', war.length, ic('users'), 'green', 'warga')}
      </div>
      <div class="section-title">📥 Kotak Masuk Pengajuan ${totalMasuk ? `<span class="chip">${totalMasuk}</span>` : ''}</div>
      <p class="muted" style="margin:-4px 0 10px">Pengajuan dari warga masuk ke sini. Setujui, proses, atau selesaikan langsung di bawah.</p>
      ${inboxCards}
      <div class="section-title">Kelola Layanan</div>
      <div class="quick-grid">
        <button class="quick" data-nav="surat"><span class="q-ic">${ic('mail')}</span><span>Layanan Surat</span></button>
        <button class="quick" data-nav="lapor"><span class="q-ic">${ic('clipboard')}</span><span>Laporan</span></button>
        <button class="quick" data-nav="bantuan"><span class="q-ic">${ic('lifebuoy')}</span><span>Bantuan</span></button>
        <button class="quick" data-nav="pengumuman"><span class="q-ic">${ic('megaphone')}</span><span>Pengumuman</span></button>
        <button class="quick" data-nav="warga"><span class="q-ic">${ic('users')}</span><span>Data Warga</span></button>
        <button class="quick" data-nav="cariwarga"><span class="q-ic">${ic('search')}</span><span>Cari Warga</span></button>
        <button class="quick" data-nav="statistik"><span class="q-ic">${ic('pie')}</span><span>Statistik</span></button>
        <button class="quick" data-nav="jadwal"><span class="q-ic">${ic('calendar')}</span><span>Jadwal & Ronda</span></button>
      </div>`;
  },

  // ---------- MENU (semua modul) ----------
  async menu(user) {
    const ids = user.role === 'pengurus' ? MENU_ITEMS.concat(['cariwarga', 'statistik']) : MENU_ITEMS;
    const items = ids.map((id) => `
      <button class="quick" data-nav="${id}"><span class="q-ic">${ic(VIEWS[id].icon)}</span><span>${VIEWS[id].label}</span></button>`).join('');
    return `<div class="section-title">Semua Layanan</div><div class="quick-grid">${items}</div>
      <div class="card"><div class="card-body profile-row">
        <div class="avatar big">${esc((user.nama || 'U')[0].toUpperCase())}</div>
        <div><strong>${esc(user.nama)}</strong><div class="muted">${user.role === 'pengurus' ? 'Pengurus RT/RW' : 'Warga'}${user.email ? ' • ' + esc(user.email) : ''}</div></div>
        <button class="btn ghost danger" id="btn-logout">Keluar</button>
      </div></div>
      <div class="card"><div class="card-body row-between"><div><strong>Mode gelap</strong><div class="muted">Ganti tampilan terang / gelap</div></div>
        <button class="btn ghost" data-theme-toggle>${Theme.get() === 'dark' ? 'Terang' : 'Gelap'}</button></div></div>`;
  },

  // ---------- LAPOR MASALAH ----------
  async lapor(user) {
    const role = user.role; const rows = await DB.list('laporan');
    const kategori = ['Fasilitas Umum', 'Kebersihan', 'Keamanan', 'Jalan Rusak', 'Banjir', 'Lainnya'];
    const note = role !== 'pengurus' ? `<div class="callout blue"><div>📨</div><div>Laporanmu otomatis diteruskan ke pengurus RT/RW untuk ditindaklanjuti. Pantau statusnya di sini.</div></div>` : '';
    const form = role !== 'pengurus' ? `
      <form id="f-lapor" class="form card"><div class="card-body">
        <h3>Buat Laporan Baru</h3>
        <label>Judul masalah<input name="judul" required placeholder="cth: Jalan berlubang di gang 2"></label>
        <label>Kategori<select name="kategori">${kategori.map((k) => `<option>${k}</option>`).join('')}</select></label>
        <label>Lokasi<input name="lokasi" placeholder="cth: RT 01 dekat masjid"></label>
        <label>Deskripsi<textarea name="deskripsi" rows="3" required placeholder="Jelaskan detail masalahnya..."></textarea></label>
        <button class="btn primary" type="submit">Kirim Laporan</button>
      </div></form>` : '';
    const cards = rows.map((r) => `
      <div class="card" data-status="${esc(r.status)}" data-text="${esc((r.judul || '') + ' ' + (r.kategori || '') + ' ' + (r.lokasi || '') + ' ' + (r.deskripsi || '') + ' ' + (r.pelapor || ''))}"><div class="card-body">
        <div class="row-between"><strong>${esc(r.judul)}</strong>${badge(r.status)}</div>
        <div class="chips"><span class="chip">${esc(r.kategori)}</span><span class="chip">📍 ${esc(r.lokasi || '-')}</span></div>
        <p class="muted">${esc(r.deskripsi)}</p>
        <small class="muted">Oleh ${esc(r.pelapor)} • ${tgl(r.createdAt)}</small>
        ${role === 'pengurus' ? statusButtons('laporan', r.id, ['Baru', 'Diproses', 'Selesai']) : ''}
      </div></div>`).join('');
    const list = rows.length ? wrapList(cards, ['Baru', 'Diproses', 'Selesai']) : emptyState(role === 'pengurus' ? 'Belum ada laporan masuk.' : 'Belum ada laporan. Jadilah yang pertama melapor.', 'clipboard');
    return note + form + `<div class="section-title">${role === 'pengurus' ? 'Kelola Laporan Warga' : 'Daftar Laporan'}</div>` + list;
  },

  // ---------- MINTA BANTUAN ----------
  async bantuan(user) {
    const role = user.role; const rows = await DB.list('bantuan');
    const jenis = ['Darurat / Medis', 'Keamanan', 'Kesehatan', 'Sosial', 'Bencana', 'Lainnya'];
    const form = role !== 'pengurus' ? `
      <div class="callout red"><div>🚨</div><div><strong>Darurat?</strong> Hubungi <a href="tel:${esc(CFG.WILAYAH.kontakDarurat)}">${esc(CFG.WILAYAH.kontakDarurat)}</a> atau ketua RT setempat.</div></div>
      <div class="callout blue"><div>📨</div><div>Permintaan bantuanmu diteruskan ke pengurus RT/RW.</div></div>
      <form id="f-bantuan" class="form card"><div class="card-body">
        <h3>Permintaan Bantuan</h3>
        <label>Jenis bantuan<select name="jenis">${jenis.map((k) => `<option>${k}</option>`).join('')}</select></label>
        <label>Tingkat urgensi<select name="urgensi"><option>Rendah</option><option selected>Sedang</option><option>Tinggi</option></select></label>
        <label>Deskripsi<textarea name="deskripsi" rows="3" required placeholder="Jelaskan bantuan yang dibutuhkan..."></textarea></label>
        <button class="btn primary" type="submit">Kirim Permintaan</button>
      </div></form>` : '';
    const cards = rows.map((r) => `
      <div class="card" data-status="${esc(r.status)}" data-text="${esc((r.jenis || '') + ' ' + (r.deskripsi || '') + ' ' + (r.pemohon || '') + ' ' + (r.urgensi || ''))}"><div class="card-body">
        <div class="row-between"><strong>${esc(r.jenis)}</strong>${badge(r.status)}</div>
        <div class="chips"><span class="chip urg-${esc((r.urgensi || '').toLowerCase())}">Urgensi: ${esc(r.urgensi)}</span></div>
        <p class="muted">${esc(r.deskripsi)}</p>
        <small class="muted">Oleh ${esc(r.pemohon)} • ${tgl(r.createdAt)}</small>
        ${role === 'pengurus' ? statusButtons('bantuan', r.id, ['Baru', 'Diproses', 'Selesai']) : ''}
      </div></div>`).join('');
    const list = rows.length ? wrapList(cards, ['Baru', 'Diproses', 'Selesai']) : emptyState(role === 'pengurus' ? 'Belum ada permintaan bantuan masuk.' : 'Belum ada permintaan bantuan.', 'lifebuoy');
    return form + `<div class="section-title">${role === 'pengurus' ? 'Kelola Permintaan Bantuan' : 'Daftar Permintaan'}</div>` + list;
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
    const cards = rows.map((r) => `
      <div class="card" data-text="${esc((r.judul || '') + ' ' + (r.isi || '') + ' ' + (r.kategori || '') + ' ' + (r.author || ''))}"><div class="card-body">
        <div class="row-between"><strong>${r.pinned ? '📌 ' : ''}${esc(r.judul)}</strong><span class="chip">${esc(r.kategori)}</span></div>
        <p class="muted">${esc(r.isi)}</p>
        <small class="muted">${esc(r.author || 'Pengurus')} • ${tgl(r.createdAt)}</small>
        ${role === 'pengurus' ? delBtn('pengumuman', r.id) : ''}
      </div></div>`).join('');
    const list = rows.length ? wrapList(cards) : emptyState('Belum ada pengumuman.', 'megaphone');
    return form + `<div class="section-title">Semua Pengumuman</div>` + list;
  },

  // ---------- DATA WARGA ----------
  async warga(user) {
    const role = user.role; const rows = await DB.list('warga');
    const totalAnggota = rows.reduce((s, r) => s + (Number(r.jmlAnggota) || 0), 0);
    const head = `<div class="stat-grid">
      <div class="stat" data-tone="blue"><div class="stat-ic">${ic('home')}</div><div><div class="stat-val">${rows.length}</div><div class="stat-lbl">Kepala Keluarga</div></div></div>
      <div class="stat" data-tone="green"><div class="stat-ic">${ic('users')}</div><div><div class="stat-val">${totalAnggota}</div><div class="stat-lbl">Total Jiwa</div></div></div>
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
    const cards = rows.map((r) => `
      <div class="card" data-text="${esc((r.nama || '') + ' ' + (r.nik || '') + ' ' + (r.alamat || '') + ' RT' + (r.rt || '') + ' RW' + (r.rw || '') + ' ' + (r.status || '') + ' ' + (r.telp || ''))}"><div class="card-body">
        <div class="row-between"><strong>${esc(r.nama)}</strong><span class="chip">RT ${esc(r.rt)}/RW ${esc(r.rw)}</span></div>
        <div class="kv"><span>NIK</span><b>${esc(r.nik || '-')}</b></div>
        <div class="kv"><span>Alamat</span><b>${esc(r.alamat || '-')}</b></div>
        <div class="kv"><span>Anggota</span><b>${esc(r.jmlAnggota || '-')} jiwa</b></div>
        <div class="chips"><span class="chip">${esc(r.status)}</span>${r.telp ? `<a class="chip link" href="tel:${esc(r.telp)}">📞 ${esc(r.telp)}</a>` : ''}</div>
        ${role === 'pengurus' ? delBtn('warga', r.id) : ''}
      </div></div>`).join('');
    const list = rows.length ? wrapList(cards) : emptyState('Belum ada data warga.', 'users');
    return head + form + `<div class="section-title">Daftar Warga</div>` + list;
  },

  // ---------- CARI WARGA (khusus pengurus/RT) ----------
  async cariwarga(user) {
    if (user.role !== 'pengurus') return `<div class="callout blue"><div>ℹ️</div><div>Pencarian data warga hanya untuk pengurus RT/RW.</div></div>`;
    const rows = await DB.list('warga');
    if (!rows.length) return `<div class="callout blue"><div>🔍</div><div>Belum ada data warga. Tambahkan dulu lewat menu Data Warga.</div></div>`;
    const cards = rows.map((r) => `
      <div class="card" data-text="${esc((r.nama || '') + ' ' + (r.nik || '') + ' ' + (r.kk || '') + ' ' + (r.alamat || '') + ' RT' + (r.rt || '') + ' RW' + (r.rw || '') + ' ' + (r.status || '') + ' ' + (r.telp || ''))}"><div class="card-body">
        <div class="row-between"><strong>${esc(r.nama)}</strong><span class="chip">RT ${esc(r.rt)}/RW ${esc(r.rw)}</span></div>
        <div class="kv"><span>NIK</span><b>${esc(r.nik || '-')}</b></div>
        <div class="kv"><span>No. KK</span><b>${esc(r.kk || '-')}</b></div>
        <div class="kv"><span>Alamat</span><b>${esc(r.alamat || '-')}</b></div>
        <div class="kv"><span>Status</span><b>${esc(r.status || '-')}</b></div>
        <div class="kv"><span>Anggota</span><b>${esc(r.jmlAnggota || '-')} jiwa</b></div>
        ${r.telp ? `<div class="chips"><a class="chip link" href="tel:${esc(r.telp)}">📞 ${esc(r.telp)}</a></div>` : ''}
      </div></div>`).join('');
    const tb = `<div class="toolbar" data-rq><div class="search-wrap">${ic('search')}<input class="search-input" type="search" placeholder="Ketik NIK atau nama warga..." aria-label="Cari warga"></div></div>`;
    return `<div class="callout blue"><div>🔍</div><div>Cari warga berdasarkan <strong>NIK</strong> atau <strong>nama</strong> — data lengkap langsung muncul.</div></div>${tb}<div class="list">${cards}</div>`;
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
    const note = role !== 'pengurus' ? `<div class="callout blue"><div>📨</div><div>Pengajuanmu otomatis diteruskan ke pengurus RT/RW untuk diproses. Pantau statusnya di bawah.</div></div>` : '';
    const form = role !== 'pengurus' ? `
      <form id="f-surat" class="form card"><div class="card-body">
        <h3>Ajukan Surat / Layanan</h3>
        <label>Jenis layanan<select name="jenis">${jenis.map((k) => `<option>${k}</option>`).join('')}</select></label>
        <label>Keperluan<textarea name="keperluan" rows="2" required placeholder="cth: untuk pendaftaran sekolah anak"></textarea></label>
        <button class="btn primary" type="submit">Kirim Pengajuan</button>
      </div></form>` : '';
    const cards = rows.map((r) => `
      <div class="card" data-status="${esc(r.status)}" data-text="${esc((r.jenis || '') + ' ' + (r.keperluan || '') + ' ' + (r.pemohon || ''))}"><div class="card-body"><div class="row-between"><strong>${esc(r.jenis)}</strong>${badge(r.status)}</div>
      <p class="muted">${esc(r.keperluan)}</p><small class="muted">Oleh ${esc(r.pemohon)} • ${tgl(r.createdAt)}</small>
      ${role === 'pengurus' ? statusButtons('surat', r.id, ['Menunggu', 'Disetujui', 'Ditolak', 'Selesai']) : ''}
      </div></div>`).join('');
    const list = rows.length ? wrapList(cards, ['Menunggu', 'Disetujui', 'Ditolak', 'Selesai']) : emptyState(role === 'pengurus' ? 'Belum ada pengajuan surat masuk.' : 'Belum ada pengajuan surat.', 'mail');
    return note + form + `<div class="section-title">${role === 'pengurus' ? 'Kelola Pengajuan Surat' : 'Riwayat Pengajuan'}</div>` + list;
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
    const tipeIcon = { Ronda: ic('shield'), Kegiatan: ic('calendar'), Rapat: ic('clipboard'), 'Kerja Bakti': ic('users') };
    const list = rows.map((r) => `
      <div class="card"><div class="card-body">
        <div class="row-between"><strong>${tipeIcon[r.tipe] || ic('calendar')} ${esc(r.judul)}</strong><span class="chip">${esc(r.tipe)}</span></div>
        <div class="kv"><span>Waktu</span><b>${tglHari(r.tanggal)}${r.waktu ? ', ' + esc(r.waktu) : ''}</b></div>
        ${r.lokasi ? `<div class="kv"><span>Lokasi</span><b>${esc(r.lokasi)}</b></div>` : ''}
        ${r.petugas ? `<div class="kv"><span>Petugas</span><b>${esc(r.petugas)}</b></div>` : ''}
        ${role === 'pengurus' ? delBtn('jadwal', r.id) : ''}
      </div></div>`).join('') || emptyState('Belum ada jadwal.', 'calendar');
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
    const icon = { 'RT/RW': ic('home'), Kesehatan: ic('lifebuoy'), Keamanan: ic('shield'), Darurat: ic('bell'), Lainnya: ic('phone') };
    const cards = rows.map((r) => `
      <div class="card" data-text="${esc((r.nama || '') + ' ' + (r.peran || '') + ' ' + (r.kategori || '') + ' ' + (r.telp || ''))}"><div class="card-body contact-row">
        <div class="c-ic">${icon[r.kategori] || ic('phone')}</div>
        <div class="c-info"><strong>${esc(r.nama)}</strong><div class="muted">${esc(r.peran || r.kategori)}</div></div>
        <a class="btn ghost" href="tel:${esc(r.telp)}">📞 Telp</a>
      </div>${role === 'pengurus' ? `<div class="card-body pt0">${delBtn('kontak', r.id)}</div>` : ''}</div>`).join('');
    const list = rows.length ? wrapList(cards) : emptyState('Belum ada kontak.', 'phone');
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
    }).join('') || emptyState('Belum ada polling.', 'chart');
    return form + `<div class="section-title">Polling Aktif</div>` + list;
  },

  // ---------- STATISTIK (pengurus) ----------
  async statistik(user) {
    if (user.role !== 'pengurus') return `<div class="callout blue"><div>ℹ️</div><div>Halaman statistik hanya untuk pengurus RT/RW.</div></div>`;
    const [lap, ban, sur, war, iur] = await Promise.all([DB.list('laporan'), DB.list('bantuan'), DB.list('surat'), DB.list('warga'), DB.list('iuran')]);
    const totJiwa = war.reduce((s, r) => s + (Number(r.jmlAnggota) || 0), 0);
    const aktif = lap.filter((x) => x.status !== 'Selesai').length;
    const suratPending = sur.filter((x) => x.status === 'Menunggu').length;
    const sc = (val, lbl, icon, tone) => `<div class="stat" data-tone="${tone}"><div class="stat-ic">${ic(icon)}</div><div><div class="stat-val">${val}</div><div class="stat-lbl">${lbl}</div></div></div>`;
    const bar = (label, val, max, cls) => {
      const pct = max ? Math.round(val / max * 100) : 0;
      return `<div class="bar-row"><span class="bar-lbl">${esc(label)}</span><div class="bar-track"><div class="bar-fill ${cls || ''}" style="width:${pct}%"></div></div><span class="bar-val">${val}</span></div>`;
    };
    const lstat = [['Baru', 'tone-red'], ['Diproses', 'tone-orange'], ['Selesai', 'tone-green']].map((x) => [x[0], lap.filter((l) => l.status === x[0]).length, x[1]]);
    const maxL = Math.max(1, ...lstat.map((x) => x[1]));
    const lapStatBars = lstat.map((x) => bar(x[0], x[1], maxL, x[2])).join('');
    const katMap = {}; lap.forEach((l) => { const k = l.kategori || 'Lainnya'; katMap[k] = (katMap[k] || 0) + 1; });
    const kats = Object.keys(katMap).map((k) => [k, katMap[k]]).sort((a, b) => b[1] - a[1]);
    const maxKat = Math.max(1, ...kats.map((k) => k[1]));
    const katBars = kats.length ? kats.map((k) => bar(k[0], k[1], maxKat)).join('') : emptyState('Belum ada data laporan.', 'chart');
    const sstat = ['Menunggu', 'Disetujui', 'Ditolak', 'Selesai'].map((s) => [s, sur.filter((x) => x.status === s).length]);
    const maxS = Math.max(1, ...sstat.map((x) => x[1]));
    const suratBars = sstat.map((x) => bar(x[0], x[1], maxS)).join('');
    const rtMap = {}; war.forEach((w) => { const k = 'RT ' + (w.rt || '-'); rtMap[k] = (rtMap[k] || 0) + 1; });
    const rts = Object.keys(rtMap).sort().map((k) => [k, rtMap[k]]);
    const maxRt = Math.max(1, ...rts.map((k) => k[1]));
    const rtBars = rts.length ? rts.map((k) => bar(k[0], k[1], maxRt)).join('') : emptyState('Belum ada data warga.', 'users');
    const lunas = iur.filter((x) => x.status === 'Lunas').length;
    const belum = iur.filter((x) => x.status === 'Belum').length;
    const bantuanAktif = ban.filter((x) => x.status !== 'Selesai').length;
    return `
      <div class="stat-grid">
        ${sc(war.length, 'Kepala Keluarga', 'home', 'blue')}
        ${sc(totJiwa, 'Total Jiwa', 'users', 'green')}
        ${sc(aktif, 'Laporan Aktif', 'clipboard', 'orange')}
        ${sc(suratPending, 'Surat Menunggu', 'mail', 'red')}
      </div>
      <div class="card"><div class="card-body"><h3>Laporan per Status</h3>${lapStatBars}</div></div>
      <div class="card"><div class="card-body"><h3>Laporan per Kategori</h3>${katBars}</div></div>
      <div class="card"><div class="card-body"><h3>Surat per Status</h3>${suratBars}</div></div>
      <div class="card"><div class="card-body"><h3>Warga per RT</h3>${rtBars}</div></div>
      <div class="card"><div class="card-body"><h3>Ringkasan Lain</h3>
        <div class="kv"><span>Permintaan bantuan aktif</span><b>${bantuanAktif}</b></div>
        <div class="kv"><span>Iuran lunas</span><b>${lunas}</b></div>
        <div class="kv"><span>Iuran belum bayar</span><b>${belum}</b></div>
      </div></div>`;
  },

  // ---------- NOTIFIKASI / STATUS SAYA ----------
  async notifikasi(user) {
    const [lap, ban, sur, peng] = await Promise.all([DB.list('laporan'), DB.list('bantuan'), DB.list('surat'), DB.list('pengumuman')]);
    const mine = [
      ...lap.filter((x) => x.pelapor === user.nama).map((x) => ({ t: 'Laporan', label: x.judul, status: x.status, at: x.createdAt, icon: 'clipboard' })),
      ...ban.filter((x) => x.pemohon === user.nama).map((x) => ({ t: 'Bantuan', label: x.jenis, status: x.status, at: x.createdAt, icon: 'lifebuoy' })),
      ...sur.filter((x) => x.pemohon === user.nama).map((x) => ({ t: 'Surat', label: x.jenis, status: x.status, at: x.createdAt, icon: 'mail' }))
    ].sort((a, b) => (b.at || '').localeCompare(a.at || ''));
    const mineList = mine.map((m) => `
      <div class="card"><div class="card-body"><div class="row-between"><strong><span class="inline-ic">${ic(m.icon)}</span> ${esc(m.label)}</strong>${badge(m.status)}</div>
      <small class="muted">${esc(m.t)} • ${tgl(m.at)}</small></div></div>`).join('') || emptyState('Belum ada pengajuan atas nama Anda.', 'bell');
    const info = peng.slice(0, 6).map((p) => `
      <div class="card"><div class="card-body"><div class="row-between"><strong><span class="inline-ic">${ic('megaphone')}</span> ${esc(p.judul)}</strong>${p.pinned ? '<span class="chip">📌</span>' : ''}</div>
      <p class="muted">${esc(p.isi)}</p><small class="muted">${tgl(p.createdAt)}</small></div></div>`).join('') || emptyState('Belum ada pengumuman.', 'megaphone');
    const notifBtn = (Notif.supported() && Notification.permission !== 'granted')
      ? `<button class="btn primary block" data-notif-enable>🔔 Aktifkan Notifikasi</button>`
      : `<div class="callout green"><div>✅</div><div>Notifikasi aktif di perangkat ini.</div></div>`;
    return `<div class="card"><div class="card-body">${notifBtn}</div></div>
      <div class="section-title">Status Pengajuan Saya</div>${mineList}
      <div class="section-title">Info & Pengumuman</div>${info}`;
  }
};

// ============================================================
//  HELPERS DATA
// ============================================================
async function countMine(nama) {
  const [lap, ban, sur] = await Promise.all([DB.list('laporan'), DB.list('bantuan'), DB.list('surat')]);
  return lap.filter((x) => x.pelapor === nama).length + ban.filter((x) => x.pemohon === nama).length + sur.filter((x) => x.pemohon === nama).length;
}
async function getPengurusList() {
  let list = [];
  try { list = await DB.list('pengurus'); } catch (e) { list = []; }
  if (!list || !list.length) list = (CFG.PENGURUS || []);
  return list;
}
function formData(form) {
  const fd = new FormData(form); const o = {};
  fd.forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; });
  return o;
}

// ============================================================
//  ROUTER / RENDER
// ============================================================
async function render(view) {
  const user = Session.get();
  if (!user) return renderLogin();
  view = view || localStorage.getItem('siwarga:lastView') || 'beranda';
  if (!VIEWS[view]) view = 'beranda';
  localStorage.setItem('siwarga:lastView', view);
  const tabs = user.role === 'pengurus' ? TABS_PENGURUS : TABS_WARGA;
  const tabLabel = (t) => (t === 'beranda' && user.role === 'pengurus') ? 'Dashboard' : VIEWS[t].label;
  const headTitle = (view === 'beranda' && user.role === 'pengurus') ? 'Dashboard Pengurus' : VIEWS[view].label;
  $('#app').innerHTML = `
    <header class="topbar">
      <div><div class="tb-title">${ic(VIEWS[view].icon)} ${esc(headTitle)}</div>
      <div class="tb-sub">${esc(CFG.WILAYAH.nama)}</div></div>
      <div class="topbar-actions">
        <button class="icon-btn" data-theme-toggle title="Ganti tema">${ic(Theme.get() === 'dark' ? 'sun' : 'moon')}</button>
        <button class="avatar" id="btn-profile" title="Menu & profil">${esc((user.nama || 'U')[0].toUpperCase())}</button>
      </div>
    </header>
    <main class="content" id="content">${skeleton()}</main>
    <nav class="tabbar">${tabs.map((t) => `<button class="tab ${t === view ? 'active' : ''}" data-nav="${t}">${ic(VIEWS[t].icon)}<span>${esc(tabLabel(t))}</span></button>`).join('')}</nav>`;
  try {
    $('#content').innerHTML = await Views[view](user);
    if ($('.toolbar[data-rq]')) applyListFilter();
  } catch (err) {
    console.error(err);
    $('#content').innerHTML = emptyState('Gagal memuat halaman. Coba lagi.', 'bell');
  }
}

function renderLogin(mode) {
  mode = mode || 'login';
  const isReg = mode === 'register';
  $('#app').innerHTML = `
    <div class="login">
      <div class="login-card">
        <div class="login-logo">🏘️</div>
        <h1>${esc(CFG.APP_NAME || 'Aplikasi')}</h1>
        <p class="muted">Layanan digital RT/RW — ${esc(CFG.WILAYAH.nama)}</p>
        ${isReg ? `
        <form id="f-register" class="form">
          <label>Nama lengkap<input name="nama" required placeholder="Nama sesuai KTP"></label>
          <label>NIK (16 digit)<input name="nik" inputmode="numeric" maxlength="16" required placeholder="contoh: 3201xxxxxxxxxxxx"></label>
          <label>Email<input name="email" type="email" required placeholder="email@contoh.com"></label>
          <label>Password<input name="pass" type="password" required minlength="6" placeholder="minimal 6 karakter"></label>
          <button class="btn primary block" type="submit">Daftar sebagai Warga</button>
        </form>
        <small class="muted">Sudah punya akun? <a href="#" data-mode="login">Masuk di sini</a></small>
        ` : `
        <form id="f-login" class="form">
          <label>Email<input name="email" type="email" required placeholder="email@contoh.com"></label>
          <label>Password<input name="pass" type="password" required placeholder="password"></label>
          <button class="btn primary block" type="submit">Masuk</button>
        </form>
        <small class="muted">Belum punya akun? <a href="#" data-mode="register">Daftar sebagai warga</a><br>Akun pengurus/RT/RW dibuat manual oleh admin di database.</small>
        `}
      </div>
    </div>`;
  document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', (ev) => { ev.preventDefault(); renderLogin(b.dataset.mode); }));

  const reg = $('#f-register');
  if (reg) reg.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = formData(e.target);
    if (!d.nama) { toast('Nama wajib diisi'); return; }
    if (!/^\d{16}$/.test(d.nik || '')) { toast('NIK harus 16 digit angka'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || '')) { toast('Format email tidak valid'); return; }
    if (!d.pass || d.pass.length < 6) { toast('Password minimal 6 karakter'); return; }
    const email = d.email.toLowerCase();
    const pengList = await getPengurusList();
    if (pengList.some((p) => String(p.email || '').toLowerCase() === email)) { toast('Email ini milik akun pengurus, silakan login.'); return; }
    const wargaList = await DB.list('warga');
    if (wargaList.some((w) => String(w.email || '').toLowerCase() === email)) { toast('Email sudah terdaftar, silakan login.'); return; }
    await DB.add('warga', { nama: d.nama, nik: d.nik, email: d.email, pass: d.pass, status: 'Tetap', jmlAnggota: 1 });
    toast('Pendaftaran berhasil ✅ Silakan login.');
    renderLogin('login');
  });

  const log = $('#f-login');
  if (log) log.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = formData(e.target);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || '')) { toast('Format email tidak valid'); return; }
    if (!d.pass) { toast('Password wajib diisi'); return; }
    const email = d.email.toLowerCase();
    const pengList = await getPengurusList();
    const peng = pengList.find((p) => String(p.email || '').toLowerCase() === email && String(p.pass || '') === d.pass);
    if (peng) {
      Session.set({ nama: peng.nama || 'Pengurus', nik: peng.nik || '', email: peng.email || d.email, role: 'pengurus', jabatan: peng.jabatan || '' });
      toast('Selamat datang, ' + (peng.nama || 'Pengurus'));
      render('beranda');
      return;
    }
    const wargaList = await DB.list('warga');
    const warga = wargaList.find((w) => String(w.email || '').toLowerCase() === email && String(w.pass || '') === d.pass);
    if (warga) {
      Session.set({ nama: warga.nama, nik: warga.nik || '', email: warga.email, role: 'warga' });
      toast('Selamat datang, ' + warga.nama);
      render('beranda');
      return;
    }
    toast('Email atau password salah.');
  });
}

// ============================================================
//  EVENT HANDLERS (delegasi global)
// ============================================================
document.addEventListener('submit', async (e) => {
  const f = e.target; const user = Session.get(); if (!user) return;
  const map = {
    'f-lapor': (d) => DB.add('laporan', { judul: d.judul, kategori: d.kategori, lokasi: d.lokasi, deskripsi: d.deskripsi, status: 'Baru', pelapor: user.nama }),
    'f-bantuan': (d) => DB.add('bantuan', { jenis: d.jenis, urgensi: d.urgensi, deskripsi: d.deskripsi, status: 'Baru', pemohon: user.nama }),
    'f-surat': (d) => DB.add('surat', { jenis: d.jenis, keperluan: d.keperluan, status: 'Menunggu', pemohon: user.nama }),
    'f-peng': (d) => DB.add('pengumuman', { judul: d.judul, isi: d.isi, kategori: d.kategori, pinned: !!d.pinned, author: user.nama }),
    'f-warga': (d) => DB.add('warga', { nama: d.nama, nik: d.nik, kk: d.kk, alamat: d.alamat, rt: d.rt, rw: d.rw, telp: d.telp, status: d.status, jmlAnggota: Number(d.jmlAnggota) || 1 }),
    'f-jadwal': (d) => DB.add('jadwal', { judul: d.judul, tipe: d.tipe, tanggal: d.tanggal, waktu: d.waktu, lokasi: d.lokasi, petugas: d.petugas }),
    'f-kontak': (d) => DB.add('kontak', { nama: d.nama, peran: d.peran, telp: d.telp, kategori: d.kategori }),
    'f-polling': (d) => { const opsi = [d.o1, d.o2, d.o3, d.o4].filter(Boolean).map((t) => ({ text: t, votes: 0 })); return DB.add('polling', { judul: d.judul, opsi, status: 'Dibuka', author: user.nama }); }
  };
  if (map[f.id]) {
    e.preventDefault();
    await map[f.id](formData(f));
    toast(f.id === 'f-surat' || f.id === 'f-lapor' || f.id === 'f-bantuan' ? 'Terkirim ke pengurus ✅' : 'Berhasil disimpan ✅');
    render(localStorage.getItem('siwarga:lastView'));
  }
});

document.addEventListener('input', (e) => { if (e.target.closest('.search-input')) applyListFilter(); });

document.addEventListener('click', async (e) => {
  const fchip = e.target.closest('.fchip');
  if (fchip) { $$('.fchip', fchip.parentElement).forEach((x) => x.classList.remove('active')); fchip.classList.add('active'); applyListFilter(); return; }
  const tt = e.target.closest('[data-theme-toggle]');
  if (tt) { Theme.toggle(); render(localStorage.getItem('siwarga:lastView')); return; }
  const ne = e.target.closest('[data-notif-enable]');
  if (ne) { await Notif.enable(); render(localStorage.getItem('siwarga:lastView')); return; }
  const prof = e.target.closest('#btn-profile');
  if (prof) { render('menu'); return; }
  const logout = e.target.closest('#btn-logout');
  if (logout) { if (await confirmModal('Keluar dari akun?', { okText: 'Keluar' })) { Session.clear(); render(); } return; }
  const nav = e.target.closest('[data-nav]');
  if (nav) { render(nav.dataset.nav); return; }
  const setb = e.target.closest('[data-set]');
  if (setb) {
    const parts = setb.dataset.set.split(':'); const coll = parts[0], id = parts[1], status = parts[2];
    await DB.update(coll, id, { status });
    toast('Status: ' + status);
    Notif.show(CFG.APP_NAME, 'Status diperbarui menjadi ' + status + '.');
    render(localStorage.getItem('siwarga:lastView'));
    return;
  }
  const del = e.target.closest('[data-del]');
  if (del) {
    const parts = del.dataset.del.split(':'); const coll = parts[0], id = parts[1];
    if (await confirmModal('Hapus data ini? Tindakan ini tidak bisa dibatalkan.', { danger: true, okText: 'Hapus' })) {
      await DB.remove(coll, id); toast('Data dihapus'); render(localStorage.getItem('siwarga:lastView'));
    }
    return;
  }
  const vote = e.target.closest('[data-vote]');
  if (vote) {
    const parts = vote.dataset.vote.split(':'); const id = parts[0], idx = Number(parts[1]);
    if (Voted.has(id)) { toast('Anda sudah memilih'); return; }
    const rows = await DB.list('polling'); const p = rows.find((x) => x.id === id);
    if (p && p.status === 'Dibuka') {
      const opsi = p.opsi.slice(); opsi[idx].votes = (opsi[idx].votes || 0) + 1;
      await DB.update('polling', id, { opsi }); Voted.add(id); toast('Suara terkirim ✅'); render('polling');
    }
    return;
  }
});

// ============================================================
//  INIT
// ============================================================
(async function init() {
  Theme.apply();
  try { if (DB.seedIfEmpty) await DB.seedIfEmpty(); } catch (e) {}
  render();
  if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js').catch(() => {}); }
})();
