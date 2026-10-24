// Fails if any UI string is missing in English or Malayalam, if placeholders differ, or if a key used in the code has no string.
// Usage: npm run check:i18n
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import en from '../src/i18n/ui.en.js';
import ml from '../src/i18n/ui.ml.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const flatten = (o, p = '', out = {}) => { for (const [k, v] of Object.entries(o)) { if (k.startsWith('_')) continue; if (v && typeof v === 'object') flatten(v, p + k + '.', out); else out[p + k] = v; } return out; };
const engEn = flatten(JSON.parse(readFileSync(join(root, '..', 'contracts', 'strings.en.json'), 'utf8')));
const engMl = flatten(JSON.parse(readFileSync(join(root, '..', 'contracts', 'strings.ml.json'), 'utf8')));
const EN = { ...engEn, ...en };
const ML = { ...engMl, ...ml };
const holes = (s) => [...String(s).matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)].map((m) => m[1]).sort().join(',');
const problems = [];

for (const k of Object.keys(EN)) if (!(k in ML)) problems.push('missing in Malayalam: ' + k);
for (const k of Object.keys(ML)) if (!(k in EN)) problems.push('missing in English: ' + k);
for (const k of Object.keys(EN)) if (k in ML && holes(EN[k]) !== holes(ML[k])) problems.push('placeholders differ: ' + k + ' [' + holes(EN[k]) + '] vs [' + holes(ML[k]) + ']');
for (const k of Object.keys(ml)) if (!/[ഀ-ൿ]/.test(ml[k])) problems.push('no Malayalam script (check it is intended): ' + k);

// every literal t('key') in the source
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.jsx?$/.test(f)) files.push(p); } };
walk(join(root, 'src'));
const used = new Set();
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)) if (!m[1].endsWith('.') && !m[1].endsWith('_')) used.add(m[1]);
  for (const m of src.matchAll(/(?:key|k): '([a-z]+\.[a-zA-Z0-9_.]+)'/g)) used.add(m[1]); // nav items etc.
}
// keys built at run time
const fam = (prefix, names, suffixes = ['']) => names.flatMap((n) => suffixes.map((s) => prefix + n + s));
for (const k of [
  ...fam('feat.', ['find', 'cliff', 'scan', 'veyil', 'today', 'koottam', 'atlas'], ['_title', '_body']),
  ...fam('home.t', ['1', '2', '3', '4'], ['_title', '_body']),
  ...fam('koottam.live_', ['connecting', 'live', 'polling']),
  ...fam('koottam.status_', ['open', 'target_reached', 'quotes_open', 'expired', 'closed']),
  ...fam('koottam.part_', ['gravity_filter_kit', 'storage_tank_1000L', 'well_recharge_ring', 'installation_labour']),
  ...fam('scan.confidence_', ['high', 'medium', 'low']),
  ...fam('atlas.sdg_name_', ['7', '6', '11', '13']),
  ...fam('roof.type.', ['flat', 'sloped']), ...fam('roof.shade.', ['little', 'some', 'a_lot']), ...fam('use.', ['home', 'public']),
  ...fam('band.', ['starting', 'good', 'strong']), ...fam('option.', ['smaller', 'recommended', 'larger']),
  ...fam('appliance.', ['motor', 'washing_machine', 'iron', 'ev_charger']),
  ...fam('quality.data.', ['cached', 'live', 'nearest-area', 'typical', 'forecast', 'forecast-stale']), ...fam('quality.units.', ['typed', 'default']),
  ...fam('safety.', ['non_drinking_use', 'treat_before_drinking', 'mesh_on_tank']),
  ...fam('as.', ['sun_data', 'rain_data', 'performance_ratio', 'usable_roof_share', 'shade_factor', 'cost_per_kw', 'rain_runoff', 'water_demand_litres_day', 'co2_kg_per_kwh', 'pm_surya_ghar', 'surplus_rate', 'savings_basis', 'net_metering_above_3kw', 'default_units']),
]) used.add(k);
for (const k of used) { if (!(k in EN)) problems.push('used in code but missing in English: ' + k); if (!(k in ML)) problems.push('used in code but missing in Malayalam: ' + k); }

console.log('UI strings: ' + Object.keys(en).length + ' English, ' + Object.keys(ml).length + ' Malayalam; ' + used.size + ' keys used in code.');
if (problems.length) { console.log('\nPROBLEMS (' + problems.length + '):\n- ' + problems.join('\n- ')); process.exit(1); }
console.log('All keys present in both languages with matching placeholders.');
