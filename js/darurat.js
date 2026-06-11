// ============================================================
//  DARURAT (SOS) — Peringatan darurat broadcast utk RT/RW
// ------------------------------------------------------------
//  Tombol SOS melayang + view Darurat. Saat dipicu, semua
//  anggota org yang sedang membuka aplikasi langsung dapat
//  alarm layar penuh + bunyi + getar + notifikasi yang berisi
//  NAMA & ALAMAT pelapor (otomatis dari data warga).
//  Modul tambahan; TIDAK mengubah app.js. Aktif hanya saat
//  BACKEND === 'supabase'. Butuh tabel darurat (supabase-darurat.sql).
//
//  CATATAN: push ke HP yang aplikasinya tertutup total butuh
//  server push (VAPID) — belum diaktifkan. Fitur ini menjangkau
//  perangkat yang app-nya sedang terbuka / berjalan di latar.
// ============================================================
(function () {
  var C = window.APP_CONFIG || {};
  if (C.BACKEND !== 'supabase') return;

  var SINCE_KEY = 'siwarga:darurat:since';
  var since = localStorage.getItem(SINCE_KEY) || '';
  var initialized = !!since;

  var TIPE = {
    maling: { emoji: '\uD83D\uDEA8', short: 'Maling', label: 'MALING / KEAMANAN' },
    kebakaran: { emoji: '\uD83D\uDD25', short: 'Kebakaran', label: 'KEBAKARAN' },
    medis: { emoji: '\uD83D\uDE91', short: 'Medis', label: 'DARURAT MEDIS' },
    bencana: { emoji: '\uD83C\uDF0A', short: 'Bencana', label: 'BENCANA ALAM' },
    lainnya: { emoji: '\u26A0\uFE0F', short: 'Lainnya', label: 'DARURAT' }
  };

  try {
    if (typeof ICON !== 'undefined' && !ICON.alert) ICON.alert = '<svg class="ic" viewBox="0 0 24 24"><path d="M12 2 1 21h22L12 2z"/><path d="M12 9v5M12 17h.01"/></svg>';
  } catch (e) {}
  try {
    if (!document.getElementById('darurat-css')) {
      var st = document.createElement('style'); st.id = 'darurat-css';
      st.textContent = '.sos-fab{position:fixed;right:16px;bottom:84px;z-index:900;display:none;align-items:center;gap:6px;background:#dc2626;color:#fff;border:none;border-radius:999px;padding:12px 16px;font-weight:800;box-shadow:0 6px 20px rgba(220,38,38,.45);cursor:pointer;animation:sospulse 2s infinite}.sos-fab .sos-ic{font-size:18px}@keyframes sospulse{0%{box-shadow:0 0 0 0 rgba(220,38,38,.5)}70%{box-shadow:0 0 0 14px rgba(220,38,38,0)}100%{box-shadow:0 0 0 0 rgba(220,38,38,0)}}.btn.danger:not(.ghost){background:#dc2626;color:#fff;border-color:transparent}.btn.block{width:100%;justify-content:center;text-align:center}.chip.danger{background:#fee2e2;color:#b91c1c}.callout.red{background:#fef2f2;border:1px solid #fecaca}.dar-chip{cursor:pointer;border:1px solid var(--line);background:var(--card);color:var(--ink);padding:8px 12px;border-radius:12px;font-weight:700;font-size:14px}.dar-chip.active{background:#dc2626;color:#fff;border-color:transparent}.darurat-alarm{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);padding:20px}.darurat-alarm .da-card{background:#fff;border-radius:20px;max-width:420px;width:100%;text-align:center;padding:24px;border-top:10px solid #dc2626;animation:dashake .5s}.darurat-alarm .da-emoji{font-size:54px;animation:dablink 1s infinite}.darurat-alarm .da-addr{background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:10px;margin:10px 0;font-size:15px}.darurat-alarm a{color:#b91c1c;font-weight:700}@keyframes dablink{50%{opacity:.35}}@keyframes dashake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}.darurat-alarm h2{margin:8px 0 4px;color:#b91c1c}';
      document.head.appendChild(st);
    }
  } catch (e) {}

  function prof() { return (window.SiAuth && window.SiAuth.profile) || null; }
  function myId() { var p = prof(); return p && p.id; }
  async function ensureId() { var id = myId(); if (id) return id; try { if (window.SiAuth && SiAuth.refresh) await SiAuth.refresh(); } catch (e) {} return myId(); }
  function meUser() { try { return Session.get() || {}; } catch (e) { return {}; } }
  function myNama() { var u = meUser(); return u.nama || (prof() && prof().nama) || 'Warga'; }
  function ctime(v) { try { return new Date(v).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }

  // Ambil info pelapor (nama, alamat, telp, rt, rw) dari data warga, dicocokkan via NIK lalu nama.
  async function myWargaInfo() {
    var p = prof() || {};
    var info = { nama: myNama(), alamat: '', telp: p.telp || '', rt: '', rw: '' };
    try {
      var list = await DB.list('warga');
      var nik = (p.nik || '').trim();
      var nm = (info.nama || '').trim().toLowerCase();
      var w = null;
      if (nik) w = list.filter(function (x) { return (x.nik || '').trim() === nik; })[0];
      if (!w && nm) w = list.filter(function (x) { return String(x.nama || '').trim().toLowerCase() === nm; })[0];
      if (w) { info.alamat = w.alamat || ''; info.telp = info.telp || w.telp || ''; info.rt = w.rt || ''; info.rw = w.rw || ''; if (w.nama) info.nama = w.nama; }
    } catch (e) {}
    return info;
  }
  function alamatStr(info) { return [info.alamat, info.rt ? 'RT ' + info.rt : '', info.rw ? 'RW ' + info.rw : ''].filter(Boolean).join(', '); }
  function telLink(t) { var s = String(t || '').replace(/[^0-9+]/g, ''); return s ? '<a href="tel:' + s + '">' + esc(t) + '</a>' : ''; }

  function beep() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
      var ctx = new Ctx(); var o = ctx.createOscillator(); var g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination); o.type = 'square'; g.gain.value = 0.18;
      var t = ctx.currentTime;
      for (var i = 0; i < 5; i++) { o.frequency.setValueAtTime(880, t + i * 0.4); o.frequency.setValueAtTime(523, t + i * 0.4 + 0.2); }
      o.start(t); o.stop(t + 2);
    } catch (e) {}
  }
  async function notify(title, body) {
    try {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'default') { try { await Notification.requestPermission(); } catch (e) {} }
      if (Notification.permission !== 'granted') return;
      var reg = null; try { reg = await navigator.serviceWorker.getRegistration(); } catch (e) {}
      var opts = { body: body, icon: './icons/icon.svg', badge: './icons/icon.svg', tag: 'darurat', renotify: true, requireInteraction: true, vibrate: [300, 150, 300, 150, 500] };
      if (reg && reg.showNotification) reg.showNotification(title, opts); else new Notification(title, opts);
    } catch (e) {}
  }

  function raiseAlarm(d) {
    document.querySelectorAll('.darurat-alarm').forEach(function (n) { n.remove(); });
    var m = TIPE[d.tipe] || TIPE.lainnya;
    var addr = d.alamat || d.lokasi || '';
    var wrap = document.createElement('div'); wrap.className = 'darurat-alarm';
    wrap.innerHTML = '<div class="da-card"><div class="da-emoji">' + m.emoji + '</div><h2>PERINGATAN ' + m.label + '</h2>' +
      '<div class="da-addr"><div>\uD83D\uDC64 <strong>' + esc(d.pengirim || 'Warga') + '</strong></div>' +
      (addr ? '<div>\uD83D\uDCCD ' + esc(addr) + '</div>' : '') +
      (d.telp ? '<div>\uD83D\uDCDE ' + telLink(d.telp) + '</div>' : '') + '</div>' +
      (d.pesan ? '<p class="muted">' + esc(d.pesan) + '</p>' : '') +
      '<p class="muted sm">' + esc(ctime(d.createdAt)) + '</p>' +
      '<div class="modal-actions"><button class="btn ghost" data-aclose>Tutup</button><button class="btn danger" data-aview>Lihat Detail</button></div></div>';
    document.body.appendChild(wrap);
    wrap.addEventListener('click', function (ev) { if (ev.target === wrap || ev.target.closest('[data-aclose]')) { wrap.remove(); return; } if (ev.target.closest('[data-aview]')) { wrap.remove(); try { render('darurat'); } catch (e) {} } });
    beep(); try { if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 500]); } catch (e) {}
    var body = 'Pelapor: ' + (d.pengirim || 'Warga') + (addr ? '\nAlamat: ' + addr : '') + (d.telp ? '\nTelp: ' + d.telp : '') + (d.pesan ? '\n' + d.pesan : '');
    notify(m.emoji + ' PERINGATAN ' + m.label, body);
  }

  function openSosModal() {
    document.querySelectorAll('.sos-modal').forEach(function (n) { n.remove(); });
    var wrap = document.createElement('div'); wrap.className = 'modal-overlay sos-modal';
    var chips = ['maling', 'kebakaran', 'medis', 'bencana', 'lainnya'].map(function (k, idx) { var m = TIPE[k]; return '<button type="button" class="dar-chip' + (idx === 0 ? ' active' : '') + '" data-tipe="' + k + '">' + m.emoji + ' ' + m.short + '</button>'; }).join('');
    wrap.innerHTML = '<div class="modal"><div class="modal-head"><strong>\uD83D\uDEA8 Peringatan Darurat</strong><button class="icon-btn" data-mclose>\u2715</button></div><div class="modal-body"><p class="muted sm" style="margin-top:0">Pilih jenis keadaan darurat lalu kirim. Peringatan langsung dikirim ke seluruh warga & pengurus yang sedang membuka aplikasi.</p><div class="pick-wrap">' + chips + '</div><label>Lokasi kejadian<input id="sos-lokasi" placeholder="otomatis dari alamat kamu"></label><label>Keterangan (opsional)<input id="sos-pesan" placeholder="cth: 2 orang mencurigakan"></label><p class="muted sm" id="sos-note">\uD83D\uDCCD Nama & alamat kamu otomatis disertakan ke peringatan.</p></div><div class="modal-actions"><button class="btn ghost" data-mclose>Batal</button><button class="btn danger" id="sos-send">\uD83D\uDEA8 KIRIM PERINGATAN</button></div></div>';
    document.body.appendChild(wrap); requestAnimationFrame(function () { wrap.classList.add('show'); });
    var tipe = 'maling';
    myWargaInfo().then(function (info) {
      var af = alamatStr(info);
      var inp = wrap.querySelector('#sos-lokasi'); if (inp && !inp.value && af) inp.value = af;
      var note = wrap.querySelector('#sos-note'); if (note) note.innerHTML = '\uD83D\uDCCD Otomatis disertakan: <strong>' + esc(info.nama) + '</strong>' + (af ? ' \u2014 ' + esc(af) : '') + (info.telp ? ' \u2022 ' + esc(info.telp) : '');
    });
    function close() { wrap.classList.remove('show'); setTimeout(function () { wrap.remove(); }, 200); }
    async function doSend() {
      var btn = wrap.querySelector('#sos-send'); btn.disabled = true; btn.textContent = 'Mengirim...';
      var lokasi = (wrap.querySelector('#sos-lokasi').value || '').trim();
      var pesan = (wrap.querySelector('#sos-pesan').value || '').trim();
      var id = await ensureId();
      var info = await myWargaInfo();
      var af = alamatStr(info);
      var lokasiFinal = lokasi || af;
      try {
        await DB.add('darurat', { tipe: tipe, pengirim: info.nama, pengirimId: id, telp: info.telp, alamat: af, lokasi: lokasiFinal, pesan: pesan, status: 'aktif' });
        since = new Date().toISOString(); localStorage.setItem(SINCE_KEY, since);
        toast('Peringatan darurat terkirim \uD83D\uDEA8');
        close();
        try { if (typeof render === 'function') render('darurat'); } catch (e) {}
      } catch (err) { toast(err.message || 'Gagal mengirim'); btn.disabled = false; btn.textContent = '\uD83D\uDEA8 KIRIM PERINGATAN'; }
    }
    wrap.addEventListener('click', function (ev) {
      if (ev.target === wrap || ev.target.closest('[data-mclose]')) return close();
      var c = ev.target.closest('[data-tipe]'); if (c) { wrap.querySelectorAll('[data-tipe]').forEach(function (x) { x.classList.remove('active'); }); c.classList.add('active'); tipe = c.dataset.tipe; return; }
      if (ev.target.closest('#sos-send')) return doSend();
    });
  }

  if (typeof VIEWS !== 'undefined') VIEWS.darurat = { label: 'Darurat', icon: 'alert' };

  if (typeof Views !== 'undefined') {
    Views.darurat = async function (user) {
      var all = []; try { all = await DB.list('darurat'); } catch (e) {}
      all.sort(function (a, b) { var sa = a.status === 'aktif' ? 0 : 1, sb = b.status === 'aktif' ? 0 : 1; if (sa !== sb) return sa - sb; return (b.createdAt || '').localeCompare(a.createdAt || ''); });
      var mid = myId();
      var top = '<div class="callout red"><div>\uD83D\uDEA8</div><div>Tekan tombol di bawah saat ada keadaan darurat (maling, kebakaran, medis). Nama & alamat kamu otomatis dikirim, dan semua warga & pengurus yang sedang membuka aplikasi langsung mendapat peringatan berbunyi.</div></div><button class="btn danger block" data-sos style="margin-bottom:12px">\uD83D\uDEA8 PICU PERINGATAN DARURAT</button>';
      if (!all.length) return top + emptyState('Belum ada laporan darurat.', 'alert');
      var list = all.map(function (d) {
        var m = TIPE[d.tipe] || TIPE.lainnya;
        var canManage = user.role === 'pengurus' || String(d.pengirimId) === String(mid);
        var addr = d.alamat || d.lokasi || '';
        return '<div class="card"><div class="card-body"><div class="row-between"><strong>' + m.emoji + ' ' + m.label + '</strong><span class="chip ' + (d.status === 'aktif' ? 'danger' : '') + '">' + (d.status === 'aktif' ? 'AKTIF' : 'Selesai') + '</span></div><div class="kv"><span>Pelapor</span><b>' + esc(d.pengirim || '-') + '</b></div>' + (addr ? '<div class="kv"><span>Alamat</span><b>' + esc(addr) + '</b></div>' : '') + (d.telp ? '<div class="kv"><span>Telp</span><b>' + telLink(d.telp) + '</b></div>' : '') + (d.pesan ? '<p class="muted">' + esc(d.pesan) + '</p>' : '') + '<small class="muted">' + esc(ctime(d.createdAt)) + '</small>' + (canManage ? '<div class="actions">' + (d.status === 'aktif' ? '<button class="btn ghost mini" data-darsel="' + esc(d.id) + '">Tandai Selesai</button>' : '') + '<button class="btn ghost danger mini" data-del="darurat:' + esc(d.id) + '">Hapus</button></div>' : '') + '</div></div>';
      }).join('');
      return top + '<div class="section-title">Riwayat Darurat</div><div class="list">' + list + '</div>';
    };

    if (typeof Views.menu === 'function') {
      var _menu = Views.menu.bind(Views);
      Views.menu = async function (user) {
        var html = await _menu(user);
        var block = '<div class="section-title">Darurat</div><div class="quick-grid"><button class="quick" data-nav="darurat" style="border-color:#fecaca"><span class="q-ic" style="color:#dc2626">' + ic('alert') + '</span><span>Darurat / SOS</span></button></div>';
        var marker = '<div class="card"><div class="card-body profile-row">';
        var i = html.indexOf(marker);
        html = i >= 0 ? html.slice(0, i) + block + html.slice(i) : html + block;
        return html;
      };
    }
  }

  // tombol SOS melayang
  function ensureFab() {
    if (document.getElementById('sos-fab')) return;
    var b = document.createElement('button'); b.id = 'sos-fab'; b.className = 'sos-fab'; b.setAttribute('data-sos', '');
    b.innerHTML = '<span class="sos-ic">\uD83D\uDEA8</span><span>SOS</span>';
    document.body.appendChild(b);
  }
  ensureFab();
  setInterval(function () {
    var fab = document.getElementById('sos-fab'); if (!fab) { ensureFab(); return; }
    var u = null; try { u = Session.get(); } catch (e) {}
    fab.style.display = u ? 'inline-flex' : 'none';
  }, 1500);

  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-sos]'); if (!b) return; openSosModal(); });
  document.addEventListener('click', async function (e) {
    var b = e.target.closest && e.target.closest('[data-darsel]'); if (!b) return;
    try { await DB.update('darurat', b.dataset.darsel, { status: 'selesai' }); toast('Ditandai selesai'); try { render('darurat'); } catch (e2) {} } catch (err) { toast(err.message || 'Gagal'); }
  });

  // polling broadcast → alarm
  async function poll() {
    var u = null; try { u = Session.get(); } catch (e) {} if (!u) return;
    var all = []; try { all = await DB.list('darurat'); } catch (e) { return; }
    if (!initialized) { var mx0 = ''; all.forEach(function (x) { if ((x.createdAt || '') > mx0) mx0 = x.createdAt; }); since = mx0 || new Date(0).toISOString(); localStorage.setItem(SINCE_KEY, since); initialized = true; return; }
    var mid = myId();
    var fresh = all.filter(function (x) { return (x.createdAt || '') > since && x.status === 'aktif' && String(x.pengirimId) !== String(mid); });
    if (fresh.length) { fresh.sort(function (a, b) { return (a.createdAt || '').localeCompare(b.createdAt || ''); }); raiseAlarm(fresh[fresh.length - 1]); }
    var mx = since; all.forEach(function (x) { if ((x.createdAt || '') > mx) mx = x.createdAt; }); since = mx; localStorage.setItem(SINCE_KEY, since);
  }
  setInterval(poll, 5000);
  setTimeout(poll, 1500);
})();
