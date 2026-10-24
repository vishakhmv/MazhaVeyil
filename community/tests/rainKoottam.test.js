import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server.js';
import { getDb, closeDatabase } from '../src/db.js';
import {
  computeRainGroupPrice,
  getComponentBreakdown,
  INDIVIDUAL_TOTAL,
  RAIN_TIERS
} from '../src/services/rainKoottam.js';

// ─── Unit tests: pure pricing logic ───────────────────────────────────────────

describe('Rain Koottam Pricing Logic', () => {
  it('0 pledges: no active tier, no discount', () => {
    const r = computeRainGroupPrice(0);
    expect(r.discount_pct).toBe(0);
    expect(r.discounted_unit_cost).toBe(INDIVIDUAL_TOTAL);
    expect(r.savings_per_home).toBe(0);
    expect(r.active_tier).toBeNull();
    expect(r.next_tier.threshold).toBe(10); // first tier
  });

  it('exactly 10 pledges: unlocks Tier 1 (8% off)', () => {
    const r = computeRainGroupPrice(10);
    expect(r.discount_pct).toBe(8);
    expect(r.active_tier.threshold).toBe(10);
    expect(r.discounted_unit_cost).toBe(Math.round(INDIVIDUAL_TOTAL * 0.92));
    expect(r.savings_per_home).toBe(INDIVIDUAL_TOTAL - r.discounted_unit_cost);
  });

  it('25 pledges: unlocks Tier 2 (12% off)', () => {
    const r = computeRainGroupPrice(25);
    expect(r.discount_pct).toBe(12);
    expect(r.active_tier.threshold).toBe(25);
  });

  it('50+ pledges: unlocks Tier 3 (18% off), no next tier pending', () => {
    const r = computeRainGroupPrice(50);
    expect(r.discount_pct).toBe(18);
    expect(r.active_tier.threshold).toBe(50);
    expect(r.next_tier).toBeNull();
    expect(r.homes_until_next_tier).toBe(0);
  });

  it('batch_total_savings scales linearly with pledge count', () => {
    const r25 = computeRainGroupPrice(25);
    const r50 = computeRainGroupPrice(50);
    // At 50, discount is larger AND count is double — savings must be significantly more
    expect(r50.batch_total_savings).toBeGreaterThan(r25.batch_total_savings * 2);
  });

  it('component breakdown sum matches discounted_unit_cost', () => {
    const r = computeRainGroupPrice(25);
    const breakdown = getComponentBreakdown(r.discount_pct);
    const totalGroupPrice = breakdown.reduce((acc, c) => acc + c.group_price, 0);
    expect(totalGroupPrice).toBe(r.discounted_unit_cost);
  });

  it('price_note always flags pricing as indicative until real quote', () => {
    const r = computeRainGroupPrice(100);
    expect(r.is_price_indicative).toBe(true);
    expect(r.price_note).toContain('Target discount pending');
  });
});

// ─── Integration tests: HTTP endpoints ────────────────────────────────────────

describe('Rain Koottam API Endpoints', () => {
  let app;
  let db;

  beforeEach(() => {
    app = createApp(':memory:');
    db = getDb();

    db.prepare(`
      INSERT INTO wards (id, name, panchayat, district, lat, lng, homes_estimated)
      VALUES ('KLM-W07', 'Ward 7', 'Example Panchayat', 'Kollam', 8.95, 76.62, 500)
    `).run();

    db.prepare(`
      INSERT INTO campaigns (
        id, ward_id, title, target_homes, tiers_json, opens_at, closes_at, status
      ) VALUES (
        'c_rain_01', 'KLM-W07', 'Rain Koottam Campaign', 50,
        '[10, 25, 50]', '2026-10-01T00:00:00Z', '2027-03-31T23:59:59Z', 'open'
      )
    `).run();
  });

  afterEach(() => {
    closeDatabase();
  });

  it('GET /api/rain-koottam/:id returns 0 pledges and no active tier initially', async () => {
    const res = await request(app).get('/api/rain-koottam/c_rain_01');
    expect(res.status).toBe(200);
    expect(res.body.rain_pledge_count).toBe(0);
    expect(res.body.pricing.discount_pct).toBe(0);
    expect(res.body.pricing.active_tier).toBeNull();
    expect(res.body.available_tiers).toHaveLength(3);
  });

  it('Rain pledges count separately from solar pledges', async () => {
    // Add solar pledge — should NOT count for rain pricing
    await request(app)
      .post('/api/campaigns/c_rain_01/pledges')
      .send({
        ward_id: 'KLM-W07',
        roof_id: 'osm:way/solar_roof',
        kind: 'solar',
        strength: 'firm'
      });

    // Add rain pledge
    await request(app)
      .post('/api/campaigns/c_rain_01/pledges')
      .send({
        ward_id: 'KLM-W07',
        roof_id: 'osm:way/rain_roof',
        kind: 'rain',
        strength: 'firm'
      });

    const res = await request(app).get('/api/rain-koottam/c_rain_01');
    expect(res.body.rain_pledge_count).toBe(1); // only the rain pledge counts
  });

  it('"both" kind pledges count for rain group pricing', async () => {
    await request(app)
      .post('/api/campaigns/c_rain_01/pledges')
      .send({
        ward_id: 'KLM-W07',
        roof_id: 'osm:way/both_roof',
        kind: 'both',
        strength: 'firm'
      });

    const res = await request(app).get('/api/rain-koottam/c_rain_01');
    expect(res.body.rain_pledge_count).toBe(1);
  });

  it('Hitting Tier 1 (10 homes) unlocks 8% off and returns component breakdown', async () => {
    // Seed 10 rain pledges directly
    for (let i = 1; i <= 10; i++) {
      db.prepare(`
        INSERT INTO pledges (
          id, campaign_id, ward_id, household_key, kind, strength,
          est_kw, source, is_demo, idem_key, created_at
        ) VALUES (?, 'c_rain_01', 'KLM-W07', ?, 'rain', 'firm', 0, 'seed', 1, ?, ?)
      `).run(
        `p_rain_${i}`,
        `hash_rain_${i}`,
        `idem_rain_${i}`,
        new Date().toISOString()
      );
    }

    const res = await request(app).get('/api/rain-koottam/c_rain_01');
    expect(res.status).toBe(200);
    expect(res.body.rain_pledge_count).toBe(10);
    expect(res.body.pricing.discount_pct).toBe(8);
    expect(res.body.pricing.active_tier.threshold).toBe(10);
    expect(res.body.component_breakdown).toHaveLength(4); // 4 components
    // Each component should have group_price < retail_price
    for (const comp of res.body.component_breakdown) {
      expect(comp.group_price).toBeLessThan(comp.retail_price);
    }
  });
});
