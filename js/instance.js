// ============================================================
//  GERBANG LISENSI - hanya aktif di MODE 'instance'.
//  Di MODE 'saas' (default) file ini tidak melakukan apa-apa.
//  Memvalidasi APP_CONFIG.INSTANCE.LISENSI_KEY ke RPC cek_lisensi.
//  Bila tidak valid -> menutup aplikasi dengan layar lisensi.
// ============================================================
(function () {
  var C = window.APP_CONFIG || {};
  if ((C.MODE || 'saas') !== 'instance') return;
  var INST = C.INSTANCE || {};
  var KEY = (INST.LISENSI_KEY || '').trim();
  var CONTACT = (INST.CONTACT || '').trim();

  function el(tag, css, text) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    return e;
  }
  function hideApp() { var a = document.getElementById('app'); if (a) a.style.display = 'none'; }
  function showApp() { var a = document.getElementById('app'); if (a) a.style.display = ''; }

  function overlay(title, msg) {
    var old = document.getElementById('lisensi-gate'); if (old) old.remove();
    var wrap = el('div', 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:28px;background:radial-gradient(130% 120% at 50% 0%,#2f7d4e 0%,#15532e 45%,#0f3d22 100%);font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;');
    wrap.id = 'lisensi-gate';
    var card = el('div', 'background:#fffdf9;border-top:4px solid #c19a3e;border-radius:22px;max-width:380px;width:100%;padding:34px 26px;text-align:center;box-shadow:0 26px 60px rgba(15,50,28,.3);');
    card.appendChild(el('div', 'font-size:44px;line-height:1;margin-bottom:10px;', '\uD83D\uDD12'));
    card.appendChild(el('h1', 'font-family:Playfair Display,Georgia,serif;font-size:23px;margin:0 0 8px;color:#15532e;', title));
    card.appendChild(el('p', 'color:#6b756d;font-size:14px;line-height:1.6;margin:0;', msg));
    if (CONTACT) {
      var a = el('a', 'display:inline-block;margin-top:18px;background:linear-gradient(180deg,#1d6e3e,#0f3d22);color:#fff;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:12px;', 'Hubungi Penyedia');
      a.href = CONTACT;
      card.appendChild(a);
    }
    wrap.appendChild(card);
    (document.body || document.documentElement).appendChild(wrap);
    hideApp();
  }

  function pass(row) {
    window.INSTANCE_ORG = row || null;
    try { localStorage.setItem('lprt:lisensi:ok', '1'); } catch (e) {}
    var g = document.getElementById('lisensi-gate'); if (g) g.remove();
    showApp();
  }

  if (!KEY) { overlay('Lisensi belum disetel', 'Aplikasi berjalan dalam mode instance namun kunci lisensi belum diisi pada konfigurasi.'); return; }

  hideApp();
  fetch(C.SUPABASE_URL + '/rest/v1/rpc/cek_lisensi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': C.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + C.SUPABASE_ANON_KEY },
    body: JSON.stringify({ p_key: KEY })
  }).then(function (r) { return r.json(); }).then(function (rows) {
    var row = Array.isArray(rows) ? rows[0] : rows;
    if (row && row.valid) { pass(row); }
    else { overlay('Lisensi tidak aktif', (row && row.pesan ? row.pesan : 'Lisensi tidak valid.') + '. Silakan hubungi penyedia aplikasi untuk mengaktifkan kembali.'); }
  }).catch(function () {
    var ok = false; try { ok = localStorage.getItem('lprt:lisensi:ok') === '1'; } catch (e) {}
    if (ok) { showApp(); return; }
    overlay('Gagal verifikasi lisensi', 'Tidak dapat terhubung ke server lisensi. Periksa koneksi internet lalu buka ulang aplikasi.');
  });
})();
