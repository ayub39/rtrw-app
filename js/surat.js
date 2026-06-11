// ============================================================
//  GENERATOR PDF SURAT  (LaporPakRT / LaporPakRW)
//  Template per-jenis surat + kop, cap/stempel, & penandatangan
//  diambil dari APP_CONFIG.SURAT (lihat js/config.js).
//  File ini dimuat SETELAH app.js dan menimpa cetakSurat bawaan.
// ============================================================
(function () {
  var ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

  // Isi keterangan untuk tiap jenis surat. Boleh ditambah/diubah sesuai kebutuhan.
  var SURAT_TEMPLATES = {
    'Surat Pengantar RT': { heading: 'SURAT PENGANTAR', isi: 'adalah benar warga yang berdomisili di lingkungan kami. Surat pengantar ini diberikan untuk melengkapi keperluan sebagaimana tersebut di bawah ini.' },
    'Surat Pengantar RW': { heading: 'SURAT PENGANTAR', isi: 'adalah benar warga yang berdomisili di lingkungan kami. Surat pengantar ini diberikan untuk melengkapi keperluan sebagaimana tersebut di bawah ini.' },
    'Cap / Legalisir RT': { heading: 'SURAT KETERANGAN', isi: 'adalah benar warga yang berdomisili di lingkungan kami, dan dokumen yang bersangkutan telah kami ketahui serta sahkan sesuai keperluan di bawah ini.' },
    'Surat Domisili': { heading: 'SURAT KETERANGAN DOMISILI', isi: 'adalah benar warga yang bertempat tinggal dan berdomisili di alamat tersebut di atas, dalam wilayah lingkungan kami.' },
    'Surat Keterangan Tidak Mampu (SKTM)': { heading: 'SURAT KETERANGAN TIDAK MAMPU', isi: 'adalah benar warga yang berdomisili di lingkungan kami, dan menurut sepengetahuan kami yang bersangkutan termasuk dalam keluarga yang KURANG / TIDAK MAMPU secara ekonomi.' },
    'Surat Pengantar KTP': { heading: 'SURAT PENGANTAR', isi: 'adalah benar warga yang berdomisili di lingkungan kami. Surat ini dibuat sebagai pengantar untuk pengurusan Kartu Tanda Penduduk (KTP).' },
    'Surat Pengantar KK': { heading: 'SURAT PENGANTAR', isi: 'adalah benar warga yang berdomisili di lingkungan kami. Surat ini dibuat sebagai pengantar untuk pengurusan Kartu Keluarga (KK).' },
    'Surat Keterangan Usaha': { heading: 'SURAT KETERANGAN USAHA', isi: 'adalah benar warga yang berdomisili di lingkungan kami dan benar-benar memiliki serta menjalankan usaha sebagaimana keterangan di bawah ini.' },
    'Surat Izin Keramaian': { heading: 'SURAT IZIN KERAMAIAN', isi: 'adalah benar warga di lingkungan kami, dan kami tidak berkeberatan serta memberikan izin atas pelaksanaan kegiatan/keramaian sebagaimana keperluan di bawah ini.' },
    'Surat Pengantar Nikah (N1-N4)': { heading: 'SURAT PENGANTAR NIKAH', isi: 'adalah benar warga yang berdomisili di lingkungan kami. Surat ini dibuat sebagai pengantar pengurusan administrasi pernikahan (model N1-N4) di KUA setempat.' },
    'Surat Pengantar SKCK': { heading: 'SURAT PENGANTAR', isi: 'adalah benar warga yang berdomisili di lingkungan kami. Surat ini dibuat sebagai pengantar untuk pengurusan Surat Keterangan Catatan Kepolisian (SKCK).' },
    'Surat Pindah Domisili': { heading: 'SURAT KETERANGAN PINDAH', isi: 'adalah benar warga di lingkungan kami yang bermaksud pindah domisili/tempat tinggal sebagaimana keperluan di bawah ini.' },
    'Surat Keterangan Kelahiran': { heading: 'SURAT KETERANGAN KELAHIRAN', isi: 'adalah benar warga di lingkungan kami, dan kami menerangkan peristiwa kelahiran sebagaimana keperluan di bawah ini.' },
    'Surat Keterangan Kematian': { heading: 'SURAT KETERANGAN KEMATIAN', isi: 'adalah benar warga di lingkungan kami, dan kami menerangkan peristiwa kematian sebagaimana keperluan di bawah ini.' },
    'Surat Keterangan Belum Menikah': { heading: 'SURAT KETERANGAN BELUM MENIKAH', isi: 'adalah benar warga yang berdomisili di lingkungan kami, dan menurut sepengetahuan kami yang bersangkutan BELUM PERNAH MENIKAH (berstatus belum kawin).' },
    'Lainnya': { heading: 'SURAT KETERANGAN', isi: 'adalah benar warga yang berdomisili di lingkungan kami. Surat keterangan ini dibuat sesuai keperluan di bawah ini.' }
  };
  window.SURAT_TEMPLATES = SURAT_TEMPLATES;

  function esq(v) { return (typeof esc === 'function') ? esc(v) : String(v == null ? '' : v); }
  function notify(m) { try { if (typeof toast === 'function') { toast(m); return; } } catch (e) {} try { alert(m); } catch (e2) {} }

  window.cetakSurat = function (s, w, signer) {
    var CF = window.APP_CONFIG || {};
    var C = CF.SURAT || {};
    var KOP = C.KOP || {};
    var nama = s.pemohon || '-';
    var nik = s.pemohonNik || (w && w.nik) || '';
    var alamat = (w && w.alamat) || '';
    var now = new Date();
    var seq = (String(s.id || '').replace(/\D/g, '').slice(-3) || '001');
    while (seq.length < 3) seq = '0' + seq;
    var nomor = (s.nomor && String(s.nomor).trim()) ? String(s.nomor).trim() : (seq + '/RT-RW/' + ROMAN[now.getMonth() + 1] + '/' + now.getFullYear());
    var tglSurat = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    var cat = Array.isArray(s.catatan) ? s.catatan : (s.catatan ? [{ text: s.catatan, role: 'pengurus' }] : []);
    var pengCats = cat.filter(function (c) { return c && c.role === 'pengurus'; });
    var lastCat = pengCats.length ? pengCats[pengCats.length - 1].text : '';
    var wil = (CF.WILAYAH && CF.WILAYAH.nama) || '';
    var kota = (KOP.kabkota || '').trim() || (wil.split('/').pop() || '').trim() || wil;

    var sgNama = (signer && signer.nama) || (C.KETUA_RT && C.KETUA_RT.nama) || 'Pengurus';
    var sgJab = (signer && signer.jabatan) || (C.KETUA_RT && C.KETUA_RT.jabatan) || 'Ketua RT/RW';
    var rwNama = (C.KETUA_RW && C.KETUA_RW.nama) || '';
    var rwJab = (C.KETUA_RW && C.KETUA_RW.jabatan) || 'Ketua RW';
    var dua = (C.DUA_TANDA_TANGAN !== false) && !!rwNama;

    var tpl = SURAT_TEMPLATES[s.jenis] || SURAT_TEMPLATES['Lainnya'];

    var kopLines = [];
    if (KOP.badan) kopLines.push('<div class="kop-badan">' + esq(KOP.badan) + '</div>');
    kopLines.push('<div class="kop-title">' + esq(KOP.namaLembaga || 'RUKUN TETANGGA / RUKUN WARGA') + '</div>');
    var sub2 = [KOP.kelurahan, KOP.kecamatan].filter(Boolean).join(' \u2022 ');
    if (sub2) kopLines.push('<div class="kop-sub">' + esq(sub2) + '</div>');
    if (KOP.alamat) kopLines.push('<div class="kop-addr">' + esq(KOP.alamat) + '</div>');
    if (KOP.kontak) kopLines.push('<div class="kop-addr">' + esq(KOP.kontak) + '</div>');
    var logoImg = KOP.logoUrl ? '<img class="kop-logo" src="' + esq(KOP.logoUrl) + '" alt="logo">' : '';

    var fill = '..............................';
    function row(label, val) { return '<tr><td class="l">' + esq(label) + '</td><td>:</td><td>' + (val ? esq(val) : fill) + '</td></tr>'; }
    var dataRows = [
      row('Nama Lengkap', nama),
      row('NIK', nik),
      row('Tempat/Tgl Lahir', w && (w.ttl || w.tempatLahir)),
      row('Jenis Kelamin', w && w.kelamin),
      row('Pekerjaan', w && w.pekerjaan),
      row('Agama', w && w.agama),
      row('Status Perkawinan', w && (w.statusKawin || w.statusNikah)),
      row('Kewarganegaraan', (w && w.kewarganegaraan) || 'Indonesia'),
      row('Alamat', alamat)
    ].join('');

    var capImg = KOP.capUrl ? '<img class="cap" src="' + esq(KOP.capUrl) + '" alt="stempel">' : '';
    var ttdBlock;
    if (dua) {
      ttdBlock = '<table class="ttd2"><tr>' +
        '<td><div>Mengetahui,</div><div>' + esq(rwJab) + '</div><div class="sp"></div><div><strong><u>' + esq(rwNama) + '</u></strong></div></td>' +
        '<td><div>' + esq(kota) + ', ' + esq(tglSurat) + '</div><div>' + esq(sgJab) + '</div><div class="sp">' + capImg + '</div><div><strong><u>' + esq(sgNama) + '</u></strong></div></td>' +
        '</tr></table>';
    } else {
      ttdBlock = '<div class="ttd"><div>' + esq(kota) + ', ' + esq(tglSurat) + '</div><div>' + esq(sgJab) + '</div><div class="sp">' + capImg + '</div><div><strong><u>' + esq(sgNama) + '</u></strong></div></div>';
    }

    var css = '*{box-sizing:border-box;font-family:"Times New Roman",Georgia,serif;color:#000}' +
      'body{margin:0;padding:36px 44px;background:#fff}' +
      '.kop{position:relative;text-align:center;line-height:1.35;min-height:64px}' +
      '.kop-logo{position:absolute;left:6px;top:0;width:64px;height:64px;object-fit:contain}' +
      '.kop-badan{font-size:15px;font-weight:bold}' +
      '.kop-title{font-size:20px;font-weight:bold;letter-spacing:1px}' +
      '.kop-sub{font-size:14px}' +
      '.kop-addr{font-size:12px}' +
      '.kop-line{border:none;border-top:3px double #000;margin:8px 0 18px}' +
      '.meta td{font-size:14px;padding:1px 0}' +
      '.judul{text-align:center;font-size:18px;font-weight:bold;text-decoration:underline;margin:18px 0 2px}' +
      '.judul-sub{text-align:center;font-size:13px;margin-bottom:14px}' +
      'p{font-size:14px;line-height:1.7;text-align:justify;margin:8px 0}' +
      'table.data{margin:6px 0 6px 28px;font-size:14px;border-collapse:collapse}' +
      'table.data td{vertical-align:top;padding:2px 6px}' +
      'table.data td.l{width:150px}' +
      '.kep{margin-left:28px;font-style:italic}' +
      '.ttd{margin-top:36px;width:50%;margin-left:auto;text-align:center;font-size:14px;line-height:1.5}' +
      '.ttd .sp{height:72px;position:relative}' +
      'table.ttd2{margin-top:30px;width:100%;font-size:14px;line-height:1.5;border-collapse:collapse}' +
      'table.ttd2 td{width:50%;text-align:center;vertical-align:top}' +
      'table.ttd2 .sp{height:72px;position:relative}' +
      '.cap{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:96px;height:96px;object-fit:contain;opacity:.9}' +
      '.noprint{text-align:center;margin-top:30px}' +
      '.noprint button{padding:10px 20px;font-size:14px;background:#4d7c0f;color:#fff;border:none;border-radius:8px;cursor:pointer}' +
      '@media print{.noprint{display:none}@page{margin:2cm}}';

    var html = '<!doctype html><html lang="id"><head><meta charset="utf-8"><title>' + esq(s.jenis) + ' - ' + esq(nama) + '</title><style>' + css + '</style></head><body>' +
      '<div class="kop">' + logoImg + kopLines.join('') + '</div>' +
      '<hr class="kop-line"/>' +
      '<table class="meta"><tr><td>Nomor</td><td>: ' + esq(nomor) + '</td></tr><tr><td>Lampiran</td><td>: -</td></tr><tr><td>Perihal</td><td>: ' + esq(s.jenis) + '</td></tr></table>' +
      '<div class="judul">' + esq(tpl.heading) + '</div><div class="judul-sub">' + esq(s.jenis) + '</div>' +
      '<p>Yang bertanda tangan di bawah ini, selaku ' + esq(sgJab) + ' di lingkungan ' + esq(wil) + ', dengan ini menerangkan bahwa:</p>' +
      '<table class="data">' + dataRows + '</table>' +
      '<p>' + esq(tpl.isi) + '</p>' +
      '<p>Surat ini dibuat untuk keperluan:</p>' +
      '<p class="kep">"' + esq(s.keperluan || '-') + '"</p>' +
      (lastCat ? '<p><strong>Catatan dari pengurus:</strong> ' + esq(lastCat) + '</p>' : '') +
      '<p>Demikian surat ini dibuat dengan sebenarnya, agar dapat dipergunakan sebagaimana mestinya.</p>' +
      ttdBlock +
      '<div class="noprint"><button onclick="window.print()">🖨️ Cetak / Simpan sebagai PDF</button></div>' +
      '</body></html>';

    var win = window.open('', '_blank');
    if (!win) { notify('Popup diblokir. Izinkan popup untuk membuat PDF.'); return; }
    win.document.write(html); win.document.close(); win.focus();
    setTimeout(function () { try { win.print(); } catch (e) {} }, 500);
  };
})();
