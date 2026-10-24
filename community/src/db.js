import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let defaultDbInstance = null;

export function initDatabase(dbPath = null) {
  // If an existing DB instance is open, we can close it if needed
  if (defaultDbInstance) {
    try {
      defaultDbInstance.close();
    } catch {
      // Ignore if already closed
    }
    defaultDbInstance = null;
  }

  const targetPath = dbPath || process.env.DATABASE_PATH || path.join(__dirname, '..', 'mazhaveyil.sqlite');
  const db = new DatabaseSync(targetPath);

  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON;');

  // Run migrations / table creation
  db.exec(`
    CREATE TABLE IF NOT EXISTS wards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      panchayat TEXT NOT NULL,
      district TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      homes_estimated INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ward_potential (
      ward_id TEXT PRIMARY KEY REFERENCES wards(id) ON DELETE CASCADE,
      roofs_mapped INTEGER NOT NULL DEFAULT 0,
      potential_kw REAL NOT NULL DEFAULT 0.0,
      avg_roof_score INTEGER NOT NULL DEFAULT 0,
      data_quality TEXT NOT NULL DEFAULT 'demo',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      ward_id TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      target_homes INTEGER NOT NULL DEFAULT 100,
      tiers_json TEXT NOT NULL DEFAULT '[25,50,100]',
      opens_at TEXT NOT NULL,
      closes_at TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('open','target_reached','quotes_open','expired','closed'))
    );

    CREATE TABLE IF NOT EXISTS pledges (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      ward_id TEXT NOT NULL,
      household_key TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'solar',
      strength TEXT NOT NULL DEFAULT 'firm',
      est_kw REAL NOT NULL DEFAULT 2.5,
      source TEXT NOT NULL CHECK (source IN ('app','survey','seed')),
      is_demo INTEGER NOT NULL DEFAULT 0,
      idem_key TEXT UNIQUE,
      created_at TEXT NOT NULL,
      UNIQUE (campaign_id, household_key)
    );

    CREATE TABLE IF NOT EXISTS contacts (
      pledge_id TEXT PRIMARY KEY REFERENCES pledges(id) ON DELETE CASCADE,
      phone TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS survey_responses (
      id TEXT PRIMARY KEY,
      ward_id TEXT NOT NULL,
      owns_house INTEGER,
      roof_type TEXT,
      monthly_units INTEGER,
      bill_is_two_month INTEGER DEFAULT 0,
      solar_status TEXT,
      barrier TEXT,
      knew_250_rule INTEGER,
      water_shortage INTEGER,
      water_coping TEXT,
      has_well INTEGER,
      well_dried INTEGER,
      rain_harvest INTEGER,
      would_join TEXT,
      would_use_malayalam INTEGER,
      consent INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      ward_id TEXT NOT NULL,
      at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bill_cache (
      image_hash TEXT PRIMARY KEY,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  defaultDbInstance = db;
  return db;
}

export function getDb() {
  if (!defaultDbInstance) {
    defaultDbInstance = initDatabase();
  }
  return defaultDbInstance;
}

export function closeDatabase() {
  if (defaultDbInstance) {
    try {
      defaultDbInstance.close();
    } catch {
      // ignore
    }
    defaultDbInstance = null;
  }
}
