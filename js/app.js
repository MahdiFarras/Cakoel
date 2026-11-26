/* =========================================================
   CaKoel — Presentation & Application layer (Full-Screen SPA)
   ========================================================= */
const app = document.getElementById('app');
const AUTH_KEY = 'cakoel_auth';
const authed = () => sessionStorage.getItem(AUTH_KEY) === '1';
const ui = { kat: 'Semua', q: '', kasbonTab: 'pelanggan', period: 7, ringDay: startOfDay(Date.now()), pin: '', pinFirst: '', tokoDraft: null, draft: {}, penjaga: '' };

const currentRoute = () => location.hash.replace(/^#/, '').split('/')[0];
function go(h) { if (location.hash === '#' + h) render(); else location.hash = h; }

/* ---------- Komponen layout & navigasi ---------- */
const topbar = (title, sub = '', back = 'home', right = '', topLevel = false) => `
  <header class="topbar">
    <div class="topbar-inner">
      ${back ? `<button class="back ${topLevel ? 'mobile-only' : ''}" data-act="go" data-to="${back}" aria-label="Kembali">‹</button>` : ''}
      <div class="grow"><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${right}
    </div>
  </header>`;

const nav = active => `<nav class="bottomnav">${[['home', '🏠', 'Beranda'], ['barang', '📦', 'Barang'], ['laporan', '📊', 'Laporan'], ['profil', '👤', 'Profil']]
  .map(([r, i, l]) => `<a href="#${r}" class="${active === r ? 'active' : ''}"><span class="ni">${i}</span>${l}</a>`).join('')}</nav>`;

function sidebar(active) {
  const t = S.toko;
  const pend = pendingMasuk().length;
  const low = lowStock().length;
  const links = [
    ['home', '🏠', 'Beranda', ''],
    ['masuk', '📥', 'Barang Masuk', ''],
    ['hitung', '🧮', 'Hitung Stok', pend ? `<span class="sb-badge info">${pend}</span>` : ''],
    ['barang', '📦', 'Barang Prioritas', `<span class="sb-badge">${S.products.length}/${limitBarang()}</span>`],
    ['rekomendasi', '🛒', 'Rekomendasi Belanja', low ? `<span class="sb-badge warn">${low}</span>` : ''],
    ['ringkasan', '📊', 'Ringkasan Harian', ''],
    ['kasbon', '📒', 'Kasbon Pelanggan', ''],
    ['laporan', '📈', 'Laporan Keuangan', ''],
    ['profil', '👤', 'Profil & Pengaturan', ''],
  ];
  return `<aside class="sidebar">
    <div class="sb-brand">
      <div class="sb-logo">🏪</div>
      <div><div class="sb-title">Ca<span>Koel</span></div><div class="sb-sub">Hitung Stok, Untung Jadi!</div></div>
    </div>
    <button class="sb-store" data-act="go" data-to="toko">
      <div class="grow"><div class="bold small ellipsis">${esc(t.nama)}</div><div class="tiny muted ellipsis">📍 ${esc(t.alamat || 'Alamat belum diisi')}</div></div>
      <span class="badge ${t.premium ? 'b-yellow' : 'b-gray'}">${t.premium ? 'PRO' : 'Gratis'}</span>
    </button>
    <nav class="sb-nav">
      ${links.map(([r, ic, lbl, badge]) => `<a href="#${r}" class="${active === r ? 'active' : ''}"><span class="sb-ic">${ic}</span><span class="grow">${lbl}</span>${badge}</a>`).join('')}
    </nav>
    <div class="sb-foot">
      <div class="avatar" style="width:36px;height:36px;font-size:12px">${initials(t.pemilik)}</div>
      <div class="grow"><div class="small bold ellipsis">${esc(t.pemilik)}</div><div class="tiny muted">Pemilik</div></div>
      <button class="btn btn-ghost btn-sm" data-act="logout">Keluar</button>
    </div>
  </aside>`;
}

const shell = (active, content, bottomActive) => `
  <div class="shell">
    ${sidebar(active)}
    <div class="main">${content}</div>
    ${nav(bottomActive || active)}
  </div>`;

const authShell = rightHtml => `
  <div class="auth-shell">
    <section class="auth-brand">
      <div class="auth-brand-inner">
        <div class="logo-bubble">🏪</div>
        <div class="brand">Ca<span>Koel</span></div>
        <div class="tag">Hitung Stok, Untung Jadi!</div>
        <p>Aplikasi pencatatan stok &amp; untung warung kelontong yang simpel dan cepat.</p>
        <ul class="auth-features">
          <li>📦 Pantau 10–20 barang utama</li>
          <li>🧮 Hitung untung otomatis</li>
          <li>💬 Laporan langsung ke WhatsApp</li>
        </ul>
        <div class="auth-foot">Sistem Informasi Bisnis (C) · Kelompok 3</div>
      </div>
    </section>
    <section class="auth-panel"><div class="auth-card">${rightHtml}</div></section>
  </div>`;

const empty = (icon, title, sub, btn = '') => `<div class="empty-state"><div class="big">${icon}</div><p class="bold" style="color:var(--text);margin:8px 0 4px">${title}</p><p class="small">${sub}</p>${btn}</div>`;

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}
function openSheet(html) {
  document.getElementById('sheet-root').innerHTML = `<div class="sheet-overlay" data-act="sheet-bg"><div class="sheet" role="dialog"><div class="grab"></div>${html}</div></div>`;
  const f = document.querySelector('.sheet input:not([type=hidden]):not([type=checkbox])');
  if (f) setTimeout(() => f.focus(), 120);
}
const closeSheet = () => { document.getElementById('sheet-root').innerHTML = ''; };
const catChips = () => `<div class="chips">${['Semua', ...KATEGORI].map(k => `<button class="chip ${ui.kat === k ? 'active' : ''}" data-act="kat" data-k="${k}">${k}</button>`).join('')}</div>`;
const filterProducts = () => S.products.filter(p => (ui.kat === 'Semua' || p.kategori === ui.kat) && p.nama.toLowerCase().includes(ui.q.toLowerCase()));

/* =========================================================
   SCREENS
   ========================================================= */
const routes = {};

/* ---------- Splash ---------- */
routes.splash = () => authShell(`
  <div class="center" style="padding:8px 0">
    <div style="font-size:52px;line-height:1;margin-bottom:12px">🏪</div>
    <div class="eyebrow">Selamat Datang</div>
    <h1 style="margin:6px 0 8px;font-size:24px">Catat Stok Warung Jadi Lebih Mudah</h1>
    <p class="small muted" style="margin:0 0 24px">Cukup catat barang masuk &amp; sisa stok — untung harian langsung ketahuan.</p>
    <div class="stack">
      <button class="btn btn-primary" data-act="go" data-to="login">Mulai Sekarang →</button>
      <button class="btn btn-ghost" data-act="demo">🧪 Coba Data Contoh</button>
    </div>
  </div>`);

/* ---------- Login / daftar ---------- */
routes.login = () => authShell(`
  ${S.toko ? `<div class="card row" style="background:var(--cream);margin-bottom:18px;padding:12px 14px">
    <div class="avatar">${initials(S.toko.pemilik)}</div>
    <div class="grow"><div class="bold small ellipsis">${esc(S.toko.nama)}</div><div class="tiny muted ellipsis">${esc(S.toko.pemilik)} · +62 ${esc(S.toko.wa)}</div></div>
    <button type="button" class="btn btn-primary btn-sm" data-act="go" data-to="pin">Masuk dengan PIN →</button>
  </div>` : ''}
  <form data-form="login" autocomplete="on">
    <div class="eyebrow">Masuk ke CaKoel</div>
    <h1 style="font-size:22px;margin:6px 0 4px">Selamat Datang di CaKoel!</h1>
    <p class="small muted" style="margin:0 0 16px">Kelola warung jadi lebih gampang setiap hari.</p>
    <button type="button" class="btn btn-wa" data-act="wa-login">💬 Masuk dengan WhatsApp</button>
    <div class="divider">${S.toko ? 'atau masuk / daftar akun warung baru' : 'atau isi data warung'}</div>
    <div class="field"><label>Nomor WhatsApp</label>
      <div class="input-group"><span>+62</span><input class="input" name="wa" inputmode="tel" placeholder="812 3456 7890" required value="${esc(ui.tokoDraft?.wa || '')}"></div>
      <div class="hint">Laporan harian akan dikirim ke nomor ini.</div></div>
    <div class="field"><label>Nama Pemilik</label><input class="input" name="pemilik" placeholder="contoh: Bu Sari" required value="${esc(ui.tokoDraft?.pemilik || '')}"></div>
    <div class="field"><label>Nama Warung</label><input class="input" name="nama" placeholder="contoh: Warung Berkah" required value="${esc(ui.tokoDraft?.nama || '')}"></div>
    <div class="field"><label>Alamat (opsional)</label><input class="input" name="alamat" placeholder="contoh: Bandung, Jawa Barat" value="${esc(ui.tokoDraft?.alamat || '')}"></div>
    <button class="btn btn-primary" type="submit">Lanjut Buat PIN →</button>
    <p class="tiny muted center mt">Dengan masuk, Ibu setuju dengan Ketentuan CaKoel.</p>
    <p class="center" style="margin:6px 0 0"><button type="button" class="link-btn" data-act="demo">Coba dulu dengan data contoh →</button></p>
  </form>`);

