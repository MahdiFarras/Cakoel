/* =========================================================
   CaKoel — Data layer (state, penyimpanan, perhitungan)
   Semua data disimpan di localStorage browser (Data Layer).
   ========================================================= */
const KEY = 'cakoel_v1';
const FREE_LIMIT = 10;      // paket gratis: 10 barang prioritas
const PREMIUM_LIMIT = 20;   // paket premium: 20 barang prioritas
const PREMIUM_PRICE = 35000;
const KATEGORI = ['Sembako', 'Makanan', 'Minuman', 'Kebutuhan Rumah', 'Lainnya'];
const EMOJIS = ['🌾', '🛢️', '🍬', '🍜', '🧃', '🥚', '☕', '🥛', '🧼', '🍪', '🧂', '🍞', '🥤', '💧', '🚬', '🧻', '🪥', '🔋', '🕯️', '🍫', '🥫', '🧴', '🐟', '📦'];

function defaultState() {
  return {
    toko: null,          // {nama, alamat, pemilik, wa, pin, penjaga:[], premium:false, notif:false}
    products: [],        // {id,nama,kategori,satuan,icon,hargaBeli,hargaJual,minStok,leadTime,stok}
    masuk: [],           // {id,pid,qty,hargaBeli,ts,shiftId}  shiftId null = belum dihitung
    shifts: [],          // {id,ts,penjaga,catatan,items:[...],omzet,modal,laba,terjual,rugi}
    pelanggan: [],       // {id,nama,hp,ts}
    kasbon: [],          // {id,cid,tipe:'utang'|'bayar',jumlah,ket,ts}
  };
}

let S = loadState();

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    return Object.assign(defaultState(), raw || {});
  } catch (e) { return defaultState(); }
}
function save() { localStorage.setItem(KEY, JSON.stringify(S)); }

/* ---------- Util ---------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const rp = n => 'Rp' + Math.round(n || 0).toLocaleString('id-ID');
const num = n => (Math.round((n || 0) * 100) / 100).toLocaleString('id-ID');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAY = 86400000;
const dayKey = ts => { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const startOfDay = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const fmtDate = ts => { const d = new Date(ts); return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; };
const fmtShort = ts => { const d = new Date(ts); return `${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)}`; };
const fmtTime = ts => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + '.' + String(d.getMinutes()).padStart(2, '0'); };
const initials = s => String(s || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
function ago(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'baru saja';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' menit lalu';
  if (startOfDay(ts) === startOfDay(Date.now())) return 'hari ini ' + fmtTime(ts);
  const d = Math.round((startOfDay(Date.now()) - startOfDay(ts)) / DAY);
  if (d === 1) return 'kemarin';
  if (d < 7) return d + ' hari lalu';
  if (d < 30) return Math.floor(d / 7) + ' minggu lalu';
  return fmtShort(ts);
}
function normalizeWA(n) {
  let s = String(n || '').replace(/[^\d]/g, '');
  if (s.startsWith('0')) s = '62' + s.slice(1);
  else if (s && !s.startsWith('62')) s = '62' + s;
  return s;
}
function waLink(phone, text) {
  const p = normalizeWA(phone);
  return 'https://wa.me/' + p + '?text=' + encodeURIComponent(text);
}

/* ---------- Domain helpers ---------- */
const limitBarang = () => (S.toko && S.toko.premium ? PREMIUM_LIMIT : FREE_LIMIT);
const getProduct = id => S.products.find(p => p.id === id);
const pendingMasuk = pid => S.masuk.filter(m => !m.shiftId && (!pid || m.pid === pid));
const pendingQty = pid => pendingMasuk(pid).reduce((a, m) => a + m.qty, 0);

function statusStok(p) {
  if (p.stok <= 0) return { key: 'habis', label: 'Habis', cls: 'b-red' };
  if (p.stok <= p.minStok) return { key: 'menipis', label: 'Menipis', cls: 'b-yellow' };
  return { key: 'aman', label: 'Aman', cls: 'b-green' };
}
const lowStock = () => S.products.filter(p => p.stok <= p.minStok);

/** Rata-rata penjualan harian per barang (7 hari terakhir yang ada shift). */
function avgDaily(pid, days = 7) {
  const from = startOfDay(Date.now()) - (days - 1) * DAY;
  const recent = S.shifts.filter(s => s.ts >= from);
  const dayset = new Set(recent.map(s => dayKey(s.ts)));
  if (!dayset.size) return 0;
  const total = recent.reduce((a, s) => a + (s.items.find(i => i.pid === pid)?.terjual || 0), 0);
  return total / dayset.size;
}

/** Rekomendasi belanja: cukup untuk (lead time + 2 hari) + stok pengaman (batas minimum). */
function rekomendasi() {
  return S.products.map(p => {
    const avg = avgDaily(p.id);
    const target = avg > 0 ? Math.ceil(avg * ((p.leadTime || 1) + 2)) + p.minStok : p.minStok * 2;
    const saran = Math.max(0, target - p.stok);
    const habisDalam = avg > 0 ? p.stok / avg : Infinity;
    return { p, avg, saran, habisDalam, low: p.stok <= p.minStok, soon: habisDalam <= (p.leadTime || 1) };
  }).filter(r => (r.low || r.soon) && r.saran > 0)
    .sort((a, b) => a.habisDalam - b.habisDalam);
}

