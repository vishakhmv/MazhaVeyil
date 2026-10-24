// Run this after putting GEMINI_API_KEY in community/.env:   npm run check:gemini
// It scans samples/test-bill.png (a realistic KSEB bill with known numbers) through the SAME code the app uses, and says PASS or FAIL.
// Expected reading: 262 units, about Rs 1,449, a two-month bill.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDatabase, closeDatabase } from '../src/db.js';
import { scanBillBuffer } from '../src/services/billScanner.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const say = (s = '') => console.log(s);

say('\nBill scanner key check\n');
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'dummy_key_for_dev') {
  say('FAIL: GEMINI_API_KEY is empty. Put your key after GEMINI_API_KEY= in community/.env (free key: https://aistudio.google.com/apikey).');
  process.exit(1);
}
say('Key found (' + process.env.GEMINI_API_KEY.slice(0, 4) + '…, ' + process.env.GEMINI_API_KEY.length + ' characters). Model: ' + (process.env.GEMINI_MODEL || 'automatic (newest available)'));

initDatabase(':memory:');
try {
  const t = Date.now();
  const r = await scanBillBuffer(readFileSync(join(HERE, '..', 'samples', 'test-bill.png')), 'image/png');
  say('Reading after ' + (Date.now() - t) + ' ms: units ' + r.units + ', amount ' + r.amount + ', months ' + r.months_in_bill + ', period ' + r.billing_period_days + ' days, consumer ' + r.consumer_no_masked + ', confidence ' + r.confidence + ', source ' + r.source);
  const checks = [
    ['came from Gemini (not the built-in sample)', r.source === 'gemini'],
    ['units = 262', r.units === 262],
    ['amount is about 1,449', r.amount !== null && Math.abs(r.amount - 1448.87) / 1448.87 < 0.03],
    ['two-month bill detected', r.months_in_bill === 2],
    ['consumer number is masked', typeof r.consumer_no_masked === 'string' && !/1155020004821/.test(JSON.stringify(r))],
  ];
  for (const [name, ok] of checks) say((ok ? '  PASS  ' : '  FAIL  ') + name);
  const bad = checks.filter(([, ok]) => !ok).length;
  say(bad ? '\nFAIL: the scanner ran but did not read the test bill correctly. Run it again; if it keeps failing, try GEMINI_MODEL in community/.env.\n' : '\nPASS: the bill scanner works with your key.\n');
  process.exitCode = bad ? 1 : 0;
} catch (e) {
  const hint = {
    scanner_bad_key: 'The key was rejected. Copy it again from https://aistudio.google.com/apikey into community/.env (no quotes, no spaces).',
    scanner_rate_limited: 'Free-tier limit reached. Wait a minute and run again.',
    scanner_model_unavailable: 'None of the default models is available to this key. Set GEMINI_MODEL in community/.env to a model listed at https://ai.google.dev/gemini-api/docs/models',
    scanner_offline: 'No internet from this machine to Google. Check the connection.',
    scanner_blocked: 'Google declined the image. Try again.',
    scanner_unreadable: 'The answer could not be understood. Run it again.',
    scanner_failed: 'Google returned an error. Run it again in a minute.',
  }[e.code];
  say('FAIL (' + (e.code || 'error') + '): ' + e.message);
  if (hint) say('Fix: ' + hint);
  say();
  process.exitCode = 1;
} finally {
  closeDatabase();
}
