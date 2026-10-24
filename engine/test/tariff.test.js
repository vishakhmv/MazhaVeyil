// Golden answer key: every expected value comes from the idea doc (sections 5.2 and 8), to be re-checked against KSEB's calculator.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { billFor, cliffList, cliffStatus, solarToBeatCliff, curve, energyPaise, selectTariff, rs } from '../src/tariff.js';

const rules = loadRules();
const D = '2026-10-24';
const energy = (units, months = 1) => billFor(rules, { units, period_months: months, date: D }).energy;

test('energy charge golden table (monthly)', () => {
  const table = {
    249: 1424.0, 250: 1432.5, 251: 1694.25, 300: 2025.0, 301: 2287.6,
    350: 2660.0, 351: 2790.45, 400: 3180.0, 401: 3308.25, 500: 4125.0, 501: 4609.2,
  };
  for (const [u, e] of Object.entries(table)) assert.equal(energy(+u), e, `${u} units`);
});

test('two-month bill: slabs are per month', () => {
  assert.equal(energy(502, 2), 3388.5); // 251 a month -> flat 6.75 on all 502 (VERIFY on KSEB calculator)
  assert.equal(energy(500, 2), 2865.0); // 250 a month -> 2 x 1432.50
});

test('fixed charge jumps at the 250 cliff (single and three phase)', () => {
  const f = (u, ph) => billFor(rules, { units: u, phase: ph, date: D }).fixed;
  assert.equal(f(250, '1ph'), 160);
  assert.equal(f(251, '1ph'), 220);
  assert.equal(f(250, '3ph'), 235);
  assert.equal(f(251, '3ph'), 240);
  assert.equal(billFor(rules, { units: 502, period_months: 2, phase: '1ph', date: D }).fixed, 440);
});

test('cliff list: five cliffs with the doc jumps', () => {
  const c = cliffList(rules, D);
  assert.deepEqual(c.map((x) => x.at), [250, 300, 350, 400, 500]);
  assert.deepEqual(c.map((x) => x.jump), [261.75, 262.6, 130.45, 128.25, 484.2]);
});

test('cliff meter: 262 units is 12 over 250 and 12 fewer saves 336', () => {
  const s = cliffStatus(rules, 262, D);
  assert.deepEqual(s.last, { at: 250, over_by: 12, saving_if_under: 336.0 });
  assert.deepEqual(s.next, { at: 300, units_to_go: 38, jump: 262.6 });
});

test('cliff meter: under 250 has no last cliff and no solar target', () => {
  const s = cliffStatus(rules, 200, D);
  assert.equal(s.last, null);
  assert.deepEqual(s.next, { at: 250, units_to_go: 50, jump: 261.75 });
  assert.equal(solarToBeatCliff(rules, 200, D), null);
});

test('solar to beat the cliff: 262 units + 1 kW (110 units) -> 152 units, saves 1106.60', () => {
  assert.deepEqual(solarToBeatCliff(rules, 262, D), { kw: 1, monthly_units_after: 152, saving_month: 1106.6 });
});

test('above the last cliff there is no next cliff', () => {
  assert.equal(cliffStatus(rules, 520, D).next, null);
});

test('old tariff is not selected today; stale flag works after expiry', () => {
  assert.equal(selectTariff(rules, '2026-10-24').stale, false);
  assert.equal(selectTariff(rules, '2027-06-01').stale, true);
});

test('invariant: the energy bill never falls as units rise (both periods)', () => {
  for (const months of [1, 2]) {
    let prev = -1;
    for (let u = 0; u <= 1200; u++) {
      const e = energy(u, months);
      assert.ok(e >= prev, `${u} units, ${months} months`);
      prev = e;
    }
  }
});

test('curve has one point per unit 0..600', () => {
  const c = curve(rules, D);
  assert.equal(c.length, 601);
  assert.equal(c[251].energy, 1694.25);
  assert.equal(rs(energyPaise(selectTariff(rules, D).tariff, 0)), 0);
});

test('old column (5 Dec 2024 - 31 Mar 2025), verified on kseb.in: 249 units = 1399.15, 252 units = 1650.60', () => {
  const old = (units) => billFor(rules, { units, period_months: 1, date: '2025-01-15' });
  assert.equal(old(249).tariff_id, 'kseb-lt1a-2024-12');
  assert.equal(old(249).energy, 1399.15);
  assert.equal(old(252).energy, 1650.6);
  assert.equal(old(252).fixed, 190);
  assert.equal(selectTariff(rules, '2025-04-01').tariff.id, 'kseb-lt1a-2025');
  assert.equal(selectTariff(rules, '2025-03-31').tariff.id, 'kseb-lt1a-2024-12');
});

test('401-500 fixed charge is 286 single phase and 285 three phase, exactly as KSEB publishes it', () => {
  assert.equal(billFor(rules, { units: 450, phase: '1ph', date: D }).fixed, 286);
  assert.equal(billFor(rules, { units: 450, phase: '3ph', date: D }).fixed, 285);
});
