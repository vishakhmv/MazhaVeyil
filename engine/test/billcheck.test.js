import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { checkScan } from '../src/billcheck.js';

const rules = loadRules();
const D = '2026-10-24';

test('a plausible bill passes: amount a little above energy + fixed', () => {
  const r = checkScan(rules, { units: 262, amount: 2100, period_start: '2026-09-01', period_end: '2026-09-30' }, D);
  assert.equal(r.status, 'ok');
  assert.equal(r.expected_total, 2165.35); // energy 1768.50 + fixed 220 + 10% duty 176.85
  assert.deepEqual(r.expected_breakdown, { energy: 1768.5, fixed: 220, duty: 176.85 });
  assert.equal(r.bill.period_months, 1);
  assert.equal(r.bill.period_source, 'dates');
});

test('a two-month bill is detected from the dates and judged per month', () => {
  const r = checkScan(rules, { units: 502, amount: 3900, period_start: '2026-08-01', period_end: '2026-09-30' }, D);
  assert.equal(r.bill.period_months, 2);
  assert.equal(r.bill.monthly_units, 251);
  assert.equal(r.expected_total, 3388.5 + 440 + 338.85);
  assert.equal(r.status, 'ok');
});

test('an amount far from our calculation raises a warning, not a rejection', () => {
  const r = checkScan(rules, { units: 262, amount: 4000, period_months: 1 }, D);
  assert.equal(r.status, 'warn');
  assert.ok(r.warnings.some((w) => w.key === 'bill.amount_differs'));
  assert.ok(r.diff_pct > 20);
});

test('readings that disagree with the units are flagged', () => {
  const r = checkScan(rules, { units: 262, amount: 2000, period_months: 1, previous_reading: 1000, current_reading: 1100 }, D);
  assert.ok(r.warnings.some((w) => w.key === 'bill.readings_mismatch'));
});

test('missing period is assumed to be one month and says so', () => {
  const r = checkScan(rules, { units: 100, amount: 700 }, D);
  assert.ok(r.warnings.some((w) => w.key === 'bill.period_assumed'));
  assert.equal(r.bill.period_source, 'assumed');
});

test('unreadable units are rejected; unreadable amount only warns', () => {
  assert.equal(checkScan(rules, { units: 'abc', amount: 500 }, D).status, 'reject');
  assert.equal(checkScan(rules, { units: -4, amount: 500 }, D).status, 'reject');
  const r = checkScan(rules, { units: 200, period_months: 1 }, D);
  assert.equal(r.status, 'warn');
  assert.ok(r.warnings.some((w) => w.key === 'bill.amount_unreadable'));
  assert.equal(r.bill.units, 200);
});

test('the old tariff is not used: the bill date picks the tariff, with a stale flag path', () => {
  const r = checkScan(rules, { units: 249, amount: 1500, period_months: 1, bill_date: '2026-06-01' }, D);
  assert.equal(r.expected_total, 1424 + 160 + 142.4);
});

test('official check: the 5 Dec 2024 - 31 Mar 2025 tariff reproduces the idea doc old column (kseb.in)', () => {
  const r = checkScan(rules, { units: 249, amount: 1700, period_months: 1, bill_date: '2025-01-15' }, D);
  assert.equal(r.tariff_id, 'kseb-lt1a-2024-12');
  assert.equal(r.expected_breakdown.energy, 1399.15);
});
