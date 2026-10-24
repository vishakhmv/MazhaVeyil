// Every i18n key the engine emits must exist in English and Malayalam, with the same {{placeholders}} and params that cover them.
import test from 'node:test';
import assert from 'node:assert/strict';
import en from '../scripts/strings-en.js';
import ml from '../scripts/strings-ml.js';
import { loadRules } from '../src/rules.js';
import { buildReport } from '../src/services.js';
import { parseReportInput } from '../src/validate.js';
import { buildSunPlan } from '../src/sunplan.js';
import { checkScan } from '../src/billcheck.js';

process.env.OFFLINE = '1';
const rules = loadRules();
const holes = (s) => [...s.matchAll(/{{([a-z_]+)}}/g)].map((m) => m[1]).sort();
const rect = (lon, lat, w, h) => {
  const dLat = h / 110540;
  const dLon = w / (111320 * Math.cos((lat * Math.PI) / 180));
  return [[lon, lat], [lon + dLon, lat], [lon + dLon, lat + dLat], [lon, lat + dLat]];
};

test('English and Malayalam have the same keys and the same placeholders', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(ml).sort());
  for (const k of Object.keys(en)) assert.deepEqual(holes(ml[k]), holes(en[k]), k);
  for (const k of Object.keys(ml)) assert.ok(/[ഀ-ൿ]/.test(ml[k]), 'no Malayalam script in ' + k);
});

test('every emitted key has a string, and its params cover the placeholders', async () => {
  const emitted = [];
  const take = (arr) => arr.forEach((x) => emitted.push(x));
  const reports = [
    { roof: { polygon: rect(77.0917, 8.3016, 10, 12) }, units: 262 },
    { roof: { polygon: rect(77.0917, 8.3016, 10, 12) } },
    { roof: { polygon: rect(77.0917, 8.3016, 6, 8) }, units: 120 },
    { roof: { polygon: rect(77.0917, 8.3016, 14, 18) }, units: 900 },
    { roof: { polygon: rect(77.0917, 8.3016, 10, 12) }, units: 240 },
    { roof: { polygon: rect(76.9043, 8.5441, 40, 30) }, building_use: 'public' },
    { roof: { polygon: rect(76.3, 9.95, 10, 12) }, units: 262 },
  ];
  for (const body of reports) {
    const r = await buildReport(rules, parseReportInput(body), '2026-10-24');
    take(r.insights);
    take(r.rain.safety.map((key) => ({ key, params: {} })));
    emitted.push({ key: 'band.' + r.score.band, params: {} }, { key: 'quality.data.' + r.quality.data, params: {} }, { key: 'quality.units.' + r.quality.units, params: {} });
    for (const o of r.sun.options) emitted.push({ key: 'option.' + o.label, params: {} });
  }
  for (const kw of [3]) {
    const p = buildSunPlan(rules, { lat: 8.3016, lon: 77.0917, kw, monthly_units: 262, date: null, appliances: ['motor', 'washing_machine', 'iron', 'ev_charger'] }, '2026-10-24');
    take(p.alerts);
    for (const x of p.plan) emitted.push({ key: 'appliance.' + x.appliance, params: {} });
  }
  take(checkScan(rules, { units: 262, amount: 9000, previous_reading: 1, current_reading: 50 }, '2026-10-24').warnings);
  take(checkScan(rules, { units: 262, period_start: '2026-01-01', period_end: '2026-06-30' }, '2026-10-24').warnings);
  take(checkScan(rules, { units: 99999 }, '2026-10-24').warnings);
  take(checkScan(rules, { units: 'x' }, '2026-10-24').warnings);
  assert.ok(emitted.length > 30);
  for (const { key, params } of emitted) {
    assert.ok(en[key], 'missing string for ' + key);
    for (const h of holes(en[key])) assert.ok(h in params, key + ' needs param ' + h);
  }
  const seen = new Set(emitted.map((e) => e.key));
  for (const must of ['insight.cliff_over', 'insight.water_days', 'insight.default_units', 'insight.public_building', 'insight.tank_tip', 'alert.evening_peak', 'bill.amount_differs', 'bill.readings_mismatch']) assert.ok(seen.has(must), 'never emitted in the sample runs: ' + must);
});
