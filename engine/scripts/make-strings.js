// Writes ../contracts/strings.en.json and strings.ml.json (nested for i18next) from strings-en.js and strings-ml.js.
// Usage: npm run strings
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENGINE_ROOT } from '../src/rules.js';
import en from './strings-en.js';
import ml from './strings-ml.js';

const nest = (flat, extra = {}) => {
  const root = { ...extra };
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let o = root;
    for (const p of parts.slice(0, -1)) o = o[p] ??= {};
    o[parts.at(-1)] = value;
  }
  return root;
};
const out = join(ENGINE_ROOT, '..', 'contracts');
writeFileSync(join(out, 'strings.en.json'), JSON.stringify(nest(en), null, 2) + '\n');
writeFileSync(join(out, 'strings.ml.json'), JSON.stringify(nest(ml, { _note: 'DRAFT Malayalam: have a native speaker check every line before the demo. Months in insight.dry_months arrive as numbers 1-12.' }), null, 2) + '\n');
const missing = Object.keys(en).filter((k) => !(k in ml));
console.log('wrote ' + Object.keys(en).length + ' English and ' + Object.keys(ml).length + ' Malayalam strings' + (missing.length ? '; MISSING in Malayalam: ' + missing.join(', ') : ''));
