// Golden Path check against the RUNNING services: run it before every rehearsal and on event morning.
// Usage: npm run check                         (engine on :8081)
//        npm run check -- --web http://localhost:8080 --community http://localhost:3001   (also checks the web routing and Kishan's community service)
// Pass criteria: every call answers with the agreed shape in under 1.5 s. For the offline proof: switch Wi-Fi off and run it again.
const arg = (name, fallback) => {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const engine = arg('engine', 'http://localhost:8081') + '/api/engine';
const web = arg('web', null);
const community = arg('community', null);
const LIMIT_MS = 1500;
let failed = 0;

async function step(name, fn) {
  const t = Date.now();
  try {
    const note = await fn();
    const ms = Date.now() - t;
    const slow = ms > LIMIT_MS;
    if (slow) failed++;
    console.log('  ' + (slow ? '✘' : '✔') + '  ' + name.padEnd(46) + String(ms).padStart(5) + ' ms  ' + (note ?? '') + (slow ? '  TOO SLOW' : ''));
  } catch (e) {
    failed++;
    console.log('  ✘  ' + name.padEnd(46) + '       ' + e.message);
  }
}
const need = (cond, msg) => { if (!cond) throw new Error(msg); };
const get = async (url) => { const r = await fetch(url, { signal: AbortSignal.timeout(5000) }); need(r.ok, 'HTTP ' + r.status + ' for ' + url); return r.json(); };
const post = async (url, body) => { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) }); need(r.ok, 'HTTP ' + r.status + ' for ' + url); return r.json(); };
const rect = (lon, lat, wM, hM) => {
  const dLat = hM / 110540;
  const dLon = wM / (111320 * Math.cos((lat * Math.PI) / 180));
  return [[lon, lat], [lon + dLon, lat], [lon + dLon, lat + dLat], [lon, lat + dLat]];
};

console.log('\nGolden Path check: ' + engine + '\n');
let areas = [];
await step('health', async () => { const h = await get(engine + '/health'); need(h.ok, 'not ok'); areas = await get(engine + '/areas'); need(areas.length > 0, 'no areas'); return 'rules ' + h.rules_checked_on + ', ' + areas.length + ' areas, offline=' + h.offline; });

for (const a of areas) {
  await step('[' + a.id + '] roofs on the map', async () => { const fc = await get(engine + '/roofs?area=' + a.id); need(fc.type === 'FeatureCollection', 'not GeoJSON'); return fc.features.length + ' roofs'; });
  await step('[' + a.id + '] roof report', async () => {
    const isHome = a.kind === 'home';
    const r = await post(engine + '/report', { roof: { polygon: rect(a.center[0], a.center[1], isHome ? 10 : 40, isHome ? 12 : 30) }, building_use: a.kind, units: isHome ? 262 : undefined });
    need(r.schema === 'roof-report@1' && r.score.score >= 0 && r.sun.units_month.length === 12 && r.rain.tank_curve.length > 0, 'bad report shape');
    need(isHome ? r.money !== null : r.money === null, 'money card rule broken');
    return 'Roof Score ' + r.score.score + ', ' + r.sun.kw_recommended + ' kW, data ' + r.quality.data;
  });
  await step('[' + a.id + '] ward summary', async () => { const w = await get(engine + '/wards/' + a.ward_id); need(w.schema === 'ward-summary@1' && w.roofs > 0, 'bad ward'); return w.roofs + ' homes, ' + w.potential.kw + ' kW'; });
}
await step('cliff meter: 262 units', async () => { const b = await post(engine + '/bill', { units: 262, period_months: 1, phase: '1ph' }); need(b.cliff.last.at === 250 && b.cliff.last.over_by === 12 && b.cliff.last.saving_if_under === 336, 'cliff numbers changed'); return '12 over 250, saves ₹' + b.cliff.last.saving_if_under; });
await step('cliff meter: 251 units = ₹1,694.25', async () => { const b = await post(engine + '/bill', { units: 251 }); need(b.bill.energy === 1694.25, 'got ' + b.bill.energy); });
const home = areas.find((a) => a.kind === 'home') ?? areas[0];
await step('Veyil Samayam', async () => { const p = await post(engine + '/sun-plan', { lat: home.center[1], lon: home.center[0], kw: 2.5, monthly_units: 262 }); need(p.plan.length === 3, 'no plan'); return p.plan.map((x) => x.appliance + ' ' + x.start).join(', ') + ' (' + p.quality.data + ')'; });
await step('Today on your roof', async () => { const t = await get(engine + '/today?lat=' + home.center[1] + '&lon=' + home.center[0] + '&area_m2=120&kw=2.5'); need(t.schema === 'today@1', 'bad shape'); return t.rain_litres_caught + ' L, ' + t.units_made + ' units (' + t.quality.data + ')'; });
await step('report extras: options, monthly bills, insights', async () => { const r = await post(engine + '/report', { roof: { polygon: rect(home.center[0], home.center[1], 10, 12) }, units: 262 }); need(r.sun.options.length >= 2 && r.money.bill_after_months.length === 12 && r.insights.length > 0 && r.cliff, 'report extras missing'); return r.sun.options.map((o) => o.kw + ' kW').join(' / ') + ', ' + r.insights.length + ' insights'; });
await step('impact at 25% adoption', async () => { const i = await get(engine + '/impact?adoption=25'); need(i.schema === 'impact@1' && i.total.units_year > 0 && i.kerala_ceiling.mw_if_4_hours > 0, 'bad impact'); return i.total.homes_adopting + ' homes, ' + i.total.kw + ' kW, ' + i.total.co2_t_year + ' t CO2'; });
await step('bill check', async () => { const c = await post(engine + '/bill/check', { units: 262, amount: 2100, period_months: 1 }); need(c.status === 'ok', 'status ' + c.status); });

