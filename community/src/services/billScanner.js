import crypto from 'node:crypto';
import { z } from 'zod';
import { getDb } from '../db.js';
import { maskConsumerNumber } from './privacy.js';

export const BillResultSchema = z.object({
  units: z.number().nullable(),
  amount: z.number().nullable(),
  billing_period_days: z.number().nullable().default(60),
  months_in_bill: z.number().nullable().default(2),
  consumer_no_masked: z.string().nullable(),
  confidence: z.enum(['high', 'medium', 'low']).default('high'),
  warnings: z.array(z.string()).default([]),
  from_cache: z.boolean().default(false),
  source: z.enum(['gemini', 'sample', 'sample_fallback']).optional(),
  cliff_analysis: z.object({
    monthly_units: z.number().nullable(),
    is_telescopic: z.boolean(),
    cliff_status: z.enum(['safe', 'near_cliff', 'above_cliff', 'tod_heavy', 'unknown']),
    status_label: z.string(),
    cliff_penalty_estimate: z.number(),
    recommended_solar_kw: z.number(),
    estimated_monthly_bill_before: z.number(),
    estimated_monthly_bill_after: z.number(),
    estimated_monthly_savings: z.number(),
    avoids_cliff_penalty: z.boolean()
  }).optional()
});

/**
 * 5 Pre-cached KSEB sample bills covering typical households, cliff danger zones,
 * high surcharge non-telescopic consumers, ToD industrial/heavy, and lifeline cottages.
 * Checked against KSEB 2025-2027 tariff table.
 */
export const SAMPLE_BILLS = [
  {
    id: 'sample-1',
    name: 'Typical Family Home (262 units / 60 days)',
    badge: 'Most Common',
    badge_color: 'sky',
    units: 262,
    amount: 2013.0,
    billing_period_days: 60,
    months_in_bill: 2,
    consumer_no_raw: '11553482104',
    consumer_no_masked: 'XXXXXX2104',
    confidence: 'high',
    warnings: [],
    description: 'Average 2-month bi-monthly consumption (~131 units/mo). Fits telescopic 101-150 unit slab. A 2 kW solar setup wipes out high tiers.'
  },
  {
    id: 'sample-2',
    name: 'Cliff Danger Zone (496 units / 60 days = 248 units/mo)',
    badge: 'Cliff Danger',
    badge_color: 'amber',
    units: 496,
    amount: 4180.0,
    billing_period_days: 60,
    months_in_bill: 2,
    consumer_no_raw: '11553791488',
    consumer_no_masked: 'XXXXXX1488',
    confidence: 'high',
    warnings: [
      'near_cliff_threshold_250: Household is at 248 units/mo — just 2 units away from the 250-unit non-telescopic cliff! Crossing it triggers ₹261.75 penalty per month.'
    ],
    description: 'Dangerously close to the 250-unit threshold. Even 3 extra units will convert all units to non-telescopic flat rates, spiking the bill by ₹500+.'
  },
  {
    id: 'sample-3',
    name: 'Post-Cliff High Surcharge (640 units / 60 days = 320 units/mo)',
    badge: 'Non-Telescopic',
    badge_color: 'rose',
    units: 640,
    amount: 5980.0,
    billing_period_days: 60,
    months_in_bill: 2,
    consumer_no_raw: '11553310921',
    consumer_no_masked: 'XXXXXX0921',
    confidence: 'high',
    warnings: [
      'above_cliff_penalty_applied: Usage exceeds 250 units/mo. Non-telescopic billing active. Rooftop solar will drop you back into subsidized telescopic slabs.'
    ],
    description: 'Currently trapped in non-telescopic penal tariff. A 3 kW rooftop solar reduces bill by ₹1,250+/month because it pulls the home below the cliff.'
  },
  {
    id: 'sample-4',
    name: 'Heavy Usage ToD (1,080 units / 60 days = 540 units/mo)',
    badge: 'ToD Tariff',
    badge_color: 'purple',
    units: 1080,
    amount: 11420.0,
    billing_period_days: 60,
    months_in_bill: 2,
    consumer_no_raw: '11553925567',
    consumer_no_masked: 'XXXXXX5567',
    confidence: 'high',
    warnings: [
      'tod_tariff_applicable: Over 500 units/mo subject to Time-of-Day 125% evening peak surcharge (6 PM - 10 PM).'
    ],
    description: 'High consumption household with air conditioning / pumps. Subject to 125% peak rates. 5 kW solar + battery/load shifting gives massive payback.'
  },
  {
    id: 'sample-5',
    name: 'Lifeline / Small Cottage (84 units / 60 days = 42 units/mo)',
    badge: 'Lifeline Slab',
    badge_color: 'emerald',
    units: 84,
    amount: 310.0,
    billing_period_days: 60,
    months_in_bill: 2,
    consumer_no_raw: '11553108233',
    consumer_no_masked: 'XXXXXX8233',
    confidence: 'high',
    warnings: [
      'low_consumption_lifeline: Monthly units below 50. Consider micro-solar 1 kW or community solar aggregation.'
    ],
    description: 'Modest consumption already in the lowest subsidized slab. 1 kW micro solar or community solar pooling is ideal.'
  }
];

