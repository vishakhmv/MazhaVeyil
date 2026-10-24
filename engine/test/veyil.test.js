import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { planDay, hourlyToSlots, typicalDayKw, baseLoad, slotLabel } from '../src/veyil.js';
import { buildSunPlan } from '../src/sunplan.js';

const rules = loadRules();
const apps = Object.entries(rules.veyil.appliances).map(([id, a]) => ({ id, ...a }));
const day = (ghi, kw) => hourlyToSlots(typicalDayKw(rules, ghi, kw));

test('base load plus flexible loads add up to the daily use', () => {
  const flex = apps.reduce((s, a) => s + a.kwh, 0);
  const base = baseLoad(rules, 8.6, flex);
  assert.ok(Math.abs(base.reduce((s, x) => s + x, 0) + flex - 8.6) < 1e-9);
});

test('typical day makes about the monthly average sun x performance ratio', () => {
  const kwh = typicalDayKw(rules, 5, 2).reduce((s, x) => s + x, 0);
  assert.ok(Math.abs(kwh - 2 * 5 * rules.solar.performance_ratio) < 0.35, 'got ' + kwh);
});

test('invariant: shifting loads into the sun never lowers solar self-use', () => {
  for (const ghi of [1, 3, 5, 6.1]) {
    for (const kw of [1, 2.5, 5]) {
      for (const units of [80, 262, 500]) {
        const r = planDay(rules, { pvKw48: day(ghi, kw), dailyUseKwh: units / 30.4, appliances: apps });
        assert.ok(r.self_use_pct.after >= r.self_use_pct.before, 'ghi ' + ghi + ' kw ' + kw + ' units ' + units);
      }
    }
  }
});

test('every appliance is placed once, inside the solar window, with its energy intact', () => {
  const r = planDay(rules, { pvKw48: day(5, 2.5), dailyUseKwh: 8.6, appliances: apps });
  assert.equal(r.plan.length, apps.length);
  for (const p of r.plan) {
    const a = apps.find((x) => x.id === p.appliance);
    assert.equal(p.kwh, a.kwh);
    assert.ok(p.start >= rules.veyil.solar_window[0] && p.start < rules.veyil.solar_window[1], p.appliance + ' at ' + p.start);
  }
});

test('a sunny day moves all flexible load out of the 6-10 pm peak', () => {
  const r = planDay(rules, { pvKw48: day(5, 2.5), dailyUseKwh: 8.6, appliances: apps });
  assert.equal(r.units_moved_from_peak, apps.reduce((s, a) => s + a.kwh, 0));
});

test('no sun: the plan keeps the usual times and nothing is claimed', () => {
  const r = planDay(rules, { pvKw48: new Array(48).fill(0), dailyUseKwh: 8.6, appliances: apps });
  assert.deepEqual(r.self_use_pct, { before: 0, after: 0 });
  for (const p of r.plan) assert.equal(p.start, p.usual_start);
});

test('calibration: a typical 262-unit, 2.5 kW home uses about a third of its solar before planning (KSEB: 36%)', () => {
  const r = planDay(rules, { pvKw48: day(4.95, 2.5), dailyUseKwh: 262 / 30.4, appliances: apps });
  assert.ok(r.self_use_pct.before >= 28 && r.self_use_pct.before <= 42, 'got ' + r.self_use_pct.before);
  assert.ok(r.self_use_pct.after >= 50);
});

test('slot labels', () => {
  assert.equal(slotLabel(23), '11:30');
  assert.equal(slotLabel(26), '13:00');
});

test('sun-plan service: far from any cached area it falls back to a typical day, flagged', () => {
  const p = buildSunPlan(rules, { lat: 9.95, lon: 76.3, kw: 3, monthly_units: 262, date: null }, '2026-10-24');
  assert.equal(p.schema, 'sun-plan@1');
  assert.equal(p.quality.data, 'typical');
  assert.equal(p.date, '2026-10-25');
  assert.equal(p.sun_hours_kw.length, 24);
  assert.equal(p.plan.length, 3);
  assert.equal(p.alerts[0].key, 'alert.evening_peak');
});

test('sun-plan service: near a cached area it uses the cached forecast', () => {
  const p = buildSunPlan(rules, { lat: 8.3016, lon: 77.0917, kw: 3, monthly_units: 262, date: null }, '2026-10-24');
  assert.ok(['forecast', 'forecast-stale'].includes(p.quality.data));
  assert.ok(p.pv_day_kwh >= 0);
  assert.ok(p.self_use_pct.after >= p.self_use_pct.before);
});

import { todFactor, todCostOf } from '../src/veyil.js';

test('KSEB ToD factors: 90% by day, 125% 6-10 pm, 100% at night', () => {
  assert.equal(todFactor(rules, 24), 0.9); // 12:00
  assert.equal(todFactor(rules, 12), 0.9); // 06:00
  assert.equal(todFactor(rules, 38), 1.25); // 19:00
  assert.equal(todFactor(rules, 36), 1.25); // 18:00
  assert.equal(todFactor(rules, 44), 1.0); // 22:00
  assert.equal(todFactor(rules, 6), 1.0); // 03:00
});

test('ToD example: a 1.5 unit wash at the Rs 9.20 rate costs 17.25 in the evening and 12.42 in the day', () => {
  const wm = { kwh: 1.5, minutes: 90 };
  assert.equal(Math.round(todCostOf(rules, wm, '18:00', 9.2) * 100) / 100, 1.5 * 9.2 * 1.25);
  assert.equal(Math.round(todCostOf(rules, { kwh: 1.5, minutes: 30 }, '18:00', 9.2) * 100) / 100, 17.25);
  assert.equal(Math.round(todCostOf(rules, { kwh: 1.5, minutes: 30 }, '12:00', 9.2) * 100) / 100, 12.42);
});

test('sun-plan: ToD rupees only for homes above 500 units; EV charger is selectable; unknown appliance is rejected', () => {
  const base = { lat: 8.3016, lon: 77.0917, kw: 5, date: null };
  const small = buildSunPlan(rules, { ...base, monthly_units: 262, appliances: null }, '2026-10-24');
  assert.equal(small.tod.applies, false);
  const big = buildSunPlan(rules, { ...base, monthly_units: 600, appliances: ['motor', 'washing_machine', 'iron', 'ev_charger'] }, '2026-10-24');
  assert.equal(big.tod.applies, true);
  assert.equal(big.tod.rate, 9.2);
  assert.ok(big.tod.saving_day > 0 && big.tod.saving_month > big.tod.saving_day * 29);
  assert.equal(big.plan.length, 4);
  assert.ok(big.plan.some((p) => p.appliance === 'ev_charger'));
  assert.ok(!('appliance_def' in big.plan[0]));
  assert.throws(() => buildSunPlan(rules, { ...base, monthly_units: 262, appliances: ['toaster'] }, '2026-10-24'), /unknown appliance/);
});
