import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { recommendBySavings, sizeOptions, evaluateKw } from '../src/sizing.js';
import { recommendKw, yieldPerKwYear, roofCapacityKw } from '../src/solar.js';
import { buildInsights } from '../src/insights.js';

const rules = loadRules();
const ghi = rules.typical_kerala.ghi_kwh_m2_day;
const D = '2026-10-24';
const ctxFor = (units, area = 150) => {
  const kwMax = roofCapacityKw(rules, area, 'flat');
  const coverKw = recommendKw(rules, { useYear: units * 12, yieldPerKw: yieldPerKwYear(rules, ghi, 'some'), kwMax });
  return { monthly: units, ghi, shade: 'some', date: D, kwMax, coverKw };
};

test('sizing: never above the roof, the 10 kW home cap, or what covers the home', () => {
  for (const units of [40, 120, 262, 500, 900, 2000]) {
    for (const area of [20, 60, 150, 400]) {
      const c = ctxFor(units, area);
      const kw = recommendBySavings(rules, c);
      assert.ok(kw <= c.kwMax && kw <= 10 && kw <= Math.max(c.coverKw, 0) + 1e-9, units + ' u, ' + area + ' m2 -> ' + kw);
      assert.equal(kw % 0.5, 0);
    }
  }
});

test('invariant: a home that uses more gets a bigger recommendation (a hard payback cut-off may dip by one 0.5 kW step at the margin)', () => {
  let prev = 0;
  const first = recommendBySavings(rules, ctxFor(40, 300));
  for (let u = 40; u <= 1200; u += 20) {
    const kw = recommendBySavings(rules, ctxFor(u, 300));
    assert.ok(kw >= prev - 0.5, u + ' units');
    prev = Math.max(prev, kw);
  }
  assert.ok(prev > first + 4);
});

test('a very low-use home is told to stay at the 1 kW minimum', () => {
  assert.equal(recommendBySavings(rules, ctxFor(60)), 1);
});

test('each extra 0.5 kW the engine adds pays back within the marginal rule', () => {
  const c = ctxFor(400, 300);
  const kw = recommendBySavings(rules, c);
  const a = evaluateKw(rules, { ...c, kw: kw - 0.5 });
  const b = evaluateKw(rules, { ...c, kw });
  const extraCost = (b.cost[0] + b.cost[1]) / 2 - (a.cost[0] + a.cost[1]) / 2 - (b.subsidy - a.subsidy);
  assert.ok(extraCost / (b.ann.benefit_year - a.ann.benefit_year) <= rules.sizing.marginal_payback_years);
});

test('options: three sizes around the recommendation, subsidy shortens payback, bigger costs more', () => {
  const c = ctxFor(320);
  const rec = recommendBySavings(rules, c);
  const o = sizeOptions(rules, c, rec);
  assert.deepEqual(o.map((x) => x.label), ['smaller', 'recommended', 'larger']);
  assert.equal(o[1].kw, rec);
  assert.ok(o[0].cost[0] < o[1].cost[0] && o[1].cost[0] < o[2].cost[0]);
  for (const x of o) assert.ok(x.payback_years[0] <= x.payback_years_no_subsidy[0]);
});

test('options: no "smaller" below the 1 kW minimum', () => {
  const o = sizeOptions(rules, ctxFor(60), 1);
  assert.deepEqual(o.map((x) => x.label), ['recommended', 'larger']);
});

const base = { isHome: true, unitsSource: 'typed', monthly: 262, kw: 2, coverKw: 2.5, kwMax: 6, subsidy: 60000, cliff: null, score: { power: 100, tip: null }, demand: 200, rainMonthly: new Array(12).fill(20000), harvestYear: 150000, quality: 'cached', daysLeft: 158 };
const keys = (c) => buildInsights(rules, { ...base, ...c }).map((i) => i.key);

test('insights: cliff, subsidy window, trimmed size, tank tip, water days', () => {
  const k = keys({ cliff: { last: { at: 250, over_by: 12, saving_if_under: 336 }, next: { at: 300, units_to_go: 38, jump: 262.6 } }, score: { power: 100, tip: { tank_litres: 7500, water: 84, score: 92 } } });
  for (const want of ['insight.cliff_over', 'insight.last_panels_earn_little', 'insight.subsidy_window', 'insight.tank_tip', 'insight.water_days']) assert.ok(k.includes(want), want);
  assert.ok(!k.includes('insight.default_units'));
});

test('insights: near the cliff, default units, public building, dry months, typical data', () => {
  assert.ok(keys({ cliff: { last: null, next: { at: 250, units_to_go: 10, jump: 261.75 } } }).includes('insight.cliff_near'));
  assert.ok(keys({ unitsSource: 'default' }).includes('insight.default_units'));
  const pub = keys({ isHome: false });
  assert.ok(pub.includes('insight.public_building') && !pub.includes('insight.subsidy_window'));
  const dry = buildInsights(rules, { ...base, rainMonthly: [0, 0, 0, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 0] }).find((i) => i.key === 'insight.dry_months');
  assert.deepEqual(dry.params.months, [1, 2, 3, 12]);
  assert.ok(keys({ quality: 'typical' }).includes('insight.typical_data'));
});