/* ---------- PIN ---------- */
const pinPad = () => `
  <div class="pin-dots" id="pindots">${[0, 1, 2, 3].map(i => `<i class="${i < ui.pin.length ? 'on' : ''}"></i>`).join('')}</div>
  <div class="pinpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button" data-act="pinkey" data-k="${n}">${n}</button>`).join('')}
    <button type="button" class="empty" tabindex="-1"></button><button type="button" data-act="pinkey" data-k="0">0</button><button type="button" data-act="pinkey" data-k="del" aria-label="Hapus">⌫</button></div>
  <p class="small muted mt2" style="margin-bottom:0">🔒 PIN Ibu aman dan tidak dibagikan</p>`;

routes.pinset = () => {
  if (!ui.tokoDraft) { setTimeout(() => go('login')); return ''; }
  const second = !!ui.pinFirst;
  return authShell(`
    <div class="row between" style="margin-bottom:8px">
      <button type="button" class="link-btn" data-act="go" data-to="login">‹ Kembali</button>
      <span class="eyebrow">Keamanan PIN</span>
    </div>
    <div class="pin-wrap">
      <h2 style="margin:0 0 4px">${second ? 'Ulangi PIN' : 'Buat PIN 4 Angka'}</h2>
      <p class="small muted" style="margin:0">${second ? 'Masukkan PIN sekali lagi untuk konfirmasi' : 'Gunakan 4 angka yang mudah Ibu ingat'}</p>
      ${pinPad()}
    </div>`);
};
routes.pin = () => {
  if (!S.toko) { setTimeout(() => go('login')); return ''; }
  return authShell(`
    <div class="row between" style="margin-bottom:8px">
      <button type="button" class="link-btn" data-act="go" data-to="login">‹ Kembali ke Login</button>
      <span class="eyebrow">Verifikasi PIN</span>
    </div>
    <div class="pin-wrap">
      <div class="avatar" style="margin:0 auto;width:64px;height:64px;font-size:20px">${initials(S.toko.pemilik)}</div>
      <h2 style="margin:12px 0 2px">${esc(S.toko.nama)}</h2>
      <p class="small muted" style="margin:0">Gunakan 4 angka PIN CaKoel ${esc(S.toko.pemilik)}</p>
      ${pinPad()}
      <p style="margin:14px 0 0"><button type="button" class="link-btn" data-act="forgot-pin">Lupa PIN?</button></p>
    </div>`);
};

/* ---------- Beranda ---------- */
routes.home = () => {
  const t = S.toko; const h = new Date().getHours();
  const greet = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  const low = lowStock();
  const today = summarize(startOfDay(Date.now()), Date.now() + 1);
  const pend = pendingMasuk().length;
  const last = S.shifts[S.shifts.length - 1];
  const body = `
  ${topbar('Beranda', fmtDate(Date.now()), '', `<span class="badge ${t.premium ? 'b-yellow' : 'b-gray'}">${t.premium ? '⭐ Premium' : 'Paket Gratis'}</span>`, true)}
  <div class="page-body">
    <section class="home-banner">
      <div>
        <div class="hello">${greet},</div>
        <h1>Halo, ${esc(t.pemilik)}!</h1>
        <div class="small" style="opacity:.92">Pilih kegiatan warung hari ini dari menu cepat di bawah.</div>
      </div>
      <button class="banner-store" data-act="go" data-to="toko">
        <span style="font-size:24px">🏪</span>
        <div><div class="tiny" style="opacity:.85;letter-spacing:.5px">TOKO SAYA</div><div class="bold">${esc(t.nama)}</div><div class="tiny" style="opacity:.9">📍 ${esc(t.alamat || 'Alamat belum diisi')}</div></div>
        <span style="font-size:18px;opacity:.9">›</span>
      </button>
    </section>

    <div class="section-title"><h3>Mau melakukan apa?</h3><span>4 aktivitas utama warung</span></div>
    <div class="tiles">
      <button class="tile t-orange" data-act="go" data-to="masuk"><span class="t-ic">📥</span><div><b>Barang<br>Masuk</b><small>Catat belanja stok</small></div><span class="arrow">→</span></button>
      <button class="tile t-green" data-act="go" data-to="hitung"><span class="t-ic">🧮</span><div><b>Hitung<br>Stok</b><small>Cek untung hari ini</small></div><span class="arrow">→</span></button>
      <button class="tile t-blue" data-act="go" data-to="ringkasan"><span class="t-ic">📊</span><div><b>Lihat<br>Hari Ini</b><small>Ringkasan warung</small></div><span class="arrow">→</span></button>
      <button class="tile t-purple" data-act="go" data-to="kasbon"><span class="t-ic">📒</span><div><b>Kasbon</b><small>Catat utang pelanggan</small></div><span class="arrow">→</span></button>
    </div>

    <div class="dash-grid mt2">
      <div class="stack">
        ${S.products.length === 0 ? `<div class="alert alert-yellow">📦<div class="grow"><b>Langkah pertama:</b> daftarkan 10–20 barang prioritas yang paling sering laku.</div><button class="btn btn-primary btn-sm" data-act="go" data-to="barangform">Tambah</button></div>` : ''}
        ${pend ? `<button class="alert alert-blue" style="width:100%;text-align:left" data-act="go" data-to="hitung">📥<div class="grow">${pend} catatan barang masuk menunggu <b>hitung stok akhir shift</b>.</div><span class="chev">›</span></button>` : ''}
        <div class="card">
          <div class="row between" style="margin-bottom:12px"><h3 style="margin:0;font-size:15.5px">Ringkasan hari ini</h3><span class="tiny muted">${fmtDate(Date.now())}</span></div>
          <div class="mini-stats">
            <div class="card" style="background:var(--cream)"><span class="tiny muted">Omzet</span><b>${rp(today.omzet)}</b></div>
            <div class="card" style="background:var(--cream)"><span class="tiny muted">Untung</span><b style="color:var(--green)">${rp(today.laba)}</b></div>
            <div class="card" style="background:var(--cream)"><span class="tiny muted">Terjual</span><b>${num(today.terjual)} unit</b></div>
          </div>
          ${last ? `<p class="tiny muted" style="margin:12px 0 0">Hitung stok terakhir: <b>${ago(last.ts)}</b> oleh ${esc(last.penjaga)}</p>` : '<p class="tiny muted" style="margin:12px 0 0">Belum ada hitung stok hari ini.</p>'}
        </div>
        <div class="tips">💡<div><b>Tips CaKoel</b><br>Hitung stok setiap warung tutup atau ganti shift agar hasil perkiraan penjualan &amp; laba makin akurat.</div></div>
      </div>

      <div class="stack">
        <div class="card">
          <div class="row between" style="margin-bottom:10px"><h3 style="margin:0;font-size:15.5px">⚠️ Stok hampir habis</h3><span class="badge ${low.length ? 'b-yellow' : 'b-green'}">${low.length} barang</span></div>
          ${low.length ? `<div class="list" style="box-shadow:none">${low.slice(0, 4).map(p => productItem(p, 'go', 'rekomendasi')).join('')}</div>
            <button class="btn btn-green btn-sm mt" data-act="go" data-to="rekomendasi">Lihat rekomendasi belanja →</button>`
            : '<p class="small muted" style="margin:4px 0 0">Semua stok barang prioritas masih aman 👍</p>'}
        </div>
        <button class="card row between" style="width:100%;text-align:left" data-act="go" data-to="kasbon">
          <div><div class="tiny muted">📒 Total kasbon belum lunas</div><div class="bold" style="font-size:20px;color:var(--purple);margin-top:2px">${rp(totalKasbon())}</div></div>
          <span class="btn btn-ghost btn-sm">Kelola ›</span>
        </button>
        ${!t.premium ? `<div class="ad-card">📢<div class="grow"><b>Iklan</b> · Grosir Sembako Murah — antar gratis ke warung area Bandung.</div><button class="link-btn" data-act="go" data-to="paket">Hapus iklan</button></div>` : ''}
      </div>
    </div>
  </div>`;
  return shell('home', body);
};

/* ---------- Barang (master data) ---------- */
const productItem = (p, act = 'go', to = 'barangform/' + p.id) => {
  const st = statusStok(p);
  return `<button class="item" data-act="${act}" data-to="${to}" data-pid="${p.id}">
    <div class="p-ic">${p.icon}</div>
    <div class="grow"><div class="name ellipsis">${esc(p.nama)}</div><div class="meta">Stok ${num(p.stok)} ${esc(p.satuan)} · ${rp(p.hargaJual)}/${esc(p.satuan)}</div></div>
    <span class="badge ${st.cls}">${st.label}</span><span class="chev">›</span></button>`;
};
const productCard = p => {
  const st = statusStok(p);
  return `<button class="prod-card" data-act="go" data-to="barangform/${p.id}" data-pid="${p.id}">
    <div class="p-ic">${p.icon}</div>
    <div class="grow">
      <div class="row between"><span class="name ellipsis">${esc(p.nama)}</span><span class="badge ${st.cls}">${st.label}</span></div>
      <div class="meta">Stok ${num(p.stok)} ${esc(p.satuan)} · min ${num(p.minStok)}</div>
      <div class="tiny muted" style="margin-top:3px">Beli ${rp(p.hargaBeli)} · Jual <b style="color:var(--text)">${rp(p.hargaJual)}</b>/${esc(p.satuan)}</div>
    </div>
  </button>`;
};
const barangListHTML = () => {
  const list = filterProducts();
  if (!S.products.length) return empty('📦', 'Belum ada barang', 'Daftarkan 10–20 barang yang paling sering dibeli pelanggan.', `<button class="btn btn-primary btn-sm mt" data-act="go" data-to="barangform">+ Tambah Barang</button>`);
  if (!list.length) return empty('🔍', 'Barang tidak ditemukan', 'Coba kata kunci lain.');
  return `<div class="card-grid">${list.map(p => productCard(p)).join('')}</div>`;
};
routes.barang = () => {
  const lim = limitBarang();
  return shell('barang', `
    ${topbar('Barang Prioritas', `${S.products.length}/${lim} barang dipantau`, 'home', S.products.length < lim ? `<button class="btn btn-primary btn-sm" data-act="go" data-to="barangform">+ Tambah Barang</button>` : '', true)}
    <div class="page-body">
      <div class="toolbar">
        <input class="input" id="search" placeholder="🔍 Cari nama barang…" value="${esc(ui.q)}">
        ${catChips()}
      </div>
      <div id="blist" class="mt">${barangListHTML()}</div>
      ${S.products.length >= lim ? `<div class="alert alert-yellow mt">⭐<div class="grow">Batas ${lim} barang tercapai.${!S.toko.premium ? ' Upgrade ke Premium untuk memantau hingga 20 barang.' : ''}</div>${!S.toko.premium ? '<button class="btn btn-sm btn-yellow" data-act="go" data-to="paket">Upgrade</button>' : ''}</div>` : ''}
      <p class="tiny muted mt">CaKoel sengaja fokus pada 10–20 barang prioritas agar pencatatan tetap ringan dan cepat.</p>
    </div>`);
};
routes.barangform = id => {
  const p = id ? getProduct(id) : null;
  if (!p && S.products.length >= limitBarang()) { setTimeout(() => { toast(`Batas ${limitBarang()} barang tercapai`); go('barang'); }); return ''; }
  const v = p || { nama: '', kategori: 'Sembako', satuan: '', icon: '📦', hargaBeli: '', hargaJual: '', minStok: '', leadTime: 2, stok: '' };
  return shell('barang', `
    ${topbar(p ? 'Ubah Barang' : 'Tambah Barang', p ? esc(p.nama) : 'Daftarkan barang prioritas', 'barang')}
    <div class="page-body"><form class="card narrow" data-form="barang">
      <input type="hidden" name="id" value="${p ? p.id : ''}">
      <input type="hidden" name="icon" id="icon-in" value="${v.icon}">
      <div class="field"><label>Ikon</label><div class="emoji-pick">${EMOJIS.map(e => `<button type="button" class="${e === v.icon ? 'active' : ''}" data-act="emoji" data-e="${e}">${e}</button>`).join('')}</div></div>
      <div class="field"><label>Nama barang</label><input class="input" name="nama" required maxlength="40" placeholder="contoh: Minyak Goreng" value="${esc(v.nama)}"></div>
      <div class="grid2">
        <div class="field"><label>Kategori</label><select class="input" name="kategori">${KATEGORI.map(k => `<option ${k === v.kategori ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
        <div class="field"><label>Satuan</label><input class="input" name="satuan" required maxlength="12" placeholder="liter, kg, bungkus" value="${esc(v.satuan)}" list="satuan-list"><datalist id="satuan-list">${['pcs', 'bungkus', 'botol', 'kg', 'liter', 'karung', 'sachet', 'kaleng', 'dus', 'batang', 'renceng'].map(s => `<option value="${s}">`).join('')}</datalist></div>
      </div>
      <div class="grid2">
        <div class="field"><label>Harga beli (modal)</label><div class="input-group"><span>Rp</span><input class="input" name="hargaBeli" type="number" min="0" step="any" required inputmode="numeric" value="${v.hargaBeli}" data-margin></div></div>
        <div class="field"><label>Harga jual</label><div class="input-group"><span>Rp</span><input class="input" name="hargaJual" type="number" min="0" step="any" required inputmode="numeric" value="${v.hargaJual}" data-margin></div></div>
      </div>
      <div class="alert alert-green" id="margin-box" style="margin:-4px 0 14px">💰 <span id="margin-txt">Isi harga untuk melihat untung per satuan.</span></div>
      <div class="field"><label>${p ? 'Stok saat ini' : 'Stok awal (hasil hitung fisik)'}</label><input class="input" name="stok" type="number" min="0" step="any" required inputmode="numeric" value="${v.stok}">
        ${p ? '<div class="hint">Ubah hanya untuk koreksi. Normalnya stok berubah lewat Barang Masuk & Hitung Stok.</div>' : ''}</div>
      <div class="grid2">
        <div class="field"><label>Batas minimum</label><input class="input" name="minStok" type="number" min="0" step="any" required inputmode="numeric" value="${v.minStok}"><div class="hint">Pengingat restock muncul saat stok ≤ angka ini.</div></div>
        <div class="field"><label>Lama kulakan (hari)</label><input class="input" name="leadTime" type="number" min="0" max="30" required inputmode="numeric" value="${v.leadTime}"><div class="hint">Waktu dari pesan sampai barang datang.</div></div>
      </div>
      <div class="stack">
        <button class="btn btn-primary" type="submit">💾 Simpan Barang</button>
        ${p ? `<button class="btn btn-danger" type="button" data-act="del-barang" data-pid="${p.id}">🗑️ Hapus Barang</button>` : ''}
      </div>
    </form></div>`);
};

