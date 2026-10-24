// One place for every network call. Relative URLs only (the phone on the hotspot cannot reach the laptop's "localhost").
// No silent fake data: when a service is down the caller gets an ApiError and shows it.
//   /api/engine/*, /api/v1/*   -> the engine (Vishakh)
//   /api/campaigns, /api/atlas, /api/bill, /api/rain-koottam, /api/survey, /api/health, WebSocket /ws, /print/*  -> community service (Kishan)
import axios from 'axios';

const http = axios.create({ baseURL: '/api', timeout: 20000 });

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'network', details = [], body = null } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.body = body;
  }
  get offline() {
    return this.status === 0 || this.status === 502 || this.status === 503 || this.status === 504;
  }
}

// Both services answer errors as JSON: the engine {error:{code,message}}, the community service {error:"code", message}
async function call(config) {
  try {
    const res = await http(config);
    return res.data;
  } catch (e) {
    const b = e.response?.data;
    const err = b?.error;
    const code = typeof err === 'string' ? err : err?.code || (e.response ? 'http_' + e.response.status : 'network');
    const message = b?.message || err?.message || (e.response ? 'Request failed (' + e.response.status + ')' : 'Cannot reach the server');
    throw new ApiError(message, { status: e.response?.status || 0, code, details: err?.details || b?.details || [], body: b || null });
  }
}

const get = (url, params) => call({ method: 'get', url, params });
const post = (url, data, extra = {}) => call({ method: 'post', url, data, ...extra });

// ---- Engine ----
export const engine = {
  health: () => get('/engine/health'),
  areas: () => get('/engine/areas'),
  roofs: (area) => get('/engine/roofs', { area }),
  roofAt: (lon, lat) => get('/engine/roofs/at', { lon, lat }),
  report: (body) => post('/engine/report', body),
  bill: (body) => post('/engine/bill', body),
  billCheck: (scan) => post('/engine/bill/check', scan),
  sunPlan: (body) => post('/engine/sun-plan', body),
  today: (params) => get('/engine/today', params),
  wards: () => get('/engine/wards'),
  ward: (id) => get('/engine/wards/' + id),
  impact: (adoption) => get('/engine/impact', { adoption }),
  rules: () => get('/engine/rules'),
};

// ---- Community service ----
export const community = {
  health: () => get('/health'),
  atlas: () => get('/atlas/summary'),
  campaign: (id) => get('/campaigns/' + id),
  // The same roof pledging twice is refused (409 duplicate_pledge); the Idempotency-Key makes a retried tap safe.
  pledge: (campaignId, body, idemKey) => post('/campaigns/' + campaignId + '/pledges', body, idemKey ? { headers: { 'Idempotency-Key': idemKey } } : {}),
  rainKoottam: (campaignId) => get('/rain-koottam/' + campaignId),
  rainAll: () => get('/rain-koottam/atlas/all'),
  billSamples: () => get('/bill/samples'),
  billSample: (id) => post('/bill/sample/' + id),
  billScan: (file) => {
    const form = new FormData();
    form.append('bill', file);
    return post('/bill/scan', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
  },
  poll: (since) => get('/events/poll', { since }),
  printUrl: (wardId) => '/print/ward/' + encodeURIComponent(wardId),
  // Live pledges: WebSocket /ws, and if it cannot stay open, polling every 3 s. Returns a function that stops everything.
  live(onEvent, onState) {
    let ws = null;
    let timer = null;
    let stopped = false;
    let since = 0;
    const startPolling = () => {
      if (timer || stopped) return;
      onState?.('polling');
      timer = setInterval(async () => {
        try {
          const r = await community.poll(since);
          since = r.latest_id ?? since;
          for (const ev of r.events || []) onEvent({ type: 'pledge', ward_id: ev.ward_id, polled: true });
        } catch { /* try again next tick */ }
      }, 3000);
    };
    const open = () => {
      if (stopped || typeof WebSocket === 'undefined') return startPolling();
      try {
        ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
      } catch { return startPolling(); }
      ws.onopen = () => { onState?.('live'); if (timer) { clearInterval(timer); timer = null; } };
      ws.onmessage = (m) => { try { const d = JSON.parse(m.data); if (d.type === 'pledge') onEvent(d); } catch { /* ignore */ } };
      ws.onclose = () => { if (!stopped) { startPolling(); setTimeout(open, 5000); } };
      ws.onerror = () => ws?.close();
    };
    open();
    return () => { stopped = true; if (timer) clearInterval(timer); ws?.close(); };
  },
};

// Nominatim search for a place (online only). Failure is normal at the venue: callers fall back to the demo areas.
export async function searchPlace(q) {
  const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=4&countrycodes=in&q=' + encodeURIComponent(q);
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error('search failed');
  return (await res.json()).map((r) => ({ name: r.display_name, lat: Number(r.lat), lon: Number(r.lon) }));
}
