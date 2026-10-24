// Node-only data layer: demo areas, cached sun/rain/roofs, roof lookup, and the data fallback chain.
// Order: cached area within 10 km -> live fetch (2 s limit, skipped when OFFLINE=1) -> nearest cached area -> typical Kerala values.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENGINE_ROOT } from './rules.js';
import { distanceKm, pointInPolygon, inBbox } from './geo.js';
import { typicalRainSeries } from './rain.js';

const CACHE = join(ENGINE_ROOT, 'data', 'cache');
const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
const NEAR_KM = 10;
const LIVE_TIMEOUT_MS = 2000;

let areasMemo = null;
const areaDataMemo = new Map();
let roofIndex = null;
const liveMemo = new Map();
let typicalMemo = null;

export function loadAreas() {
  if (areasMemo) return areasMemo;
  const cfg = readJson(join(ENGINE_ROOT, 'data', 'areas.json')) ?? [];
  areasMemo = cfg
    .map((a) => {
      const meta = readJson(join(CACHE, a.id, 'meta.json'));
      const center = a.center ?? meta?.center ?? null;
      const bbox = a.bbox ?? meta?.bbox ?? null;
      return {
        id: a.id,
        name: a.name,
        center,
        zoom: a.zoom ?? 18,
        bbox,
        kind: a.kind ?? 'home',
        ward_id: a.id + '-w1',
        homes_in_ward: a.homes_in_ward ?? null,
        homes_note: a.homes_note ?? null,
        cached: existsSync(join(CACHE, a.id, 'sun.json')) && existsSync(join(CACHE, a.id, 'rain.json')),
      };
    })
    .filter((a) => a.center && a.bbox);
  return areasMemo;
}

export const publicArea = (a) => ({ id: a.id, name: a.name, center: a.center, zoom: a.zoom, bbox: a.bbox, kind: a.kind, ward_id: a.ward_id });

export function areaData(id) {
  if (!areaDataMemo.has(id)) {
    const dir = join(CACHE, id);
    areaDataMemo.set(id, {
      sun: readJson(join(dir, 'sun.json')),
      rain: readJson(join(dir, 'rain.json')),
      roofs: readJson(join(dir, 'roofs.geojson')) ?? { type: 'FeatureCollection', features: [] },
      forecast: readJson(join(dir, 'forecast.json')),
    });
  }
  return areaDataMemo.get(id);
}

function buildRoofIndex() {
  roofIndex = new Map();
  for (const a of loadAreas()) for (const f of areaData(a.id).roofs.features) roofIndex.set(f.properties.id, { feature: f, areaId: a.id });
}

export function roofById(id) {
  if (!roofIndex) buildRoofIndex();
  return roofIndex.get(id) ?? null;
}

// Roofs for the map: ids and areas only, biggest first, capped so the response stays small.
export function roofsFeatureCollection(areaId, cap = 2000) {
  const feats = [...areaData(areaId).roofs.features].sort((a, b) => b.properties.area_m2 - a.properties.area_m2).slice(0, cap);
  return {
    type: 'FeatureCollection',
    features: feats.map((f) => ({ type: 'Feature', id: f.properties.id, properties: { id: f.properties.id, area_m2: f.properties.area_m2 }, geometry: f.geometry })),
  };
}

// The smallest roof containing the point, else the nearest roof centroid within 20 m.
export function roofAt(lon, lat) {
  let best = null;
  let nearest = null;
  for (const a of loadAreas()) {
    if (!inBbox([lon, lat], [a.bbox[0] - 0.001, a.bbox[1] - 0.001, a.bbox[2] + 0.001, a.bbox[3] + 0.001])) continue;
    for (const f of areaData(a.id).roofs.features) {
      if (pointInPolygon([lon, lat], f.geometry.coordinates[0])) {
        if (!best || f.properties.area_m2 < best.properties.area_m2) best = f;
      } else {
        const d = distanceKm([lon, lat], f.properties.centroid) * 1000;
        if (d <= 20 && (!nearest || d < nearest.d)) nearest = { f, d };
      }
    }
  }
  return best ?? nearest?.f ?? null;
}

async function liveFetch(lon, lat) {
  const signal = AbortSignal.timeout(LIVE_TIMEOUT_MS);
  const sunUrl = 'https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=' + lon + '&latitude=' + lat + '&format=JSON';
  const rainUrl = 'https://archive-api.open-meteo.com/v1/archive?latitude=' + lat + '&longitude=' + lon + '&start_date=2016-01-01&end_date=2025-12-31&daily=precipitation_sum&timezone=Asia%2FKolkata';
  const [s, r] = await Promise.all([fetch(sunUrl, { signal }).then((x) => x.json()), fetch(rainUrl, { signal }).then((x) => x.json())]);
  const p = s.properties.parameter.ALLSKY_SFC_SW_DWN;
  const ghi = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map((m) => p[m]);
  return { ghi, rainStart: r.daily.time[0], rainMm: r.daily.precipitation_sum.map((v) => v ?? 0) };
}

// Sun + 10 years of daily rain for a point, with an honest quality flag.
export async function dataFor(lon, lat, rules) {
  const areas = loadAreas().filter((a) => a.cached);
  const ranked = areas.map((a) => ({ a, km: distanceKm([lon, lat], a.center) })).sort((x, y) => x.km - y.km);
  const fromArea = (a, quality) => {
    const d = areaData(a.id);
    return { ghi: d.sun.ghi, rainStart: d.rain.start, rainMm: d.rain.mm, quality, area: a.id };
  };
  if (ranked.length && ranked[0].km <= NEAR_KM) return fromArea(ranked[0].a, 'cached');
  if (process.env.OFFLINE !== '1') {
    const key = lat.toFixed(1) + ',' + lon.toFixed(1);
    if (liveMemo.has(key)) return liveMemo.get(key);
    try {
      const live = { ...(await liveFetch(lon, lat)), quality: 'live', area: null };
      liveMemo.set(key, live);
      return live;
    } catch {
      /* offline or slow: fall through to the nearest cached area */
    }
  }
  if (ranked.length) return fromArea(ranked[0].a, 'nearest-area');
  typicalMemo ??= typicalRainSeries(rules);
  return { ghi: rules.typical_kerala.ghi_kwh_m2_day, rainStart: '2016-01-01', rainMm: typicalMemo, quality: 'typical', area: null };
}