/* ---------- Barang masuk ---------- */
const masukListHTML = () => {
  const freq = {}; S.masuk.forEach(m => { freq[m.pid] = (freq[m.pid] || 0) + 1; });
  const list = filterProducts().sort((a, b) => (freq[b.id] || 0) - (freq[a.id] || 0));
  if (!S.products.length) return empty('📦', 'Belum ada barang', 'Daftarkan barang prioritas dulu.', `<button class="btn btn-primary btn-sm mt" data-act="go" data-to="barangform">+ Tambah Barang</button>`);
  if (!list.length) return empty('🔍', 'Barang tidak ditemukan', 'Coba kata kunci lain.');
  return `<div class="card-grid-2">${list.map(p => `<button class="prod-card" data-act="masuk-sheet" data-pid="${p.id}">
    <div class="p-ic">${p.icon}</div><div class="grow"><div class="name ellipsis">${esc(p.nama)}</div><div class="meta">${rp(p.hargaBeli)} / ${esc(p.satuan)} · stok ${num(p.stok)}</div></div><span class="chev">›</span></button>`).join('')}</div>`;
};
routes.masuk = () => {
  const pend = pendingMasuk().sort((a, b) => b.ts - a.ts);
  const tot = pend.reduce((a, m) => a + m.qty * m.hargaBeli, 0);
  return shell('masuk', `
    ${topbar('Barang Masuk', 'Barang apa yang baru dibeli dari agen/supplier?', 'home', '', true)}
    <div class="page-body">
      <div class="split-grid">
        <div>
          <div class="toolbar">
            <input class="input" id="search" placeholder="🔍 Cari nama barang…" value="${esc(ui.q)}">
            ${catChips()}
          </div>
          <div class="section-title"><h3>Pilih barang</h3><span>${S.products.length} barang</span></div>
          <div id="blist">${masukListHTML()}</div>
        </div>
        <div class="sticky-col">
          <div class="card">
            <div class="row between" style="margin-bottom:10px"><h3 style="margin:0;font-size:15.5px">Belum dihitung (shift ini)</h3><span class="bold small" style="color:var(--blue)">${rp(tot)}</span></div>
            ${pend.length ? `<div class="list" style="box-shadow:none">${pend.map(m => { const p = getProduct(m.pid); return p ? `<div class="item"><div class="p-ic">${p.icon}</div><div class="grow"><div class="name">+${num(m.qty)} ${esc(p.satuan)} ${esc(p.nama)}</div><div class="meta">${ago(m.ts)} · ${rp(m.qty * m.hargaBeli)}</div></div><button class="btn btn-sm btn-danger" data-act="del-masuk" data-id="${m.id}" aria-label="Hapus">✕</button></div>` : ''; }).join('')}</div>
              <p class="tiny muted mt">Barang masuk akan dijumlahkan ke stok saat melakukan <b>Hitung Stok</b> akhir shift.</p>
              <button class="btn btn-green mt" data-act="go" data-to="hitung">🧮 Lanjut Hitung Stok</button>`
              : '<p class="small muted" style="margin:0">Belum ada barang masuk yang dicatat untuk shift ini. Klik salah satu barang di sebelah kiri untuk mencatat belanja stok.</p>'}
          </div>
        </div>
      </div>
    </div>`, 'home');
};
function masukSheet(pid) {
  const p = getProduct(pid); if (!p) return;
  openSheet(`<form data-form="masuk">
    <input type="hidden" name="pid" value="${p.id}">
    <div class="row"><div class="p-ic" style="width:48px;height:48px;border-radius:14px;background:var(--cream-2);display:grid;place-items:center;font-size:24px">${p.icon}</div>
      <div><h3>${esc(p.nama)}</h3><div class="small muted">Berapa ${esc(p.satuan)} yang diterima?</div></div></div>
    <div class="big-qty"><button type="button" data-act="qty" data-d="-1">−</button><input id="qty-in" name="qty" type="number" min="0" step="any" inputmode="decimal" value="1" required><button type="button" data-act="qty" data-d="1">+</button></div>
    <p class="center small muted" style="margin-top:-4px">${esc(p.satuan)}</p>
    <label class="row small" style="margin:10px 0"><input type="checkbox" id="chg-price" data-act="toggle-price"> Harga beli berubah?</label>
    <div class="field hidden" id="price-field"><label>Harga beli baru per ${esc(p.satuan)}</label><div class="input-group"><span>Rp</span><input class="input" name="hargaBeli" id="price-in" type="number" min="0" step="any" inputmode="numeric" value="${p.hargaBeli}"></div><div class="hint">Harga lama: ${rp(p.hargaBeli)}</div></div>
    <div class="alert alert-blue" style="margin-bottom:14px">🧾 Total belanja: <b id="sub-txt">${rp(p.hargaBeli)}</b></div>
    <button class="btn btn-primary" type="submit">✔ Simpan Barang Masuk</button>
  </form>`);
  document.querySelector('#qty-in').dataset.price = p.hargaBeli;
}
function updateMasukSub() {
  const q = Number(document.getElementById('qty-in')?.value) || 0;
  const chg = document.getElementById('chg-price')?.checked;
  const price = chg ? Number(document.getElementById('price-in').value) || 0 : Number(document.getElementById('qty-in').dataset.price);
  const el = document.getElementById('sub-txt'); if (el) el.textContent = rp(q * price);
}

