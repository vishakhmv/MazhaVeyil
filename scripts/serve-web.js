// Serves the built web app and routes /api to the right service, so the demo needs no Vite config and the phone needs one address.
//   /api/engine/*, /api/v1/*      -> the engine (:8081)
//   /api/*, /ws, /print/*          -> Kishan's community service (:3001): /api/campaigns, /api/atlas, /api/bill, /api/rain-koottam, /api/survey, /api/health, WebSocket /ws, print pages
//   everything else   -> the built app (single-page fallback to index.html)
// Usage: node scripts/serve-web.js [distDir]   (env: WEB_PORT, ENGINE_PORT, COMMUNITY_PORT)
import http from 'node:http';
import net from 'node:net';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(process.argv[2] || join(ROOT, process.env.WEB_DIR || 'frontend', 'dist'));
const port = Number(process.env.WEB_PORT || 8080);
const engine = Number(process.env.ENGINE_PORT || 8081);
const community = Number(process.env.COMMUNITY_PORT || 3001);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.map': 'application/json', '.txt': 'text/plain; charset=utf-8' };

function proxy(req, res, targetPort) {
  const up = http.request({ host: '127.0.0.1', port: targetPort, path: req.url, method: req.method, headers: { ...req.headers, host: '127.0.0.1:' + targetPort } }, (r) => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res); // pipes streams too, so live updates (server-sent events) keep working
  });
  up.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'service_down', message: 'The service behind ' + req.url.split('?')[0] + ' is not running (port ' + targetPort + ')', details: [] } }));
  });
  req.pipe(up);
}

function serveFile(res, file, cache) {
  res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': cache });
  createReadStream(file).pipe(res);
}

export function createWebServer() {
  const server = http.createServer((req, res) => {
    const path = decodeURIComponent((req.url || '/').split('?')[0]);
    if (path.startsWith('/api/engine') || path.startsWith('/api/v1/')) return proxy(req, res, engine);
    if (path.startsWith('/api/') || path.startsWith('/print')) return proxy(req, res, community);
    const file = normalize(join(dist, path));
    if (!file.startsWith(dist)) { res.writeHead(403); return res.end('forbidden'); }
    if (existsSync(file) && statSync(file).isFile()) return serveFile(res, file, path.startsWith('/assets/') ? 'public, max-age=3600' : 'no-cache');
    const index = join(dist, 'index.html');
    if (existsSync(index)) return serveFile(res, index, 'no-cache'); // single-page app fallback
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('No build found in ' + dist + '. Run: npm run build (in the web app folder)');
  });
  // WebSocket (live pledges) is tunnelled straight through to the community service
  server.on('upgrade', (req, socket, head) => {
    if (!(req.url || '').startsWith('/ws')) return socket.destroy();
    const up = net.connect(community, '127.0.0.1', () => {
      const CRLF = '\r\n';
      up.write(req.method + ' ' + req.url + ' HTTP/1.1' + CRLF + Object.entries(req.headers).map(([k, v]) => k + ': ' + v).join(CRLF) + CRLF + CRLF);
      if (head?.length) up.write(head);
      up.pipe(socket);
      socket.pipe(up);
    });
    up.on('error', () => socket.destroy());
    socket.on('error', () => up.destroy());
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createWebServer().listen(port, '0.0.0.0', () => console.log('[web] serving ' + dist + ' on http://0.0.0.0:' + port + ' (api -> engine :' + engine + ', community :' + community + ')'));
}