if (web) {
  console.log('\nThrough the web app (proxy) ' + web + '\n');
  await step('web page loads', async () => { const r = await fetch(web, { signal: AbortSignal.timeout(5000) }); need(r.ok, 'HTTP ' + r.status); });
  await step('web routes /api/engine to the engine', async () => { const h = await get(web + '/api/engine/health'); need(h.ok, 'not ok'); });
  await step('web routes /api/v1 (compat) to the engine', async () => { const r = await post(web + '/api/v1/roof/calculate', { coordinates: rect(home.center[0], home.center[1], 10, 12).map(([lng, lat]) => ({ lat, lng })), roofType: 'flat_concrete', shadeLevel: 'low', monthlyElectricityConsumptionKwh: 262 }); need(r.solar && r.financial && r.roofScore, 'bad shape'); });
  await step('web routes /api/atlas to the community service', async () => { const a = await get(web + '/api/atlas/summary'); need(Array.isArray(a.wards), 'bad shape'); });
}
if (community) {
  console.log('\nCommunity service ' + community + '\n');
  await step('community: health', async () => { const h = await get(community + '/api/health'); need(h.status === 'ok', 'not ok'); return h.module; });
  await step('community: wards seeded (run npm run seed)', async () => { const a = await get(community + '/api/atlas/summary'); need(a.wards.length > 0, 'no wards: run npm run seed'); return a.wards.length + ' wards, ' + a.wards.reduce((s, w) => s + w.pledged_homes, 0) + ' pledged'; });
  await step('community: campaign + rain group price', async () => { const id = 'c_' + areas.find((a) => a.kind === 'home').id; const c = await get(community + '/api/campaigns/' + id); need(c.target_homes > 0 && Array.isArray(c.tiers), 'bad campaign'); const r = await get(community + '/api/rain-koottam/' + id); need(r.pricing && r.available_tiers.length > 0, 'no pricing'); return c.pledged_homes + '/' + c.target_homes + ' pledged'; });
  await step('community: bill samples', async () => { const s = await get(community + '/api/bill/samples'); need(s.samples.length > 0, 'no samples'); return s.samples.length + ' sample bills'; });
}

console.log('\n' + (failed ? '✘ ' + failed + ' check(s) FAILED' : '✔ all checks passed') + '\n');
process.exit(failed ? 1 : 0);