/** Hitung hasil shift (estimasi berbasis perubahan stok). */
function computeShift(draft) {
  const items = S.products.map(p => {
    const d = draft[p.id] || {};
    const awal = p.stok;
    const masuk = pendingQty(p.id);
    const rusak = Math.max(0, Number(d.rusak) || 0);
    const akhir = d.akhir === '' || d.akhir == null ? null : Number(d.akhir);
    const tersedia = awal + masuk;
    const terjual = akhir == null ? 0 : tersedia - rusak - akhir;
    return {
      pid: p.id, nama: p.nama, icon: p.icon, satuan: p.satuan,
      awal, masuk, rusak, akhir, tersedia, terjual,
      hargaJual: p.hargaJual, hargaBeli: p.hargaBeli,
      omzet: terjual * p.hargaJual, modal: terjual * p.hargaBeli, rugi: rusak * p.hargaBeli,
      invalid: akhir != null && (akhir < 0 || terjual < 0),
    };
  });
  return items;
}

function saveShift(draft, penjaga, catatan) {
  const items = computeShift(draft);
  const id = uid();
  const ts = Date.now();
  const shift = {
    id, ts, penjaga, catatan,
    items: items.map(({ invalid, tersedia, ...rest }) => rest),
    omzet: items.reduce((a, i) => a + i.omzet, 0),
    modal: items.reduce((a, i) => a + i.modal, 0),
    terjual: items.reduce((a, i) => a + i.terjual, 0),
    rugi: items.reduce((a, i) => a + i.rugi, 0),
  };
  shift.laba = shift.omzet - shift.modal;
  S.masuk.forEach(m => { if (!m.shiftId) m.shiftId = id; });
  items.forEach(i => { const p = getProduct(i.pid); if (p) p.stok = i.akhir; });
  S.shifts.push(shift);
  save();
  return shift;
}

/** Ringkasan untuk rentang waktu [from, to). */
function summarize(from, to) {
  const shifts = S.shifts.filter(s => s.ts >= from && s.ts < to);
  const omzet = shifts.reduce((a, s) => a + s.omzet, 0);
  const modal = shifts.reduce((a, s) => a + s.modal, 0);
  const terjual = shifts.reduce((a, s) => a + s.terjual, 0);
  const rugi = shifts.reduce((a, s) => a + (s.rugi || 0), 0);
  const pembelian = S.masuk.filter(m => m.ts >= from && m.ts < to).reduce((a, m) => a + m.qty * m.hargaBeli, 0);
  const perItem = {};
  shifts.forEach(s => s.items.forEach(i => {
    const r = perItem[i.pid] || (perItem[i.pid] = { pid: i.pid, nama: i.nama, icon: i.icon, satuan: i.satuan, terjual: 0, omzet: 0, laba: 0 });
    r.terjual += i.terjual; r.omzet += i.omzet; r.laba += i.omzet - i.modal;
  }));
  return { shifts, omzet, modal, laba: omzet - modal, terjual, rugi, pembelian, items: Object.values(perItem).sort((a, b) => b.omzet - a.omzet) };
}

/* ---------- Kasbon ---------- */
function saldoPelanggan(cid) {
  return S.kasbon.filter(k => k.cid === cid).reduce((a, k) => a + (k.tipe === 'utang' ? k.jumlah : -k.jumlah), 0);
}
function lastKasbon(cid) {
  const t = S.kasbon.filter(k => k.cid === cid).sort((a, b) => b.ts - a.ts)[0];
  return t ? t.ts : null;
}
const totalKasbon = () => S.pelanggan.reduce((a, c) => a + Math.max(0, saldoPelanggan(c.id)), 0);

/* ---------- Data contoh (demo) ---------- */
const SEED = [
  // nama, kategori, satuan, icon, hargaBeli, hargaJual, minStok, leadTime, stok, rata2 terjual/hari
  ['Beras Ramos', 'Sembako', 'karung', '🌾', 65000, 72000, 3, 2, 8, 2],
  ['Minyak Goreng', 'Sembako', 'liter', '🛢️', 16500, 19000, 6, 2, 15, 3],
  ['Gula Pasir', 'Sembako', 'kg', '🍬', 15500, 18000, 5, 2, 12, 4],
  ['Mi Instan', 'Makanan', 'bungkus', '🍜', 2900, 3500, 24, 3, 60, 15],
  ['Teh Botol', 'Minuman', 'botol', '🧃', 4000, 5000, 12, 3, 30, 6],
  ['Telur Ayam', 'Sembako', 'kg', '🥚', 28000, 31000, 4, 2, 10, 2],
  ['Kopi Sachet', 'Minuman', 'sachet', '☕', 1900, 2500, 20, 3, 50, 12],
  ['Susu Kental', 'Minuman', 'kaleng', '🥛', 10500, 12500, 4, 4, 12, 2],
  ['Sabun Mandi', 'Kebutuhan Rumah', 'batang', '🧼', 3200, 4000, 6, 5, 15, 2],
  ['Biskuit Kelapa', 'Makanan', 'bungkus', '🍪', 7500, 9000, 5, 4, 10, 2],
];

