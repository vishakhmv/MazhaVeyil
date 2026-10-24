// The bill scanner with a Gemini key: a local fake of Google's generateContent API checks the exact request and every failure path.
// Rules under test: a real key works first time; any failure is a clear error (never a made-up bill); fake results are never cached.
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import request from 'supertest';
import { createApp } from '../src/server.js';
import { getDb, closeDatabase } from '../src/db.js';

const IMG = Buffer.from('ÿØ pretend this is a jpeg of a KSEB bill ' + 'x'.repeat(300));
const goodReply = (text) => ({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] });
const bill262 = { units: 262, amount: 2013, billing_period_days: 60, months_in_bill: 2, consumer_no: '1155020004821', confidence: 'high', warnings: [] };

let server;
let base;
let requests;
let behave;
beforeAll(async () => {
  server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const entry = { url: req.url, headers: req.headers, body: raw ? JSON.parse(raw) : null };
      requests.push(entry);
      const out = behave(entry);
      res.writeHead(out.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(out.json ?? {}));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = 'http://127.0.0.1:' + server.address().port;
});
afterAll(() => server.close());

let app;
beforeEach(() => {
  requests = [];
  behave = () => ({ status: 200, json: goodReply(JSON.stringify(bill262)) });
  process.env.GEMINI_API_KEY = 'test-key-123';
  process.env.GEMINI_BASE_URL = base;
  delete process.env.GEMINI_MODEL;
  app = createApp(':memory:');
});
afterEach(() => {
  closeDatabase();
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_BASE_URL;
  delete process.env.GEMINI_MODEL;
});

const scan = (img = IMG) => request(app).post('/api/bill/scan').attach('bill', img, { filename: 'bill.jpg', contentType: 'image/jpeg' });
const cacheRows = () => getDb().prepare('SELECT COUNT(*) AS n FROM bill_cache').get().n;

