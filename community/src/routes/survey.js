import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { getDb } from '../db.js';

export const surveyRouter = Router();

const SurveySubmissionSchema = z.object({
  ward_id: z.string().min(1),
  owns_house: z.boolean().default(true),
  roof_type: z.string().default('flat'),
  monthly_units: z.number().default(250),
  bill_is_two_month: z.boolean().default(false),
  solar_status: z.string().default('planning'),
  barrier: z.string().default('cost'),
  knew_250_rule: z.boolean().default(false),
  water_shortage: z.boolean().default(false),
  water_coping: z.string().default('none'),
  has_well: z.boolean().default(true),
  well_dried: z.boolean().default(false),
  rain_harvest: z.boolean().default(false),
  would_join: z.string().default('yes'),
  would_use_malayalam: z.boolean().default(true),
  consent: z.boolean().default(true)
});

/**
 * POST /api/survey
 * Save individual survey response (strictly anonymous, no names/phones)
 */
surveyRouter.post('/', (req, res) => {
  const parsed = SurveySubmissionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: 'invalid_survey_data', details: parsed.error.issues });
  }

  const d = parsed.data;
  const db = getDb();
  const id = 'srv_' + crypto.randomUUID().slice(0, 10);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO survey_responses (
      id, ward_id, owns_house, roof_type, monthly_units, bill_is_two_month,
      solar_status, barrier, knew_250_rule, water_shortage, water_coping,
      has_well, well_dried, rain_harvest, would_join, would_use_malayalam,
      consent, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    d.ward_id,
    d.owns_house ? 1 : 0,
    d.roof_type,
    d.monthly_units,
    d.bill_is_two_month ? 1 : 0,
    d.solar_status,
    d.barrier,
    d.knew_250_rule ? 1 : 0,
    d.water_shortage ? 1 : 0,
    d.water_coping,
    d.has_well ? 1 : 0,
    d.well_dried ? 1 : 0,
    d.rain_harvest ? 1 : 0,
    d.would_join,
    d.would_use_malayalam ? 1 : 0,
    d.consent ? 1 : 0,
    now
  );

  res.status(201).json({ status: 'recorded', id });
});

/**
 * GET /api/survey/stats
 * Aggregated statistics for Slide 2 and the Atlas
 */
surveyRouter.get('/stats', (req, res) => {
  const db = getDb();
  const stats = db.prepare(`
    SELECT
      COUNT(*) AS total_responses,
      SUM(CASE WHEN water_shortage = 1 THEN 1 ELSE 0 END) AS water_problem_count,
      SUM(CASE WHEN knew_250_rule = 0 THEN 1 ELSE 0 END) AS unaware_of_250_rule_count,
      SUM(CASE WHEN would_join = 'yes' OR would_join = 'maybe' THEN 1 ELSE 0 END) AS would_join_count,
      SUM(CASE WHEN well_dried = 1 THEN 1 ELSE 0 END) AS well_dried_count
    FROM survey_responses
  `).get();

  const total = stats.total_responses || 0;
  const waterPct = total > 0 ? Math.round((stats.water_problem_count / total) * 100) : 0;
  const cliffUnawarePct = total > 0 ? Math.round((stats.unaware_of_250_rule_count / total) * 100) : 0;
  const joinPct = total > 0 ? Math.round((stats.would_join_count / total) * 100) : 0;

  res.json({
    total_responses: total,
    water_shortage_percentage: waterPct,
    cliff_unaware_percentage: cliffUnawarePct,
    would_join_percentage: joinPct,
    summary_sentence: `${stats.water_problem_count || 0} of ${total} homes asked faced a water shortage last summer. ${cliffUnawarePct}% were unaware of KSEB's 250-unit slab jump. ${joinPct}% would join a ward group.`
  });
});