function loadDemo(keepToko = true) {
  const toko = keepToko && S.toko ? S.toko : null;
  S = defaultState();
  S.toko = toko || { nama: 'Warung Berkah', alamat: 'Bandung, Jawa Barat', pemilik: 'Bu Sari', wa: '081234567890', pin: '1234', penjaga: ['Bu Sari', 'Rina'], premium: false, notif: false };
  if (!S.toko.penjaga || !S.toko.penjaga.length) S.toko.penjaga = [S.toko.pemilik || 'Pemilik'];
  const rand = (a, b) => a + Math.random() * (b - a);
  S.products = SEED.map(r => ({ id: uid(), nama: r[0], kategori: r[1], satuan: r[2], icon: r[3], hargaBeli: r[4], hargaJual: r[5], minStok: r[6], leadTime: r[7], stok: r[8], _rate: r[9] }));
  const today = startOfDay(Date.now());
  for (let d = 14; d >= 1; d--) {
    const dayStart = today - d * DAY;
    [ [9, 0.45], [20, 0.55] ].forEach(([hour, share], idx) => {
      const ts = dayStart + hour * 3600000 + Math.floor(rand(0, 40)) * 60000;
      const sid = uid();
      const items = S.products.map(p => {
        const awal = p.stok;
        let masuk = 0;
        if (idx === 0 && awal <= p.minStok * 1.6 && d > 2) {
          masuk = Math.max(p.minStok * 2, Math.ceil(p._rate * 4));
          S.masuk.push({ id: uid(), pid: p.id, qty: masuk, hargaBeli: p.hargaBeli, ts: ts - 3600000, shiftId: sid });
        }
        const weekend = [0, 6].includes(new Date(ts).getDay()) ? 1.3 : 1;
        let terjual = Math.round(p._rate * share * weekend * rand(0.6, 1.4));
        terjual = Math.min(terjual, awal + masuk);
        const rusak = Math.random() < 0.03 && awal + masuk - terjual > 0 ? 1 : 0;
        const akhir = awal + masuk - terjual - rusak;
        p.stok = akhir;
        return { pid: p.id, nama: p.nama, icon: p.icon, satuan: p.satuan, awal, masuk, rusak, akhir, terjual, hargaJual: p.hargaJual, hargaBeli: p.hargaBeli, omzet: terjual * p.hargaJual, modal: terjual * p.hargaBeli, rugi: rusak * p.hargaBeli };
      });
      const sh = { id: sid, ts, penjaga: S.toko.penjaga[idx % S.toko.penjaga.length], catatan: '', items,
        omzet: items.reduce((a, i) => a + i.omzet, 0), modal: items.reduce((a, i) => a + i.modal, 0),
        terjual: items.reduce((a, i) => a + i.terjual, 0), rugi: items.reduce((a, i) => a + i.rugi, 0) };
      sh.laba = sh.omzet - sh.modal;
      S.shifts.push(sh);
    });
  }
  S.products.forEach(p => delete p._rate);
  // barang masuk hari ini yang belum dihitung
  const mi = S.products.find(p => p.nama === 'Mi Instan');
  if (mi) S.masuk.push({ id: uid(), pid: mi.id, qty: 40, hargaBeli: mi.hargaBeli, ts: today + 8 * 3600000, shiftId: null });
  const now = Date.now();
  S.pelanggan = [
    { id: uid(), nama: 'Siti Aminah', hp: '081211112222', ts: now - 20 * DAY },
    { id: uid(), nama: 'Pak Dedi', hp: '081233334444', ts: now - 15 * DAY },
    { id: uid(), nama: 'Mbak Rina', hp: '081255556666', ts: now - 10 * DAY },
    { id: uid(), nama: 'Bu Nani', hp: '081277778888', ts: now - 9 * DAY },
  ];
  const [a, b, c, e] = S.pelanggan.map(x => x.id);
  S.kasbon = [
    { id: uid(), cid: a, tipe: 'utang', jumlah: 150000, ket: 'Beras + minyak', ts: now - 6 * DAY },
    { id: uid(), cid: a, tipe: 'bayar', jumlah: 25000, ket: 'Cicil', ts: now - 2 * DAY },
    { id: uid(), cid: b, tipe: 'utang', jumlah: 87000, ket: 'Rokok & kopi', ts: now - 2 * DAY },
    { id: uid(), cid: c, tipe: 'utang', jumlah: 75000, ket: 'Gula 3 kg, telur', ts: now - 4 * DAY },
    { id: uid(), cid: e, tipe: 'utang', jumlah: 60000, ket: 'Mi instan 1 dus', ts: now - 7 * DAY },
  ];
  save();
}
