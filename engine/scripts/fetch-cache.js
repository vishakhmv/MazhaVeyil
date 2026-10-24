// One-time (online) fetch of everything the demo areas need, frozen into data/cache/<area>/.
// Usage: npm run fetch            (all areas)     npm run fetch -- pozhiyoor   (one area)
//        npm run forecast         (only the 3-day sun forecast, for event morning; keeps the rest of the cache)
// Sources: NASA POWER (sun), Open-Meteo archive + forecast (rain, hourly sun), OpenStreetMap via Overpass (roof outlines), Nominatim (geocode).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENGINE_ROOT } from '../src/rules.js';
import { polygonAreaM2, centroid } from '../src/geo.js';

const UA = 'MazhaVeyil-hackathon/1.0 (https://github.com/vishakhmv/MazhaVeyil)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const args = process.argv.slice(2);
const forecastOnly = args.includes('--forecast');
const only = args.find((a) => !a.startsWith('--'));
const areas = JSON.parse(readFileSync(join(ENGINE_ROOT, 'data', 'areas.json'), 'utf8')).filter((a) => !only || a.id === only);

async function getJson(url, opts = {}, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { ...opts, headers: { 'User-Agent': UA, ...(opts.headers || {}) }, signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) {
      if (i === tries) throw e;
      console.log('    retry ' + i + ' (' + e.message + ')');
      await sleep(2000 * i);
    }
  }
}

async function geocode(query) {
  const r = await getJson('https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(query) + '&format=json&limit=1&countrycodes=in');
  await sleep(1100); // Nominatim policy: max 1 request per second
  if (!r.length) throw new Error('no geocode result for "' + query + '"');
  return [Number(r[0].lon), Number(r[0].lat)];
}

async function overpassRoofs(bbox) {
  const [w, s, e, n] = bbox;
  const q = '[out:json][timeout:50];way["building"](' + [s, w, n, e].join(',') + ');out geom;';
  const j = await getJson('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(q),
  });
  const features = [];
  for (const el of j.elements || []) {
    if (el.type !== 'way' || !el.geometry || el.geometry.length < 4) continue;
    const ring = el.geometry.map((p) => [p.lon, p.lat]);
    const area = polygonAreaM2(ring);
    if (area < 8 || area > 20000) continue;
    const id = 'osm:way/' + el.id;
    features.push({
      type: 'Feature',
      id,
      properties: { id, area_m2: Math.round(area * 10) / 10, centroid: centroid(ring).map((v) => Math.round(v * 1e6) / 1e6) },
      geometry: { type: 'Polygon', coordinates: [ring] },
    });
  }
  return { type: 'FeatureCollection', features };
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

for (const a of areas) {
  const dir = join(ENGINE_ROOT, 'data', 'cache', a.id);
  mkdirSync(dir, { recursive: true });
  console.log('\n== ' + a.id);
  try {
    let meta = null;
    try { meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')); } catch { /* first run */ }
    const center = a.center || (forecastOnly && meta?.center) || (await geocode(a.query));
    const h = a.half_deg || 0.0045;
    const bbox = a.bbox || (forecastOnly && meta?.bbox) || [center[0] - h, center[1] - h, center[0] + h, center[1] + h];
    if (!forecastOnly) writeFileSync(join(dir, 'meta.json'), JSON.stringify({ center, bbox, fetched: new Date().toISOString() }, null, 1));
    console.log('  center ' + center + ' bbox ' + bbox.map((v) => v.toFixed(4)));
    const [lon, lat] = center;

    const jobs = {
      sun: async () => {
        const j = await getJson('https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=' + lon + '&latitude=' + lat + '&format=JSON');
        const p = j.properties.parameter.ALLSKY_SFC_SW_DWN;
        const ghi = MONTHS.map((m) => p[m]);
        writeFileSync(join(dir, 'sun.json'), JSON.stringify({ source: 'NASA POWER climatology ALLSKY_SFC_SW_DWN (kWh/m2/day)', lat, lon, ghi }, null, 1));
        return 'ghi avg ' + (ghi.reduce((s, v) => s + v, 0) / 12).toFixed(2);
      },
      rain: async () => {
        const j = await getJson('https://archive-api.open-meteo.com/v1/archive?latitude=' + lat + '&longitude=' + lon + '&start_date=2016-01-01&end_date=2025-12-31&daily=precipitation_sum&timezone=Asia%2FKolkata');
        const mm = j.daily.precipitation_sum.map((v) => v ?? 0);
        writeFileSync(join(dir, 'rain.json'), JSON.stringify({ source: 'Open-Meteo archive precipitation_sum (mm/day), 2016-2025', start: j.daily.time[0], lat, lon, mm }));
        return mm.length + ' days, ' + Math.round(mm.reduce((s, v) => s + v, 0) / 10) + ' mm/yr';
      },
      forecast: async () => {
        const j = await getJson('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&hourly=shortwave_radiation,cloud_cover&daily=precipitation_sum,sunrise,sunset&forecast_days=3&timezone=Asia%2FKolkata');
        writeFileSync(join(dir, 'forecast.json'), JSON.stringify({ source: 'Open-Meteo forecast', fetched: new Date().toISOString(), lat, lon, hourly: j.hourly, daily: j.daily }));
        return j.hourly.time.length + ' hours';
      },
      roofs: async () => {
        const fc = await overpassRoofs(bbox);
        writeFileSync(join(dir, 'roofs.geojson'), JSON.stringify(fc));
        return fc.features.length + ' roofs';
      },
    };
    for (const [name, fn] of Object.entries(jobs)) {
      if (forecastOnly && name !== 'forecast') continue;
      try { console.log('  ' + name + ': ' + (await fn())); } catch (e) { console.log('  ' + name + ': FAILED (' + e.message + ')'); }
    }
  } catch (e) {
    console.log('  ' + a.id + ': FAILED (' + e.message + ')');
  }
}
console.log('\ndone');