describe('Gemini bill scanner with a key', () => {
  it('sends the right request and returns the reading, with the consumer number masked', async () => {
    const res = await scan();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ units: 262, amount: 2013, months_in_bill: 2, billing_period_days: 60, confidence: 'high', source: 'gemini', from_cache: false });
    expect(res.body.consumer_no_masked).toBe('XXXXXXXXX4821');
    expect(JSON.stringify(res.body)).not.toContain('1155020004821');
    expect(JSON.stringify(res.body)).not.toContain('"consumer_no"');

    expect(requests).toHaveLength(1);
    const r = requests[0];
    expect(r.url).toBe('/v1beta/models/gemini-3.5-flash-lite:generateContent');
    expect(r.headers['x-goog-api-key']).toBe('test-key-123');
    const parts = r.body.contents[0].parts;
    expect(parts[0].text).toContain('KSEB');
    expect(parts[1].inline_data.mime_type).toBe('image/jpeg');
    expect(parts[1].inline_data.data).toBe(IMG.toString('base64'));
    expect(r.body.generationConfig.response_mime_type).toBe('application/json');
    expect(r.body.generationConfig.temperature).toBeLessThanOrEqual(0.2);
  });

  it('caches a real reading: the same photo is not sent to Google twice', async () => {
    await scan();
    const second = await scan();
    expect(second.body.from_cache).toBe(true);
    expect(second.body.units).toBe(262);
    expect(requests).toHaveLength(1);
  });

  it('copes with markdown fences, numbers sent as text, rupee signs and missing months', async () => {
    behave = () => ({ status: 200, json: goodReply('Here you go:\n```json\n{"units": "300", "amount": "₹2,425.50", "billing_period_days": 30, "months_in_bill": null, "consumer_no": null, "confidence": "high", "warnings": []}\n```') });
    const res = await scan();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ units: 300, amount: 2425.5, months_in_bill: 1, billing_period_days: 30 });
  });

  it('joins several text parts (thinking models may split the answer)', async () => {
    behave = () => ({ status: 200, json: { candidates: [{ content: { parts: [{ text: '{"units": 120, "amount": 700,' }, { text: ' "months_in_bill": 2, "confidence": "medium"}' }] } }] } });
    const res = await scan();
    expect(res.body.units).toBe(120);
    expect(res.body.confidence).toBe('medium');
  });

  it('moves to the next model when one is retired (404)', async () => {
    behave = (r) => (r.url.includes('gemini-3.5-flash-lite') ? { status: 404, json: { error: { message: 'model not found' } } } : { status: 200, json: goodReply(JSON.stringify(bill262)) });
    const res = await scan();
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('gemini');
    expect(requests.map((r) => r.url)).toEqual(['/v1beta/models/gemini-3.5-flash-lite:generateContent', '/v1beta/models/gemini-3.6-flash:generateContent']);
  });

  it('GEMINI_MODEL overrides the model list', async () => {
    process.env.GEMINI_MODEL = 'my-custom-model';
    await scan();
    expect(requests[0].url).toBe('/v1beta/models/my-custom-model:generateContent');
  });

  it('reports every failure clearly and never returns a made-up bill', async () => {
    const cases = [
      // what real Google returns for a wrong key (checked live): 400 with reason API_KEY_INVALID
      [() => ({ status: 400, json: { error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] } } }), 'scanner_bad_key', /key was rejected/],
      [() => ({ status: 401, json: {} }), 'scanner_bad_key', /key was rejected/],
      [() => ({ status: 403, json: { error: { message: 'Requests from this referrer are blocked.' } } }), 'scanner_bad_key', /not allowed.*referrer are blocked/],
      [() => ({ status: 400, json: { error: { message: 'User location is not supported for the API use.' } } }), 'scanner_failed', /Google says: User location is not supported/],
      [() => ({ status: 429, json: {} }), 'scanner_rate_limited', /rate limited/],
      [() => ({ status: 404, json: {} }), 'scanner_model_unavailable', /GEMINI_MODEL/],
      [() => ({ status: 500, json: {} }), 'scanner_failed', /HTTP 500/],
      [() => ({ status: 200, json: goodReply('sorry, I cannot help') }), 'scanner_unreadable', /could not read/],
      [() => ({ status: 200, json: { candidates: [] } }), 'scanner_unreadable', /nothing/],
      [() => ({ status: 200, json: { promptFeedback: { blockReason: 'SAFETY' } } }), 'scanner_blocked', /declined/],
    ];
    for (const [fn, code, msg] of cases) {
      behave = fn;
      const res = await scan(Buffer.from('different photo ' + code + Math.random() + 'y'.repeat(200)));
      expect(res.status, code).toBe(502);
      expect(res.body.error).toBe(code);
      expect(res.body.message).toMatch(msg);
      expect(res.body.units).toBeUndefined();
    }
    expect(cacheRows()).toBe(0);
  });

  it('a failed scan is not cached: the same photo works after the problem is fixed', async () => {
    behave = () => ({ status: 429, json: {} });
    expect((await scan()).status).toBe(502);
    behave = () => ({ status: 200, json: goodReply(JSON.stringify(bill262)) });
    const ok = await scan();
    expect(ok.status).toBe(200);
    expect(ok.body.source).toBe('gemini');
    expect(ok.body.from_cache).toBe(false);
  });

  it('no internet: a clear "offline" error', async () => {
    process.env.GEMINI_BASE_URL = 'http://127.0.0.1:1';
    const res = await scan();
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('scanner_offline');
  });

  it('a blurry photo returns a low-confidence "units not found" result and is not cached', async () => {
    behave = () => ({ status: 200, json: goodReply('{"units": null, "amount": null, "confidence": "low", "warnings": ["blurry_image"]}') });
    const res = await scan();
    expect(res.status).toBe(200);
    expect(res.body.units).toBeNull();
    expect(res.body.confidence).toBe('low');
    expect(res.body.warnings).toEqual(expect.arrayContaining(['blurry_image', 'units_not_found']));
    expect(cacheRows()).toBe(0);
  });

  it('ignores nonsense the model might return: negative units, unknown confidence', async () => {
    behave = () => ({ status: 200, json: goodReply('{"units": -5, "amount": 100, "confidence": "certain", "months_in_bill": 7}') });
    const res = await scan();
    expect(res.status).toBe(200);
    expect(res.body.units).toBeNull();
    expect(res.body.confidence).toBe('low');
    expect(res.body.months_in_bill).toBe(2);
  });
});

describe('Bill scanner without a key', () => {
  beforeEach(() => { delete process.env.GEMINI_API_KEY; });

  it('answers with the built-in sample, clearly flagged, low confidence, never cached', async () => {
    const res = await scan();
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('sample_fallback');
    expect(res.body.confidence).toBe('low');
    expect(res.body.warnings.join(' ')).toMatch(/no_api_key_sample_bill/);
    expect(requests).toHaveLength(0);
    expect(cacheRows()).toBe(0);
  });

  it('adding the key later works on the same photo (the sample was never cached)', async () => {
    await scan();
    process.env.GEMINI_API_KEY = 'test-key-123';
    const res = await scan();
    expect(res.body.source).toBe('gemini');
    expect(res.body.units).toBe(262);
  });

  it('the sample-bill buttons still work with no key (they are labelled samples, not readings)', async () => {
    const res = await request(app).post('/api/bill/sample/sample-2');
    expect(res.status).toBe(200);
    expect(res.body.units).toBe(496);
    expect(res.body.source).toBe('sample');
    expect(requests).toHaveLength(0);
  });
});
