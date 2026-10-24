// Regenerates ../contracts/*.sample.json from the REAL engine, so the samples can never drift from the code.
// Usage: npm run samples   (needs data/cache; run npm run fetch first)
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ENGINE_ROOT, loadRules } from '../src/rules.js';
import { today } from '../src/clock.js';
import { loadAreas, publicArea, roofsFeatureCollection } from '../src/data.js';
import { parseReportInput, parseBillInput } from '../src/validate.js';
import { buildReport, buildBill } from '../src/services.js';
import { buildWard } from '../src/wards.js';
import { buildSunPlan } from '../src/sunplan.js';
import { buildToday } from '../src/today.js';
import { checkScan } from '../src/billcheck.js';
import { buildImpact } from '../src/impact.js';

process.env.OFFLINE = '1';
const rules = loadRules();
const date = today();
const out = join(ENGINE_ROOT, '..', 'contracts');
const save = (name, obj) => writeFileSync(join(out, name), JSON.stringify(obj, null, 2) + '\n');

const areas = loadAreas();
const home = areas.find((a) => a.kind === 'home');
const campus = areas.find((a) => a.kind === 'public') ?? home;
const rect = (lon, lat, wM, hM) => {
  const dLat = hM / 110540;
  const dLon = wM / (111320 * Math.cos((lat * Math.PI) / 180));
  return [[lon, lat], [lon + dLon, lat], [lon + dLon, lat + dLat], [lon, lat + dLat]];
};

save('areas.sample.json', areas.map(publicArea));
const fc = roofsFeatureCollection(home.id);
const mid = fc.features.slice(0, 3);
save('roofs.sample.geojson', { type: 'FeatureCollection', features: mid.length ? mid : roofsFeatureCollection(campus.id).features.slice(0, 3) });
save('bill-result.sample.json', buildBill(rules, parseBillInput({ units: 262, period_months: 1, phase: '1ph' }), date));
save('roof-report.home.sample.json', await buildReport(rules, parseReportInput({ roof: { polygon: rect(home.center[0], home.center[1], 10, 12) }, roof_type: 'flat', shade: 'some', building_use: 'home', units: 262, period_months: 1, phase: '1ph' }), date));
save('roof-report.public.sample.json', await buildReport(rules, parseReportInput({ roof: { polygon: rect(campus.center[0], campus.center[1], 40, 30) }, roof_type: 'flat', shade: 'little', building_use: 'public', phase: '3ph' }), date));
save('ward-summary.sample.json', buildWard(rules, home.ward_id));
save('sun-plan.sample.json', buildSunPlan(rules, { lat: home.center[1], lon: home.center[0], kw: 2.5, monthly_units: 262, date: null }, date));
save('today.sample.json', buildToday(rules, { lat: home.center[1], lon: home.center[0], area_m2: 120, kw: 2.5 }, date));
save('bill-check.sample.json', checkScan(rules, JSON.parse(readFileSync(join(out, 'bill-scan.sample.json'), 'utf8')), date));
save('sun-plan.tod.sample.json', buildSunPlan(rules, { lat: home.center[1], lon: home.center[0], kw: 5, monthly_units: 620, date: null, appliances: ['motor', 'washing_machine', 'iron', 'ev_charger'] }, date));
save('impact.sample.json', buildImpact(rules, 25));
console.log('samples written to ' + out + ' (date ' + date + ')');
