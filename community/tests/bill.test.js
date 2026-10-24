import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import { createApp } from '../src/server.js';
import { getDb, closeDatabase } from '../src/db.js';
import { SAMPLE_BILLS, calculateCliffAnalysis } from '../src/services/billScanner.js';

describe('Bill Scanner Service (Tier 2)', () => {
  let app;

  beforeEach(() => {
    app = createApp(':memory:');
  });

  afterEach(() => {
    closeDatabase();
  });

  it('POST /api/bill/scan extracts bill details and masks consumer number', async () => {
    const dummyImageBuffer = Buffer.from('fake-bill-image-bytes-kseb-sample-1');
    const filesBefore = fs.readdirSync(process.cwd());

    const res = await request(app)
      .post('/api/bill/scan')
      .attach('bill', dummyImageBuffer, 'sample_bill.jpg');

    expect(res.status).toBe(200);
    expect(res.body.units).toBeDefined();
    expect(res.body.amount).toBeDefined();
    expect(res.body.billing_period_days).toBe(60);
    expect(res.body.consumer_no_masked).toBeDefined();
    expect(res.body.consumer_no_masked).toMatch(/^X+/); // Starts with masked X
    expect(res.body.from_cache).toBe(false);
    expect(res.body.cliff_analysis).toBeDefined();

    // Strict Privacy & Storage Rule: No image file ever written to disk
    const filesAfter = fs.readdirSync(process.cwd());
    expect(filesAfter.length).toBe(filesBefore.length);
  });

  it('Repeated scan of same image returns cached result', async () => {
    const dummyImageBuffer = Buffer.from('cached-bill-sample-bytes');

    const first = await request(app)
      .post('/api/bill/scan')
      .attach('bill', dummyImageBuffer, 'sample.jpg');
    expect(first.status).toBe(200);
    expect(first.body.from_cache).toBe(false);

    const second = await request(app)
      .post('/api/bill/scan')
      .attach('bill', dummyImageBuffer, 'sample.jpg');
    expect(second.status).toBe(200);
    expect(second.body.from_cache).toBe(true);
  });

  it('GET /api/bill/samples returns all 5 calibrated sample bills', async () => {
    const res = await request(app).get('/api/bill/samples');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(5);
    expect(res.body.samples).toHaveLength(5);

    // Verify units on all 5 sample bills
    const unitsList = res.body.samples.map(s => s.units);
    expect(unitsList).toEqual([262, 496, 640, 1080, 84]);

    // Consumer numbers all masked
    for (const sample of res.body.samples) {
      expect(sample.consumer_no_masked).toMatch(/^X+/);
    }
  });

  it('POST /api/bill/sample/:id loads sample with cliff calculation', async () => {
    const res = await request(app).post('/api/bill/sample/sample-2');
    expect(res.status).toBe(200);
    expect(res.body.units).toBe(496);
    expect(res.body.cliff_analysis.monthly_units).toBe(248);
    expect(res.body.cliff_analysis.cliff_status).toBe('near_cliff');
  });

  it('KSEB Tariff Cliff calculations properly identify non-telescopic penalty', () => {
    // 248 units/mo -> Near cliff (telescopic safe)
    const near = calculateCliffAnalysis(496, 2);
    expect(near.is_telescopic).toBe(true);
    expect(near.cliff_status).toBe('near_cliff');

    // 320 units/mo -> Above cliff (non-telescopic penalty active)
    const above = calculateCliffAnalysis(640, 2);
    expect(above.is_telescopic).toBe(false);
    expect(above.cliff_status).toBe('above_cliff');
    expect(above.cliff_penalty_estimate).toBeGreaterThan(200);
    expect(above.avoids_cliff_penalty).toBe(true); // Solar drops usage below cliff!

    // 540 units/mo -> Heavy ToD
    const heavy = calculateCliffAnalysis(1080, 2);
    expect(heavy.is_telescopic).toBe(false);
    expect(heavy.cliff_status).toBe('tod_heavy');

    // Blurry / null
    const blurry = calculateCliffAnalysis(null, 2);
    expect(blurry.cliff_status).toBe('unknown');
  });

  it('GET /print/ward/:id renders A4 Grama Sabha action sheet with Bill Scanner info', async () => {
    const db = getDb();
    db.prepare(`
      INSERT INTO wards (id, name, panchayat, district, lat, lng, homes_estimated)
      VALUES ('KLM-W07', 'Ward 7', 'Example Panchayat', 'Kollam', 8.95, 76.62, 500)
    `).run();

    const res = await request(app).get('/print/ward/KLM-W07');
    expect(res.status).toBe(200);
    expect(res.text).toContain('മഴവെയിൽ വാർഡ് കർമ്മപദ്ധതി');
    expect(res.text).toContain('Example Panchayat');
    expect(res.text).toContain('PM Surya Ghar Subsidy Window');
    expect(res.text).toContain('KSEB ബിൽ സ്കാനർ');
  });
});
