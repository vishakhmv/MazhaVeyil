// MazhaVeyil community service: Koottam pledges, Ward Atlas, rain Koottam pricing, bill scanner, print page, live updates.
//
// RECONSTRUCTED on 24 Oct 2026. The original src/server.js was overwritten by mistake; this file was rebuilt from the tests in
// tests/ and the routers in src/routes/. It mounts the same paths the tests call. Compare with Kishan's original and keep his if it differs.
//
//   GET  /api/health
//   /api/campaigns/:id (+ /pledges)   /api/atlas/summary   /api/atlas/wards/:id/summary   /api/wards/:id/summary   /api/events/poll
//   /api/bill/(samples|sample/:id|scan)   /api/rain-koottam/...   /api/survey   /print/ward/:id   WebSocket /ws
import 'dotenv/config';
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import express from 'express';
import cors from 'cors';
import { initDatabase } from './db.js';
import { campaignsRouter } from './routes/campaigns.js';
import { atlasRouter } from './routes/atlas.js';
import { billRouter } from './routes/bill.js';
import { rainKoottamRouter } from './routes/rainKoottam.js';
import { surveyRouter } from './routes/survey.js';
import { printRouter } from './routes/print.js';
import { setupRealtime } from './realtime.js';

// dbPath ':memory:' gives the tests an isolated database; null uses DATABASE_PATH or community/mazhaveyil.sqlite
export function createApp(dbPath = null) {
  initDatabase(dbPath);
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', module: 'MazhaVeyil Koottam + Atlas', time: new Date().toISOString() });
  });

  app.use('/api/campaigns', campaignsRouter);
  app.use('/api/atlas', atlasRouter);
  app.use('/api', atlasRouter); // /api/events/poll and /api/wards/:id/summary
  app.use('/api/bill', billRouter);
  app.use('/api/rain-koottam', rainKoottamRouter);
  app.use('/api/survey', surveyRouter);
  app.use('/print', printRouter);

  app.use('/api', (req, res) => res.status(404).json({ error: 'not_found', message: 'No such community route' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad_json', message: 'Request body is not valid JSON' });
    console.error('[community]', err);
    return res.status(500).json({ error: 'internal', message: 'Something went wrong in the community service' });
  });
  return app;
}

// Resolves once the server is listening: { app, server, port }
export async function startServer(port = Number(process.env.PORT) || 3001, dbPath = null) {
  const app = createApp(dbPath);
  const server = http.createServer(app);
  setupRealtime(server);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', resolve);
  });
  return { app, server, port };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().then(({ port }) => console.log('[community] listening on http://0.0.0.0:' + port + '  (WebSocket /ws, health /api/health)'));
}
