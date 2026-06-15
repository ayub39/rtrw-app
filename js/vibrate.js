// ============================================================
//  GETAR (vibrate) helper - LaporPakRT/RW
// ------------------------------------------------------------
//  CATATAN PENTING:
//  - Chrome Android TIDAK lagi menghormati opsi 'vibrate' pada
//    notifikasi push latar belakang. Getar notif saat app TERTUTUP
//    diatur oleh sistem Android (Setelan > Aplikasi > Notifikasi).
//  - File ini membuat HP bergetar saat app SEDANG TERBUKA dan ada
//    push masuk (service worker mengirim pesan ke halaman), serta
//    menyediakan tombol "Tes Getar" untuk menguji perangkat.
// ============================================================
(function () {
  function vib(p) {
    try { if (navigator.vibrate) return navigator.vibrate(p && p.length ? p : [200, 100, 200]); } catch (e) {}
    return false;
  }
  function buzzTest() {
    var ok = vib([300, 120, 300, 120, 500]);
    try { toast(ok ? 'Getar diuji. Terasa?' : 'Perangkat/browser ini tidak mendukung getar.'); } catch (e) {}
  }

  // Getar saat app TERBUKA & ada push masuk (pesan dari service worker).
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', function (e) {
        if (e.data && e.data.type === 'vibrate') vib(e.data.pattern);
      });
    }
  } catch (e) {}

  // Tombol apa pun bertanda data-tesgetar akan memicu tes getar.
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('[data-tesgetar]');
    if (b) { e.preventDefault(); buzzTest(); }
  });

  // Sisipkan kartu "Tes Getar" di halaman Pengaturan tanpa mengubah settings.js.
  function injectTest() {
    var form = document.getElementById('f-pengaturan');
    if (!form || document.getElementById('tes-getar-card')) return;
    var card = document.createElement('div');
    card.id = 'tes-getar-card';
    card.className = 'card';
    var body = document.createElement('div');
    body.className = 'card-body';
    var t = document.createElement('strong');
    t.textContent = 'Notifikasi & Getar';
    var p = document.createElement('p');
    p.className = 'muted';
    p.style.cssText = 'font-size:13px;margin:6px 0 10px;line-height:1.4';
    p.textContent = 'Getar saat app tertutup diatur oleh sistem Android (Setelan > Aplikasi > pilih app > Notifikasi > aktifkan Getar). Tekan tombol di bawah untuk menguji getar perangkat ini.';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn ghost';
    btn.textContent = 'Tes Getar';
    btn.addEventListener('click', buzzTest);
    body.appendChild(t);
    body.appendChild(p);
    body.appendChild(btn);
    card.appendChild(body);
    form.parentNode.insertBefore(card, form);
  }
  try {
    var mo = new MutationObserver(injectTest);
    mo.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
  } catch (e) {}
  injectTest();

  window.SiVibrate = {
    test: function () { return vib([300, 120, 300, 120, 500]); },
    buzz: vib,
    supported: function () { return !!navigator.vibrate; }
  };
})();
