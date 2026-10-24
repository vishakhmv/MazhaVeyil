// Number formatting in the Indian style (1,23,456) for both languages.
const nf = (d) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
const cache = {};
const fmt = (d) => (cache[d] ??= nf(d));

export const dash = '–';
export const num = (n, d = 0) => (n === null || n === undefined || Number.isNaN(n) ? dash : fmt(d).format(n));
export const inr = (n, d = 0) => (n === null || n === undefined || Number.isNaN(n) ? dash : '₹' + fmt(d).format(n));
export const pct = (n) => (n === null || n === undefined ? dash : Math.round(n) + '%');
export const range = (r, f = num) => (r ? (r[0] === r[1] ? f(r[0]) : f(r[0]) + ' – ' + f(r[1])) : dash);
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// "1.38 lakh" / "3.6 crore" with the unit word supplied by the caller (translated)
export function big(n, words) {
  if (n === null || n === undefined) return dash;
  if (Math.abs(n) >= 1e7) return (n / 1e7).toFixed(2) + ' ' + words.crore;
  if (Math.abs(n) >= 1e5) return (n / 1e5).toFixed(2) + ' ' + words.lakh;
  return fmt(0).format(Math.round(n));
}

export function monthNames(lang) {
  const loc = lang === 'ml' ? 'ml-IN' : 'en-IN';
  return Array.from({ length: 12 }, (_, m) => new Date(2026, m, 1).toLocaleString(loc, { month: 'short' }));
}

export const hourLabel = (h) => String(h).padStart(2, '0') + ':00';

// A small stable id for this browser, so one device can pledge once per ward. Never leaves the device as anything but this hash.
export function deviceId() {
  try {
    let id = localStorage.getItem('mv_device');
    if (!id) {
      id = (crypto.randomUUID?.() || String(Math.random()).slice(2) + Date.now()).replace(/-/g, '');
      localStorage.setItem('mv_device', id);
    }
    return id;
  } catch {
    return 'anon' + Math.random().toString(36).slice(2);
  }
}

// 12.0 -> "12", 12.5 -> "12.5" (for sentences, where a trailing .0 looks odd)
export const numT = (n, d = 1) => num(n, d).replace(/\.0+$/, '');
