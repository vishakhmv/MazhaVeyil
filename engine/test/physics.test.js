import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { roofCapacityKw, yieldPerKwYear, recommendKw } from '../src/solar.js';
import { dailyInflowLitres, simulateTank, recommendTank, typicalRainSeries, monthlyAverage } from '../src/rain.js';
import { roofScore, bandOf } from '../src/score.js';
import { polygonAreaM2, validatePolygon, pointInPolygon } from '../src/geo.js';

const rules = loadRules();
const ghi = rules.typical_kerala.ghi_kwh_m2_day;

test('invariant: a bigger roof never gives fewer kW', () => {
  for (const type of ['flat', 'sloped']) {
    let prev = -1;
    for (let a = 8; a <= 2000; a += 7) {
      const kw = roofCapacityKw(rules, a, type);
      assert.ok(kw >= prev);
      prev = kw;
    }
  }
});

test('120 m2 flat roof hosts 6 kW; sloped hosts less', () => {
  assert.equal(roofCapacityKw(rules, 120, 'flat'), 6);
  assert.ok(roofCapacityKw(rules, 120, 'sloped') < 6);
});

test('sanity: Kerala yield is 3 to 5 units per kW per day', () => {
  const perDay = yieldPerKwYear(rules, ghi, 'little') / 365.25;
  assert.ok(perDay >= 3 && perDay <= 5, 'got ' + perDay);
});

test('shade lowers the yield', () => {
  assert.ok(yieldPerKwYear(rules, ghi, 'a_lot') < yieldPerKwYear(rules, ghi, 'some'));
  assert.ok(yieldPerKwYear(rules, ghi, 'some') < yieldPerKwYear(rules, ghi, 'little'));
});

test('recommended kW covers the yearly use, rounded to 0.5, within [1, kwMax]', () => {
  const y = yieldPerKwYear(rules, ghi, 'some');
  const kw = recommendKw(rules, { useYear: 262 * 12, yieldPerKw: y, kwMax: 6 });
  assert.ok(kw >= 1 && kw <= 6 && kw % 0.5 === 0);
  assert.equal(recommendKw(rules, { useYear: 1e6, yieldPerKw: y, kwMax: 4 }), 4);
  assert.equal(recommendKw(rules, { useYear: 100, yieldPerKw: y, kwMax: 6 }), 1);
  assert.equal(recommendKw(rules, { useYear: 1e6, yieldPerKw: y, kwMax: 59, buildingUse: 'public' }), 59);
  assert.equal(recommendKw(rules, { useYear: 1e6, yieldPerKw: y, kwMax: 59, buildingUse: 'home' }), 10);
});

test('invariant: zero rain gives zero water and zero overflow', () => {
  const inflow = dailyInflowLitres(rules, new Array(3650).fill(0), 120);
  const r = simulateTank(inflow, 200, 5000);
  assert.equal(r.reliability, 0);
  assert.equal(r.overflow, 0);
});

test('first flush: the first mm of a rainy day is discarded', () => {
  assert.deepEqual(dailyInflowLitres(rules, [0.5, 1, 11], 100), [0, 0, 800]);
});

test('invariant: a bigger tank never lowers reliability', () => {
  const inflow = dailyInflowLitres(rules, typicalRainSeries(rules), 120);
  let prev = -1;
  for (const c of rules.rain.tank_sizes_l) {
    const r = simulateTank(inflow, 200, c).reliability;
    assert.ok(r >= prev - 1e-12);
    prev = r;
  }
});

test('overflow never exceeds what was harvested', () => {
  const inflow = dailyInflowLitres(rules, typicalRainSeries(rules), 120);
  const total = inflow.reduce((s, v) => s + v, 0);
  assert.ok(simulateTank(inflow, 200, 5000).overflow <= total);
});

test("tank recommendation: the knee of the curve (each extra day of storage adds under 0.4 points beyond it)", () => {
  const inflow = dailyInflowLitres(rules, typicalRainSeries(rules), 120);
  const r = recommendTank(rules, inflow, 200);
  const c = r.tank_curve;
  const i = c.findIndex((p) => p.litres === r.tank_litres);
  assert.ok(i >= 0);
  const rel = (j) => simulateTank(inflow, 200, c[j].litres).reliability * 100;
  const gainPerDay = (j) => (rel(j + 1) - rel(j)) / ((c[j + 1].litres - c[j].litres) / 200);
  if (i < c.length - 1) assert.ok(gainPerDay(i) < rules.rain.marginal_gain_pp_per_day);
  for (let j = 0; j < i; j++) assert.ok(gainPerDay(j) >= rules.rain.marginal_gain_pp_per_day);
  assert.ok(r.water_cover_pct >= 0 && r.water_cover_pct <= 100);
});

test('typical rain series sums close to the monthly normals', () => {
  const avg = monthlyAverage(typicalRainSeries(rules), '2016-01-01').reduce((a, v) => a + v, 0);
  const normal = rules.typical_kerala.rain_mm_month.reduce((a, v) => a + v, 0);
  assert.ok(Math.abs(avg - normal) / normal < 0.05, avg + ' vs ' + normal);
});

test('roof score: average of power and water, bands, tip', () => {
  const s = roofScore({ roofMaxUnitsYear: 8000, useYear: 3000, waterCoverPct: 60, nextTank: { tank_litres: 7500, water_cover_pct: 70 } });
  assert.deepEqual(s, { power: 100, water: 60, score: 80, band: 'strong', tip: { tank_litres: 7500, water: 70, score: 85 } });
  assert.equal(bandOf(39), 'starting');
  assert.equal(bandOf(40), 'good');
  assert.equal(bandOf(69), 'good');
  assert.equal(bandOf(70), 'strong');
});

test('roof score stays within 0-100 and has no tip when there is no better tank', () => {
  for (const roof of [0, 500, 1e6]) {
    for (const water of [0, 50, 100]) {
      const s = roofScore({ roofMaxUnitsYear: roof, useYear: 3000, waterCoverPct: water, nextTank: null });
      assert.ok(s.score >= 0 && s.score <= 100);
      assert.equal(s.tip, null);
    }
  }
});

test('geometry: a 10 m x 12 m rectangle near Kerala is about 120 m2', () => {
  const lat = 8.3;
  const lon = 77.09;
  const dLat = 12 / 110540;
  const dLon = 10 / (111320 * Math.cos((lat * Math.PI) / 180));
  const ring = [[lon, lat], [lon + dLon, lat], [lon + dLon, lat + dLat], [lon, lat + dLat], [lon, lat]];
  assert.ok(Math.abs(polygonAreaM2(ring) - 120) < 1.5);
  assert.equal(validatePolygon(ring), null);
  assert.ok(pointInPolygon([lon + dLon / 2, lat + dLat / 2], ring));
  assert.ok(!pointInPolygon([lon + dLon * 2, lat], ring));
});

test('geometry: bad drawn polygons are rejected', () => {
  assert.match(validatePolygon([[77, 8], [77.1, 8]]), /3 points/);
  assert.match(validatePolygon([[77, 8], [77.0001, 8.0001], [77.0001, 8], [77, 8.0001]]), /cross/);
  assert.match(validatePolygon([[77, 8], [77.00001, 8], [77.00001, 8.00001]]), /too small/);
  assert.match(validatePolygon([[0, 0], [1, 0], [1, 1]]), /outside India/);
});
