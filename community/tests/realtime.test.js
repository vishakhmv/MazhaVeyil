import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { WebSocket } from 'ws';
import { startServer } from '../src/server.js';
import { getDb, closeDatabase } from '../src/db.js';

describe('Realtime WebSocket & Polling Fallback', () => {
  let serverInstance;
  let port = 3999;
  let db;

  beforeEach(async () => {
    // Start server on dedicated test port
    port = 3000 + Math.floor(Math.random() * 1000);
    const result = await startServer(port, ':memory:');
    serverInstance = result.server;
    db = getDb();

    // Seed test ward and campaign
    db.prepare(`
      INSERT INTO wards (id, name, panchayat, district, lat, lng, homes_estimated)
      VALUES ('KLM-W07', 'Ward 7', 'Example Panchayat', 'Kollam', 8.95, 76.62, 500)
    `).run();

    db.prepare(`
      INSERT INTO campaigns (id, ward_id, title, target_homes, tiers_json, opens_at, closes_at, status)
      VALUES (
        'c_ws',
        'KLM-W07',
        'Ward 7 Live Campaign',
        100,
        '[25, 50, 100]',
        '2026-10-01T00:00:00Z',
        '2027-03-31T23:59:59Z',
        'open'
      )
    `).run();
  });

  afterEach(() => {
    if (serverInstance) {
      serverInstance.close();
    }
    closeDatabase();
  });

  it('WebSocket client receives pledge broadcast in under 2 seconds', async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);

    const receivedMessages = [];
    const connectedPromise = new Promise((resolve) => {
      ws.on('open', () => resolve());
    });
    ws.on('message', (data) => {
      receivedMessages.push(JSON.parse(data.toString()));
    });

    await connectedPromise;

    // Post a pledge via HTTP
    const startTime = Date.now();
    await fetch(`http://localhost:${port}/api/campaigns/c_ws/pledges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ward_id: 'KLM-W07',
        roof_id: 'osm:way/ws_test_roof',
        strength: 'firm',
        kind: 'solar'
      })
    });

    // Wait for the pledge broadcast
    const broadcastReceived = await new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const pledgeMsg = receivedMessages.find((m) => m.type === 'pledge');
        if (pledgeMsg) {
          clearInterval(checkInterval);
          resolve(pledgeMsg);
        } else if (Date.now() - startTime > 2000) {
          clearInterval(checkInterval);
          reject(new Error('Timeout: Did not receive WebSocket message within 2 seconds'));
        }
      }, 20);
    });

    expect(broadcastReceived).toBeDefined();
    expect(broadcastReceived.type).toBe('pledge');
    expect(broadcastReceived.ward_id).toBe('KLM-W07');
    expect(broadcastReceived.pledged).toBe(1);
    expect(broadcastReceived.target).toBe(100);
    // Strict privacy rule: Never transmit personal data
    expect(broadcastReceived.phone).toBeUndefined();
    expect(broadcastReceived.roof_id).toBeUndefined();

    ws.close();
  });

  it('GET /api/events/poll serves polling fallback when WebSocket is unavailable', async () => {
    // Record pledge
    await fetch(`http://localhost:${port}/api/campaigns/c_ws/pledges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ward_id: 'KLM-W07',
        roof_id: 'osm:way/poll_test_roof',
        strength: 'firm'
      })
    });

    const res = await fetch(`http://localhost:${port}/api/events/poll?since=0`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.events).toBeDefined();
    expect(data.events.length).toBeGreaterThan(0);
    expect(data.events[0].ward_id).toBe('KLM-W07');
    expect(data.events[0].type).toBe('pledge');
  });
});
