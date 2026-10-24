import { Router } from 'express';
import { getDb } from '../db.js';
import { computeRainGroupPrice, getComponentBreakdown, RAIN_TIERS } from '../services/rainKoottam.js';

export const rainKoottamRouter = Router();

/**
 * GET /api/rain-koottam/:campaignId
 * Returns live group-pricing summary for a campaign's rain pledges.
 * Used by the Atlas Rain Koottam tab and Savio's join-screen.
 */
rainKoottamRouter.get('/:campaignId', (req, res) => {
  const db = getDb();
  const { campaignId } = req.params;

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  if (!campaign) {
    return res.status(404).json({ error: 'campaign_not_found' });
  }

  // Count pledges for rain / both (excludes solar-only pledges)
  const rainCounts = db.prepare(`
    SELECT
      COUNT(*) AS total_rain,
      SUM(CASE WHEN strength = 'firm' THEN 1 ELSE 0 END) AS firm_rain
    FROM pledges
    WHERE campaign_id = ? AND kind IN ('rain', 'both')
  `).get(campaignId);

  const rainPledgeCount = rainCounts?.total_rain || 0;
  const pricing = computeRainGroupPrice(rainPledgeCount);
  const breakdown = getComponentBreakdown(pricing.discount_pct);

  res.json({
    campaign_id: campaignId,
    ward_id: campaign.ward_id,
    rain_pledge_count: rainPledgeCount,
    firm_rain_pledges: rainCounts?.firm_rain || 0,
    pricing,
    component_breakdown: breakdown,
    available_tiers: RAIN_TIERS
  });
});

/**
 * GET /api/rain-koottam/atlas/all
 * Returns rain pledge counts + pricing for all wards (Atlas heatmap data).
 */
rainKoottamRouter.get('/atlas/all', (req, res) => {
  const db = getDb();

  const rows = db.prepare(`
    SELECT
      p.ward_id,
      c.id AS campaign_id,
      COUNT(*) AS total_rain,
      SUM(CASE WHEN p.strength = 'firm' THEN 1 ELSE 0 END) AS firm_rain
    FROM pledges p
    JOIN campaigns c ON p.campaign_id = c.id
    WHERE p.kind IN ('rain', 'both')
    GROUP BY p.ward_id
  `).all();

  const result = rows.map((row) => {
    const pricing = computeRainGroupPrice(row.total_rain);
    return {
      ward_id: row.ward_id,
      campaign_id: row.campaign_id,
      total_rain: row.total_rain,
      firm_rain: row.firm_rain,
      discount_pct: pricing.discount_pct,
      discounted_unit_cost: pricing.discounted_unit_cost,
      savings_per_home: pricing.savings_per_home,
      active_tier_label: pricing.active_tier?.label || null,
      homes_until_next_tier: pricing.homes_until_next_tier
    };
  });

  res.json({ wards: result, timestamp: new Date().toISOString() });
});
