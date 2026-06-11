// ============================================================
//  SETTINGS + SUPER-ADMIN (SaaS)
// ------------------------------------------------------------
//  - Halaman "Pengaturan" (pengurus): edit identitas RT/RW, kop
//    surat, penandatangan; lihat kode gabung + status langganan.
//  - Halaman "Super Admin" (pemilik platform): kelola status
//    langganan tiap RT/RW (aktifkan / nonaktif / suspend).
//  Menambah halaman lewat objek Views/VIEWS milik app.js TANPA
//  mengubah app.js. Aktif hanya saat BACKEND === 'supabase'.
// ============================================================
(function () {
  var C = window.APP_CONFIG || {};
  if (C.BACKEND !== 'supabase') return;
  var BASE = C.SUPABASE_URL;

  function SA() { return window.SiAuth || {}; }
  function headers() {
    if (SA().headers) return SA().headers();
    return { apikey: C.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + (window.SIWARGA_TOKEN || C.SUPABASE_ANON_KEY), 'Content-Type': 'application/json' };
  }
  function isAdmin() { return !!(SA().isAdmin && SA().isAdmin()); }
  function dstr(v) { try { return new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return '-'; } }

  async function getOrg() {
    var org = SA().org;
    if (org) return org;
    try { var p = SA().refresh ? await SA().refresh() : null; if (p) org = p.organisasi; } catch (e) {}
    return org || null;
  }
  async function patchOrg(id, body) {
    var r = await fetch(BASE + '/rest/v1/organisasi?id=eq.' + id, { method: 'PATCH', headers: Object.assign(headers(), { Prefer: 'return=representation' }), body: JSON.stringify(body) });
    var d = await r.json().catch(function () { return []; });
    if (!r.ok) throw new Error((d && d.message) || 'Gagal menyimpan');
    return Array.isArray(d) ? d[0] : d;
  }
  function field(label, name, val, ph) { return '<label>' + esc(label) + '<input name="' + name + '" value="' + esc(val || '') + '" placeholder="' + esc(ph || '') + '"></label>'; }

  var STMAP = { aktif: 'green', trial: 'blue', pending: 'orange', nonaktif: 'red', suspended: 'red' };

  // ---- daftarkan view ke router app.js ----
  if (typeof VIEWS !== 'undefined') {
    VIEWS.pengaturan = { label: 'Pengaturan', icon: 'shield' };
    VIEWS.superadmin = { label: 'Super Admin', icon: 'shield' };
  }

  if (typeof Views !== 'undefined') {
    Views.pengaturan = async function (user) {
      if (user.role !== 'pengurus') return '<div class="callout blue"><div>\u2139\uFE0F</div><div>Halaman Pengaturan khusus pengurus RT/RW.</div></div>';
      var org = await getOrg();
      if (!org) return '<div class="callout red"><div>\u26A0\uFE0F</div><div>Gagal memuat data organisasi. Coba muat ulang halaman.</div></div>';
      var st = org.status || 'pending';
      var akhir = (st === 'trial') ? org.trialBerakhir : org.langgananBerakhir;
      var info = '<div class="card"><div class="card-body">' +
        '<div class="row-between"><strong>Status Langganan</strong><span class="badge ' + (STMAP[st] || 'gray') + '">' + esc(st) + '</span></div>' +
        '<div class="kv"><span>Kode gabung warga</span><b>' + esc(org.kode || '-') + '</b></div>' +
        '<div class="kv"><span>Mode</span><b>' + esc(org.mode || 'saas') + '</b></div>' +
        (akhir ? '<div class="kv"><span>Berlaku s/d</span><b>' + esc(dstr(akhir)) + '</b></div>' : '') +
        '</div></div>';
      return info +
        '<form id="f-pengaturan" class="form card"><div class="card-body">' +
        '<h3>Identitas RT/RW</h3>' +
        field('Nama RT/RW', 'nama', org.nama, 'cth: RW 05 Sukamaju') +
        '<label>Tingkat<select name="jenis"><option value="RW"' + (org.jenis === 'RW' ? ' selected' : '') + '>RW</option><option value="RT"' + (org.jenis === 'RT' ? ' selected' : '') + '>RT</option></select></label>' +
        '<h3 style="margin-top:14px">Kop Surat</h3>' +
        field('Badan / Pemerintah', 'kopBadan', org.kopBadan, 'cth: PEMERINTAH KOTA ...') +
        field('Nama Lembaga', 'kopLembaga', org.kopLembaga, 'cth: RUKUN WARGA 05') +
        field('Kelurahan / Desa', 'kopKelurahan', org.kopKelurahan) +
        field('Kecamatan', 'kopKecamatan', org.kopKecamatan) +
        field('Kabupaten / Kota', 'kopKabkota', org.kopKabkota) +
        field('Alamat sekretariat', 'kopAlamat', org.kopAlamat) +
        field('Kontak / kode pos', 'kopKontak', org.kopKontak) +
        field('URL Logo (opsional)', 'logoUrl', org.logoUrl, 'https://...') +
        field('URL Cap / Stempel (opsional)', 'capUrl', org.capUrl, 'https://...') +
        '<h3 style="margin-top:14px">Penandatangan</h3>' +
        field('Nama Ketua RT', 'ketuaRtNama', org.ketuaRtNama) +
        field('Jabatan Ketua RT', 'ketuaRtJabatan', org.ketuaRtJabatan, 'cth: Ketua RT 01') +
        field('Nama Ketua RW', 'ketuaRwNama', org.ketuaRwNama) +
        field('Jabatan Ketua RW', 'ketuaRwJabatan', org.ketuaRwJabatan, 'cth: Ketua RW 05') +
        '<label class="check"><input type="checkbox" name="duaTandaTangan"' + (org.duaTandaTangan ? ' checked' : '') + '> Pakai dua tanda tangan (RT & RW)</label>' +
        '<button class="btn primary" type="submit">Simpan Pengaturan</button>' +
        '</div></form>';
    };

    Views.superadmin = async function () {
      if (!isAdmin()) return '<div class="callout red"><div>\u26D4</div><div>Akses ditolak. Halaman ini khusus pemilik platform.</div></div>';
      var rows = [];
      try { rows = await SA().rpc('list_semua_organisasi', {}); } catch (e) { return '<div class="callout red"><div>\u26A0\uFE0F</div><div>' + esc(e.message || 'Gagal memuat') + '</div></div>'; }
      if (!rows || !rows.length) return '<div class="callout blue"><div>\uD83D\uDCED</div><div>Belum ada RT/RW yang mendaftar.</div></div>';
      var cards = rows.map(function (o) {
        var st = o.status || 'pending';
        return '<div class="card"><div class="card-body">' +
          '<div class="row-between"><strong>' + esc(o.nama || '-') + '</strong><span class="badge ' + (STMAP[st] || 'gray') + '">' + esc(st) + '</span></div>' +
          '<div class="kv"><span>Kode</span><b>' + esc(o.kode || '-') + '</b></div>' +
          '<div class="kv"><span>Jenis</span><b>' + esc(o.jenis || '-') + '</b></div>' +
          '<div class="kv"><span>Mode</span><b>' + esc(o.mode || 'saas') + '</b></div>' +
          '<div class="actions">' +
          '<button class="btn primary mini" data-adminstatus="' + esc(o.id) + ':aktif">Aktifkan (1 thn)</button>' +
          '<button class="btn ghost mini" data-adminstatus="' + esc(o.id) + ':nonaktif">Nonaktif</button>' +
          '<button class="btn ghost danger mini" data-adminstatus="' + esc(o.id) + ':suspended">Suspend</button>' +
          '</div></div></div>';
      }).join('');
      return '<div class="callout blue"><div>\uD83D\uDEE0\uFE0F</div><div>Kelola langganan tiap RT/RW. "Aktifkan" memberi langganan 1 tahun.</div></div>' +
        '<div class="section-title">Semua RT/RW (' + rows.length + ')</div><div class="list">' + cards + '</div>';
    };

    // sisipkan menu "Pengaturan" / "Super Admin" ke halaman menu
    if (typeof Views.menu === 'function') {
      var _menu = Views.menu.bind(Views);
      Views.menu = async function (user) {
        var html = await _menu(user);
        var extra = '';
        if (user.role === 'pengurus') extra += '<button class="quick" data-nav="pengaturan"><span class="q-ic">' + ic('shield') + '</span><span>Pengaturan</span></button>';
        if (isAdmin()) extra += '<button class="quick" data-nav="superadmin"><span class="q-ic">' + ic('shield') + '</span><span>Super Admin</span></button>';
        if (extra) {
          var block = '<div class="section-title">Pengelolaan</div><div class="quick-grid">' + extra + '</div>';
          var marker = '<div class="card"><div class="card-body profile-row">';
          var i = html.indexOf(marker);
          html = i >= 0 ? html.slice(0, i) + block + html.slice(i) : html + block;
        }
        return html;
      };
    }
  }

  // ---- handler: simpan pengaturan org ----
  document.addEventListener('submit', async function (e) {
    if (!e.target || e.target.id !== 'f-pengaturan') return;
    e.preventDefault();
    var org = await getOrg(); if (!org) { toast('Data organisasi tidak ditemukan'); return; }
    var d = formData(e.target);
    var body = {
      nama: d.nama, jenis: d.jenis,
      kopBadan: d.kopBadan, kopLembaga: d.kopLembaga, kopKelurahan: d.kopKelurahan,
      kopKecamatan: d.kopKecamatan, kopKabkota: d.kopKabkota, kopAlamat: d.kopAlamat,
      kopKontak: d.kopKontak, logoUrl: d.logoUrl, capUrl: d.capUrl,
      ketuaRtNama: d.ketuaRtNama, ketuaRtJabatan: d.ketuaRtJabatan,
      ketuaRwNama: d.ketuaRwNama, ketuaRwJabatan: d.ketuaRwJabatan,
      duaTandaTangan: !!d.duaTandaTangan
    };
    var btn = e.target.querySelector('button[type=submit]'); if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan…'; }
    try {
      var updated = await patchOrg(org.id, body);
      if (window.SiAuth) { window.SiAuth.org = updated; if (window.SiAuth.applyOrg) window.SiAuth.applyOrg(updated); }
      toast('Pengaturan tersimpan \u2705');
      render('pengaturan');
    } catch (err) { toast(err.message || 'Gagal menyimpan'); if (btn) { btn.disabled = false; btn.textContent = 'Simpan Pengaturan'; } }
  });

  // ---- handler: ubah status langganan (super-admin) ----
  document.addEventListener('click', async function (e) {
    var b = e.target.closest && e.target.closest('[data-adminstatus]');
    if (!b) return;
    var parts = b.dataset.adminstatus.split(':'); var id = parts[0], status = parts[1];
    if (!(await confirmModal('Ubah status RT/RW ini menjadi "' + status + '"?', { okText: 'Ya, ubah' }))) return;
    try {
      var args = { p_org_id: id, p_status: status };
      if (status === 'aktif') args.p_hari = 365;
      await SA().rpc('aktifkan_organisasi', args);
      toast('Status diubah: ' + status + ' \u2705');
      render('superadmin');
    } catch (err) { toast(err.message || 'Gagal mengubah status'); }
  });
})();
