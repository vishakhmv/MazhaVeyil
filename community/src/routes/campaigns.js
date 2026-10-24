import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { getDb } from '../db.js';
import { hashHousehold } from '../services/privacy.js';
import { computeCampaignStatus, calculateDaysLeft } from '../services/campaignStatus.js';
import { broadcastPledgeEvent } from '../realtime.js';

export const campaignsRouter = Router();

const PledgeInputSchema = z.object({
  ward_id: z.string().min(1, 'ward_id is required'),
  roof_id: z.string().min(1, 'roof_id is required'),
  kind: z.enum(['solar', 'rain', 'both']).default('solar'),
  strength: z.enum(['firm', 'maybe']).default('firm'),
  est_kw: z.number().positive().default(2.5),
  contact_consent: z.boolean().default(false),
  phone: z.string().optional(),
  source: z.enum(['app', 'survey', 'seed']).default('app'),
  is_demo: z.boolean().optional().default(false)
});

/**
 * GET /api/campaigns/:id
 * Retrieve campaign progress, tiers, days left, status
 */
campaignsRouter.get('/:id', (req, res) => {
  const db = getDb();
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);

  if (!campaign) {
    return res.status(404).json({ error: 'campaign_not_found' });
  }

  const pledgeCounts = db.prepare(`
    SELECT
      COUNT(*) AS total_pledged,
      SUM(CASE WHEN strength = 'firm' THEN 1 ELSE 0 END) AS firm_count
    FROM pledges
    WHERE campaign_id = ?
  `).get(campaign.id);

  const totalPledged = pledgeCounts.total_pledged || 0;
  const firmCount = pledgeCounts.firm_count || 0;

  const currentStatus = computeCampaignStatus(campaign, totalPledged);
  if (currentStatus !== campaign.status) {
    db.prepare('UPDATE campaigns SET status = ? WHERE id = ?').run(currentStatus, campaign.id);
    campaign.status = currentStatus;
  }

  let tiers = [25, 50, 100];
  try {
    tiers = JSON.parse(campaign.tiers_json);
  } catch {
    tiers = [25, 50, 100];
  }

  const daysLeft = calculateDaysLeft(campaign.closes_at);

  res.json({
    id: campaign.id,
    ward_id: campaign.ward_id,
    title: campaign.title,
    target_homes: campaign.target_homes,
    pledged_homes: totalPledged,
    firm_homes: firmCount,
    status: campaign.status,
    tiers,
    days_left: daysLeft,
    opens_at: campaign.opens_at,
    closes_at: campaign.closes_at
  });
});

/**
 * POST /api/campaigns/:id/pledges
 * Record a pledge to join a ward group (Idempotent, Privacy-preserving)
 */
campaignsRouter.post('/:id/pledges', (req, res) => {
  const db = getDb();
  const campaignId = req.params.id;
  const idemKey = req.headers['idempotency-key'] || req.body.idem_key || null;

  // 1. Check idempotency key first
  if (idemKey) {
    const existingByIdem = db.prepare('SELECT * FROM pledges WHERE idem_key = ?').get(idemKey);
    if (existingByIdem) {
      const counts = db.prepare('SELECT COUNT(*) AS total FROM pledges WHERE campaign_id = ?').get(campaignId);
      const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
      const daysLeft = campaign ? calculateDaysLeft(campaign.closes_at) : 0;

      return res.status(200).json({
        pledge_id: existingByIdem.id,
        campaign: {
          id: campaignId,
          pledged: counts ? counts.total : 0,
          target: campaign ? campaign.target_homes : 100,
          status: campaign ? campaign.status : 'open',
          days_left: daysLeft
        },
        duplicate: false,
        replayed: true
      });
    }
  }

  // 2. Validate input schema
  const parsed = PledgeInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      error: 'invalid_input',
      details: parsed.error.issues
    });
  }

  const data = parsed.data;

  // 3. Find Campaign
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  if (!campaign) {
    return res.status(404).json({ error: 'campaign_not_found' });
  }

  // 4. Check campaign status & expiry
  const currentCountRow = db.prepare('SELECT COUNT(*) AS count FROM pledges WHERE campaign_id = ?').get(campaignId);
  const currentCount = currentCountRow ? currentCountRow.count : 0;
  const currentStatus = computeCampaignStatus(campaign, currentCount);

  if (currentStatus === 'closed' || currentStatus === 'expired') {
    return res.status(409).json({
      error: 'campaign_closed',
      status: currentStatus,
      message: 'This campaign is closed to new pledges.'
    });
  }

  // 5. Generate household hash
  const householdKey = hashHousehold(data.roof_id);

  // 6. Check for duplicate pledge (same campaign, same household)
  const existingPledge = db.prepare('SELECT id FROM pledges WHERE campaign_id = ? AND household_key = ?').get(campaignId, householdKey);
  if (existingPledge) {
    return res.status(409).json({
      error: 'duplicate_pledge',
      duplicate: true,
      message: 'A pledge has already been recorded for this household.'
    });
  }

  // 7. Insert pledge
  const pledgeId = 'p_' + crypto.randomUUID().slice(0, 12);
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO pledges (
        id, campaign_id, ward_id, household_key, kind, strength,
        est_kw, source, is_demo, idem_key, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pledgeId,
      campaignId,
      data.ward_id,
      householdKey,
      data.kind,
      data.strength,
      data.est_kw,
      data.source,
      data.is_demo ? 1 : 0,
      idemKey,
      now
    );
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({
        error: 'duplicate_pledge',
        duplicate: true
      });
    }
    throw err;
  }

  // 8. If contact consented and phone provided, store in contacts table (isolated from Atlas)
  if (data.contact_consent && data.phone) {
    db.prepare(`
      INSERT INTO contacts (pledge_id, phone, created_at)
      VALUES (?, ?, ?)
    `).run(pledgeId, data.phone, now);
  }

  // 9. Record event for live ticker
  db.prepare(`
    INSERT INTO events (type, ward_id, at)
    VALUES ('pledge', ?, ?)
  `).run(data.ward_id, now);

  // 10. Update campaign status if target reached
  const newCount = currentCount + 1;
  const newStatus = computeCampaignStatus(campaign, newCount);
  if (newStatus !== campaign.status) {
    db.prepare('UPDATE campaigns SET status = ? WHERE id = ?').run(newStatus, campaignId);
  }

  const daysLeft = calculateDaysLeft(campaign.closes_at);

  // 11. Broadcast realtime event (Ward & count only, strictly anonymous)
  broadcastPledgeEvent({
    ward_id: data.ward_id,
    pledged: newCount,
    target: campaign.target_homes,
    kind: data.kind,
    strength: data.strength
  });

  return res.status(201).json({
    pledge_id: pledgeId,
    campaign: {
      id: campaignId,
      pledged: newCount,
      target: campaign.target_homes,
      status: newStatus,
      days_left: daysLeft
    },
    duplicate: false
  });
});
