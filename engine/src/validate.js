// Request validation for the HTTP layer. Returns clean values or throws ApiError (400/404).
import { polygonAreaM2, centroid, validatePolygon } from './geo.js';
import { roofById } from './data.js';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const oneOf = (name, rawValue, allowed, fallback) => {
  if (rawValue === undefined || rawValue === null) return fallback;
  // Forms send numbers as strings ("2"): accept them for numeric enums.
  const value = typeof rawValue === 'string' && allowed.every((a) => typeof a === 'number') && rawValue.trim() !== '' ? Number(rawValue) : rawValue;
  if (!allowed.includes(value)) throw new ApiError(400, 'bad_input', name + ' must be one of: ' + allowed.join(', '), [name]);
  return value;
};

const unitsOrNull = (v, required) => {
  if (v === undefined || v === null || v === '') {
    if (required) throw new ApiError(400, 'bad_input', 'units is required', ['units']);
    return null;
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100000 || (!required && n === 0)) throw new ApiError(400, 'bad_input', 'units must be a number from ' + (required ? '0' : '1') + ' to 100000', ['units']);
  return n;
};

const hashId = (ring) => {
  let h = 5381;
  for (const c of JSON.stringify(ring.map((p) => [Math.round(p[0] * 1e6), Math.round(p[1] * 1e6)]))) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
  return 'drawn:' + h.toString(36);
};

function parseRoof(roof) {
  if (!roof || typeof roof !== 'object') throw new ApiError(400, 'bad_input', 'roof is required: send roof.id or roof.polygon', ['roof']);
  if (roof.polygon) {
    const bad = validatePolygon(roof.polygon);
    if (bad) throw new ApiError(400, 'bad_roof', bad, ['roof.polygon']);
    return { id: roof.id ?? hashId(roof.polygon), area_m2: Math.round(polygonAreaM2(roof.polygon) * 10) / 10, centroid: centroid(roof.polygon) };
  }
  if (roof.point !== undefined || roof.area_m2 !== undefined) {
    // "My roof is about 100 m2, here": no outline needed.
    const p = roof.point;
    if (!Array.isArray(p) || p.length !== 2) throw new ApiError(400, 'bad_roof', 'roof.point must be [lon, lat] when roof.area_m2 is given', ['roof.point']);
    const lon = num('roof.point[0]', p[0], 60, 100);
    const lat = num('roof.point[1]', p[1], 0, 40);
    const area = num('roof.area_m2', roof.area_m2, 8, 20000);
    return { id: roof.id ?? 'point:' + hashId([[lon, lat], [area, 0]]).slice(6), area_m2: Math.round(area * 10) / 10, centroid: [lon, lat] };
  }
  if (roof.id) {
    const hit = roofById(String(roof.id));
    if (!hit) throw new ApiError(404, 'roof_not_found', 'no roof with id ' + roof.id, ['roof.id']);
    return { id: hit.feature.properties.id, area_m2: hit.feature.properties.area_m2, centroid: hit.feature.properties.centroid };
  }
  throw new ApiError(400, 'bad_input', 'send roof.id or roof.polygon', ['roof']);
}

export function parseReportInput(body = {}) {
  return {
    roof: parseRoof(body.roof),
    roof_type: oneOf('roof_type', body.roof_type, ['flat', 'sloped'], 'flat'),
    shade: oneOf('shade', body.shade, ['little', 'some', 'a_lot'], 'some'),
    building_use: oneOf('building_use', body.building_use, ['home', 'public'], 'home'),
    units: unitsOrNull(body.units, false),
    period_months: oneOf('period_months', body.period_months, [1, 2], 1),
    phase: oneOf('phase', body.phase, ['1ph', '3ph'], '1ph'),
    household: body.household === undefined || body.household === null ? null : Math.round(num('household', body.household, 1, 30)),
  };
}

export function parseBillInput(body = {}) {
  return {
    units: unitsOrNull(body.units, true),
    period_months: oneOf('period_months', body.period_months, [1, 2], 1),
    phase: oneOf('phase', body.phase, ['1ph', '3ph'], '1ph'),
  };
}

const num = (name, v, min, max) => {
  const n = Number(v);
  if (v === undefined || v === null || v === '' || !Number.isFinite(n) || n < min || n > max) {
    throw new ApiError(400, 'bad_input', name + ' must be a number from ' + min + ' to ' + max, [name]);
  }
  return n;
};

export function parseSunPlanInput(body = {}) {
  const date = body.date ?? null;
  if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw new ApiError(400, 'bad_input', 'date must be YYYY-MM-DD', ['date']);
  return {
    lat: num('lat', body.lat, 0, 40),
    lon: num('lon', body.lon, 60, 100),
    kw: num('kw', body.kw, 0.5, 500),
    monthly_units: num('monthly_units', body.monthly_units, 1, 100000),
    date,
    appliances: parseAppliances(body.appliances),
  };
}

export function parseTodayInput(q = {}) {
  return {
    lat: num('lat', q.lat, 0, 40),
    lon: num('lon', q.lon, 60, 100),
    area_m2: num('area_m2', q.area_m2, 8, 20000),
    kw: num('kw', q.kw, 0, 500),
  };
}

export function parseScanInput(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'bad_input', 'send the scanned bill fields as a JSON object', []);
  return body;
}

function parseAppliances(a) {
  if (a === undefined || a === null) return null;
  if (!Array.isArray(a) || a.length === 0 || a.length > 6 || a.some((x) => typeof x !== 'string')) {
    throw new ApiError(400, 'bad_input', 'appliances must be a list of 1 to 6 appliance ids', ['appliances']);
  }
  return [...new Set(a)];
}
