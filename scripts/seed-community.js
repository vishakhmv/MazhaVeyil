// Seeds the demo wards and one Koottam campaign per ward into Kishan's community database, using HIS db.js (no code of his is touched).
// Safe to run any number of times: wards and campaigns are inserted once, ward potential is refreshed from the engine every run.
// Ward ids come from the engine (campus-w1, pozhiyoor-w1, town-w1) so the Roof Report, Koottam and the Atlas all talk about the same wards.
// Campaign id convention: "c_" + area id (c_pozhiyoor). Usage: node scripts/seed-community.js   (npm run seed at the repo root)
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// his .env may point DATABASE_PATH somewhere: honour it without needing dotenv here
const envFile = join(ROOT, 'community', '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*(DATABASE_PATH)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const { getDb, closeDatabase } = await import('../community/src/db.js');
const { loadRules } = await import('../engine/src/rules.js');
const { loadAreas } = await import('../engine/src/data.js');
const { buildWard } = await import('../engine/src/wards.js');
const { roofsFeatureCollection } = await import('../engine/src/data.js');

const rules = loadRules();
const db = getDb();
const now = new Date();
const days = Number(process.env.KOOTTAM_DAYS || 60);
const target = Number(process.env.KOOTTAM_TARGET || 25);
const closes = new Date(now.getTime() + days * 86400000);

let wards = 0;
let campaigns = 0;
for (const a of loadAreas()) {
  const w = buildWard(rules, a.id);
  const mapped = roofsFeatureCollection(a.id, 100000).features.length;
  const ins = db.prepare('INSERT OR IGNORE INTO wards (id, name, panchayat, district, lat, lng, homes_estimated) VALUES (?, ?, ?, ?, ?, ?, ?)').run(a.ward_id, a.name.en, a.name.en, 'Thiruvananthapuram', a.center[1], a.center[0], w.roofs);
  wards += Number(ins.changes);
  db.prepare('INSERT OR REPLACE INTO ward_potential (ward_id, roofs_mapped, potential_kw, avg_roof_score, data_quality, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(a.ward_id, mapped, w.potential.kw, w.typical_roof.score, 'cached+modelled', now.toISOString());
  const c = db.prepare('INSERT OR IGNORE INTO campaigns (id, ward_id, title, target_homes, tiers_json, opens_at, closes_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run('c_' + a.id, a.ward_id, a.name.en + ' Koottam', target, JSON.stringify([10, target, 50]), now.toISOString(), closes.toISOString(), 'open');
  campaigns += Number(c.changes);
}
const total = db.prepare('SELECT (SELECT COUNT(*) FROM wards) AS w, (SELECT COUNT(*) FROM campaigns) AS c, (SELECT COUNT(*) FROM pledges) AS p').get();
console.log('[seed] community database: ' + wards + ' new wards, ' + campaigns + ' new campaigns (now ' + total.w + ' wards, ' + total.c + ' campaigns, ' + total.p + ' pledges)');
closeDatabase();