export const DEMO_BILL_SAMPLE = SAMPLE_BILLS[0];

/**
 * KSEB 2025-2027 Domestic Tariff (LT-1A) calculation engine
 * Sourced directly from MazhaVeyil_NEXATHON_Idea.md Section 0 & 2
 */
export function calculateCliffAnalysis(units, monthsInBill = 2) {
  if (units === null || units === undefined) {
    return {
      monthly_units: null,
      is_telescopic: true,
      cliff_status: 'unknown',
      status_label: 'Units Not Detected',
      cliff_penalty_estimate: 0,
      recommended_solar_kw: 2.0,
      estimated_monthly_bill_before: 0,
      estimated_monthly_bill_after: 0,
      estimated_monthly_savings: 0,
      avoids_cliff_penalty: false
    };
  }

  const months = monthsInBill || 2;
  const monthlyUnits = Math.round(units / months);

  let isTelescopic = true;
  let cliffStatus = 'safe';
  let statusLabel = 'Safe in Telescopic Slab';
  let cliffPenalty = 0;

  if (monthlyUnits > 500) {
    isTelescopic = false;
    cliffStatus = 'tod_heavy';
    statusLabel = 'ToD Tariff Active (500+ units, 125% peak)';
    cliffPenalty = 484.20; // 500-unit cliff jump
  } else if (monthlyUnits > 250) {
    isTelescopic = false;
    cliffStatus = 'above_cliff';
    statusLabel = 'Non-Telescopic Penalty Active (250+ units)';
    cliffPenalty = 261.75; // 250-unit cliff jump
  } else if (monthlyUnits >= 240) {
    isTelescopic = true;
    cliffStatus = 'near_cliff';
    statusLabel = 'Cliff Danger Zone (Within 10 units of 250 cliff)';
    cliffPenalty = 0;
  }

  // Recommended solar size
  let recommendedKw = 2.0;
  if (monthlyUnits < 80) recommendedKw = 1.0;
  else if (monthlyUnits <= 180) recommendedKw = 2.0;
  else if (monthlyUnits <= 350) recommendedKw = 3.0;
  else recommendedKw = 5.0;

  // Monthly solar generation (~110-120 units per kW per month in Kerala)
  const monthlySolarYield = recommendedKw * 115;
  const netMonthlyUnits = Math.max(0, monthlyUnits - monthlySolarYield);

  // Approximate monthly bill before and after
  const billBefore = computeMonthlyBillKSEB(monthlyUnits);
  const billAfter = computeMonthlyBillKSEB(netMonthlyUnits);
  const monthlySavings = Math.max(0, Math.round(billBefore - billAfter));

  const avoidsCliff = !isTelescopic && netMonthlyUnits <= 250;

  return {
    monthly_units: monthlyUnits,
    is_telescopic: isTelescopic,
    cliff_status: cliffStatus,
    status_label: statusLabel,
    cliff_penalty_estimate: Math.round(cliffPenalty),
    recommended_solar_kw: recommendedKw,
    estimated_monthly_bill_before: Math.round(billBefore),
    estimated_monthly_bill_after: Math.round(billAfter),
    estimated_monthly_savings: monthlySavings,
    avoids_cliff_penalty: avoidsCliff
  };
}

