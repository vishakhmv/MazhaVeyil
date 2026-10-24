import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server.js';
import { getDb, closeDatabase } from '../src/db.js';

describe('Community Service: Pledges, Campaigns & Atlas', () => {
  let app;
  let db;

  afterEach(() => {
    closeDatabase();
  });

  beforeEach(() => {
    // In-memory isolated database for each test run
    app = createApp(':memory:');
    db = getDb();

    // Seed test ward
    db.prepare(`
      INSERT INTO wards (id, name, panchayat, district, lat, lng, homes_estimated)
      VALUES ('KLM-W07', 'Ward 7', 'Example Panchayat', 'Kollam', 8.95, 76.62, 500)
    `).run();

    // Seed test campaign
    db.prepare(`
      INSERT INTO campaigns (id, ward_id, title, target_homes, tiers_json, opens_at, closes_at, status)
      VALUES (
        'c_01',
        'KLM-W07',
        'Ward 7 Solar Koottam',
        3,
        '[1, 2, 3]',
        '2026-10-01T00:00:00Z',
        '2027-03-31T23:59:59Z',
        'open'
      )
    `).run();
  });

  it('GET /api/health returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.module).toContain('Koottam');
  });

  it('POST valid pledge records successfully and returns 201', async () => {
    const res = await request(app)
      .post('/api/campaigns/c_01/pledges')
      .send({
        ward_id: 'KLM-W07',
        roof_id: 'osm:way/1001',
        kind: 'solar',
        strength: 'firm',
        est_kw: 2.5,
        contact_consent: false
      });

    expect(res.status).toBe(201);
    expect(res.body.pledge_id).toBeDefined();
    expect(res.body.campaign.pledged).toBe(1);
    expect(res.body.campaign.target).toBe(3);
    expect(res.body.campaign.status).toBe('open');
    expect(res.body.duplicate).toBe(false);
    // Hard rule: No personal data in response
    expect(res.body.phone).toBeUndefined();
    expect(res.body.household_key).toBeUndefined();
    expect(res.body.roof_id).toBeUndefined();
  });

  it('Duplicate pledge from same roof is rejected with 409', async () => {
    const payload = {
      ward_id: 'KLM-W07',
      roof_id: 'osm:way/1002',
      kind: 'solar',
      strength: 'firm',
      est_kw: 2.5
    };

    const first = await request(app)
      .post('/api/campaigns/c_01/pledges')
      .send(payload);
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/campaigns/c_01/pledges')
      .send(payload);
    expect(second.status).toBe(409);
    expect(second.body.error).toBe('duplicate_pledge');
    expect(second.body.duplicate).toBe(true);
  });

  it('Same Idempotency-Key returns cached response without creating second pledge', async () => {
    const payload = {
      ward_id: 'KLM-W07',
      roof_id: 'osm:way/1003',
      kind: 'both',
      strength: 'firm',
      est_kw: 3.0
    };
    const idemKey = 'uuid-idem-test-999';

    const res1 = await request(app)
      .post('/api/campaigns/c_01/pledges')
      .set('Idempotency-Key', idemKey)
      .send(payload);
    expect(res1.status).toBe(201);
    const originalPledgeId = res1.body.pledge_id;

    const res2 = await request(app)
      .post('/api/campaigns/c_01/pledges')
      .set('Idempotency-Key', idemKey)
      .send(payload);
    expect(res2.status).toBe(200);
    expect(res2.body.pledge_id).toBe(originalPledgeId);
    expect(res2.body.replayed).toBe(true);

    // Verify pledges count is strictly 1
    const count = db.prepare('SELECT COUNT(*) as c FROM pledges WHERE campaign_id = ?').get('c_01');
    expect(count.c).toBe(1);
  });

  it('Reaching campaign target automatically updates status to target_reached', async () => {
    // Campaign c_01 has target_homes = 3
    for (let i = 1; i <= 2; i++) {
      await request(app)
        .post('/api/campaigns/c_01/pledges')
        .send({
          ward_id: 'KLM-W07',
          roof_id: `osm:way/batch_${i}`,
          strength: 'firm'
        });
    }

    const third = await request(app)
      .post('/api/campaigns/c_01/pledges')
      .send({
        ward_id: 'KLM-W07',
        roof_id: 'osm:way/batch_3',
        strength: 'firm'
      });

    expect(third.status).toBe(201);
    expect(third.body.campaign.pledged).toBe(3);
    expect(third.body.campaign.status).toBe('target_reached');

    // Verify DB updated
    const campaign = db.prepare('SELECT status FROM campaigns WHERE id = ?').get('c_01');
    expect(campaign.status).toBe('target_reached');
  });

  it('Pledge to expired campaign is rejected with 409 campaign_closed', async () => {
    // Insert expired campaign
    db.prepare(`
      INSERT INTO campaigns (id, ward_id, title, target_homes, tiers_json, opens_at, closes_at, status)
      VALUES (
        'c_expired',
        'KLM-W07',
        'Expired Ward Campaign',
        100,
        '[25, 50, 100]',
        '2025-01-01T00:00:00Z',
        '2025-02-01T00:00:00Z',
        'open'
      )
    `).run();

    const res = await request(app)
      .post('/api/campaigns/c_expired/pledges')
      .send({
        ward_id: 'KLM-W07',
        roof_id: 'osm:way/late_roof',
        strength: 'firm'
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('campaign_closed');
  });

  it('Invalid input schema returns 422 with validation errors', async () => {
    const res = await request(app)
      .post('/api/campaigns/c_01/pledges')
      .send({
        // missing ward_id and roof_id
        kind: 'unknown_kind',
        est_kw: -10
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('invalid_input');
    expect(res.body.details).toBeDefined();
  });

  it('GET /api/atlas/summary returns merged ward summary with pledge metrics', async () => {
    // Add a pledge
    await request(app)
      .post('/api/campaigns/c_01/pledges')
      .send({
        ward_id: 'KLM-W07',
        roof_id: 'osm:way/atlas_test',
        strength: 'firm'
      });

    const res = await request(app).get('/api/atlas/summary');
    expect(res.status).toBe(200);
    expect(res.body.wards).toBeDefined();
    expect(res.body.wards.length).toBeGreaterThan(0);

    const ward7 = res.body.wards.find(w => w.ward_id === 'KLM-W07');
    expect(ward7).toBeDefined();
    expect(ward7.pledged_homes).toBe(1);
    expect(ward7.firm_homes).toBe(1);
    expect(ward7.centroid).toEqual({ lat: 8.95, lng: 76.62 });
  });
});
