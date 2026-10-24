import { Router } from 'express';
import { getDb } from '../db.js';

export const atlasRouter = Router();

/**
 * Helper to build ward summary object
 */
function buildWardSummary(wardRow, countRow) {
  const pledged = countRow ? (countRow.pledged_homes || 0) : 0;
  const firm = countRow ? (countRow.firm_homes || 0) : 0;

  return {
    ward_id: wardRow.id,
    name: wardRow.name,
    panchayat: wardRow.panchayat,
    district: wardRow.district,
    centroid: {
      lat: wardRow.lat,
      lng: wardRow.lng
    },
    homes_estimated: wardRow.homes_estimated,
    roofs_mapped: wardRow.roofs_mapped || 0,
    potential_kw: wardRow.potential_kw || 0.0,
    avg_roof_score: wardRow.avg_roof_score || 0,
    pledged_homes: pledged,
    firm_homes: firm,
    target_homes: wardRow.target_homes || 100,
    campaign_status: wardRow.campaign_status || 'open',
    data_quality: wardRow.data_quality || 'demo',
    updated_at: wardRow.updated_at || new Date().toISOString()
  };
}

/**
 * GET /api/atlas/summary
 * Returns ward summaries for all mapped wards
 */
atlasRouter.get('/summary', (req, res) => {
  const db = getDb();

  const wards = db.prepare(`
    SELECT
      w.*,
      wp.roofs_mapped,
      wp.potential_kw,
      wp.avg_roof_score,
      wp.data_quality,
      wp.updated_at,
      c.id AS campaign_id,
      c.target_homes,
      c.status AS campaign_status
    FROM wards w
    LEFT JOIN ward_potential wp ON w.id = wp.ward_id
    LEFT JOIN campaigns c ON w.id = c.ward_id
  `).all();

  const counts = db.prepare(`
    SELECT
      ward_id,
      COUNT(*) AS pledged_homes,
      SUM(CASE WHEN strength = 'firm' THEN 1 ELSE 0 END) AS firm_homes
    FROM pledges
    GROUP BY ward_id
  `).all();

  const countsMap = new Map();
  for (const c of counts) {
    countsMap.set(c.ward_id, c);
  }

  const summaries = wards.map((w) => buildWardSummary(w, countsMap.get(w.id)));

  res.json({
    wards: summaries,
    total_wards: summaries.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/wards/:id/summary
 * Returns detailed summary for one specific ward
 */
atlasRouter.get('/wards/:id/summary', (req, res) => {
  const db = getDb();
  const wardId = req.params.id;

  const ward = db.prepare(`
    SELECT
      w.*,
      wp.roofs_mapped,
      wp.potential_kw,
      wp.avg_roof_score,
      wp.data_quality,
      wp.updated_at,
      c.id AS campaign_id,
      c.target_homes,
      c.status AS campaign_status
    FROM wards w
    LEFT JOIN ward_potential wp ON w.id = wp.ward_id
    LEFT JOIN campaigns c ON w.id = c.ward_id
    WHERE w.id = ?
  `).get(wardId);

  if (!ward) {
    return res.status(404).json({ error: 'ward_not_found' });
  }

  const counts = db.prepare(`
    SELECT
      COUNT(*) AS pledged_homes,
      SUM(CASE WHEN strength = 'firm' THEN 1 ELSE 0 END) AS firm_homes
    FROM pledges
    WHERE ward_id = ?
  `).get(wardId);

  res.json(buildWardSummary(ward, counts));
});

/**
 * GET /api/events/poll
 * Fallback polling endpoint for clients where WebSocket is unavailable or blocked
 */
atlasRouter.get('/events/poll', (req, res) => {
  const db = getDb();
  const sinceId = parseInt(req.query.since || '0', 10);

  const events = db.prepare(`
    SELECT id, type, ward_id, at
    FROM events
    WHERE id > ?
    ORDER BY id ASC
    LIMIT 50
  `).all(sinceId);

  res.json({
    events,
    latest_id: events.length > 0 ? events[events.length - 1].id : sinceId
  });
});