/**
 * Approximate KSEB LT-1A monthly bill in INR
 */
function computeMonthlyBillKSEB(u) {
  if (u <= 0) return 40; // minimum fixed charge
  if (u <= 40) return 40 + u * 1.50;
  if (u <= 50) return 60 + u * 3.50;
  if (u <= 100) return 80 + 50 * 3.50 + (u - 50) * 4.20;
  if (u <= 150) return 100 + 50 * 3.50 + 50 * 4.20 + (u - 100) * 5.60;
  if (u <= 200) return 130 + 50 * 3.50 + 50 * 4.20 + 50 * 5.60 + (u - 150) * 7.10;
  if (u <= 250) return 160 + 50 * 3.50 + 50 * 4.20 + 50 * 5.60 + 50 * 7.10 + (u - 200) * 8.40;
  // Non-telescopic above 250 units: all units flat rate!
  if (u <= 300) return 180 + u * 6.60;
  if (u <= 350) return 210 + u * 7.50;
  if (u <= 400) return 240 + u * 8.00;
  if (u <= 500) return 270 + u * 8.40;
  // Above 500: ToD weighted average rate
  return 320 + u * 9.20;
}

/**
 * Process bill image buffer
 * 1. Hashes buffer bytes
 * 2. Checks bill_cache
 * 3. Matches predefined mock buffer or calls Gemini
 * 4. Strictly validates, masks consumer number & performs cliff analysis
 */
export async function scanBillBuffer(fileBuffer, mimeType = 'image/jpeg') {
  const db = getDb();
  const imageHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  // 1. Check cache
  const cached = db.prepare('SELECT result_json FROM bill_cache WHERE image_hash = ?').get(imageHash);
  if (cached) {
    try {
      const parsed = JSON.parse(cached.result_json);
      if (parsed.source !== 'sample_fallback') {
        parsed.from_cache = true;
        return parsed;
      }
    } catch {
      // If corrupted in cache, proceed to fresh scan
    }
  }

  let resultData = null;
  const apiKey = process.env.GEMINI_API_KEY;

  // 2. Check if the buffer matches any known sample identifier
  const bufferString = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 128));
  for (const sample of SAMPLE_BILLS) {
    if (bufferString.includes(sample.id) || bufferString.includes(sample.consumer_no_raw)) {
      resultData = {
        source: 'sample',
        units: sample.units,
        amount: sample.amount,
        billing_period_days: sample.billing_period_days,
        months_in_bill: sample.months_in_bill,
        consumer_no_masked: sample.consumer_no_masked,
        confidence: sample.confidence,
        warnings: [...sample.warnings]
      };
      break;
    }
  }

  // 3. Live Gemini Vision call when a key is set. If it fails the scan FAILS with a clear message: it never falls back to
  //    a sample bill (that would show invented numbers as if they were read from the photo).
  if (!resultData && apiKey && apiKey !== 'dummy_key_for_dev') {
    resultData = { ...(await callGeminiVision(fileBuffer, mimeType, apiKey)), source: 'gemini' };
  }

  // 4. No key at all: answer with the built-in sample, clearly flagged, low confidence, and never cached.
  if (!resultData) {
    resultData = {
      source: 'sample_fallback',
      units: DEMO_BILL_SAMPLE.units,
      amount: DEMO_BILL_SAMPLE.amount,
      billing_period_days: DEMO_BILL_SAMPLE.billing_period_days,
      months_in_bill: DEMO_BILL_SAMPLE.months_in_bill,
      consumer_no_masked: DEMO_BILL_SAMPLE.consumer_no_masked,
      confidence: 'low',
      warnings: ['no_api_key_sample_bill: no GEMINI_API_KEY is set, so this is the built-in sample bill, not a reading of your photo']
    };
  }

  // Ensure consumer number is masked
  if (resultData.consumer_no && !resultData.consumer_no_masked) {
    resultData.consumer_no_masked = maskConsumerNumber(resultData.consumer_no);
    delete resultData.consumer_no;
  }
  // A bill the model could not read a consumer number from (blurry, cropped) must not fail validation
  if (resultData.consumer_no_masked === undefined) resultData.consumer_no_masked = null;
  delete resultData.consumer_no;

  if (!resultData.units) {
    resultData.warnings = resultData.warnings || [];
    if (!resultData.warnings.includes('units_not_found')) {
      resultData.warnings.push('units_not_found');
    }
    resultData.confidence = 'low';
  }

  // Attach cliff analysis
  const cliffAnalysis = calculateCliffAnalysis(resultData.units, resultData.months_in_bill);

  const validated = BillResultSchema.parse({
    ...resultData,
    cliff_analysis: cliffAnalysis,
    from_cache: false
  });

  // Save to cache (only real readings: never a fallback sample, never an unreadable result)
  if (validated.source !== 'sample_fallback' && validated.units !== null) db.prepare(`
    INSERT OR REPLACE INTO bill_cache (image_hash, result_json, created_at)
    VALUES (?, ?, ?)
  `).run(imageHash, JSON.stringify(validated), new Date().toISOString());

  return validated;
}

