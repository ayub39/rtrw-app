// Brand: logo + polish layar login LaporPakRT.
(function () {
  var HOUSE = '\uD83C\uDFD8';
  var CSS = [
    '.login{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(130% 120% at 50% 0%, #2f7d4e 0%, #15532e 42%, #0f3d22 100%);}',
    '.login-card{width:100%;max-width:384px;background:#fffdf9;border:1px solid #e4ece3;border-radius:26px;padding:36px 28px 30px;box-shadow:0 26px 60px rgba(15,50,28,.28),0 3px 10px rgba(15,50,28,.12);border-top:4px solid #c19a3e;}',
    '.login-logo{width:84px;height:84px;margin:2px auto 16px;display:flex;align-items:center;justify-content:center;}',
    '.login-logo img.brand-logo{width:84px;height:84px;border-radius:22px;box-shadow:0 12px 26px rgba(15,61,34,.32);}',
    '.login-card h1{font-family:Playfair Display,Georgia,serif;font-weight:800;font-size:30px;line-height:1.1;text-align:center;margin:0 0 3px;color:#1f2a22;letter-spacing:-.3px;}',
    '.login-card h1 .ac{color:#15532e;}',
    '.login-card p.muted{text-align:center;color:#8a948b;font-size:14px;margin:0 0 6px;}',
    '.login .form label{display:block;font-size:12.5px;font-weight:600;color:#54605a;margin:15px 0 0;letter-spacing:.2px;}',
    '.login .form input,.login .form select{width:100%;margin-top:6px;padding:12px 14px;border:1.5px solid #d9e3d8;border-radius:13px;background:#f7faf6;font-size:15px;color:#1f2a22;outline:none;transition:border-color .15s,box-shadow .15s,background .15s;}',
    '.login .form input:focus,.login .form select:focus{border-color:#15532e;box-shadow:0 0 0 3px rgba(21,83,46,.18);background:#fff;}',
    '.login .btn.primary{margin-top:20px;background:linear-gradient(180deg,#1d6e3e,#0f3d22);border:none;color:#fff;font-weight:700;font-size:15px;padding:13px;border-radius:13px;box-shadow:0 8px 18px rgba(15,61,34,.30);cursor:pointer;transition:transform .08s,box-shadow .15s,filter .15s;}',
    '.login .btn.primary:hover{filter:brightness(1.05);box-shadow:0 11px 22px rgba(15,61,34,.40);}',
    '.login .btn.primary:active{transform:translateY(1px);}',
    '.login small.muted{display:block;text-align:center;margin-top:16px;color:#8a948b;line-height:1.7;font-size:13px;}',
    '.login small.muted a{color:#15532e;font-weight:600;text-decoration:none;}',
    '.login small.muted a:hover{text-decoration:underline;}',
    '.login .callout{border-radius:14px;text-align:left;}'
  ].join('\n');
  function injectCss() {
    if (document.getElementById('brand-css')) return;
    var s = document.createElement('style');
    s.id = 'brand-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }
  function decorate() {
    var logos = document.querySelectorAll('.login-logo');
    for (var i = 0; i < logos.length; i++) {
      var el = logos[i];
      if (el.querySelector('img')) continue;
      if ((el.textContent || '').indexOf(HOUSE) === -1) continue;
      el.innerHTML = "<img class='brand-logo' src='./icons/icon.svg' alt='LaporPakRT'>";
    }
    var h = document.querySelector('.login-card h1');
    if (h && ((h.textContent || '').trim() !== 'LaporPakRT' || !h.querySelector('.ac'))) {
      h.innerHTML = "LaporPak<span class='ac'>RT</span>";
    }
    var subs = document.querySelectorAll('.login-card p.muted');
    for (var j = 0; j < subs.length; j++) {
      var p = subs[j];
      var t = (p.textContent || '');
      if (/layanan digital/i.test(t) && t.trim() !== 'Layanan digital RT') p.textContent = 'Layanan digital RT';
    }
  }
  injectCss();
  decorate();
  try {
    var mo = new MutationObserver(function () { injectCss(); decorate(); });
    mo.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
  } catch (e) {}
})();
