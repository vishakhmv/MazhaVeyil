// End-to-end over HTTP on an ephemeral port. Runs fully offline (OFFLINE=1) from the committed cache.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';
import { loadAreas } from '../src/data.js';

process.env.OFFLINE = '1';
process.env.QUIET = '1';
process.env.DEMO_DATE = '2026-10-24';

let server;
let base;
before(async () => {
  await new Promise((resolve) => {
    server = createApp().listen(0, '127.0.0.1', resolve);
  });
  base = 'http://127.0.0.1:' + server.address().port + '/api/engine';
});
after(() => server.close());

const post = (path, body) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const rect = (lon, lat, wM, hM) => {
  const dLat = hM / 110540;
  const dLon = wM / (111320 * Math.cos((lat * Math.PI) / 180));
  return [[lon, lat], [lon + dLon, lat], [lon + dLon, lat + dLat], [lon, lat + dLat]];
};

test('health and areas', async () => {
  const h = await (await fetch(base + '/health')).json();
  assert.equal(h.ok, true);
  assert.equal(h.offline, true);
  const areas = await (await fetch(base + '/areas')).json();
  assert.ok(areas.length >= 2);
  for (const a of areas) assert.ok(a.id && a.center.length === 2 && a.bbox.length === 4 && ['home', 'public'].includes(a.kind));
});

test('bill: 262 units over the cliff, contract shape, under 1.5 s', async () => {
  const t = Date.now();
  const b = await (await post('/bill', { units: 262, period_months: 1, phase: '1ph' })).json();
  assert.ok(Date.now() - t < 1500);
  assert.equal(b.schema, 'bill-result@1');
  assert.deepEqual(b.bill, { units: 262, period_months: 1, monthly_units: 262, phase: '1ph', energy: 1768.5, fixed: 220, total: 1988.5, rate: 6.75 });
  assert.deepEqual(b.cliff.last, { at: 250, over_by: 12, saving_if_under: 336 });
  assert.equal(b.cliffs.length, 5);
  assert.equal(b.curve.length, 601);
  assert.deepEqual(b.solar_to_beat_cliff, { kw: 1, monthly_units_after: 152, saving_month: 1106.6 });
});

test('report: a drawn home roof in Pozhiyoor, offline, under 1.5 s', async () => {
  const t = Date.now();
  const res = await post('/report', { roof: { polygon: rect(77.0917, 8.3016, 10, 12) }, units: 262, roof_type: 'flat', shade: 'some' });
  assert.equal(res.status, 200);
  const r = await res.json();
  assert.ok(Date.now() - t < 1500);
  assert.equal(r.schema, 'roof-report@1');
  assert.ok(Math.abs(r.roof.area_m2 - 120) < 2);
  assert.equal(r.sun.kw_max, 6);
  assert.ok(r.sun.kw_recommended >= 1 && r.sun.kw_recommended <= r.sun.kw_max);
  assert.equal(r.sun.subsidy, r.sun.kw_recommended === 2.5 ? 69000 : r.sun.subsidy);
  assert.equal(r.sun.units_month.length, 12);
  assert.ok(r.money.saving_year > 0);
  assert.ok(r.sun.payback_years[0] < r.sun.payback_years_no_subsidy[0]);
  assert.equal(r.sun.subsidy_days_left, 158);
  assert.ok(r.score.score >= 0 && r.score.score <= 100);
  assert.equal(r.quality.data, 'cached');
  assert.equal(r.home.units_source, 'typed');
});

test('report: public building (campus) shows no subsidy and no money card', async () => {
  const campus = loadAreas().find((a) => a.kind === 'public');
  const r = await (await post('/report', { roof: { polygon: rect(campus.center[0], campus.center[1], 40, 30) }, building_use: 'public' })).json();
  assert.equal(r.money, null);
  assert.equal(r.sun.subsidy, 0);
  assert.equal(r.sun.payback_years, null);
  assert.equal(r.sun.subsidy_days_left, null);
  assert.equal(r.home.units_source, 'default');
});

test('report without units uses a flagged default; a bigger bill needs a bigger system', async () => {
  const poly = rect(77.0917, 8.3016, 12, 15);
  const a = await (await post('/report', { roof: { polygon: poly } })).json();
  assert.equal(a.quality.units, 'default');
  const small = await (await post('/report', { roof: { polygon: poly }, units: 120 })).json();
  const big = await (await post('/report', { roof: { polygon: poly }, units: 480 })).json();
  assert.ok(big.sun.kw_recommended >= small.sun.kw_recommended);
});

