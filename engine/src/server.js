// MazhaVeyil engine HTTP API (contract: ../CONTRACT.md). Runs offline from cached data; needs no keys.
import express from 'express';
import cors from 'cors';
import { pathToFileURL } from 'node:url';
import { loadRules } from './rules.js';
import { today } from './clock.js';
import { loadAreas, publicArea, roofsFeatureCollection, roofAt, areaData, roofById } from './data.js';
import { ApiError, parseReportInput, parseBillInput, parseSunPlanInput, parseTodayInput, parseScanInput } from './validate.js';
import { buildReport, buildBill } from './services.js';
import { buildWard, wardIds } from './wards.js';
import { buildSunPlan } from './sunplan.js';
import { buildToday } from './today.js';
import { checkScan } from './billcheck.js';
import { buildImpact, keralaCeiling } from './impact.js';
import { legacyCalculate } from './compat.js';

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

// Fail at start-up, not mid-demo, if the rules file is missing something the engine needs.
export function assertRules(rules) {
  const need = [
    ['tariffs[0]', rules.tariffs?.[0]], ['pm_surya_ghar.cap', rules.pm_surya_ghar?.cap], ['net_metering.surplus_rate_new', rules.net_metering?.surplus_rate_new],
    ['solar.performance_ratio', rules.solar?.performance_ratio], ['rain.runoff', rules.rain?.runoff], ['co2.kg_per_kwh', rules.co2?.kg_per_kwh],
    ['home_defaults.monthly_units', rules.home_defaults?.monthly_units], ['ward.usable_share', rules.ward?.usable_share],
  ];
  const missing = need.filter(([, v]) => v === undefined || v === null).map(([k]) => k);
  if (missing.length) throw new Error('rules.json is missing: ' + missing.join(', '));
}

export function createApp(rules = loadRules()) {
  assertRules(rules);
  const app = express();
  // origin: true reflects the caller's origin, so browsers accept credentialed requests (axios withCredentials) from the Vite app.
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use((req, res, next) => {
    const t = process.hrtime.bigint();
    res.on('finish', () => {
      if (!process.env.QUIET) console.log('[engine] ' + req.method + ' ' + req.originalUrl.split('?')[0] + ' ' + res.statusCode + ' ' + Number((process.hrtime.bigint() - t) / 1000000n) + 'ms');
    });
    next();
  });

  const r = express.Router();
  r.get('/health', (req, res) =>
    res.json({ ok: true, version: '1.0.0', rules_checked_on: rules.checked_on, today: today(), offline: process.env.OFFLINE === '1', areas: loadAreas().map((a) => a.id) }),
  );
  r.get('/rules', (req, res) => res.json(rules));
  r.get('/areas', (req, res) => res.json(loadAreas().map(publicArea)));

  r.get('/roofs', (req, res) => {
    const area = loadAreas().find((a) => a.id === req.query.area);
    if (!area) throw new ApiError(404, 'area_not_found', 'unknown area; ask /api/engine/areas for the ids');
    res.json(roofsFeatureCollection(area.id));
  });
  r.get('/roofs/at', (req, res) => {
    const lon = Number(req.query.lon);
    const lat = Number(req.query.lat);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) throw new ApiError(400, 'bad_input', 'lon and lat are required numbers', ['lon', 'lat']);
    const f = roofAt(lon, lat);
    if (!f) throw new ApiError(404, 'roof_not_found', 'no mapped roof here: draw it instead');
    res.json({ type: 'Feature', id: f.properties.id, properties: { id: f.properties.id, area_m2: f.properties.area_m2 }, geometry: f.geometry });
  });

  r.post('/report', wrap(async (req, res) => res.json(await buildReport(rules, parseReportInput(req.body), today()))));
  r.post('/bill', (req, res) => res.json(buildBill(rules, parseBillInput(req.body), today())));

  r.post('/bill/check', (req, res) => res.json(checkScan(rules, parseScanInput(req.body), today())));
  r.get('/today', (req, res) => res.json(buildToday(rules, parseTodayInput(req.query), today())));

  r.get('/impact', (req, res) => {
    const pct = req.query.adoption === undefined ? 25 : Number(req.query.adoption);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw new ApiError(400, 'bad_input', 'adoption must be a number from 0 to 100', ['adoption']);
    res.json(buildImpact(rules, pct));
  });
  r.get('/kerala-ceiling', (req, res) => res.json(keralaCeiling(rules)));

  r.get('/wards', (req, res) => res.json(wardIds().map((id) => buildWard(rules, id))));
  r.get('/wards/:id', (req, res) => {
    const w = buildWard(rules, req.params.id);
    if (!w) throw new ApiError(404, 'ward_not_found', 'unknown ward; try ' + wardIds().join(', '));
    res.json(w);
  });

  r.post('/sun-plan', (req, res) => res.json(buildSunPlan(rules, parseSunPlanInput(req.body), today())));

  r.use((req, res) => res.status(404).json({ error: { code: 'not_found', message: 'no such engine route' } }));
  app.use('/api/engine', r);

  // Compatibility for the first web prototype (see src/compat.js).
  app.post('/api/v1/roof/calculate', wrap(async (req, res) => res.json(await legacyCalculate(rules, req.body, today()))));

  app.use((err, req, res, next) => {
    if (err instanceof ApiError) return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details ?? [] } });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'bad_json', message: 'request body is not valid JSON', details: [] } });
    if (err.type === 'entity.too.large') return res.status(400).json({ error: { code: 'too_large', message: 'request body is too large', details: [] } });
    console.error(err);
    return res.status(500).json({ error: { code: 'internal', message: 'something went wrong in the engine', details: [] } });
  });
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.ENGINE_PORT || 8081);
  // Warm everything up so the first click on stage is as fast as the hundredth.
  for (const a of loadAreas()) areaData(a.id);
  roofById('warm-up');
  createApp().listen(port, '0.0.0.0', () => {
    const areas = loadAreas();
    console.log('MazhaVeyil engine on http://0.0.0.0:' + port + '/api/engine  (rules checked ' + loadRules().checked_on + ', offline=' + (process.env.OFFLINE === '1') + ')');
    console.log('areas: ' + areas.map((a) => a.id + (a.cached ? '' : ' (NO CACHE: run npm run fetch)')).join(', '));
  });
}
