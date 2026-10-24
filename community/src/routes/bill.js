import { Router } from 'express';
import multer from 'multer';
import { scanBillBuffer, SAMPLE_BILLS, calculateCliffAnalysis } from '../services/billScanner.js';

export const billRouter = Router();

// HARD PRIVACY RULE: Image NEVER touches disk! Memory storage only.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

/**
 * GET /api/bill/samples
 * Returns list of 5 representative KSEB sample bills with cliff classifications.
 * Used for instant interactive testing on Atlas UI and demo day offline resilience.
 */
billRouter.get('/samples', (req, res) => {
  const summaries = SAMPLE_BILLS.map(s => ({
    id: s.id,
    name: s.name,
    badge: s.badge,
    badge_color: s.badge_color,
    units: s.units,
    amount: s.amount,
    billing_period_days: s.billing_period_days,
    months_in_bill: s.months_in_bill,
    consumer_no_masked: s.consumer_no_masked,
    description: s.description,
    warnings: s.warnings,
    cliff_analysis: calculateCliffAnalysis(s.units, s.months_in_bill)
  }));

  res.json({
    count: summaries.length,
    samples: summaries
  });
});

/**
 * POST /api/bill/sample/:id
 * Instantly loads a chosen sample bill result with cliff analysis and masked consumer number.
 */
billRouter.post('/sample/:id', async (req, res) => {
  const { id } = req.params;
  const sample = SAMPLE_BILLS.find(s => s.id === id);
  if (!sample) {
    return res.status(404).json({ error: 'sample_not_found', message: `Sample ${id} not found` });
  }

  const fakeBuffer = Buffer.from(`kseb-sample-bill-content-${sample.id}-${sample.units}`);
  try {
    const result = await scanBillBuffer(fakeBuffer, 'image/jpeg');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'sample_load_failed', message: err.message });
  }
});

/**
 * POST /api/bill/scan
 * Upload KSEB bill photo in multipart/form-data.
 * Returns parsed units, amount, masked consumer number, and tariff cliff analysis.
 */
billRouter.post('/scan', upload.single('bill'), async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: 'no_file_uploaded', message: 'Please provide a bill photo file' });
  }

  try {
    const result = await scanBillBuffer(req.file.buffer, req.file.mimetype);
    res.json(result);
  } catch (err) {
    // A ScanFailure (bad key, rate limit, offline, unreadable photo...) carries its own status, code and a message a person can act on.
    if (err && err.code && err.status) {
      console.warn('Bill scan failed (' + err.code + '):', err.message);
      return res.status(err.status).json({ error: err.code, message: err.message });
    }
    console.error('Bill scan error:', err);
    res.status(500).json({
      error: 'scan_failed',
      message: 'Failed to process bill image',
      details: err.message
    });
  }
});