test('report by roof id from the cached outlines', async () => {
  const fc = await (await fetch(base + '/roofs?area=' + loadAreas()[0].id)).json();
  assert.ok(fc.features.length > 0);
  const id = fc.features[0].id;
  const res = await post('/report', { roof: { id }, building_use: 'public' });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).roof.id, id);
});

test('wards: every area has a summary in the contract shape', async () => {
  for (const a of loadAreas()) {
    const w = await (await fetch(base + '/wards/' + a.ward_id)).json();
    assert.equal(w.schema, 'ward-summary@1');
    assert.ok(w.roofs > 0 && w.potential.kw > 0 && w.per_home_avg.units_year > 0);
    assert.equal(w.boundary.type, 'Polygon');
    assert.equal(w.boundary_quality, 'approximate');
  }
  assert.equal((await fetch(base + '/wards/nope')).status, 404);
});

test('errors: clean JSON with the contract shape', async () => {
  for (const [res, status, code] of [
    [await post('/bill', { units: -5 }), 400, 'bad_input'],
    [await post('/bill', {}), 400, 'bad_input'],
    [await post('/report', { roof: { id: 'osm:way/nope' } }), 404, 'roof_not_found'],
    [await post('/report', { roof: { polygon: [[77, 8], [77.1, 8]] } }), 400, 'bad_roof'],
    [await post('/report', { roof: { polygon: rect(77.09, 8.3, 10, 10) }, shade: 'dark' }), 400, 'bad_input'],
    [await fetch(base + '/nothing'), 404, 'not_found'],
  ]) {
    assert.equal(res.status, status);
    assert.equal((await res.json()).error.code, code);
  }
});

test('far from every cached area and offline: falls back to the nearest area, flagged', async () => {
  const r = await (await post('/report', { roof: { polygon: rect(76.3, 9.95, 10, 12) }, units: 262 })).json();
  assert.equal(r.quality.data, 'nearest-area');
  assert.ok(r.sun.units_year > 0);
});

test('property: every report across areas, roof sizes and units stays in range', async () => {
  for (const a of loadAreas()) {
    for (const [w, h] of [[4, 4], [8, 10], [15, 20], [40, 30]]) {
      for (const units of [60, 262, 700]) {
        const r = await (await post('/report', { roof: { polygon: rect(a.center[0], a.center[1], w, h) }, units, building_use: 'home' })).json();
        assert.ok(r.sun.kw_recommended <= r.sun.kw_max + 1e-9);
        assert.ok(r.score.score >= 0 && r.score.score <= 100);
        assert.ok(r.rain.water_cover_pct >= 0 && r.rain.water_cover_pct <= 100);
        assert.ok(r.sun.subsidy <= 78000);
        assert.ok(r.money.saving_year >= 0);
      }
    }
  }
});

test('sun-plan: Veyil Samayam over HTTP, with the typical-day pitch numbers', async () => {
  const res = await post('/sun-plan', { lat: 8.3016, lon: 77.0917, kw: 2.5, monthly_units: 262 });
  assert.equal(res.status, 200);
  const p = await res.json();
  assert.equal(p.schema, 'sun-plan@1');
  assert.equal(p.sun_hours_kw.length, 24);
  assert.deepEqual(p.plan.map((x) => x.appliance).sort(), ['iron', 'motor', 'washing_machine']);
  assert.ok(p.self_use_pct.after >= p.self_use_pct.before);
  assert.ok(p.typical_day.self_use_pct.after > p.typical_day.self_use_pct.before);
  assert.ok(p.alerts.some((a) => a.key === 'alert.evening_peak'));
});

test('sun-plan: bad input is a clean 400', async () => {
  for (const body of [{}, { lat: 8.3, lon: 77, kw: 0, monthly_units: 262 }, { lat: 8.3, lon: 77, kw: 2.5, monthly_units: 262, date: 'tomorrow' }, { lat: 99, lon: 77, kw: 2.5, monthly_units: 262 }]) {
    const res = await post('/sun-plan', body);
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, 'bad_input');
  }
});

