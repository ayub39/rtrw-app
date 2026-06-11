// ============================================================
//  CHAT — Diskusi Ronda + Chat Warga <-> Pengurus RT/RW (SaaS)
// ------------------------------------------------------------
//  Menambah fitur lewat objek Views/VIEWS app.js TANPA mengubah
//  app.js. Aktif HANYA saat BACKEND === 'supabase'.
//  Butuh tabel ronda_chat & chat_rt (lihat supabase-chat.sql).
// ============================================================
(function () {
  var C = window.APP_CONFIG || {};
  if (C.BACKEND !== 'supabase') return;

  try {
    if (typeof ICON !== 'undefined' && !ICON.chat) ICON.chat = '<svg class="ic" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  } catch (e) {}
  try {
    if (!document.getElementById('chat-extra-css')) {
      var st = document.createElement('style'); st.id = 'chat-extra-css';
      st.textContent = '.pick-chip{cursor:pointer;border:1px solid var(--line);background:var(--card);color:var(--ink);padding:6px 10px;border-radius:999px;font-size:13px;display:inline-flex;gap:4px;align-items:center}.pick-chip.active{background:var(--green);color:#fff;border-color:transparent}.pick-chip.active .muted{color:rgba(255,255,255,.85)}.pick-wrap{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 2px}';
      document.head.appendChild(st);
    }
  } catch (e) {}

  function prof() { return (window.SiAuth && window.SiAuth.profile) || null; }
  function myId() { var p = prof(); return p && p.id; }
  async function ensureId() { var id = myId(); if (id) return id; try { if (window.SiAuth && SiAuth.refresh) await SiAuth.refresh(); } catch (e) {} return myId(); }
  function meUser() { try { return Session.get() || {}; } catch (e) { return {}; } }
  function myNama() { var u = meUser(); return u.nama || (prof() && prof().nama) || 'Saya'; }
  function myRole() { var u = meUser(); return u.role || 'warga'; }
  function ctime(v) { try { return new Date(v).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function bubble(m) { return '<div class="chat-bubble ' + (m.mine ? 'me' : 'them') + '"><div class="cb-meta">' + esc(m.pengirim || '-') + ' \u2022 ' + esc(ctime(m.at)) + '</div><div>' + esc(m.pesan || '') + '</div></div>'; }

  function openChatModal(opts) {
    document.querySelectorAll('.chat-modal').forEach(function (n) { n.remove(); });
    var wrap = document.createElement('div'); wrap.className = 'modal-overlay chat-modal';
    wrap.innerHTML = '<div class="modal modal-lg"><div class="modal-head"><strong>' + esc(opts.title || 'Chat') + '</strong><button class="icon-btn" data-mclose>\u2715</button></div><div class="modal-body scroll">' + (opts.sub ? '<p class="muted sm" style="margin-top:0">' + esc(opts.sub) + '</p>' : '') + '<div class="chat-box" id="cm-box" style="max-height:46vh">' + skeleton(2) + '</div><div class="chat-input"><input id="cm-input" placeholder="' + esc(opts.placeholder || 'Tulis pesan...') + '"><button class="btn primary mini" data-cmsend>Kirim</button></div></div><div class="modal-actions wrap"><button class="btn ghost" data-mclose>Tutup</button></div></div>';
    document.body.appendChild(wrap);
    requestAnimationFrame(function () { wrap.classList.add('show'); });
    var box = wrap.querySelector('#cm-box'); var input = wrap.querySelector('#cm-input'); var iv = null;
    async function paint() { var msgs = []; try { msgs = await opts.loadMsgs(); } catch (e) {} box.innerHTML = msgs.length ? msgs.map(bubble).join('') : '<p class="muted sm">Belum ada pesan. Mulai percakapan di bawah.</p>'; box.scrollTop = box.scrollHeight; }
    function close() { if (iv) clearInterval(iv); wrap.classList.remove('show'); setTimeout(function () { wrap.remove(); }, 200); }
    async function send() { var t = (input.value || '').trim(); if (!t) { toast('Tulis pesan dulu'); return; } input.value = ''; try { await opts.send(t); } catch (e) { toast(e.message || 'Gagal mengirim'); } await paint(); }
    wrap.addEventListener('click', function (ev) { if (ev.target === wrap || ev.target.closest('[data-mclose]')) return close(); if (ev.target.closest('[data-cmsend]')) return send(); });
    input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); send(); } });
    paint();
    iv = setInterval(function () { if (!document.body.contains(wrap)) { clearInterval(iv); return; } if (document.activeElement !== input && !document.hidden) paint(); }, 4500);
  }

  function openRondaChat(jadwalId, judul) {
    openChatModal({
      title: '\uD83D\uDCAC ' + (judul || 'Diskusi'),
      sub: 'Diskusi koordinasi jadwal ini \u2014 terlihat oleh semua anggota.',
      placeholder: 'Tulis pesan ke peserta...',
      loadMsgs: async function () { var all = []; try { all = await DB.list('ronda_chat'); } catch (e) {} var mid = myId(); return all.filter(function (x) { return String(x.jadwalId) === String(jadwalId); }).sort(function (a, b) { return (a.createdAt || '').localeCompare(b.createdAt || ''); }).map(function (x) { return { pengirim: x.pengirim, at: x.createdAt, pesan: x.pesan, mine: String(x.pengirimId) === String(mid) }; }); },
      send: async function (t) { var id = await ensureId(); return DB.add('ronda_chat', { jadwalId: jadwalId, pengirim: myNama(), pengirimId: id, role: myRole(), pesan: t }); }
    });
  }

  function openThreadPengurus(wargaId, wargaNama) {
    openChatModal({
      title: '\uD83D\uDCAC ' + (wargaNama || 'Warga'),
      sub: 'Balasanmu dikirim sebagai Pengurus RT/RW.',
      placeholder: 'Tulis balasan...',
      loadMsgs: async function () { var all = []; try { all = await DB.list('chat_rt'); } catch (e) {} return all.filter(function (x) { return String(x.wargaId) === String(wargaId); }).sort(function (a, b) { return (a.createdAt || '').localeCompare(b.createdAt || ''); }).map(function (x) { return { pengirim: x.pengirim, at: x.createdAt, pesan: x.pesan, mine: x.dari === 'pengurus' }; }); },
      send: async function (t) { var id = await ensureId(); return DB.add('chat_rt', { wargaId: wargaId, wargaNama: wargaNama, pengirim: myNama(), pengirimId: id, dari: 'pengurus', pesan: t }); }
    });
  }

  if (typeof VIEWS !== 'undefined') VIEWS.chatrt = { label: 'Chat RT/RW', icon: 'chat' };

  if (typeof Views !== 'undefined') {
    Views.chatrt = async function (user) {
      var all = []; try { all = await DB.list('chat_rt'); } catch (e) {}
      if (user.role === 'pengurus') {
        var map = {};
        all.forEach(function (x) { var k = String(x.wargaId || ''); if (!k) return; if (!map[k]) map[k] = { wargaId: x.wargaId, wargaNama: x.wargaNama || 'Warga', last: x, count: 0 }; map[k].count++; if ((x.createdAt || '') > (map[k].last.createdAt || '')) map[k].last = x; });
        var threads = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return (b.last.createdAt || '').localeCompare(a.last.createdAt || ''); });
        if (!threads.length) return '<div class="callout blue"><div>\uD83D\uDCAC</div><div>Belum ada warga yang memulai chat. Warga bisa mengirim pesan lewat menu <strong>Chat RT\/RW</strong>.</div></div>';
        var cards = threads.map(function (t) { var l = t.last; return '<div class="card" style="cursor:pointer" data-openthread="' + esc(t.wargaId) + '" data-nama="' + esc(t.wargaNama) + '"><div class="card-body"><div class="row-between"><strong>' + ic('users') + ' ' + esc(t.wargaNama) + '</strong><span class="chip">' + t.count + ' pesan</span></div><p class="muted">' + (l.dari === 'pengurus' ? 'Kamu: ' : '') + esc((l.pesan || '').slice(0, 80)) + '</p><small class="muted">' + esc(ctime(l.createdAt)) + '</small></div></div>'; }).join('');
        return '<div class="callout blue"><div>\uD83D\uDCAC</div><div>Pesan langsung dari warga. Klik untuk membalas.</div></div><div class="section-title">Percakapan Warga</div><div class="list">' + cards + '</div>';
      }
      var mid = myId();
      var msgs = all.filter(function (x) { return !mid || String(x.wargaId) === String(mid); }).sort(function (a, b) { return (a.createdAt || '').localeCompare(b.createdAt || ''); }).map(function (x) { return { pengirim: x.pengirim, at: x.createdAt, pesan: x.pesan, mine: x.dari === 'warga' }; });
      var boxhtml = msgs.length ? msgs.map(bubble).join('') : '<p class="muted sm">Belum ada pesan. Sampaikan pertanyaan atau keluhanmu langsung ke pengurus RT\/RW.</p>';
      return '<div class="callout blue"><div>\uD83D\uDCAC</div><div>Chat langsung & pribadi ke pengurus RT\/RW. Hanya kamu & pengurus yang melihat percakapan ini.</div></div><div class="section-title">Chat dengan Pengurus</div><div class="card"><div class="card-body"><div class="chat-box" id="chatrt-box" style="max-height:52vh">' + boxhtml + '</div><div class="chat-input"><input id="chatrt-input" placeholder="Tulis pesan ke pengurus..."><button class="btn primary mini" data-chatrt-send>Kirim</button></div></div></div>';
    };

    if (typeof Views.menu === 'function') {
      var _menu = Views.menu.bind(Views);
      Views.menu = async function (user) {
        var html = await _menu(user);
        var label = user.role === 'pengurus' ? 'Chat Warga' : 'Chat RT/RW';
        var block = '<div class="section-title">Komunikasi</div><div class="quick-grid"><button class="quick" data-nav="chatrt"><span class="q-ic">' + ic('chat') + '</span><span>' + label + '</span></button></div>';
        var marker = '<div class="card"><div class="card-body profile-row">';
        var i = html.indexOf(marker);
        html = i >= 0 ? html.slice(0, i) + block + html.slice(i) : html + block;
        return html;
      };
    }

    if (typeof Views.jadwal === 'function') {
      Views.jadwal = async function (user) {
        var role = user.role;
        var rows = (await DB.list('jadwal')).sort(function (a, b) { return (a.tanggal || '').localeCompare(b.tanggal || ''); });
        var picker = '';
        if (role === 'pengurus') {
          var warga = []; try { warga = await DB.list('warga'); } catch (e) {}
          warga.sort(function (a, b) { return String(a.nama || '').localeCompare(String(b.nama || '')); });
          picker = warga.length ? '<div class="muted sm" style="margin-top:6px">Pilih dari daftar warga:</div><div class="pick-wrap">' + warga.map(function (w) { var nm = w.nama || ''; var rt = w.rt ? 'RT' + esc(w.rt) : ''; return '<button type="button" class="pick-chip" data-pick="' + esc(nm) + '">' + esc(nm) + (rt ? '<small class="muted">' + rt + '</small>' : '') + '</button>'; }).join('') + '</div>' : '<div class="muted sm" style="margin-top:6px">Belum ada data warga untuk dipilih. Tambahkan di menu Data Warga.</div>';
        }
        var form = role === 'pengurus' ? '<form id="f-jadwal" class="form card"><div class="card-body"><h3>Tambah Jadwal</h3><label>Judul kegiatan<input name="judul" required placeholder="cth: Ronda malam RT 02"></label><label>Tipe<select name="tipe"><option>Ronda</option><option>Kegiatan</option><option>Rapat</option><option>Kerja Bakti</option><option>Lainnya</option></select></label><div class="grid-2"><label>Tanggal<input name="tanggal" type="date" required></label><label>Waktu<input name="waktu" type="time"></label></div><label>Lokasi<input name="lokasi"></label><label>Petugas / peserta<input name="petugas" id="jdw-petugas" placeholder="cth: Budi, Andi"></label>' + picker + '<button class="btn primary" type="submit" style="margin-top:10px">Simpan Jadwal</button></div></form>' : '';
        var tipeIcon = { Ronda: ic('shield'), Kegiatan: ic('calendar'), Rapat: ic('clipboard'), 'Kerja Bakti': ic('users') };
        var list = rows.map(function (r) { return '<div class="card"><div class="card-body"><div class="row-between"><strong>' + (tipeIcon[r.tipe] || ic('calendar')) + ' ' + esc(r.judul) + '</strong><span class="chip">' + esc(r.tipe) + '</span></div><div class="kv"><span>Waktu</span><b>' + tglHari(r.tanggal) + (r.waktu ? ', ' + esc(r.waktu) : '') + '</b></div>' + (r.lokasi ? '<div class="kv"><span>Lokasi</span><b>' + esc(r.lokasi) + '</b></div>' : '') + (r.petugas ? '<div class="kv"><span>Petugas</span><b>' + esc(r.petugas) + '</b></div>' : '') + '<div class="actions"><button class="btn ghost mini" data-ronda="' + esc(r.id) + '" data-judul="' + esc(r.judul) + '">' + ic('chat') + ' Diskusi</button>' + (role === 'pengurus' ? '<button class="btn ghost danger mini" data-del="jadwal:' + esc(r.id) + '">Hapus</button>' : '') + '</div></div></div>'; }).join('') || emptyState('Belum ada jadwal.', 'calendar');
        return form + '<div class="section-title">Jadwal Mendatang</div>' + list;
      };
    }
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-pick]'); if (!b) return;
    var inp = document.getElementById('jdw-petugas'); if (!inp) return;
    b.classList.toggle('active');
    var name = b.dataset.pick;
    var parts = (inp.value || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var i = parts.indexOf(name);
    if (b.classList.contains('active')) { if (i < 0) parts.push(name); } else { if (i >= 0) parts.splice(i, 1); }
    inp.value = parts.join(', ');
  });
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-ronda]'); if (!b) return; openRondaChat(b.dataset.ronda, b.dataset.judul || ''); });
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-openthread]'); if (!b) return; openThreadPengurus(b.dataset.openthread, b.dataset.nama || 'Warga'); });
  document.addEventListener('click', async function (e) {
    var b = e.target.closest && e.target.closest('[data-chatrt-send]'); if (!b) return;
    var inp = document.getElementById('chatrt-input'); if (!inp) return;
    var t = (inp.value || '').trim(); if (!t) { toast('Tulis pesan dulu'); return; }
    var id = await ensureId(); if (!id) { toast('Sesi belum siap, coba lagi'); return; }
    inp.value = '';
    try { await DB.add('chat_rt', { wargaId: id, wargaNama: myNama(), pengirim: myNama(), pengirimId: id, dari: 'warga', pesan: t }); await render('chatrt'); } catch (err) { toast(err.message || 'Gagal mengirim'); }
  });
  document.addEventListener('keydown', function (e) { if (e.target && e.target.id === 'chatrt-input' && e.key === 'Enter') { e.preventDefault(); var btn = document.querySelector('[data-chatrt-send]'); if (btn) btn.click(); } });

  setInterval(async function () {
    var box = document.getElementById('chatrt-box'); if (!box || document.hidden) return;
    var inp = document.getElementById('chatrt-input'); if (inp && document.activeElement === inp && inp.value) return;
    var u = null; try { u = Session.get(); } catch (e) {} if (!u || u.role === 'pengurus') return;
    var all = []; try { all = await DB.list('chat_rt'); } catch (e) { return; }
    var mid = myId();
    var msgs = all.filter(function (x) { return !mid || String(x.wargaId) === String(mid); }).sort(function (a, b) { return (a.createdAt || '').localeCompare(b.createdAt || ''); }).map(function (x) { return { pengirim: x.pengirim, at: x.createdAt, pesan: x.pesan, mine: x.dari === 'warga' }; });
    if (box.dataset.sig !== String(msgs.length)) { box.innerHTML = msgs.length ? msgs.map(bubble).join('') : '<p class="muted sm">Belum ada pesan. Sampaikan pertanyaan atau keluhanmu langsung ke pengurus RT\/RW.</p>'; box.scrollTop = box.scrollHeight; box.dataset.sig = String(msgs.length); }
  }, 5000);
})();
