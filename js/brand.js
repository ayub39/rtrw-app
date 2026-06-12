// Brand: pasang logo LaporPakRT di layar login utama (ganti emoji rumah).
(function () {
  var HOUSE = '\uD83C\uDFD8';
  function swap() {
    var list = document.querySelectorAll('.login-logo');
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el.querySelector('img')) continue;
      if ((el.textContent || '').indexOf(HOUSE) === -1) continue;
      el.innerHTML = "<img src='./icons/icon.svg' alt='LaporPakRT' style='width:78px;height:78px;border-radius:18px;box-shadow:0 6px 16px rgba(0,0,0,.12)'>";
    }
  }
  swap();
  try {
    var mo = new MutationObserver(function () { swap(); });
    mo.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
  } catch (e) {}
})();
