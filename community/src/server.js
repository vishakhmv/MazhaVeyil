import express from 'express';
import cors from 'cors';
import http from 'node:http';
import dotenv from 'dotenv';
import { initDatabase } from './db.js';
import { setupRealtime } from './realtime.js';
import { campaignsRouter } from './routes/campaigns.js';
import { atlasRouter } from './routes/atlas.js';
import { billRouter } from './routes/bill.js';
import { surveyRouter } from './routes/survey.js';
import { printRouter } from './routes/print.js';
import { rainKoottamRouter } from './routes/rainKoottam.js';

dotenv.config();

export function createApp(dbPath = null) {
  // Initialize SQLite database schema
  initDatabase(dbPath);

  const app = express();

  app.use(cors());
  app.use(express.json());

  // Root redirect to Grama Sabha A4 sheet
  app.get('/', (req, res) => {
    res.redirect('/print/ward/KLM-W07');
  });

  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'mazhaveyil-community',
      module: 'Koottam + Ward Atlas',
      version: '1.0.0',
      time: new Date().toISOString()
    });
  });

  // Mount API Routers
  app.use('/api/campaigns', campaignsRouter);
  app.use('/api/atlas', atlasRouter);
  app.use('/api/bill', billRouter);
  app.use('/api/survey', surveyRouter);
  app.use('/print', printRouter);
  app.use('/api/rain-koottam', rainKoottamRouter);
  app.use('/api', atlasRouter);

  return app;
}

export function startServer(port = process.env.PORT || 3001, dbPath = null) {
  const app = createApp(dbPath);
  const server = http.createServer(app);

  setupRealtime(server);

  return new Promise((resolve) => {
    const listener = server.listen(port, () => {
      console.log(`[MazhaVeyil] Community service listening on port ${port}`);
      resolve({ app, server, listener });
    });
  });
}

// Automatically start if run directly
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  startServer();
}
