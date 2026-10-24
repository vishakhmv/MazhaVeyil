import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { subsidyFor, subsidyWindow, surplusPayout, monthSaving, annualSavings, costRange, paybackYears, co2Tonnes } from '../src/finance.js';

const rules = loadRules();
const D = '2026-10-24';

test('PM Surya Ghar subsidy: 1/2/2.5/3/5 kW', () => {
  const got = [1, 2, 2.5, 3, 5].map((kw) => subsidyFor(rules, kw));
  assert.deepEqual(got, [30000, 60000, 69000, 78000, 78000]);
});

test('subsidy: zero below 1 kW and zero for public buildings (homes only)', () => {
  assert.equal(subsidyFor(rules, 0.5), 0);
  assert.equal(subsidyFor(rules, 59, 'public'), 0);
});

test('invariant: subsidy never falls as kW grows and never exceeds the cap', () => {
  let prev = 0;
  for (let kw = 0; kw <= 30; kw += 0.5) {
    const s = subsidyFor(rules, kw);
    assert.ok(s >= prev && s <= 78000);
    prev = s;
  }
});

test('subsidy window on 2026-10-24 is 158 days (ends 2027-03-31)', () => {
  assert.deepEqual(subsidyWindow(rules, '2026-10-24'), { ends_on: '2027-03-31', days_left: 158 });
  assert.equal(subsidyWindow(rules, '2027-05-01').days_left, 0);
});

test('3,000 surplus units are paid 8,370', () => {
  assert.equal(surplusPayout(rules, 3000), 8370);
});

test('slab-aware saving: 320 units, 100 from solar saves 1254.50 (not 760)', () => {
  assert.equal(monthSaving(rules, 320, 100, D), 1254.5);
});

test('slab-aware saving: 262 units, 1 kW (110 units) saves 1106.60', () => {
  assert.equal(monthSaving(rules, 262, 110, D), 1106.6);
});

test('saving can never exceed the bill before, and never goes negative', () => {
  for (const use of [40, 120, 262, 320, 560]) {
    for (const gen of [0, 30, 110, 400, 900]) {
      const s = monthSaving(rules, use, gen, D);
      assert.ok(s >= 0);
      assert.ok(s <= monthSaving(rules, use, 1e9, D) + 1e-9);
    }
  }
});

test('annual savings with banking: a system matching yearly use pays off and pays a small surplus', () => {
  const gen = Array(12).fill(300);
  const a = annualSavings(rules, 262, gen, D);
  assert.ok(a.saving_year > 12 * 1600); // each month's bill drops to 0 energy
  assert.equal(a.surplus_units, 12 * 38);
  assert.equal(a.surplus_payout_year, Math.round(12 * 38 * 2.79 * 100) / 100);
});

test('annual savings: no solar means no saving', () => {
  const a = annualSavings(rules, 262, Array(12).fill(0), D);
  assert.equal(a.saving_year, 0);
  assert.equal(a.surplus_payout_year, 0);
});

test('payback is a range, with and without subsidy; no benefit means null', () => {
  const cost = costRange(rules, 3);
  assert.deepEqual(cost, [165000, 210000]);
  const p = paybackYears(cost, 78000, 20000);
  assert.deepEqual(p.with_subsidy, [4.4, 6.6]);
  assert.deepEqual(p.without_subsidy, [8.3, 10.5]);
  assert.deepEqual(paybackYears(cost, 78000, 0), { with_subsidy: null, without_subsidy: null });
});

test('CO2: 3,420 units at the CEA factor 0.727 kg/kWh is about 2.49 t', () => {
  assert.equal(co2Tonnes(rules, 3420), 2.49);
});
