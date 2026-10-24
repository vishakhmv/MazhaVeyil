// Writes data/wards/<ward_id>.json for Kishan's Atlas. Usage: npm run wards
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENGINE_ROOT, loadRules } from '../src/rules.js';
import { wardIds, buildWard } from '../src/wards.js';

const rules = loadRules();
const dir = join(ENGINE_ROOT, 'data', 'wards');
mkdirSync(dir, { recursive: true });
for (const id of wardIds()) {
  const w = buildWard(rules, id);
  writeFileSync(join(dir, id + '.json'), JSON.stringify(w, null, 2));
  console.log(id + ': ' + w.roofs + ' homes, ' + w.potential.kw + ' kW, ' + (w.potential.units_year / 1e6).toFixed(2) + ' GWh/yr, ' + (w.potential.litres_year / 1e7).toFixed(2) + ' crore L/yr, ' + w.potential.co2_t_year + ' t CO2');
}
