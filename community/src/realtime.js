import { WebSocketServer, WebSocket } from 'ws';

let wss = null;

export function setupRealtime(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    // Send initial ping / hello
    ws.send(JSON.stringify({ type: 'connected', time: new Date().toISOString() }));

    ws.on('message', (msg) => {
      try {
        const parsed = JSON.parse(msg.toString());
        if (parsed.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', time: new Date().toISOString() }));
        }
      } catch {
        // Ignore unparseable client messages
      }
    });
  });

  return wss;
}

/**
 * Broadcast pledge event to all connected clients.
 * STRICT PRIVACY RULE: Ward counts only, never household or personal details.
 */
export function broadcastPledgeEvent(eventData) {
  if (!wss) return;

  const payload = JSON.stringify({
    type: 'pledge',
    ward_id: eventData.ward_id,
    pledged: eventData.pledged,
    target: eventData.target,
    kind: eventData.kind || 'solar',
    strength: eventData.strength || 'firm',
    timestamp: new Date().toISOString()
  });

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}