test('today card: rain caught and power made, from the cached forecast', async () => {
  const q = new URLSearchParams({ lat: '8.3016', lon: '77.0917', area_m2: '120', kw: '2.5' });
  const t = await (await fetch(base + '/today?' + q)).json();
  assert.equal(t.schema, 'today@1');
  assert.ok(t.units_made >= 0 && t.rain_litres_caught >= 0);
  assert.ok(['forecast', 'forecast-stale'].includes(t.quality.data));
  assert.equal((await fetch(base + '/today?lat=8.3')).status, 400);
});

test('bill check: the scanner output is cross-checked by our rules', async () => {
  const ok = await (await post('/bill/check', { units: 262, amount: 2100, period_start: '2026-09-01', period_end: '2026-09-30', phase: '1ph' })).json();
  assert.equal(ok.schema, 'bill-check@1');
  assert.equal(ok.status, 'ok');
  const bad = await (await post('/bill/check', { units: 262, amount: 9000 })).json();
  assert.equal(bad.status, 'warn');
  assert.equal((await post('/bill/check', [1, 2])).status, 400);
});

test('a home recommended above 3 kW carries the unverified net-metering caveat', async () => {
  const r = await (await post('/report', { roof: { polygon: rect(77.0917, 8.3016, 14, 18) }, units: 600, roof_type: 'flat' })).json();
  assert.ok(r.sun.kw_recommended > 3);
  const a = r.assumptions.find((x) => x.id === 'net_metering_above_3kw');
  assert.ok(a && a.verified === false);
  const small = await (await post('/report', { roof: { polygon: rect(77.0917, 8.3016, 10, 12) }, units: 262 })).json();
  assert.equal(small.assumptions.some((x) => x.id === 'net_metering_above_3kw'), false);
});

test('report v1.1: sizing options, monthly bills, cliff block, insights, household', async () => {
  const poly = rect(77.0917, 8.3016, 10, 12);
  const r = await (await post('/report', { roof: { polygon: poly }, units: 262, household: 6 })).json();
  assert.ok(r.sun.options.length >= 2 && r.sun.options.some((o) => o.label === 'recommended' && o.kw === r.sun.kw_recommended));
  assert.equal(r.money.bill_before_months.length, 12);
  assert.equal(r.money.bill_after_months.length, 12);
  assert.ok(Math.abs(r.money.bill_before_months.reduce((s, v) => s + v, 0) - 12 * r.money.bill_before_month) < 0.05);
  assert.deepEqual(r.cliff.last, { at: 250, over_by: 12, saving_if_under: 336 });
  assert.deepEqual(r.cliff.solar_to_beat_cliff, { kw: 1, monthly_units_after: 152, saving_month: 1106.6 });
  assert.equal(r.rain.demand_litres_day, 6 * rules50());
  assert.ok(r.insights.some((i) => i.key === 'insight.cliff_over'));
  assert.ok(r.insights.some((i) => i.key === 'insight.water_days'));
  const noUnits = await (await post('/report', { roof: { polygon: poly } })).json();
  assert.equal(noUnits.cliff, null);
  assert.ok(noUnits.insights.some((i) => i.key === 'insight.default_units'));
  const campus = await (await post('/report', { roof: { polygon: rect(76.9043, 8.5441, 40, 30) }, building_use: 'public' })).json();
  assert.deepEqual(campus.sun.options, []);
  assert.equal(campus.cliff, null);
  assert.equal((await post('/report', { roof: { polygon: poly }, household: 0 })).status, 400);
});
function rules50() {
  return 50;
}

test('sun-plan over HTTP: appliances list and ToD', async () => {
  const ok = await (await post('/sun-plan', { lat: 8.3016, lon: 77.0917, kw: 5, monthly_units: 700, appliances: ['motor', 'ev_charger'] })).json();
  assert.equal(ok.plan.length, 2);
  assert.equal(ok.tod.applies, true);
  assert.equal((await post('/sun-plan', { lat: 8.3016, lon: 77.0917, kw: 5, monthly_units: 700, appliances: ['toaster'] })).status, 400);
  assert.equal((await post('/sun-plan', { lat: 8.3016, lon: 77.0917, kw: 5, monthly_units: 700, appliances: 'motor' })).status, 400);
});

