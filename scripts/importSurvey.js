import fs from 'node:fs';
import { getDb, initDatabase, closeDatabase } from '../community/src/db.js';
import crypto from 'node:crypto';

/**
 * Imports survey responses from CSV into the survey_responses table.
 * PRIVACY RULE: Never stores names or individual contact details.
 */
export function importSurveyCsv(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) {
    console.log('No data rows found in CSV');
    return;
  }

  const db = getDb();
  let importedCount = 0;

  // Header is line 0
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim());
    if (parts.length < 5) continue;

    const [
      ward_id,
      owns_house,
      roof_type,
      monthly_units,
      bill_is_two_month,
      solar_status,
      barrier,
      knew_250_rule,
      water_shortage,
      water_coping,
      has_well,
      well_dried,
      rain_harvest,
      would_join,
      would_use_malayalam
    ] = parts;

    const id = 'srv_' + crypto.randomUUID().slice(0, 10);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO survey_responses (
        id, ward_id, owns_house, roof_type, monthly_units, bill_is_two_month,
        solar_status, barrier, knew_250_rule, water_shortage, water_coping,
        has_well, well_dried, rain_harvest, would_join, would_use_malayalam,
        consent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      id,
      ward_id || 'KLM-W07',
      owns_house === '1' || owns_house === 'yes' ? 1 : 0,
      roof_type || 'flat',
      parseInt(monthly_units || '250', 10),
      bill_is_two_month === '1' || bill_is_two_month === 'yes' ? 1 : 0,
      solar_status || 'planning',
      barrier || 'cost',
      knew_250_rule === '1' || knew_250_rule === 'yes' ? 1 : 0,
      water_shortage === '1' || water_shortage === 'yes' ? 1 : 0,
      water_coping || 'tanker',
      has_well === '1' || has_well === 'yes' ? 1 : 0,
      well_dried === '1' || well_dried === 'yes' ? 1 : 0,
      rain_harvest === '1' || rain_harvest === 'yes' ? 1 : 0,
      would_join || 'yes',
      would_use_malayalam === '1' || would_use_malayalam === 'yes' ? 1 : 0,
      now
    );

    importedCount++;
  }

  console.log(`Imported ${importedCount} survey responses (strictly anonymous).`);
}

if (process.argv[1] && process.argv[1].endsWith('importSurvey.js')) {
  initDatabase();
  const targetFile = process.argv[2] || './sample_survey.csv';
  importSurveyCsv(targetFile);
  closeDatabase();
}
