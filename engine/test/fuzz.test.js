// Seeded fuzz over the HTTP API: whatever is sent, the engine answers with a clean 200 or a clean 4xx JSON error, never a 500 or a crash.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';

process.env.OFFLINE = '1';
process.env.QUIET = '1';
let server;
let base;
before(async () => {
  await new Promise((resolve) => { server = createApp().listen(0, '127.0.0.1', resolve); });
  base = 'http://127.0.0.1:' + server.address().port + '/api/engine';
});
after(() => server.close());

let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const weird = [undefined, null, '', 'abc', 'NaN', -1, 0, 1, 2, 3, 99, 1e9, -1e9, '2', '1', [], {}, true, 262, 262.5, '262'];
const point = () => [pick([77.09, 76.9, 0, 200, 'x', null, 76.3]) , pick([8.3, 8.5, 90, -5, 'y', 9.95])];
const polygon = () => (rnd() < 0.4 ? pick([weird, [[1, 2]], 'poly']) : Array.from({ length: Math.floor(rnd() * 7) }, point));
const roof = () => pick([{ polygon: polygon() }, { id: pick(['osm:way/1', '', null, 5, 'drawn:abc']) }, null, 'roof', {}, { polygon: [[77.0917, 8.3016], [77.0918, 8.3016], [77.0918, 8.3017], [77.0917, 8.3017]] }]);

const calls = [
  () => ['POST', '/report', { roof: roof(), roof_type: pick(['flat', 'sloped', 'x', undefined]), shade: pick(['little', 'some', 'a_lot', 'dark', null]), building_use: pick(['home', 'public', 'z']), units: pick(weird), period_months: pick(weird), phase: pick(['1ph', '3ph', '2ph', 3]), household: pick(weird) }],
  () => ['POST', '/bill', { units: pick(weird), period_months: pick(weird), phase: pick(['1ph', '3ph', 'x', undefined]) }],
  () => ['POST', '/bill/check', pick([{ units: pick(weird), amount: pick(weird), period_start: pick(['2026-01-01', 'x', null, 5]), period_end: pick(['2026-02-01', 'y', undefined]), previous_reading: pick(weird), current_reading: pick(weird), phase: pick(weird) }, [], 'str', null, 7])],
  () => ['POST', '/sun-plan', { lat: pick(weird.concat([8.3])), lon: pick(weird.concat([77.09])), kw: pick(weird.concat([2.5])), monthly_units: pick(weird.concat([262])), date: pick([null, '2026-10-25', 'x', 5]), appliances: pick([null, undefined, ['motor'], ['toaster'], [], 'motor', ['iron', 5], ['ev_charger', 'motor']]) }],
  () => ['GET', '/today?' + new URLSearchParams({ lat: String(pick(weird.concat([8.3]))), lon: String(pick(weird.concat([77.09]))), area_m2: String(pick(weird.concat([120]))), kw: String(pick(weird.concat([2.5]))) }), null],
  () => ['GET', '/impact?adoption=' + encodeURIComponent(String(pick(weird.concat([25])))), null],
  () => ['GET', '/roofs/at?lon=' + pick([77.09, 'x', '', 500]) + '&lat=' + pick([8.3, 'y', '']), null],
  () => ['GET', '/roofs?area=' + pick(['campus', 'nope', '', 'pozhiyoor']), null],
  () => ['GET', '/wards/' + pick(['campus-w1', 'nope', '..%2F..%2Fpackage.json', 'pozhiyoor-w1']), null],
];

test('fuzz: 400 random requests never produce a 500', async () => {
  const bad = [];
  const statuses = {};
  for (let i = 0; i < 400; i++) {
    const [method, path, body] = pick(calls)();
    let res;
    try {
      res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body === null ? undefined : JSON.stringify(body) });
    } catch (e) {
      bad.push(method + ' ' + path + ' -> fetch failed ' + e.message);
      continue;
    }
    statuses[res.status] = (statuses[res.status] || 0) + 1;
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* checked below */ }
    if (res.status >= 500 || json === null) bad.push(method + ' ' + path + ' ' + JSON.stringify(body)?.slice(0, 120) + ' -> ' + res.status + ' ' + text.slice(0, 100));
    else if (res.status >= 400) assert.ok(json.error && json.error.code && json.error.message, 'error shape for ' + path);
    else assert.ok(json.schema || Array.isArray(json) || json.type, 'success shape for ' + path);
  }
  assert.deepEqual(bad.slice(0, 5), []);
  assert.ok((statuses[200] || 0) >= 40, 'too few successful requests to be a useful fuzz: ' + JSON.stringify(statuses));
  assert.ok((statuses[400] || 0) >= 40, 'too few rejected requests to be a useful fuzz: ' + JSON.stringify(statuses));
  console.log('fuzz status mix: ' + JSON.stringify(statuses));
});

test('numeric strings from forms are accepted (period_months "2")', async () => {
  const poly = [[77.0917, 8.3016], [77.0918, 8.3016], [77.0918, 8.3017], [77.0917, 8.3017]];
  const r = await fetch(base + '/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roof: { polygon: poly }, units: '524', period_months: '2' }) });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).home.monthly_units, 262);
});