/* ---------- Hitung stok (serah-terima shift) ---------- */
routes.hitung = () => {
  if (!S.products.length) return shell('hitung', `${topbar('Hitung Stok', 'Masukkan sisa barang sekarang', 'home', '', true)}<div class="page-body">${empty('📦', 'Belum ada barang', 'Daftarkan barang prioritas dulu sebelum menghitung stok.', `<button class="btn btn-primary btn-sm mt" data-act="go" data-to="barangform">+ Tambah Barang</button>`)}</div>`, 'home');
  const last = S.shifts[S.shifts.length - 1];
  const penjaga = S.toko.penjaga?.length ? S.toko.penjaga : [S.toko.pemilik];
  if (!ui.penjaga || !penjaga.includes(ui.penjaga)) ui.penjaga = penjaga[0];
  return shell('hitung', `
    ${topbar('Hitung Stok', 'Masukkan sisa barang fisik di rak', 'home', '', true)}
    <div class="page-body">
      <div class="split-grid">
        <div>
          <div class="row between small"><b>Isi stok fisik di rak</b><span class="muted" id="prog-txt"></span></div>
          <div class="progress" style="margin-top:6px"><i id="prog-bar" style="width:0"></i></div>
          <div class="alert alert-blue mt">ℹ️<div class="small">Stok awal diambil dari ${last ? `hitung stok terakhir (<b>${esc(last.penjaga)}</b>, ${ago(last.ts)})` : 'data barang'}. Terjual = stok awal + masuk − rusak − stok akhir.</div></div>
          <div class="list mt">${S.products.map(p => {
            const masuk = pendingQty(p.id); const d = ui.draft[p.id] || {};
            return `<div class="count-row" id="row-${p.id}">
              <div class="row"><div class="p-ic" style="width:40px;height:40px;border-radius:12px;background:var(--cream-2);display:grid;place-items:center;font-size:20px;flex:none">${p.icon}</div>
                <div class="grow"><div class="name bold" style="font-size:14px">${esc(p.nama)}</div><div class="tiny muted">Awal ${num(p.stok)}${masuk ? ` + masuk <b style="color:var(--blue)">${num(masuk)}</b>` : ''} = ${num(p.stok + masuk)} ${esc(p.satuan)}</div></div>
                <div class="stepper"><button type="button" data-act="step" data-pid="${p.id}" data-d="-1" aria-label="Kurangi">−</button><input type="number" min="0" step="any" inputmode="decimal" data-count="${p.id}" value="${d.akhir ?? ''}" placeholder="–" aria-label="Stok akhir ${esc(p.nama)}"><button type="button" data-act="step" data-pid="${p.id}" data-d="1" aria-label="Tambah">+</button></div></div>
              <div class="row between" style="margin-top:4px"><button type="button" class="link-btn" data-act="toggle-rusak" data-pid="${p.id}">${d.rusak ? '− Rusak/hilang' : '+ Ada rusak/hilang?'}</button><span class="tiny bold" id="sold-${p.id}"></span></div>
              <div class="row ${d.rusak ? '' : 'hidden'}" id="rusak-${p.id}" style="margin-top:6px"><span class="tiny muted grow">Jumlah rusak / kedaluwarsa / hilang (${esc(p.satuan)})</span><input class="input" style="width:90px;padding:8px" type="number" min="0" step="any" data-rusak="${p.id}" value="${d.rusak || ''}" placeholder="0"></div>
              <div class="err-msg hidden" id="err-${p.id}">⚠️ Stok akhir lebih besar dari stok tersedia. Cek ulang, atau catat dulu barang masuk yang terlewat.</div>
            </div>`; }).join('')}</div>
        </div>
        <div class="sticky-col stack">
          <div class="card">
            <h3 style="margin:0 0 10px;font-size:15.5px">Estimasi sementara</h3>
            <div class="stat-duo">
              <div class="stat stat-blue"><div class="lbl">Omzet</div><div class="val" id="live-omzet" style="font-size:18px">Rp0</div></div>
              <div class="stat stat-green"><div class="lbl">Untung</div><div class="val" id="live-laba" style="font-size:18px">Rp0</div></div>
            </div>
            <p class="tiny muted" style="margin:10px 0 0">Total terjual sementara: <b id="live-terjual">0 unit</b></p>
          </div>
          <div class="card">
            <div class="field"><label>Penjaga yang menghitung</label><select class="input" id="penjaga-in">${penjaga.map(n => `<option ${n === ui.penjaga ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
            <div class="field" style="margin:0"><label>Catatan serah-terima (opsional)</label><textarea class="input" id="catatan-in" rows="2" placeholder="contoh: Gas elpiji tinggal 1, besok ada pesanan beras">${esc(ui.catatan || '')}</textarea></div>
            <button class="btn btn-green mt" data-act="save-shift">✔ Simpan &amp; Lihat Hasil</button>
          </div>
        </div>
      </div>
    </div>`, 'home');
};
function updateCount(pid) {
  const it = computeShift(ui.draft).find(i => i.pid === pid);
  const row = document.getElementById('row-' + pid); if (!row || !it) return;
  const sold = document.getElementById('sold-' + pid), err = document.getElementById('err-' + pid);
  row.classList.toggle('err', it.invalid); row.classList.toggle('ok', it.akhir != null && !it.invalid);
  err.classList.toggle('hidden', !it.invalid);
  sold.innerHTML = it.akhir == null ? '' : it.invalid ? '<span style="color:var(--red)">Tidak sesuai</span>' : `<span style="color:var(--green)">Terjual ± ${num(it.terjual)} ${esc(it.satuan)}</span>`;
  updateProgress();
}
function updateProgress() {
  const items = computeShift(ui.draft);
  const filled = items.filter(i => i.akhir != null).length;
  const t = document.getElementById('prog-txt'), b = document.getElementById('prog-bar');
  if (t) t.textContent = `${filled}/${S.products.length} diisi`;
  if (b) b.style.width = (S.products.length ? filled / S.products.length * 100 : 0) + '%';
  const valid = items.filter(i => i.akhir != null && !i.invalid);
  const om = valid.reduce((a, i) => a + i.omzet, 0);
  const lb = valid.reduce((a, i) => a + (i.omzet - i.modal), 0);
  const tj = valid.reduce((a, i) => a + i.terjual, 0);
  const eOm = document.getElementById('live-omzet'), eLb = document.getElementById('live-laba'), eTj = document.getElementById('live-terjual');
  if (eOm) eOm.textContent = rp(om);
  if (eLb) eLb.textContent = rp(lb);
  if (eTj) eTj.textContent = `${num(tj)} unit`;
}

/* ---------- Hasil hitung ---------- */
routes.hasil = id => {
  const s = S.shifts.find(x => x.id === id);
  if (!s) return shell('home', `${topbar('Hasil', '', 'home')}<div class="page-body">${empty('🤔', 'Data tidak ditemukan', '')}</div>`);
  const margin = s.omzet ? s.laba / s.omzet * 100 : 0;
  const sold = s.items.filter(i => i.terjual > 0).sort((a, b) => b.omzet - a.omzet);
  const rusak = s.items.filter(i => i.rusak > 0);
  return shell('home', `
    ${topbar('Hasil Hitung', 'Perkiraan berdasarkan perubahan stok', 'home')}
    <div class="page-body">
      <div class="split-grid">
        <div class="stack">
          <div class="alert alert-blue small">ℹ️ Hasil ini adalah <b>perkiraan</b> berdasarkan perubahan stok, bukan catatan penjualan per transaksi.</div>
          <div class="stat-duo">
            <div class="stat stat-blue"><div class="lbl">Perkiraan omzet</div><div class="val">${rp(s.omzet)}</div><div class="sub">${num(s.terjual)} unit terjual</div></div>
            <div class="stat stat-green"><div class="lbl">Perkiraan untung</div><div class="val">${rp(s.laba)}</div><div class="sub">Margin ${num(margin)}%</div></div>
          </div>
          <div>
            <div class="section-title" style="margin-top:6px"><h3>Barang terjual</h3><span>${num(s.terjual)} unit</span></div>
            ${sold.length ? `<div class="list">${sold.map(i => `<div class="item"><div class="p-ic">${i.icon}</div><div class="grow"><div class="name">${esc(i.nama)}</div><div class="meta">${num(i.terjual)} ${esc(i.satuan)} terjual · sisa ${num(i.akhir)}</div></div><div class="right"><div class="bold small">${rp(i.omzet)}</div><div class="tiny" style="color:var(--green)">+${rp(i.omzet - i.modal)}</div></div></div>`).join('')}</div>` : empty('🛒', 'Tidak ada barang terjual', 'Stok akhir sama dengan stok awal.')}
          </div>
        </div>
        <div class="sticky-col stack">
          <div class="card">
            <div class="tiny muted">Waktu hitung stok</div>
            <div class="bold">${fmtDate(s.ts)} · ${fmtTime(s.ts)}</div>
            <div class="small muted" style="margin-top:4px">Penjaga: <b>${esc(s.penjaga)}</b></div>
          </div>
          ${rusak.length ? `<div class="alert alert-red">🗑️<div class="small"><b>Rusak/hilang:</b> ${rusak.map(i => `${esc(i.nama)} ${num(i.rusak)} ${esc(i.satuan)}`).join(', ')} — kerugian ±${rp(s.rugi)}</div></div>` : ''}
          ${s.catatan ? `<div class="card small">📝 <b>Catatan serah-terima:</b><div style="margin-top:4px">${esc(s.catatan)}</div></div>` : ''}
          <div class="card stack">
            <button class="btn btn-green" data-act="go" data-to="rekomendasi">🛒 Lihat Rekomendasi Belanja</button>
            <a class="btn btn-wa" target="_blank" rel="noopener" href="${waLink(S.toko.wa, shiftText(s))}">💬 Kirim ke WhatsApp Pemilik</a>
            <button class="btn btn-ghost" data-act="go" data-to="home">Kembali ke Beranda</button>
          </div>
        </div>
      </div>
    </div>`);
};
function shiftText(s) {
  const margin = s.omzet ? s.laba / s.omzet * 100 : 0;
  const top = s.items.filter(i => i.terjual > 0).sort((a, b) => b.omzet - a.omzet).slice(0, 5);
  const low = lowStock();
  return `*Laporan Shift — ${S.toko.nama}*\n${fmtDate(s.ts)} · ${fmtTime(s.ts)}\nPenjaga: ${s.penjaga}\n\n` +
    `Perkiraan omzet: ${rp(s.omzet)}\nPerkiraan untung: ${rp(s.laba)} (${num(margin)}%)\nBarang terjual: ${num(s.terjual)} unit\n` +
    (top.length ? `\n*Terlaris:*\n${top.map(i => `• ${i.nama} ${num(i.terjual)} ${i.satuan} — ${rp(i.omzet)}`).join('\n')}\n` : '') +
    (s.rugi ? `\nRusak/hilang: ±${rp(s.rugi)}\n` : '') +
    (low.length ? `\n⚠️ *Stok menipis:* ${low.map(p => `${p.nama} (${num(p.stok)} ${p.satuan})`).join(', ')}\n` : '') +
    (s.catatan ? `\nCatatan: ${s.catatan}\n` : '') + `\n_Dikirim dari CaKoel — Hitung Stok, Untung Jadi!_`;
}

/* ---------- Rekomendasi belanja ---------- */
routes.rekomendasi = () => {
  const rec = rekomendasi();
  const total = rec.reduce((a, r) => a + r.saran * r.p.hargaBeli, 0);
  return shell('rekomendasi', `
    ${topbar('Rekomendasi Belanja', 'Supaya stok warung tetap aman', 'home', '', true)}
    <div class="page-body">
      ${rec.length ? `<div class="split-grid">
        <div>
          <div class="alert alert-yellow">⚠️<div><b>${rec.length} barang perlu dibeli</b><div class="tiny">Belanjakan lebih dulu agar tidak kehilangan penjualan.</div></div></div>
          <div class="section-title"><h3>Prioritas belanja</h3><span>${rec.length} item</span></div>
          <div class="list">${rec.map(r => { const st = statusStok(r.p); return `<div class="item" style="align-items:flex-start">
            <div class="p-ic">${r.p.icon}</div>
            <div class="grow"><div class="row between"><span class="name">${esc(r.p.nama)}</span><span class="badge ${st.key === 'aman' ? 'b-blue' : st.cls}">${st.key === 'aman' ? 'Segera' : st.label}</span></div>
              <div class="meta">Tersisa ${num(r.p.stok)} ${esc(r.p.satuan)}${isFinite(r.habisDalam) ? ` · habis ±${num(Math.max(0, r.habisDalam))} hari` : ''} · laku ±${num(r.avg)}/hari</div>
              <div class="row between" style="margin-top:6px"><span class="tiny muted">Saran beli</span><b class="small">${num(r.saran)} ${esc(r.p.satuan)} · ${rp(r.saran * r.p.hargaBeli)}</b></div></div></div>`; }).join('')}</div>
        </div>
        <div class="sticky-col stack">
          <div class="stat stat-orange"><div class="lbl">Estimasi modal belanja</div><div class="val">${rp(total)}</div><div class="sub">${rec.length} barang prioritas</div></div>
          <div class="card small muted"><b>Rumus saran beli:</b><br>(rata-rata terjual per hari × (lama kulakan + 2 hari)) + batas minimum − stok sekarang.</div>
          <div class="card stack">
            <a class="btn btn-wa" target="_blank" rel="noopener" href="${waLink(S.toko.wa, belanjaText(rec, total))}">💬 Kirim Daftar Belanja ke WhatsApp</a>
            <button class="btn btn-green" data-act="go" data-to="home">Kembali ke Beranda</button>
          </div>
        </div>
      </div>` : empty('✅', 'Stok masih aman', 'Belum ada barang yang mencapai batas minimum.', `<button class="btn btn-green btn-sm mt" data-act="go" data-to="home">Kembali ke Beranda</button>`)}
    </div>`, 'home');
};
const belanjaText = (rec, total) => `*Daftar Belanja — ${S.toko.nama}*\n${fmtDate(Date.now())}\n\n${rec.map((r, i) => `${i + 1}. ${r.p.nama}: ${num(r.saran)} ${r.p.satuan} (±${rp(r.saran * r.p.hargaBeli)})`).join('\n')}\n\nEstimasi total: ${rp(total)}\n\n_Dikirim dari CaKoel_`;

/* ---------- Ringkasan harian ---------- */
routes.ringkasan = () => {
  const d0 = ui.ringDay, d1 = d0 + DAY;
  const cur = summarize(d0, d1), prev = summarize(d0 - DAY, d0);
  const isToday = d0 === startOfDay(Date.now());
  const pct = prev.omzet ? (cur.omzet - prev.omzet) / prev.omzet * 100 : null;
  const low = lowStock();
  return shell('ringkasan', `
    ${topbar('Ringkasan Harian', fmtDate(d0), 'home', '', true)}
    <div class="page-body">
      <div class="card row between" style="padding:8px 12px;max-width:360px">
        <button class="btn btn-ghost btn-sm" data-act="ring-day" data-d="-1">‹</button>
        <b>${isToday ? 'Hari ini' : fmtShort(d0)}</b>
        <button class="btn btn-ghost btn-sm" data-act="ring-day" data-d="1" ${isToday ? 'disabled' : ''}>›</button>
      </div>
      <div class="split-grid mt">
        <div class="stack">
          ${cur.shifts.length ? `
          <div class="stat-big"><div class="tiny bold" style="opacity:.9">PERKIRAAN OMZET</div><div class="val">${rp(cur.omzet)}</div>
            <div class="tiny">${pct === null ? 'Belum ada data pembanding' : `${pct >= 0 ? '↑' : '↓'} ${num(Math.abs(pct))}% dibanding hari sebelumnya`}</div></div>
          <div class="grid2">
            <div class="card"><div class="tiny muted">💰 Perkiraan untung</div><b style="font-size:18px;color:var(--green)">${rp(cur.laba)}</b></div>
            <div class="card"><div class="tiny muted">🛒 Barang terjual</div><b style="font-size:18px">${num(cur.terjual)} unit</b></div>
          </div>
          <div>
            <div class="section-title" style="margin-top:6px"><h3>Shift hari ini</h3><span>${cur.shifts.length} kali hitung</span></div>
            <div class="list">${cur.shifts.map(s => `<button class="item" data-act="go" data-to="hasil/${s.id}"><div class="p-ic">🧮</div><div class="grow"><div class="name">${fmtTime(s.ts)} · ${esc(s.penjaga)}</div><div class="meta">${num(s.terjual)} unit · untung ${rp(s.laba)}</div></div><b class="small">${rp(s.omzet)}</b><span class="chev">›</span></button>`).join('')}</div>
          </div>` : empty('🗓️', 'Belum ada hitung stok', isToday ? 'Lakukan hitung stok saat tutup warung atau ganti shift.' : 'Tidak ada data pada tanggal ini.', isToday ? `<button class="btn btn-green btn-sm mt" data-act="go" data-to="hitung">🧮 Hitung Stok Sekarang</button>` : '')}
        </div>
        <div class="sticky-col stack">
          ${cur.items.length ? `<div class="card"><h3 style="margin:0 0 10px;font-size:15.5px">Terlaris hari ini</h3>${cur.items.slice(0, 5).map(i => `<div class="row between small" style="padding:5px 0;border-bottom:1px dashed var(--line)"><span>${i.icon} ${esc(i.nama)}</span><b>${num(i.terjual)} ${esc(i.satuan)}</b></div>`).join('')}</div>` : ''}
          <div class="card">
            <div class="row between" style="margin-bottom:10px"><h3 style="margin:0;font-size:15.5px">Stok hampir habis</h3><span class="badge b-yellow">${low.length} barang</span></div>
            ${low.length ? `<div class="list" style="box-shadow:none">${low.slice(0, 4).map(p => productItem(p, 'go', 'rekomendasi')).join('')}</div><button class="link-btn mt" data-act="go" data-to="rekomendasi">Lihat semua rekomendasi →</button>` : '<p class="small muted" style="margin:0">Semua stok aman 👍</p>'}
          </div>
          ${cur.shifts.length ? `<a class="btn btn-blue" target="_blank" rel="noopener" href="${waLink(S.toko.wa, dailyText(d0, cur, low))}">💬 Kirim Ringkasan ke WhatsApp</a>` : ''}
        </div>
      </div>
    </div>`, 'home');
};
const dailyText = (d0, c, low) => `*Ringkasan Harian — ${S.toko.nama}*\n${fmtDate(d0)}\n\nPerkiraan omzet: ${rp(c.omzet)}\nPerkiraan untung: ${rp(c.laba)}\nBarang terjual: ${num(c.terjual)} unit\nJumlah shift: ${c.shifts.length}\n` +
  (c.items.length ? `\n*Terlaris:*\n${c.items.slice(0, 5).map(i => `• ${i.nama} ${num(i.terjual)} ${i.satuan}`).join('\n')}\n` : '') +
  (low.length ? `\n⚠️ *Perlu kulakan:* ${low.map(p => p.nama).join(', ')}\n` : '') + `\n_Dikirim dari CaKoel_`;

/* ---------- Kasbon ---------- */
routes.kasbon = () => {
  const total = totalKasbon();
  const aktif = S.pelanggan.filter(c => saldoPelanggan(c.id) > 0).length;
  const list = [...S.pelanggan].sort((a, b) => saldoPelanggan(b.id) - saldoPelanggan(a.id));
  const trx = [...S.kasbon].sort((a, b) => b.ts - a.ts);
  return shell('kasbon', `
    ${topbar('Kasbon Pelanggan', 'Catat utang, jaga kepercayaan', 'home', `<button class="btn btn-yellow btn-sm" data-act="add-pelanggan">+ Tambah Pelanggan</button>`, true)}
    <div class="page-body">
      <div class="stat stat-purple row between"><div><div class="lbl">Total belum lunas</div><div class="val">${rp(total)}</div><div class="sub">${aktif} pelanggan aktif</div></div><span style="font-size:44px">📒</span></div>
      <div class="tabs mt"><button class="${ui.kasbonTab === 'pelanggan' ? 'active' : ''}" data-act="ktab" data-t="pelanggan">Pelanggan</button><button class="${ui.kasbonTab === 'riwayat' ? 'active' : ''}" data-act="ktab" data-t="riwayat">Riwayat</button></div>
      <div class="mt">
      ${ui.kasbonTab === 'pelanggan'
        ? (list.length ? `<div class="card-grid">${list.map(c => { const s = saldoPelanggan(c.id); const l = lastKasbon(c.id); return `<button class="prod-card" data-act="go" data-to="pelanggan/${c.id}">
            <div class="initials">${initials(c.nama)}</div><div class="grow"><div class="name ellipsis">${esc(c.nama)}</div><div class="meta">${l ? 'Terakhir ' + ago(l) : 'Belum ada transaksi'}</div></div>
            <div class="right"><div class="bold small">${rp(Math.abs(s))}</div><span class="badge ${s > 0 ? 'b-red' : 'b-green'}">${s > 0 ? 'Belum lunas' : 'Lunas'}</span></div></button>`; }).join('')}</div>`
          : empty('📒', 'Belum ada pelanggan', 'Tambahkan pelanggan yang suka kasbon.'))
        : (trx.length ? `<div class="list">${trx.map(k => { const c = S.pelanggan.find(x => x.id === k.cid); return `<div class="item"><div class="initials" style="${k.tipe === 'bayar' ? 'background:var(--green-l);color:var(--green)' : ''}">${k.tipe === 'bayar' ? '✓' : '↑'}</div>
            <div class="grow"><div class="name">${esc(c?.nama || '(dihapus)')}</div><div class="meta">${esc(k.ket || (k.tipe === 'bayar' ? 'Pembayaran' : 'Utang'))} · ${ago(k.ts)}</div></div>
            <b class="small" style="color:${k.tipe === 'bayar' ? 'var(--green)' : 'var(--red)'}">${k.tipe === 'bayar' ? '−' : '+'}${rp(k.jumlah)}</b></div>`; }).join('')}</div>`
          : empty('🧾', 'Belum ada riwayat', 'Transaksi kasbon akan muncul di sini.'))}
      </div>
    </div>`, 'home');
};
routes.pelanggan = cid => {
  const c = S.pelanggan.find(x => x.id === cid);
  if (!c) return shell('kasbon', `${topbar('Pelanggan', '', 'kasbon')}<div class="page-body">${empty('🤔', 'Pelanggan tidak ditemukan', '')}</div>`, 'home');
  const s = saldoPelanggan(cid);
  const trx = S.kasbon.filter(k => k.cid === cid).sort((a, b) => b.ts - a.ts);
  const msg = `Assalamualaikum ${c.nama}, ini dari ${S.toko.nama}. Mengingatkan kasbon sebesar ${rp(s)} ya. Terima kasih 🙏`;
  return shell('kasbon', `
    ${topbar(esc(c.nama), c.hp ? esc(c.hp) : 'Tanpa nomor HP', 'kasbon')}
    <div class="page-body">
      <div class="split-grid">
        <div class="stack">
          <div class="stat ${s > 0 ? 'stat-purple' : 'stat-green'}"><div class="lbl">${s > 0 ? 'Sisa utang' : s < 0 ? 'Kelebihan bayar' : 'Status'}</div><div class="val">${s === 0 ? 'Lunas ✓' : rp(Math.abs(s))}</div><div class="sub">${trx.length} transaksi</div></div>
          <div class="grid2">
            <button class="btn btn-primary" data-act="kasbon-sheet" data-cid="${cid}" data-tipe="utang">+ Catat Utang</button>
            <button class="btn btn-green" data-act="kasbon-sheet" data-cid="${cid}" data-tipe="bayar" ${s <= 0 ? 'disabled' : ''}>✓ Terima Bayar</button>
          </div>
          ${s > 0 && c.hp ? `<a class="btn btn-wa" target="_blank" rel="noopener" href="${waLink(c.hp, msg)}">💬 Ingatkan via WhatsApp</a>` : ''}
          <button class="btn btn-danger" data-act="del-pelanggan" data-cid="${cid}">🗑️ Hapus Pelanggan</button>
        </div>
        <div>
          <div class="section-title" style="margin-top:0"><h3>Riwayat transaksi</h3><span>${trx.length} catatan</span></div>
          ${trx.length ? `<div class="list">${trx.map(k => `<div class="item"><div class="grow"><div class="name">${k.tipe === 'bayar' ? '✓ Bayar' : '↑ Utang'}${k.ket ? ' · ' + esc(k.ket) : ''}</div><div class="meta">${fmtDate(k.ts)} ${fmtTime(k.ts)}</div></div>
            <b class="small" style="color:${k.tipe === 'bayar' ? 'var(--green)' : 'var(--red)'}">${k.tipe === 'bayar' ? '−' : '+'}${rp(k.jumlah)}</b><button class="btn btn-sm btn-ghost" data-act="del-kasbon" data-id="${k.id}" aria-label="Hapus">✕</button></div>`).join('')}</div>` : empty('🧾', 'Belum ada transaksi', '')}
        </div>
      </div>
    </div>`, 'home');
};
function kasbonSheet(cid, tipe) {
  const c = S.pelanggan.find(x => x.id === cid); const s = saldoPelanggan(cid);
  const chips = [10000, 20000, 50000, 100000];
  openSheet(`<form data-form="kasbon"><input type="hidden" name="cid" value="${cid}"><input type="hidden" name="tipe" value="${tipe}">
    <h3>${tipe === 'utang' ? 'Catat Utang' : 'Terima Pembayaran'}</h3><p class="small muted" style="margin-top:0">${esc(c.nama)}${s > 0 ? ' · sisa ' + rp(s) : ''}</p>
    <div class="field"><label>Jumlah</label><div class="input-group"><span>Rp</span><input class="input" id="amt-in" name="jumlah" type="number" min="1" step="any" inputmode="numeric" required></div></div>
    <div class="chips" style="margin:-4px 0 12px">${chips.map(v => `<button type="button" class="chip" data-act="amt" data-v="${v}">${rp(v)}</button>`).join('')}${tipe === 'bayar' && s > 0 ? `<button type="button" class="chip active" data-act="amt" data-v="${s}">Lunasi ${rp(s)}</button>` : ''}</div>
    <div class="field"><label>Keterangan (opsional)</label><input class="input" name="ket" maxlength="60" placeholder="${tipe === 'utang' ? 'contoh: beras 1 karung' : 'contoh: cicilan'}"></div>
    <button class="btn ${tipe === 'utang' ? 'btn-primary' : 'btn-green'}" type="submit">Simpan</button></form>`);
}

/* ---------- Laporan ---------- */
routes.laporan = () => {
  const prem = S.toko.premium;
  if (!prem && ui.period !== 7) ui.period = 7;
  const now = Date.now();
  const from = ui.period ? startOfDay(now) - (ui.period - 1) * DAY : 0;
  const r = summarize(from, now + 1);
  const days = new Set(r.shifts.map(s => dayKey(s.ts))).size || 1;
  const margin = r.omzet ? r.laba / r.omzet * 100 : 0;
  const maxOm = Math.max(1, ...r.items.map(i => i.omzet));
  const periods = [[7, '7 Hari'], [30, '30 Hari'], [0, 'Semua']];
  return shell('laporan', `
    ${topbar('Laporan Keuangan', `${S.toko.nama} · ${ui.period ? `${fmtShort(from)} – ${fmtShort(now)}` : 'Semua data'}`, 'home', `<button class="btn btn-ghost btn-sm no-print" data-act="print">🖨️ Cetak / PDF</button>`, true)}
    <div class="page-body">
      <div class="toolbar no-print">
        <div class="chips">${periods.map(([v, l]) => `<button class="chip ${ui.period === v ? 'active' : ''}" data-act="period" data-v="${v}">${l}${!prem && v !== 7 ? '<span class="lock-badge">PRO</span>' : ''}</button>`).join('')}</div>
        ${r.shifts.length ? `<div class="row" style="flex-wrap:wrap">
          <a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${waLink(S.toko.wa, reportText(from, now, r, margin))}">💬 Kirim WhatsApp</a>
          <button class="btn btn-ghost btn-sm" data-act="csv">📄 Unduh Excel (CSV)${!prem ? '<span class="lock-badge">PRO</span>' : ''}</button>
        </div>` : ''}
      </div>
      ${r.shifts.length ? `
      <div class="kpi-4 mt">
        <div class="stat stat-blue"><div class="lbl">Perkiraan omzet</div><div class="val">${rp(r.omzet)}</div><div class="sub">±${rp(r.omzet / days)}/hari</div></div>
        <div class="stat stat-green"><div class="lbl">Perkiraan laba kotor</div><div class="val">${rp(r.laba)}</div><div class="sub">Margin ${num(margin)}%</div></div>
        <div class="card"><div class="tiny muted">📥 Belanja stok</div><b style="font-size:20px;display:block;margin-top:6px">${rp(r.pembelian)}</b></div>
        <div class="card"><div class="tiny muted">📒 Kasbon belum lunas</div><b style="font-size:20px;color:var(--purple);display:block;margin-top:6px">${rp(totalKasbon())}</b></div>
      </div>

      <div class="two-col mt2">
        <div class="stack">
          <div class="card">
            <div class="row between"><b class="small">Omzet &amp; laba harian</b><span class="tiny muted">${days} hari tercatat</span></div>
            <div class="chart-wrap mt"><canvas id="chart"></canvas></div>
            <div class="legend"><span><i style="background:var(--blue)"></i>Omzet</span><span><i style="background:var(--green)"></i>Laba</span></div>
          </div>
          <div class="card">
            <div class="row between" style="margin-bottom:8px"><h3 style="margin:0;font-size:15.5px">Barang terlaris</h3><span class="tiny muted">${num(r.terjual)} unit terjual</span></div>
            ${r.items.slice(0, 5).map((i, n) => `<div style="padding:7px 0"><div class="row between small"><span>${n + 1}. ${i.icon} ${esc(i.nama)}</span><b>${rp(i.omzet)}</b></div>
              <div class="bar-h"><i style="width:${i.omzet / maxOm * 100}%"></i></div><div class="tiny muted" style="margin-top:3px">${num(i.terjual)} ${esc(i.satuan)} · laba ${rp(i.laba)}</div></div>`).join('')}
          </div>
        </div>
        <div class="stack">
          <div class="card">
            <div class="row between" style="margin-bottom:8px"><h3 style="margin:0;font-size:15.5px">Laba rugi sederhana</h3><span class="tiny muted">estimasi</span></div>
            <table class="table">
              <tr><td>Penjualan (omzet)</td><td class="right">${rp(r.omzet)}</td></tr>
              <tr><td>Harga pokok penjualan</td><td class="right">(${rp(r.modal)})</td></tr>
              <tr><td><b>Laba kotor</b></td><td class="right"><b>${rp(r.laba)}</b></td></tr>
              <tr><td>Kerugian rusak/hilang</td><td class="right">(${rp(r.rugi)})</td></tr>
              <tr class="tot"><td>Laba setelah susut</td><td class="right" style="color:var(--green)">${rp(r.laba - r.rugi)}</td></tr>
            </table>
            <p class="tiny muted" style="margin:10px 0 0">Mengarah ke format SAK EMKM; belum termasuk biaya operasional (listrik, sewa, gaji).</p>
          </div>
          <div>
            <div class="section-title" style="margin-top:4px"><h3>Riwayat hitung stok</h3><span>${r.shifts.length} shift</span></div>
            <div class="list">${[...r.shifts].reverse().slice(0, 30).map(s => `<button class="item" data-act="go" data-to="hasil/${s.id}"><div class="grow"><div class="name">${fmtShort(s.ts)} · ${fmtTime(s.ts)}</div><div class="meta">${esc(s.penjaga)} · ${num(s.terjual)} unit · laba ${rp(s.laba)}</div></div><b class="small">${rp(s.omzet)}</b><span class="chev">›</span></button>`).join('')}</div>
          </div>
        </div>
      </div>` : `<div class="mt">${empty('📊', 'Belum ada data laporan', 'Laporan terisi otomatis setiap kali Ibu melakukan Hitung Stok.', `<button class="btn btn-green btn-sm mt" data-act="go" data-to="hitung">🧮 Hitung Stok</button>`)}</div>`}
    </div>`);
};
const reportText = (from, to, r, margin) => `*Laporan ${S.toko.nama}*\n${ui.period ? `${fmtShort(from)} – ${fmtShort(to)}` : 'Semua data'}\n\nPerkiraan omzet: ${rp(r.omzet)}\nHPP: ${rp(r.modal)}\nLaba kotor: ${rp(r.laba)} (${num(margin)}%)\nRusak/hilang: ${rp(r.rugi)}\nBelanja stok: ${rp(r.pembelian)}\nKasbon belum lunas: ${rp(totalKasbon())}\n\n*5 Terlaris:*\n${r.items.slice(0, 5).map((i, n) => `${n + 1}. ${i.nama} — ${num(i.terjual)} ${i.satuan}`).join('\n')}\n\n_Dikirim dari CaKoel_`;

function drawChart() {
  const cv = document.getElementById('chart'); if (!cv) return;
  const now = Date.now();
  let n = ui.period;
  if (!n) { const first = S.shifts.length ? Math.min(...S.shifts.map(s => s.ts)) : now; n = Math.min(60, Math.round((startOfDay(now) - startOfDay(first)) / DAY) + 1); }
  const start = startOfDay(now) - (n - 1) * DAY;
  const data = Array.from({ length: n }, (_, i) => { const d = start + i * DAY; const s = summarize(d, d + DAY); return { d, om: s.omzet, lb: s.laba }; });
  const dpr = window.devicePixelRatio || 1; const W = cv.clientWidth, H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr; const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const padL = 44, padB = 22, padT = 10; const cw = W - padL - 6, ch = H - padB - padT;
  const max = Math.max(1, ...data.map(x => x.om)) * 1.1;
  g.font = '10px Poppins, sans-serif'; g.fillStyle = '#9a8f86'; g.strokeStyle = '#f0e6d6'; g.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = padT + ch - ch * i / 3; g.beginPath(); g.moveTo(padL, y); g.lineTo(W, y); g.stroke();
    const v = max * i / 3; g.textAlign = 'right'; g.fillText(v >= 1e6 ? (v / 1e6).toFixed(1) + 'jt' : Math.round(v / 1000) + 'rb', padL - 6, y + 3);
  }
  const bw = cw / n; const step = Math.ceil(n / 10);
  data.forEach((x, i) => {
    const x0 = padL + i * bw; const w = Math.max(3, Math.min(28, bw * 0.65));
    const h1 = ch * x.om / max, h2 = ch * x.lb / max;
    g.fillStyle = '#3F86E8'; roundRect(g, x0 + (bw - w) / 2, padT + ch - h1, w, h1, Math.min(5, w / 2));
    g.fillStyle = '#2F6B4F'; roundRect(g, x0 + (bw - w) / 2, padT + ch - h2, w, h2, Math.min(5, w / 2));
    if (i % step === 0 || i === n - 1) { g.fillStyle = '#9a8f86'; g.textAlign = 'center'; g.fillText(new Date(x.d).getDate(), x0 + bw / 2, H - 5); }
  });
}
function roundRect(g, x, y, w, h, r) { if (h <= 0) return; r = Math.min(r, h); g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h); g.closePath(); g.fill(); }

/* ---------- Profil & pengaturan ---------- */
const menuItem = (icon, title, sub, act, to = '', extra = '') => `<button class="item" data-act="${act}" data-to="${to}"><div class="p-ic">${icon}</div><div class="grow"><div class="name" ${extra}>${title}</div><div class="meta">${sub}</div></div><span class="chev">›</span></button>`;
routes.profil = () => {
  const t = S.toko;
  return shell('profil', `
    ${topbar('Profil & Pengaturan', 'Kelola akun warung, data, dan paket langganan', 'home', '', true)}
    <div class="page-body">
      <div class="two-col">
        <div>
          <div class="card profile-card"><div class="avatar">${initials(t.pemilik)}</div><div class="grow"><div class="bold">${esc(t.nama)}</div><div class="tiny muted">${esc(t.pemilik)} · ${esc(t.alamat || '-')}</div></div><button class="btn btn-sm btn-danger" data-act="go" data-to="toko">Ubah Profil</button></div>
          ${!t.premium ? `<div class="premium-card mt"><h3>⭐ CaKoel Premium</h3><div class="small">Pantau hingga 20 barang, laporan 30 hari, unduh Excel &amp; tanpa iklan — ${rp(PREMIUM_PRICE)}/bulan.</div><button class="btn btn-yellow btn-sm mt" data-act="go" data-to="paket">Lihat Paket</button></div>` : ''}
          <div class="menu-group-title">Toko &amp; Akun</div>
          <div class="list">
            ${menuItem('🏪', 'Data Toko', 'Nama, alamat, dan nomor WA', 'go', 'toko')}
            ${menuItem('⚙️', 'Pengaturan', 'PIN, penjaga, notifikasi', 'go', 'pengaturan')}
            ${menuItem('⭐', 'Paket Langganan', t.premium ? 'Premium aktif' : 'Gratis', 'go', 'paket')}
            ${menuItem('❓', 'Bantuan', 'Panduan menggunakan CaKoel', 'go', 'bantuan')}
          </div>
        </div>
        <div>
          <div class="menu-group-title" style="margin-top:0">Data</div>
          <div class="list">
            ${menuItem('💾', 'Cadangkan Data', 'Unduh file cadangan (.json)', 'backup')}
            ${menuItem('📂', 'Pulihkan Data', 'Dari file cadangan', 'restore')}
            ${menuItem('🧪', 'Muat Data Contoh', 'Ganti data dengan contoh 14 hari', 'demo-reload')}
            ${menuItem('🗑️', 'Hapus Semua Data', 'Mulai dari awal', 'wipe', '', 'style="color:var(--red)"')}
          </div>
          <div class="menu-group-title">Tentang</div>
          <div class="list">
            ${menuItem('🟠', 'Tentang CaKoel', 'Versi 1.0', 'go', 'tentang')}
            ${menuItem('↪️', 'Keluar', 'Kembali ke halaman login', 'logout', '', 'style="color:var(--red)"')}
          </div>
        </div>
      </div>
      <input type="file" id="restore-file" accept="application/json,.json" class="hidden">
      <p class="foot-note">CaKoel — Hitung Stok, Untung Jadi!</p>
    </div>`);
};
routes.toko = () => {
  const t = S.toko;
  return shell('profil', `
    ${topbar('Data Toko', 'Informasi warung Ibu', 'profil')}
    <div class="page-body"><form class="card narrow" data-form="toko">
      <div class="field"><label>Nama Warung</label><input class="input" name="nama" required value="${esc(t.nama)}"></div>
      <div class="field"><label>Nama Pemilik</label><input class="input" name="pemilik" required value="${esc(t.pemilik)}"></div>
      <div class="field"><label>Alamat</label><input class="input" name="alamat" value="${esc(t.alamat)}"></div>
      <div class="field"><label>Nomor WhatsApp Pemilik</label><div class="input-group"><span>+62</span><input class="input" name="wa" inputmode="tel" required value="${esc(t.wa)}"></div><div class="hint">Tujuan pengiriman laporan & daftar belanja.</div></div>
      <button class="btn btn-primary" type="submit">💾 Simpan</button>
    </form></div>`);
};
routes.pengaturan = () => {
  const t = S.toko;
  return shell('profil', `
    ${topbar('Pengaturan', 'PIN, penjaga, notifikasi', 'profil')}
    <div class="page-body"><div class="two-col">
      <div>
        <div class="section-title" style="margin-top:0"><h3>Penjaga warung</h3><span>untuk serah-terima shift</span></div>
        <div class="list">${(t.penjaga || []).map((n, i) => `<div class="item"><div class="initials">${initials(n)}</div><div class="grow name">${esc(n)}</div>${t.penjaga.length > 1 ? `<button class="btn btn-sm btn-ghost" data-act="del-penjaga" data-i="${i}">✕</button>` : ''}</div>`).join('')}</div>
        <form class="row mt" data-form="penjaga"><input class="input grow" name="nama" required maxlength="30" placeholder="Nama penjaga baru"><button class="btn btn-primary btn-sm" style="height:46px" type="submit">Tambah</button></form>
        <div class="section-title"><h3>Pengingat stok</h3></div>
        <div class="card row"><div class="grow"><b class="small">Notifikasi stok menipis</b><div class="tiny muted">Tampil saat aplikasi dibuka &amp; ada barang di bawah batas minimum.</div></div>
          <label class="switch"><input type="checkbox" id="notif-toggle" ${t.notif ? 'checked' : ''}><span></span></label></div>
      </div>
      <div>
        <div class="section-title" style="margin-top:0"><h3>Ubah PIN</h3></div>
        <form class="card" data-form="pin">
          <div class="field"><label>PIN lama</label><input class="input" name="old" type="password" inputmode="numeric" maxlength="4" pattern="\\d{4}" required></div>
          <div class="grid2"><div class="field"><label>PIN baru</label><input class="input" name="new1" type="password" inputmode="numeric" maxlength="4" pattern="\\d{4}" required></div>
          <div class="field"><label>Ulangi PIN baru</label><input class="input" name="new2" type="password" inputmode="numeric" maxlength="4" pattern="\\d{4}" required></div></div>
          <button class="btn btn-primary" type="submit">Ubah PIN</button>
        </form>
      </div>
    </div></div>`);
};
routes.paket = () => {
  const p = S.toko.premium;
  const rows = [['Barang prioritas', '10 barang', '20 barang'], ['Barang masuk & hitung stok', '✓', '✓'], ['Estimasi penjualan & laba', '✓', '✓'], ['Rekomendasi belanja', '✓', '✓'], ['Kasbon pelanggan', '✓', '✓'], ['Laporan via WhatsApp', '✓', '✓'], ['Riwayat laporan', '7 hari', '30 hari & semua'], ['Unduh Excel (CSV)', '–', '✓'], ['Bebas iklan', '–', '✓']];
  return shell('profil', `
    ${topbar('Paket Langganan', 'Model freemium CaKoel', 'profil')}
    <div class="page-body"><div class="narrow">
      <div class="premium-card"><h3>⭐ Premium</h3><div style="font-size:28px;font-weight:800">${rp(PREMIUM_PRICE)}<span style="font-size:13px;font-weight:500">/bulan</span></div><div class="small">Paket saat ini: <b>${p ? 'Premium' : 'Gratis'}</b></div></div>
      <div class="card mt"><table class="table"><tr><td class="bold">Fitur</td><td class="center bold">Gratis</td><td class="center bold" style="color:var(--green)">Premium</td></tr>
        ${rows.map(r => `<tr><td>${r[0]}</td><td class="center">${r[1]}</td><td class="center">${r[2]}</td></tr>`).join('')}</table></div>
      <button class="btn ${p ? 'btn-ghost' : 'btn-yellow'} mt" data-act="toggle-premium">${p ? 'Kembali ke Paket Gratis' : 'Aktifkan Premium (Simulasi)'}</button>
      <p class="tiny muted center mt">Ini simulasi untuk prototipe — belum ada pembayaran sungguhan.</p>
    </div></div>`);
};
routes.bantuan = () => shell('profil', `
  ${topbar('Bantuan', 'Panduan menggunakan CaKoel', 'profil')}
  <div class="page-body"><div class="two-col">
    <div class="stack">
      <div class="section-title" style="margin-top:0"><h3>Cara pakai</h3></div>
      ${[['1', '📦', 'Daftarkan barang prioritas', 'Pilih 10–20 barang yang paling sering laku. Isi harga beli, harga jual, stok awal, dan batas minimum.'],
        ['2', '📥', 'Catat barang masuk', 'Setiap habis kulakan, buka Barang Masuk → pilih barang → isi jumlah. Jika harga beli berubah, centang “Harga beli berubah?”.'],
        ['3', '🧮', 'Hitung stok akhir shift', 'Saat tutup warung atau ganti penjaga, hitung sisa barang di rak lalu isi di Hitung Stok.'],
        ['4', '📊', 'Lihat hasil & untung', 'CaKoel otomatis memperkirakan barang terjual, omzet, dan untung: terjual = stok awal + masuk − stok akhir.'],
        ['5', '🛒', 'Belanja sesuai rekomendasi', 'Barang yang menipis muncul di Rekomendasi Belanja lengkap dengan saran jumlah beli.'],
        ['6', '💬', 'Kirim laporan via WhatsApp', 'Tekan tombol hijau untuk mengirim ringkasan ke nomor WhatsApp pemilik.']]
        .map(s => `<div class="card row" style="align-items:flex-start"><div class="avatar" style="background:var(--primary-l);color:var(--primary)">${s[0]}</div><div><b>${s[1]} ${s[2]}</b><div class="small muted">${s[3]}</div></div></div>`).join('')}
    </div>
    <div class="stack">
      <div class="section-title" style="margin-top:0"><h3>Pertanyaan umum</h3></div>
      ${[['Kenapa hasilnya disebut “perkiraan”?', 'Karena CaKoel tidak mencatat setiap transaksi. Penjualan dihitung dari perubahan stok, sehingga barang rusak/hilang yang tidak dicatat akan terbaca sebagai terjual.'],
        ['Muncul peringatan “stok akhir lebih besar”?', 'Artinya ada barang masuk yang belum dicatat, atau salah hitung. Catat dulu barang masuknya, lalu hitung ulang.'],
        ['Di mana data saya disimpan?', 'Di perangkat ini (browser). Gunakan menu Cadangkan Data secara berkala agar data aman.']]
        .map(f => `<details class="card"><summary class="bold small" style="cursor:pointer">${f[0]}</summary><p class="small muted" style="margin:8px 0 0">${f[1]}</p></details>`).join('')}
    </div>
  </div></div>`);
routes.tentang = () => shell('profil', `
  ${topbar('Tentang CaKoel', 'Versi 1.0', 'profil')}
  <div class="page-body"><div class="narrow">
    <div class="card center"><div style="font-size:52px">🏪</div><div class="brand" style="color:var(--primary);margin:0;font-size:30px">Ca<span style="color:var(--yellow)">Koel</span></div><div class="small bold">Catatan Bakoel — Hitung Stok, Untung Jadi!</div>
      <p class="small muted">Solusi aplikasi digital dalam pengelolaan persediaan barang pada usaha warung kelontong. CaKoel memperkirakan penjualan dan laba dari <b>barang masuk</b> + <b>stok akhir shift</b> pada 10–20 barang prioritas, memberi rekomendasi restock, dan membagikan laporan melalui WhatsApp.</p></div>
    <div class="section-title"><h3>Tim Pengembang — Kelompok 3</h3></div>
    <div class="list">${[['Hisya Auliani Indra', '5031251112'], ['Vania Maharani Putri', '5031251115'], ['Mahdi Farras Madani', '5031251136'], ['Anak Agung Gde Arista M', '5031251046'], ['Natalia Erika', '5031251147']].map(m => `<div class="item"><div class="initials">${initials(m[0])}</div><div class="grow"><div class="name">${m[0]}</div><div class="meta">${m[1]}</div></div></div>`).join('')}</div>
    <p class="small muted center mt">Sistem Informasi Bisnis (C)<br>Dosen Pengampu: Theodosia Yunita Durman, S.M., M.MT.</p>
  </div></div>`);

/* =========================================================
   RENDER
   ========================================================= */
function render() {
  const [route = '', param = ''] = location.hash.replace(/^#/, '').split('/');
  const pub = ['splash', 'login', 'pinset'];
  if (!S.toko) { if (!pub.includes(route)) return go('splash'); }
  else if (!authed()) { if (![...pub, 'pin'].includes(route)) return go('login'); }
  else if ([...pub, 'pin', ''].includes(route) || !routes[route]) return go('home');
  if (!['barang', 'masuk'].includes(route)) { ui.q = ''; ui.kat = 'Semua'; }
  closeSheet();
  app.innerHTML = routes[route](decodeURIComponent(param));
  window.scrollTo(0, 0);
  if (route === 'laporan') requestAnimationFrame(drawChart);
  if (route === 'hitung') { S.products.forEach(p => { if (ui.draft[p.id]?.akhir !== undefined && ui.draft[p.id]?.akhir !== '') updateCount(p.id); }); updateProgress(); }
  if (route === 'barangform') updateMargin();
}
function updateMargin() {
  const f = document.querySelector('[data-form=barang]'); if (!f) return;
  const b = Number(f.hargaBeli.value), j = Number(f.hargaJual.value), el = document.getElementById('margin-txt'), box = document.getElementById('margin-box');
  if (!b || !j) { el.textContent = 'Isi harga untuk melihat untung per satuan.'; box.className = 'alert alert-green'; return; }
  const u = j - b;
  el.innerHTML = u >= 0 ? `Untung <b>${rp(u)}</b> per ${esc(f.satuan.value || 'satuan')} (margin ${num(u / j * 100)}%)` : `Harga jual lebih rendah dari modal — rugi ${rp(-u)} per satuan!`;
  box.className = 'alert ' + (u >= 0 ? 'alert-green' : 'alert-red');
}
function pinDone() {
  const route = currentRoute();
  const dots = document.getElementById('pindots');
  const fail = msg => { dots?.classList.add('shake'); setTimeout(() => dots?.classList.remove('shake'), 400); ui.pin = ''; refreshDots(); toast(msg); };
  if (route === 'pin') {
    if (ui.pin === S.toko.pin) { sessionStorage.setItem(AUTH_KEY, '1'); ui.pin = ''; go('home'); maybeNotify(); }
    else fail('PIN salah, coba lagi');
  } else if (route === 'pinset') {
    if (!ui.pinFirst) { ui.pinFirst = ui.pin; ui.pin = ''; render(); }
    else if (ui.pin === ui.pinFirst) {
      S = defaultState();
      S.toko = { ...ui.tokoDraft, pin: ui.pin, penjaga: [ui.tokoDraft.pemilik], premium: false, notif: false };
      save(); sessionStorage.setItem(AUTH_KEY, '1');
      ui.pin = ''; ui.pinFirst = ''; ui.tokoDraft = null;
      toast('Akun dibuat! Yuk daftarkan barang prioritas 📦'); go('barang');
    } else { ui.pinFirst = ''; ui.pin = ''; render(); toast('PIN tidak sama, silakan buat ulang'); }
  }
}
function refreshDots() { document.querySelectorAll('#pindots i').forEach((d, i) => d.classList.toggle('on', i < ui.pin.length)); }
function maybeNotify() {
  try {
    const low = lowStock();
    if (!S.toko?.notif || !low.length || !('Notification' in window) || Notification.permission !== 'granted') return;
    const k = 'cakoel_notif_day'; if (localStorage.getItem(k) === dayKey(Date.now())) return;
    new Notification('CaKoel: stok menipis', { body: `${low.length} barang perlu dibeli: ${low.map(p => p.nama).join(', ')}` });
    localStorage.setItem(k, dayKey(Date.now()));
  } catch (e) { /* abaikan */ }
}
function download(name, content, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* =========================================================
   ACTIONS (klik)
   ========================================================= */
const actions = {
  go: el => go(el.dataset.to),
  'sheet-bg': (el, e) => { if (e.target === el) closeSheet(); },
  demo: () => { loadDemo(false); sessionStorage.setItem(AUTH_KEY, '1'); toast('Data contoh dimuat · PIN: 1234'); go('home'); },
  'demo-reload': () => { if (confirm('Ganti semua data dengan data contoh? Data sekarang akan terhapus.')) { loadDemo(true); toast('Data contoh dimuat'); go('home'); } },
  'wa-login': () => toast('Verifikasi OTP WhatsApp tersedia di versi berikutnya — silakan isi nomor di bawah'),
  pinkey: el => {
    const k = el.dataset.k;
    if (k === 'del') ui.pin = ui.pin.slice(0, -1); else if (ui.pin.length < 4) ui.pin += k;
    refreshDots(); if (ui.pin.length === 4) setTimeout(pinDone, 150);
  },
  'forgot-pin': () => openSheet(`<form data-form="forgot"><h3>Lupa PIN</h3><p class="small muted" style="margin-top:0">Masukkan nomor WhatsApp yang terdaftar untuk membuat PIN baru.</p>
    <div class="field"><label>Nomor WhatsApp</label><div class="input-group"><span>+62</span><input class="input" name="wa" inputmode="tel" required></div></div>
    <div class="field"><label>PIN baru (4 angka)</label><input class="input" name="pin" type="password" inputmode="numeric" maxlength="4" pattern="\\d{4}" required></div>
    <button class="btn btn-primary" type="submit">Atur Ulang PIN</button></form>`),
  kat: el => { ui.kat = el.dataset.k; document.querySelectorAll('.chips .chip').forEach(c => c.classList.toggle('active', c.dataset.k === ui.kat)); refreshList(); },
  emoji: el => { document.getElementById('icon-in').value = el.dataset.e; document.querySelectorAll('.emoji-pick button').forEach(b => b.classList.toggle('active', b === el)); },
  'del-barang': el => {
    const p = getProduct(el.dataset.pid);
    if (!confirm(`Hapus ${p.nama}? Riwayat laporan tetap tersimpan.`)) return;
    S.products = S.products.filter(x => x.id !== p.id); S.masuk = S.masuk.filter(m => !(m.pid === p.id && !m.shiftId));
    save(); toast('Barang dihapus'); go('barang');
  },
  'masuk-sheet': el => masukSheet(el.dataset.pid),
  qty: el => { const i = document.getElementById('qty-in'); i.value = Math.max(0, (Number(i.value) || 0) + Number(el.dataset.d)); updateMasukSub(); },
  'toggle-price': el => { document.getElementById('price-field').classList.toggle('hidden', !el.checked); updateMasukSub(); },
  'del-masuk': el => { if (!confirm('Hapus catatan barang masuk ini?')) return; S.masuk = S.masuk.filter(m => m.id !== el.dataset.id); save(); render(); },
  step: el => {
    const pid = el.dataset.pid; const inp = document.querySelector(`[data-count="${pid}"]`);
    const v = Math.max(0, (inp.value === '' ? 0 : Number(inp.value)) + Number(el.dataset.d));
    inp.value = v; (ui.draft[pid] = ui.draft[pid] || {}).akhir = v; updateCount(pid);
  },
  'toggle-rusak': el => {
    const pid = el.dataset.pid; const box = document.getElementById('rusak-' + pid);
    const show = box.classList.contains('hidden'); box.classList.toggle('hidden', !show);
    el.textContent = show ? '− Rusak/hilang' : '+ Ada rusak/hilang?';
    if (!show) { (ui.draft[pid] = ui.draft[pid] || {}).rusak = 0; box.querySelector('input').value = ''; updateCount(pid); }
  },
  'save-shift': () => {
    const items = computeShift(ui.draft);
    const missing = items.filter(i => i.akhir == null);
    if (missing.length) { toast(`Masih ada ${missing.length} barang belum diisi`); document.getElementById('row-' + missing[0].pid)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    const bad = items.filter(i => i.invalid);
    if (bad.length) { toast(`Cek lagi ${bad.length} barang yang tidak sesuai`); document.getElementById('row-' + bad[0].pid)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    const penjaga = document.getElementById('penjaga-in').value; const cat = document.getElementById('catatan-in').value.trim();
    const s = saveShift(ui.draft, penjaga, cat);
    ui.draft = {}; ui.catatan = '';
    toast('Stok tersimpan ✔'); go('hasil/' + s.id); maybeNotify();
  },
  'ring-day': el => { const d = ui.ringDay + Number(el.dataset.d) * DAY; if (d <= startOfDay(Date.now())) { ui.ringDay = d; render(); } },
  ktab: el => { ui.kasbonTab = el.dataset.t; render(); },
  'add-pelanggan': () => openSheet(`<form data-form="pelanggan"><h3>Tambah Pelanggan</h3>
    <div class="field"><label>Nama pelanggan</label><input class="input" name="nama" required maxlength="40" placeholder="contoh: Bu Nani"></div>
    <div class="field"><label>Nomor HP/WA (opsional)</label><input class="input" name="hp" inputmode="tel" placeholder="0812…"></div>
    <div class="field"><label>Utang awal (opsional)</label><div class="input-group"><span>Rp</span><input class="input" name="jumlah" type="number" min="0" step="any" inputmode="numeric"></div></div>
    <div class="field"><label>Keterangan</label><input class="input" name="ket" maxlength="60" placeholder="contoh: beras 5 kg"></div>
    <button class="btn btn-yellow" type="submit">Simpan Pelanggan</button></form>`),
  'kasbon-sheet': el => kasbonSheet(el.dataset.cid, el.dataset.tipe),
  amt: el => { document.getElementById('amt-in').value = el.dataset.v; },
  'del-kasbon': el => { if (!confirm('Hapus transaksi ini?')) return; S.kasbon = S.kasbon.filter(k => k.id !== el.dataset.id); save(); render(); },
  'del-pelanggan': el => {
    if (!confirm('Hapus pelanggan beserta seluruh riwayat kasbonnya?')) return;
    S.pelanggan = S.pelanggan.filter(c => c.id !== el.dataset.cid); S.kasbon = S.kasbon.filter(k => k.cid !== el.dataset.cid);
    save(); toast('Pelanggan dihapus'); go('kasbon');
  },
  period: el => {
    const v = Number(el.dataset.v);
    if (v !== 7 && !S.toko.premium) { toast('Laporan 30 hari & semua data tersedia di Premium ⭐'); return go('paket'); }
    ui.period = v; render();
  },
  print: () => window.print(),
  csv: () => {
    if (!S.toko.premium) { toast('Unduh Excel tersedia di Premium ⭐'); return go('paket'); }
    const from = ui.period ? startOfDay(Date.now()) - (ui.period - 1) * DAY : 0;
    const head = ['Tanggal', 'Jam', 'Penjaga', 'Barang', 'Satuan', 'Stok Awal', 'Masuk', 'Rusak/Hilang', 'Stok Akhir', 'Terjual', 'Harga Jual', 'Harga Beli', 'Omzet', 'HPP', 'Laba'];
    const rows = S.shifts.filter(s => s.ts >= from).flatMap(s => s.items.map(i => [dayKey(s.ts), fmtTime(s.ts), s.penjaga, i.nama, i.satuan, i.awal, i.masuk, i.rusak, i.akhir, i.terjual, i.hargaJual, i.hargaBeli, i.omzet, i.modal, i.omzet - i.modal]));
    const csv = '\ufeff' + [head, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    download(`laporan-cakoel-${dayKey(Date.now())}.csv`, csv, 'text/csv;charset=utf-8'); toast('File laporan diunduh');
  },
  backup: () => { download(`cakoel-backup-${dayKey(Date.now())}.json`, JSON.stringify(S, null, 2), 'application/json'); toast('Cadangan diunduh'); },
  restore: () => document.getElementById('restore-file').click(),
  wipe: () => {
    if (!confirm('Hapus SEMUA data CaKoel di perangkat ini? Tindakan ini tidak bisa dibatalkan.')) return;
    localStorage.removeItem(KEY); sessionStorage.removeItem(AUTH_KEY); S = defaultState(); go('splash');
  },
  logout: () => { sessionStorage.removeItem(AUTH_KEY); ui.pin = ''; ui.pinFirst = ''; ui.tokoDraft = null; toast('Berhasil keluar'); go('login'); },
  'del-penjaga': el => { S.toko.penjaga.splice(Number(el.dataset.i), 1); save(); render(); },
  'toggle-premium': () => {
    S.toko.premium = !S.toko.premium;
    if (!S.toko.premium) ui.period = 7;
    save(); toast(S.toko.premium ? 'Premium aktif ⭐ (simulasi)' : 'Kembali ke paket Gratis');
    if (!S.toko.premium && S.products.length > FREE_LIMIT) toast(`Catatan: paket Gratis hanya bisa menambah hingga ${FREE_LIMIT} barang`);
    render();
  },
};
function refreshList() {
  const el = document.getElementById('blist'); if (!el) return;
  el.innerHTML = currentRoute() === 'masuk' ? masukListHTML() : barangListHTML();
}

/* =========================================================
   FORMS (submit)
   ========================================================= */
const forms = {
  login: f => {
    const d = Object.fromEntries(new FormData(f));
    if (normalizeWA(d.wa).length < 10) return toast('Nomor WhatsApp belum benar');
    if (S.toko && normalizeWA(d.wa) === normalizeWA(S.toko.wa)) {
      ui.pin = ''; ui.pinFirst = ''; ui.tokoDraft = null;
      return go('pin');
    }
    ui.tokoDraft = { nama: d.nama.trim(), pemilik: d.pemilik.trim(), alamat: d.alamat.trim(), wa: d.wa.trim() };
    ui.pin = ''; ui.pinFirst = ''; go('pinset');
  },
  forgot: f => {
    const d = Object.fromEntries(new FormData(f));
    if (normalizeWA(d.wa) !== normalizeWA(S.toko.wa)) return toast('Nomor tidak cocok dengan data toko');
    S.toko.pin = d.pin; save(); closeSheet(); toast('PIN baru tersimpan, silakan masuk');
  },
  barang: f => {
    const d = Object.fromEntries(new FormData(f));
    const n = k => Math.max(0, Number(d[k]) || 0);
    const data = { nama: d.nama.trim(), kategori: d.kategori, satuan: d.satuan.trim(), icon: d.icon || '📦', hargaBeli: n('hargaBeli'), hargaJual: n('hargaJual'), stok: n('stok'), minStok: n('minStok'), leadTime: n('leadTime') };
    if (!data.hargaJual) return toast('Harga jual belum diisi');
    if (S.products.some(p => p.nama.toLowerCase() === data.nama.toLowerCase() && p.id !== d.id)) return toast('Nama barang sudah ada');
    if (d.id) Object.assign(getProduct(d.id), data);
    else { if (S.products.length >= limitBarang()) return toast('Batas barang tercapai'); S.products.push({ id: uid(), ...data }); }
    save(); toast(d.id ? 'Barang diperbarui ✔' : 'Barang ditambahkan ✔'); go('barang');
  },
  masuk: f => {
    const d = Object.fromEntries(new FormData(f));
    const p = getProduct(d.pid); const qty = Number(d.qty);
    if (!qty || qty <= 0) return toast('Isi jumlah barang');
    const chg = document.getElementById('chg-price').checked;
    const price = chg ? Math.max(0, Number(d.hargaBeli) || 0) : p.hargaBeli;
    if (chg && price !== p.hargaBeli) p.hargaBeli = price;
    S.masuk.push({ id: uid(), pid: p.id, qty, hargaBeli: price, ts: Date.now(), shiftId: null });
    save(); closeSheet(); toast(`✔ ${num(qty)} ${p.satuan} ${p.nama} dicatat`); render();
  },
  pelanggan: f => {
    const d = Object.fromEntries(new FormData(f));
    const c = { id: uid(), nama: d.nama.trim(), hp: d.hp.trim(), ts: Date.now() };
    S.pelanggan.push(c);
    if (Number(d.jumlah) > 0) S.kasbon.push({ id: uid(), cid: c.id, tipe: 'utang', jumlah: Number(d.jumlah), ket: d.ket.trim(), ts: Date.now() });
    save(); closeSheet(); toast('Pelanggan ditambahkan'); render();
  },
  kasbon: f => {
    const d = Object.fromEntries(new FormData(f));
    const j = Number(d.jumlah); if (!j || j <= 0) return toast('Isi jumlah');
    S.kasbon.push({ id: uid(), cid: d.cid, tipe: d.tipe, jumlah: j, ket: d.ket.trim(), ts: Date.now() });
    save(); closeSheet(); toast(d.tipe === 'utang' ? 'Utang dicatat' : 'Pembayaran diterima ✔'); render();
  },
  toko: f => {
    const d = Object.fromEntries(new FormData(f));
    if (normalizeWA(d.wa).length < 10) return toast('Nomor WhatsApp belum benar');
    const oldOwner = S.toko.pemilik;
    Object.assign(S.toko, { nama: d.nama.trim(), pemilik: d.pemilik.trim(), alamat: d.alamat.trim(), wa: d.wa.trim() });
    const i = S.toko.penjaga.indexOf(oldOwner); if (i >= 0) S.toko.penjaga[i] = S.toko.pemilik;
    save(); toast('Data toko disimpan ✔'); go('profil');
  },
  penjaga: f => {
    const n = f.nama.value.trim(); if (!n) return;
    if (S.toko.penjaga.includes(n)) return toast('Nama sudah ada');
    S.toko.penjaga.push(n); save(); render(); toast('Penjaga ditambahkan');
  },
  pin: f => {
    const d = Object.fromEntries(new FormData(f));
    if (d.old !== S.toko.pin) return toast('PIN lama salah');
    if (d.new1 !== d.new2) return toast('PIN baru tidak sama');
    S.toko.pin = d.new1; save(); f.reset(); toast('PIN berhasil diubah ✔');
  },
};

/* =========================================================
   EVENT DELEGATION
   ========================================================= */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = actions[el.dataset.act]; if (!fn) return;
  if (el.dataset.act === 'sheet-bg') { if (e.target === el) closeSheet(); return; }
  if (el.tagName !== 'INPUT') e.preventDefault();
  fn(el, e);
});
document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]'); if (!f) return;
  e.preventDefault(); forms[f.dataset.form]?.(f);
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'search') { ui.q = t.value; refreshList(); }
  else if (t.dataset.count) { (ui.draft[t.dataset.count] = ui.draft[t.dataset.count] || {}).akhir = t.value === '' ? '' : Math.max(0, Number(t.value)); updateCount(t.dataset.count); }
  else if (t.dataset.rusak) { (ui.draft[t.dataset.rusak] = ui.draft[t.dataset.rusak] || {}).rusak = Math.max(0, Number(t.value) || 0); updateCount(t.dataset.rusak); }
  else if (t.id === 'qty-in' || t.id === 'price-in') updateMasukSub();
  else if (t.id === 'catatan-in') ui.catatan = t.value;
  else if (t.closest('[data-form=barang]')) updateMargin();
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'penjaga-in') ui.penjaga = t.value;
  if (t.id === 'notif-toggle') {
    S.toko.notif = t.checked; save();
    if (t.checked && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission().then(p => { if (p === 'granted') maybeNotify(); });
    toast(t.checked ? 'Pengingat stok aktif' : 'Pengingat stok dimatikan');
  }
  if (t.id === 'restore-file' && t.files[0]) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(r.result);
        if (!obj || !Array.isArray(obj.products) || !obj.toko) throw new Error();
        if (!confirm('Pulihkan data dari file ini? Data sekarang akan diganti.')) return;
        S = Object.assign(defaultState(), obj); save(); toast('Data berhasil dipulihkan ✔'); go('home');
      } catch (err) { toast('File cadangan tidak valid'); }
    };
    r.readAsText(t.files[0]);
  }
});
document.addEventListener('keydown', e => {
  if (!['pin', 'pinset'].includes(currentRoute()) || document.querySelector('.sheet')) return;
  if (/^\d$/.test(e.key)) actions.pinkey({ dataset: { k: e.key } });
  else if (e.key === 'Backspace') actions.pinkey({ dataset: { k: 'del' } });
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
window.addEventListener('hashchange', render);
window.addEventListener('resize', () => { if (currentRoute() === 'laporan') drawChart(); });
render();
