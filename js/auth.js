// ============================================================
//  AUTH (SaaS) — Supabase Auth + onboarding multi-tenant
// ------------------------------------------------------------
//  Aktif HANYA saat BACKEND === 'supabase'. Meng-override layar
//  login app.js dengan autentikasi Supabase + RLS per-organisasi.
//  Tanpa library: pakai endpoint GoTrue (/auth/v1) + PostgREST RPC.
// ============================================================
(function () {
  var C = window.APP_CONFIG || {};
  if (C.BACKEND !== 'supabase') return; // mode lokal: biarkan alur lama

  var BASE = C.SUPABASE_URL;
  var KEY = C.SUPABASE_ANON_KEY;
  var SKEY = 'siwarga:sb_session';
  var ADMIN_EMAILS = ['ayubsobhe@gmail.com']; // pemilik platform / super-admin

  // ---------- session token ----------
  function loadSession() { try { return JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { return null; } }
  function saveSession(s) { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) {} window.SIWARGA_TOKEN = (s && s.access_token) || null; }
  function clearSbSession() { try { localStorage.removeItem(SKEY); } catch (e) {} window.SIWARGA_TOKEN = null; }

  function hAnon() { return { apikey: KEY, 'Content-Type': 'application/json' }; }
  function hAuth() { return { apikey: KEY, Authorization: 'Bearer ' + (window.SIWARGA_TOKEN || KEY), 'Content-Type': 'application/json' }; }

  function normalizeAuth(d) {
    if (!d) return d;
    if (d.access_token) return d;
    if (d.session && d.session.access_token) { var s = d.session; s.user = d.user || s.user; return s; }
    return d;
  }
  function persist(resp) {
    var a = normalizeAuth(resp); var u = a.user || {};
    var s = { access_token: a.access_token, refresh_token: a.refresh_token, user_id: u.id, email: u.email, expires_at: Date.now() + ((a.expires_in || 3600) * 1000) };
    saveSession(s); return s;
  }

  // ---------- GoTrue + PostgREST ----------
  async function apiSignUp(email, pass) {
    var r = await fetch(BASE + '/auth/v1/signup', { method: 'POST', headers: hAnon(), body: JSON.stringify({ email: email, password: pass }) });
    var d = await r.json();
    if (!r.ok) throw new Error(d.msg || d.error_description || d.error || 'Gagal mendaftar');
    var a = normalizeAuth(d);
    if (!a.access_token) throw new Error('Akun dibuat. Cek email untuk konfirmasi, lalu Masuk.');
    return a;
  }
  async function apiSignIn(email, pass) {
    var r = await fetch(BASE + '/auth/v1/token?grant_type=password', { method: 'POST', headers: hAnon(), body: JSON.stringify({ email: email, password: pass }) });
    var d = await r.json();
    if (!r.ok) throw new Error(d.msg || d.error_description || d.error || 'Email atau password salah');
    return normalizeAuth(d);
  }
  async function apiRefresh(rt) {
    if (!rt) return null;
    var r = await fetch(BASE + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: hAnon(), body: JSON.stringify({ refresh_token: rt }) });
    if (!r.ok) return null;
    return normalizeAuth(await r.json());
  }
  async function apiSignOut() { try { await fetch(BASE + '/auth/v1/logout', { method: 'POST', headers: hAuth() }); } catch (e) {} }
  async function apiRecover(email) {
    var r = await fetch(BASE + '/auth/v1/recover', { method: 'POST', headers: hAnon(), body: JSON.stringify({ email: email }) });
    if (!r.ok) { var d = await r.json().catch(function () { return {}; }); throw new Error(d.msg || d.error_description || 'Gagal mengirim email reset'); }
    return true;
  }
  async function rpc(name, args) {
    var r = await fetch(BASE + '/rest/v1/rpc/' + name, { method: 'POST', headers: hAuth(), body: JSON.stringify(args) });
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error((d && (d.message || d.hint || d.details)) || 'Operasi gagal');
    return d;
  }
  async function fetchProfile(uid) {
    var r = await fetch(BASE + '/rest/v1/profiles?id=eq.' + uid + '&select=*,organisasi(*)', { headers: hAuth() });
    if (!r.ok) return null;
    var d = await r.json();
    return (Array.isArray(d) && d.length) ? d[0] : null;
  }

  // ---------- helpers ----------
  function mapRole(role) { return (role === 'owner' || role === 'pengurus') ? 'pengurus' : 'warga'; }
  function orgActive(org) {
    if (!org) return false;
    if (org.status === 'aktif') return true;
    if (org.status === 'trial') { if (!org.trialBerakhir) return true; return new Date(org.trialBerakhir).getTime() > Date.now(); }
    return false;
  }
  function applyOrgToCfg(org) {
    if (!org) return;
    try {
      C.WILAYAH = C.WILAYAH || {}; if (org.nama) C.WILAYAH.nama = org.nama;
      C.APP_NAME = (org.jenis === 'RT') ? 'LaporPakRT' : 'LaporPakRW';
      var S = C.SURAT = C.SURAT || {}; var K = S.KOP = S.KOP || {};
      if (org.kopBadan) K.badan = org.kopBadan; if (org.kopLembaga) K.namaLembaga = org.kopLembaga;
      if (org.kopKelurahan) K.kelurahan = org.kopKelurahan; if (org.kopKecamatan) K.kecamatan = org.kopKecamatan;
      if (org.kopKabkota) K.kabkota = org.kopKabkota; if (org.kopAlamat) K.alamat = org.kopAlamat;
      if (org.kopKontak) K.kontak = org.kopKontak; if (org.logoUrl) K.logoUrl = org.logoUrl; if (org.capUrl) K.capUrl = org.capUrl;
      if (org.ketuaRwNama) { S.KETUA_RW = S.KETUA_RW || {}; S.KETUA_RW.nama = org.ketuaRwNama; S.KETUA_RW.jabatan = org.ketuaRwJabatan || 'Ketua RW'; }
      if (org.ketuaRtNama) { S.KETUA_RT = S.KETUA_RT || {}; S.KETUA_RT.nama = org.ketuaRtNama; S.KETUA_RT.jabatan = org.ketuaRtJabatan || 'Ketua RT'; }
      if (typeof org.duaTandaTangan === 'boolean') S.DUA_TANDA_TANGAN = org.duaTandaTangan;
    } catch (e) {}
  }
  function enterApp(prof) {
    applyOrgToCfg(prof.organisasi);
    try { window.SiAuth.org = prof.organisasi || null; window.SiAuth.profile = prof; } catch (e) {}
    var sess = loadSession() || {};
    Session.set({ nama: prof.nama || 'Pengguna', nik: prof.nik || '', email: sess.email || '', role: mapRole(prof.role), jabatan: prof.jabatan || '' });
    render('beranda');
  }

  // ---------- API publik utk modul lain (settings.js) ----------
  window.SiAuth = {
    BASE: BASE, KEY: KEY, org: null, profile: null,
    token: function () { return window.SIWARGA_TOKEN; },
    headers: function () { return hAuth(); },
    rpc: function (name, args) { return rpc(name, args); },
    applyOrg: function (org) { applyOrgToCfg(org); },
    isAdmin: function () { var s = loadSession() || {}; return ADMIN_EMAILS.indexOf(String(s.email || '').toLowerCase()) >= 0; },
    refresh: async function () { var s = loadSession(); if (!s || !s.user_id) return null; var p = await fetchProfile(s.user_id); if (p) { this.profile = p; this.org = p.organisasi || null; } return p; }
  };

  // ---------- UI ----------
  function busy(form, on, label) { var b = form.querySelector('button[type=submit]'); if (b) { b.disabled = on; if (on) { b.dataset.l = b.textContent; b.textContent = 'Memproses…'; } else { b.textContent = b.dataset.l || label || 'Kirim'; } } }

  function parseHash() {
    var h = (location.hash || '').replace(/^#/, ''); var p = {};
    if (!h) return p;
    h.split('&').forEach(function (kv) { var x = kv.split('='); p[decodeURIComponent(x[0])] = decodeURIComponent(x[1] || ''); });
    return p;
  }
  function showResetPassword() {
    document.getElementById('app').innerHTML = '<div class="login"><div class="login-card">' +
      '<div class="login-logo">\uD83D\uDD11</div><h1>Atur Password Baru</h1>' +
      '<p class="muted">Masukkan password baru untuk akunmu.</p>' +
      '<form id="f-reset" class="form"><label>Password baru<input name="pass" type="password" required minlength="6" placeholder="minimal 6 karakter"></label>' +
      '<button class="btn primary block" type="submit">Simpan Password</button></form></div></div>';
    var f = document.getElementById('f-reset');
    if (f) f.addEventListener('submit', async function (e) {
      e.preventDefault(); var d = formData(e.target);
      if (!d.pass || d.pass.length < 6) { toast('Password minimal 6 karakter'); return; }
      busy(e.target, true);
      try {
        var r = await fetch(BASE + '/auth/v1/user', { method: 'PUT', headers: hAuth(), body: JSON.stringify({ password: d.pass }) });
        if (!r.ok) { var dd = await r.json().catch(function () { return {}; }); throw new Error(dd.msg || dd.error_description || 'Gagal mengatur password'); }
        try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
        clearSbSession(); try { Session.clear(); } catch (e2) {}
        toast('Password berhasil diubah \u2705 Silakan masuk.');
        showLogin('login');
      } catch (err) { toast(err.message); busy(e.target, false, 'Simpan Password'); }
    });
  }

  function showLogin(mode) {
    mode = mode || 'login';
    var head = '<div class="login-logo">\uD83C\uDFD8\uFE0F</div><h1>' + esc(C.APP_NAME || 'Aplikasi') + '</h1><p class="muted">Layanan digital RT/RW</p>';
    var body;
    if (mode === 'rtrw') {
      body = '<form id="f-daftar-rtrw" class="form">' +
        '<label>Nama Anda (pengurus)<input name="nama" required placeholder="Nama lengkap"></label>' +
        '<label>Nama RT/RW<input name="orgnama" required placeholder="cth: RW 05 Kel. Sukamaju"></label>' +
        '<label>Tingkat<select name="jenis"><option value="RW">RW</option><option value="RT">RT</option></select></label>' +
        '<label>Kode unik RT/RW (dibagikan ke warga)<input name="kode" required placeholder="cth: RW05SKM"></label>' +
        '<label>Email<input name="email" type="email" required></label>' +
        '<label>Password<input name="pass" type="password" required minlength="6" placeholder="minimal 6 karakter"></label>' +
        '<button class="btn primary block" type="submit">Daftar & Buat RT/RW</button></form>' +
        '<small class="muted">Sudah punya akun? <a href="#" data-go="login">Masuk</a> • Warga? <a href="#" data-go="warga">Gabung di sini</a></small>';
    } else if (mode === 'warga') {
      body = '<form id="f-daftar-warga" class="form">' +
        '<label>Nama lengkap<input name="nama" required placeholder="Nama sesuai KTP"></label>' +
        '<label>Kode RT/RW<input name="kode" required placeholder="dapat dari pengurus RT/RW"></label>' +
        '<label>Email<input name="email" type="email" required></label>' +
        '<label>Password<input name="pass" type="password" required minlength="6" placeholder="minimal 6 karakter"></label>' +
        '<button class="btn primary block" type="submit">Daftar sebagai Warga</button></form>' +
        '<small class="muted">Sudah punya akun? <a href="#" data-go="login">Masuk</a></small>';
    } else if (mode === 'lupa') {
      body = '<form id="f-lupa" class="form">' +
        '<label>Email akun<input name="email" type="email" required placeholder="email@contoh.com"></label>' +
        '<button class="btn primary block" type="submit">Kirim Link Reset</button></form>' +
        '<small class="muted">Kami kirim link reset ke emailmu. <a href="#" data-go="login">Kembali masuk</a></small>';
    } else {
      body = '<form id="f-login" class="form">' +
        '<label>Email<input name="email" type="email" required></label>' +
        '<label>Password<input name="pass" type="password" required></label>' +
        '<button class="btn primary block" type="submit">Masuk</button></form>' +
        '<small class="muted">Pengurus RT/RW baru? <a href="#" data-go="rtrw">Daftar di sini</a><br>Warga? <a href="#" data-go="warga">Gabung dengan kode RT/RW</a><br><a href="#" data-go="lupa">Lupa password?</a></small>';
    }
    document.getElementById('app').innerHTML = '<div class="login"><div class="login-card">' + head + body + '</div></div>';
    document.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function (ev) { ev.preventDefault(); showLogin(b.dataset.go); }); });
    bindForms();
  }

  function showGate(prof) {
    var org = (prof && prof.organisasi) || {};
    document.getElementById('app').innerHTML = '<div class="login"><div class="login-card">' +
      '<div class="login-logo">\u23F3</div><h1>Menunggu Aktivasi</h1>' +
      '<p class="muted">RT/RW <strong>' + esc(org.nama || '-') + '</strong> belum aktif atau masa coba sudah berakhir.</p>' +
      '<div class="callout blue" style="text-align:left"><div>\u2139\uFE0F</div><div>Hubungi admin LaporPakRT untuk mengaktifkan langganan. Setelah aktif, silakan masuk kembali.</div></div>' +
      '<button class="btn ghost block" id="gate-logout">Keluar</button></div></div>';
    var b = document.getElementById('gate-logout'); if (b) b.addEventListener('click', function () { Session.clear(); showLogin('login'); });
  }

  function bindForms() {
    var fl = document.getElementById('f-login'); if (fl) fl.addEventListener('submit', onLogin);
    var fr = document.getElementById('f-daftar-rtrw'); if (fr) fr.addEventListener('submit', onDaftarRtrw);
    var fw = document.getElementById('f-daftar-warga'); if (fw) fw.addEventListener('submit', onDaftarWarga);
    var fp = document.getElementById('f-lupa'); if (fp) fp.addEventListener('submit', onLupa);
  }

  async function onLogin(e) {
    e.preventDefault(); var d = formData(e.target);
    if (!d.email || !d.pass) { toast('Lengkapi email & password'); return; }
    busy(e.target, true);
    try {
      var s = persist(await apiSignIn(d.email.toLowerCase(), d.pass));
      var prof = await fetchProfile(s.user_id);
      if (!prof) { toast('Akun belum terhubung ke RT/RW.'); showLogin('rtrw'); return; }
      if (!orgActive(prof.organisasi)) { showGate(prof); return; }
      toast('Selamat datang, ' + (prof.nama || ''));
      enterApp(prof);
    } catch (err) { toast(err.message || 'Gagal masuk'); busy(e.target, false, 'Masuk'); }
  }
  async function onDaftarRtrw(e) {
    e.preventDefault(); var d = formData(e.target);
    if (!d.nama || !d.orgnama || !d.kode || !d.email || !d.pass) { toast('Lengkapi semua kolom'); return; }
    if (d.pass.length < 6) { toast('Password minimal 6 karakter'); return; }
    busy(e.target, true);
    try {
      var s = persist(await apiSignUp(d.email.toLowerCase(), d.pass));
      await rpc('buat_organisasi', { p_nama: d.orgnama, p_jenis: d.jenis || 'RW', p_kode: d.kode.trim(), p_nama_pengguna: d.nama });
      var prof = await fetchProfile(s.user_id);
      if (!prof) { toast('Gagal memuat profil'); busy(e.target, false, 'Daftar & Buat RT/RW'); return; }
      toast('RT/RW dibuat! Masa coba 14 hari aktif \u2705');
      enterApp(prof);
    } catch (err) { toast(err.message || 'Gagal mendaftar'); busy(e.target, false, 'Daftar & Buat RT/RW'); }
  }
  async function onDaftarWarga(e) {
    e.preventDefault(); var d = formData(e.target);
    if (!d.nama || !d.kode || !d.email || !d.pass) { toast('Lengkapi semua kolom'); return; }
    if (d.pass.length < 6) { toast('Password minimal 6 karakter'); return; }
    busy(e.target, true);
    try {
      var s = persist(await apiSignUp(d.email.toLowerCase(), d.pass));
      await rpc('gabung_organisasi', { p_kode: d.kode.trim(), p_nama: d.nama });
      var prof = await fetchProfile(s.user_id);
      if (!prof) { toast('Gagal memuat profil'); busy(e.target, false, 'Daftar sebagai Warga'); return; }
      if (!orgActive(prof.organisasi)) { showGate(prof); return; }
      toast('Berhasil gabung \u2705');
      enterApp(prof);
    } catch (err) { toast(err.message || 'Gagal mendaftar'); busy(e.target, false, 'Daftar sebagai Warga'); }
  }
  async function onLupa(e) {
    e.preventDefault(); var d = formData(e.target);
    if (!d.email) { toast('Isi email dulu'); return; }
    busy(e.target, true);
    try { await apiRecover(d.email.toLowerCase()); toast('Link reset dikirim ke email (cek inbox/spam) \uD83D\uDCE7'); showLogin('login'); }
    catch (err) { toast(err.message || 'Gagal mengirim'); busy(e.target, false, 'Kirim Link Reset'); }
  }

  // override layar login app.js + bersihkan token saat logout
  window.renderLogin = function () { showLogin('login'); };
  try { var _clr = Session.clear.bind(Session); Session.clear = function () { _clr(); clearSbSession(); apiSignOut(); }; } catch (e) {}

  // ---------- boot ----------
  async function boot() {
    try { var hp = parseHash(); if (hp && hp.type === 'recovery' && hp.access_token) { window.SIWARGA_TOKEN = hp.access_token; showResetPassword(); return; } } catch (e) {}
    var s = loadSession();
    if (!s || !s.access_token) { Session.clear(); showLogin('login'); return; }
    window.SIWARGA_TOKEN = s.access_token;
    if (s.expires_at && s.expires_at < Date.now() + 60000) {
      var nr = await apiRefresh(s.refresh_token);
      if (nr && nr.access_token) { s = persist(nr); } else { clearSbSession(); Session.clear(); showLogin('login'); return; }
    }
    try {
      var prof = await fetchProfile(s.user_id);
      if (!prof) { showLogin('rtrw'); return; }
      if (!orgActive(prof.organisasi)) { showGate(prof); return; }
      enterApp(prof);
    } catch (e) { showLogin('login'); }
  }
  boot();
})();