/**
 * Pre-cache all 5 sample bills into SQLite bill_cache
 */
export function preCacheSampleBills() {
  const db = getDb();
  for (const sample of SAMPLE_BILLS) {
    const fakeBuffer = Buffer.from(`kseb-sample-bill-content-${sample.id}-${sample.units}`);
    const imageHash = crypto.createHash('sha256').update(fakeBuffer).digest('hex');
    const cliffAnalysis = calculateCliffAnalysis(sample.units, sample.months_in_bill);

    const payload = {
      units: sample.units,
      amount: sample.amount,
      billing_period_days: sample.billing_period_days,
      months_in_bill: sample.months_in_bill,
      consumer_no_masked: sample.consumer_no_masked,
      confidence: sample.confidence,
      warnings: sample.warnings,
      from_cache: false,
      cliff_analysis: cliffAnalysis
    };

    db.prepare(`
      INSERT OR REPLACE INTO bill_cache (image_hash, result_json, created_at)
      VALUES (?, ?, ?)
    `).run(imageHash, JSON.stringify(payload), new Date().toISOString());
  }
}

/** An error a person can act on: carries the HTTP status and a stable code for the route to return. */
export class ScanFailure extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Current stable fast vision models, newest first (checked against Google's model list, Oct 2026). Override with GEMINI_MODEL.
// A 404 "model not found" moves on to the next one, so a retired name does not break scanning.
export const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-2.5-flash'];

const BILL_PROMPT = `You are an expert Kerala KSEB electricity bill parser.
Analyze this KSEB bill image and extract the key numbers accurately.
Return ONLY valid raw JSON with NO markdown code fences, no comments, and no extra text.

JSON schema:
{
  "units": number or null,
  "amount": number or null,
  "billing_period_days": number or null,
  "months_in_bill": number or null,
  "consumer_no": string or null,
  "confidence": "high" | "medium" | "low",
  "warnings": string[]
}

Rules:
1. "units" is Total Units / Consumption in the bill period.
2. "amount" is the Total Payable / Net Amount in Indian Rupees.
3. If this is a 2-month bi-monthly bill, set "months_in_bill" to 2.
4. If image is blurry or numbers are unreadable, set "units" to null, "confidence" to "low", and add "blurry_image" to warnings.`;

const toNum = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

// Turn whatever the model returned into the shape the schema expects (numbers as numbers, sane months, valid confidence)
export function normaliseGeminiResult(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const days = toNum(r.billing_period_days);
  let months = toNum(r.months_in_bill);
  if (months !== 1 && months !== 2) months = days === null ? 2 : days <= 40 ? 1 : 2;
  const units = toNum(r.units);
  const out = {
    units: units !== null && units >= 0 ? units : null,
    amount: toNum(r.amount),
    billing_period_days: days,
    months_in_bill: months,
    consumer_no: r.consumer_no ? String(r.consumer_no) : null,
    confidence: ['high', 'medium', 'low'].includes(r.confidence) ? r.confidence : 'medium',
    warnings: Array.isArray(r.warnings) ? r.warnings.map(String) : []
  };
  if (out.units === null) out.confidence = 'low';
  return out;
}

/**
 * Call Gemini Vision (generateContent) with a strict JSON output constraint.
 * GEMINI_MODEL picks one model; GEMINI_BASE_URL exists for tests. Throws ScanFailure with a clear message on any problem.
 */
async function callGeminiVision(buffer, mimeType, apiKey) {
  const base = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
  const models = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : GEMINI_MODELS;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: BILL_PROMPT }, { inline_data: { mime_type: mimeType, data: buffer.toString('base64') } }] }],
    generationConfig: { temperature: 0.1, response_mime_type: 'application/json' }
  });

  let response = null;
  let lastModel = null;
  for (const model of models) {
    lastModel = model;
    try {
      response = await fetch(base + '/v1beta/models/' + model + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body,
        signal: AbortSignal.timeout(30000)
      });
    } catch {
      throw new ScanFailure(502, 'scanner_offline', 'Could not reach Google\'s scanning service (no internet?). Use a sample bill or type the numbers.');
    }
    if (response.status !== 404) break; // 404 = this model name is not available: try the next one
  }

  if (!response.ok) {
    // Google answers a wrong key with 400 API_KEY_INVALID (checked before the model), a restricted key with 403, a retired model with 404
    const err = (await response.json().catch(() => ({}))).error || {};
    const reason = (err.details || []).find((d) => d.reason)?.reason || '';
    const why = err.message ? ' Google says: ' + err.message : '';
    if (reason === 'API_KEY_INVALID' || /api key not valid/i.test(err.message || '') || response.status === 401) {
      throw new ScanFailure(502, 'scanner_bad_key', 'The Gemini API key was rejected. Copy it again from https://aistudio.google.com/apikey into GEMINI_API_KEY in community/.env (no quotes or spaces).');
    }
    if (response.status === 403) throw new ScanFailure(502, 'scanner_bad_key', 'The Gemini API key is not allowed to use this service.' + why);
    if (response.status === 429) throw new ScanFailure(502, 'scanner_rate_limited', 'The Gemini free tier is rate limited right now. Wait a minute and try again, or use a sample bill.');
    if (response.status === 404) throw new ScanFailure(502, 'scanner_model_unavailable', 'None of the Gemini models (' + models.join(', ') + ') is available to this key. Set GEMINI_MODEL in community/.env.');
    throw new ScanFailure(502, 'scanner_failed', 'The scanning service answered with an error (HTTP ' + response.status + ' from ' + lastModel + ').' + why);
  }

  const json = await response.json();
  if (json.promptFeedback?.blockReason) throw new ScanFailure(502, 'scanner_blocked', 'The scanning service declined this image (' + json.promptFeedback.blockReason + '). Try another photo.');
  const text = (json.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  if (!text.trim()) throw new ScanFailure(502, 'scanner_unreadable', 'The scanner returned nothing for this photo. Try a sharper, well-lit photo.');

  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  let parsed;
  try {
    parsed = JSON.parse(first >= 0 && last > first ? cleaned.slice(first, last + 1) : cleaned);
  } catch {
    throw new ScanFailure(502, 'scanner_unreadable', 'The scanner could not read this photo. Try a sharper, well-lit photo.');
  }
  return normaliseGeminiResult(parsed);
}