test('impact: SDG numbers scale with adoption and carry the Kerala ceiling maths', async () => {
  const a = await (await fetch(base + '/impact?adoption=25')).json();
  const b = await (await fetch(base + '/impact?adoption=50')).json();
  assert.equal(a.schema, 'impact@1');
  assert.ok(Math.abs(b.total.units_year - 2 * a.total.units_year) <= 2);
  assert.ok(a.total.homes_adopting > 0 && a.sdg[7].kwh_year === a.total.units_year && a.sdg[13].co2_t_year === a.total.co2_t_year);
  assert.ok(a.wards.every((w) => w.homes_adopting <= w.homes_total));
  assert.equal(a.kerala_ceiling.mw_if_4_hours, 168.5);
  assert.equal(a.kerala_ceiling.mw_if_5_hours, 134.8);
  const zero = await (await fetch(base + '/impact?adoption=0')).json();
  assert.equal(zero.total.units_year, 0);
  assert.equal((await fetch(base + '/impact?adoption=150')).status, 400);
  assert.equal((await fetch(base + '/impact?adoption=abc')).status, 400);
  assert.equal((await (await fetch(base + '/kerala-ceiling')).json()).kwh_moved_per_day, 674000);
});

test('ward summary: typical roof score and adoption scenarios', async () => {
  const w = await (await fetch(base + '/wards/' + loadAreas().find((x) => x.kind === 'home').ward_id)).json();
  assert.ok(w.typical_roof.score >= 0 && w.typical_roof.score <= 100 && w.typical_roof.tank_litres > 0);
  assert.deepEqual(w.scenarios.map((s) => s.adoption_pct), [10, 25, 50, 100]);
  assert.equal(w.scenarios[3].homes, w.roofs);
  assert.ok(Math.abs(w.scenarios[3].kw - w.potential.kw) < 0.2);
  assert.ok(w.scenarios[1].units_year < w.scenarios[2].units_year);
});

test('roof without an outline: a point and an area', async () => {
  const r = await (await post('/report', { roof: { point: [77.0917, 8.3016], area_m2: 100 }, units: 262 })).json();
  assert.equal(r.roof.area_m2, 100);
  assert.equal(r.sun.kw_max, 5);
  assert.ok(r.roof.id.startsWith('point:'));
  assert.equal((await post('/report', { roof: { point: [77.0917, 8.3016], area_m2: 3 } })).status, 400);
  assert.equal((await post('/report', { roof: { point: [77.0917], area_m2: 100 } })).status, 400);
  assert.equal((await post('/report', { roof: { area_m2: 100 } })).status, 400);
});

test('compat: the first frontend prototype payload works at /api/v1/roof/calculate', async () => {
  const root = base.replace('/api/engine', '');
  const body = {
    coordinates: rect(77.0917, 8.3016, 10, 12).map(([lng, lat]) => ({ lat, lng })),
    roofType: 'flat_concrete', shadeLevel: 'low', monthlyElectricityConsumptionKwh: 262,
  };
  const res = await fetch(root + '/api/v1/roof/calculate', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' }, body: JSON.stringify(body) });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
  const r = await res.json();
  for (const k of ['calculationId', 'solar', 'financial', 'rainwater', 'roofScore', 'disclaimer']) assert.ok(r[k], k);
  assert.ok(r.solar.estimatedCapacityKw > 0 && r.solar.panelCount >= 3 && r.solar.annualGenerationKwh > 2000);
  assert.ok(r.financial.annualSavingsInr > 10000 && r.financial.paybackYears > 0 && r.financial.netInvestmentInr > 0);
  assert.ok(r.rainwater.recommendedTankCapacityLiters > 0 && r.rainwater.drySeasonBufferDays > 0);
  assert.ok(['A', 'B', 'C', 'D'].includes(r.roofScore.grade));
  assert.equal(r.engine.schema, 'roof-report@1');
  const tuple = await fetch(root + '/api/v1/roof/calculate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, coordinates: body.coordinates.map((p) => [p.lat, p.lng]), roofType: 'metal_sheet', shadeLevel: 'high' }) });
  assert.equal(tuple.status, 200);
  assert.equal((await fetch(root + '/api/v1/roof/calculate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, roofType: 'thatch' }) })).status, 400);
  assert.equal((await fetch(root + '/api/v1/roof/calculate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coordinates: [] }) })).status, 400);
});
