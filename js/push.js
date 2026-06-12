// ============================================================
//  PUSH NOTIFICATION (Web Push / VAPID) — LaporPakRT
// ------------------------------------------------------------
//  - Minta izin notifikasi + subscribe ke browser (PushManager)
//  - Simpan langganan ke tabel push_sub (RLS: milik user)
//  - Pengiriman push dilakukan Edge Function 'kirim-push'
//  Butuh APP_CONFIG.VAPID_PUBLIC_KEY terisi.
// ============================================================
(function () {
  var C = window.APP_CONFIG || {};
  if (C.BACKEND !== 'supabase') return;

  function vapidKey() { return (C.VAPID_PUBLIC_KEY || '').trim(); }
  function ready() { return ('serviceWorker' in navigator) && ('PushManager' in window) && !!vapidKey(); }
  function toastMsg(m) { try { toast(m); } catch (e) {} }

  function urlB64ToUint8(base64) {
    var pad = '='.repeat((4 - (base64.length % 4)) % 4);
    var b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(b64);
    var arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  function headers() {
    try { if (window.SiAuth && window.SiAuth.headers) return window.SiAuth.headers(); } catch (e) {}
    return { apikey: C.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + (window.SIWARGA_TOKEN || C.SUPABASE_ANON_KEY), 'Content-Type': 'application/json' };
  }

  async function saveSub(sub) {
    var j = sub.toJSON ? sub.toJSON() : sub;
    var body = { endpoint: j.endpoint, p256dh: (j.keys && j.keys.p256dh) || '', auth: (j.keys && j.keys.auth) || '' };
    var h = headers();
    h.Prefer = 'resolution=merge-duplicates,return=minimal';
    var r = await fetch(C.SUPABASE_URL + '/rest/v1/push_sub?on_conflict=endpoint', { method: 'POST', headers: h, body: JSON.stringify(body) });
    if (!r.ok && r.status !== 409) throw new Error('save failed');
    return true;
  }

  async function enable() {
    if (!ready()) { toastMsg('Push belum siap (VAPID belum diisi / browser tak mendukung)'); return false; }
    try {
      var perm = await Notification.requestPermission();
      if (perm !== 'granted') { toastMsg('Izin notifikasi ditolak'); return false; }
      var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(vapidKey()) });
      await saveSub(sub);
      try { localStorage.setItem('siwarga:push', '1'); } catch (e) {}
      toastMsg('Notifikasi aktif \u2705');
      hideBanner();
      return true;
    } catch (err) { toastMsg('Gagal mengaktifkan notifikasi'); return false; }
  }

  function hideBanner() { var b = document.getElementById('push-banner'); if (b) b.remove(); }

  function maybeBanner() {
    if (!ready()) return;
    if (!window.SIWARGA_TOKEN) return;
    if (typeof Notification === 'undefined') return;
    if (document.querySelector('.login-card')) return;
    if (Notification.permission !== 'default') return;
    if (document.getElementById('push-banner')) return;
    var bar = document.createElement('div');
    bar.id = 'push-banner';
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:78px;z-index:9999;max-width:520px;margin:0 auto;background:#fffdf9;border:1px solid #f0d9bf;border-radius:16px;padding:12px 14px;box-shadow:0 10px 30px rgba(80,40,15,.22);display:flex;align-items:center;gap:10px;font-family:Inter,system-ui,sans-serif';
    bar.innerHTML = "<span style='font-size:22px'>\uD83D\uDD14</span><div style='flex:1;font-size:13px;color:#3f372c;line-height:1.3'><b>Aktifkan notifikasi</b><br><span style='color:#9a9082'>Biar dapat info penting &amp; darurat walau app ditutup.</span></div><button id='push-no' style='background:none;border:none;color:#9a9082;font-size:13px;cursor:pointer'>Nanti</button><button id='push-yes' style='background:linear-gradient(180deg,#cf7338,#b3551f);color:#fff;border:none;border-radius:10px;padding:9px 14px;font-weight:700;font-size:13px;cursor:pointer'>Aktifkan</button>";
    document.body.appendChild(bar);
    var y = document.getElementById('push-yes'); if (y) y.addEventListener('click', enable);
    var n = document.getElementById('push-no'); if (n) n.addEventListener('click', hideBanner);
  }

  async function send(payload) {
    var r = await fetch(C.SUPABASE_URL + '/functions/v1/kirim-push', { method: 'POST', headers: headers(), body: JSON.stringify(payload || {}) });
    return r.json().catch(function () { return {}; });
  }

  async function init() {
    if (!ready()) return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && window.SIWARGA_TOKEN) {
      try {
        var reg = await navigator.serviceWorker.ready;
        var sub = await reg.pushManager.getSubscription();
        if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(vapidKey()) });
        await saveSub(sub);
      } catch (e) {}
    }
    maybeBanner();
  }

  window.SiPush = { enable: enable, init: init, send: send, ready: ready };

  init();
  try {
    var mo = new MutationObserver(function () { maybeBanner(); });
    mo.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
  } catch (e) {}
})();
