// One command for the demo: starts the engine (:8081), Kishan's community service (:8082, if community/ exists) and
// Savio's built web app (:8080, if web/ exists), then prints a green checklist, the LAN address and a QR code for the phone.
// Usage: npm run demo           npm run demo -- --no-build   (reuse the last web build)
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const has = (p) => existsSync(join(ROOT, p));
// Savio's app may live in web/ or frontend/: use whichever has a package.json.
const webDir = has('web/package.json') ? 'web' : has('frontend/package.json') ? 'frontend' : null;
const win = process.platform === 'win32';
const procs = [];
const ports = { engine: Number(process.env.ENGINE_PORT || 8081), community: Number(process.env.COMMUNITY_PORT || 3001), web: Number(process.env.WEB_PORT || 8080) };

function lanIp() {
  const all = Object.values(networkInterfaces()).flat().filter((n) => n && n.family === 'IPv4' && !n.internal);
  const pref = all.find((n) => /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(n.address));
  return (pref ?? all[0])?.address ?? 'localhost';
}

function start(name, cmd, args, cwd, env = {}, shell = win) {
  const p = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'inherit', 'inherit'], shell });
  p.on('exit', (code) => console.log('[demo] ' + name + ' stopped (code ' + code + ')'));
  procs.push(p);
  return p;
}

function stopAll() {
  for (const p of procs) {
    if (win) spawnSync('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' });
    else p.kill();
  }
}
process.on('SIGINT', () => { stopAll(); process.exit(0); });
process.on('SIGTERM', () => { stopAll(); process.exit(0); });

const up = async (url) => {
  for (let i = 0; i < 30; i++) {
    try { await fetch(url, { signal: AbortSignal.timeout(1500) }); return true; } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
  return false;
};

console.log('[demo] starting MazhaVeyil...');
start('engine', process.execPath, [join(ROOT, 'engine', 'src', 'server.js')], ROOT, { ENGINE_PORT: String(ports.engine) }, false); // node needs no shell (its path may contain spaces)
// Kishan's service (express + sqlite + websocket). The demo wards and campaigns are seeded into its database first (idempotent).
if (has('community/package.json')) {
  const seed = spawnSync(process.execPath, [join(ROOT, 'scripts', 'seed-community.js')], { cwd: ROOT, stdio: 'inherit' });
  if (seed.status !== 0) console.log('[demo] seeding the community database failed: Koottam and the Atlas will show no wards');
  start('community', 'npm', ['start'], join(ROOT, 'community'), { PORT: String(ports.community) });
}
if (has('community') && (!has('community/package.json') || !has('community/src/server.js'))) {
  console.log('\n[demo] WARNING: community/ is missing package.json or src/server.js, so the community service cannot start.\n       Restore them (they were overwritten by mistake), then run npm run demo again. Koottam and the Atlas need it.\n');
}

if (webDir) {
  if (!process.argv.includes('--no-build')) {
    console.log('[demo] building the web app (vite build)...');
    const b = spawnSync('npm', ['run', 'build'], { cwd: join(ROOT, webDir), stdio: 'inherit', shell: win });
    if (b.status !== 0) console.log('[demo] WEB BUILD FAILED: starting without a fresh build (run npm run demo -- --no-build to reuse the last one)');
  }
  // Our own tiny server: serves the build and routes /api to the engine and the community service, so no Vite proxy is needed.
  start('web', process.execPath, [join(ROOT, 'scripts', 'serve-web.js')], ROOT, { WEB_DIR: webDir, WEB_PORT: String(ports.web), ENGINE_PORT: String(ports.engine), COMMUNITY_PORT: String(ports.community) }, false);
}

const checks = [
  ['engine   ', 'http://localhost:' + ports.engine + '/api/engine/health', true],
  ['community', 'http://localhost:' + ports.community + '/api/health', has('community/package.json')],
  ['web+api  ', 'http://localhost:' + ports.web + '/api/engine/health', Boolean(webDir)],
];
console.log('');
for (const [name, url, expected] of checks) {
  if (!expected) { console.log('  -  ' + name + ' not in the repo yet (skipped)'); continue; }
  console.log('  ' + ((await up(url)) ? '✔' : '✘') + '  ' + name + ' ' + url);
}
const ip = lanIp();
const phoneUrl = 'http://' + ip + ':' + (webDir ? ports.web : ports.engine) + (webDir ? '' : '/api/engine/health');
console.log('\n  Phone on the same hotspot: ' + phoneUrl);
console.log('  (Windows: allow Node through the firewall on Public networks, or the phone cannot connect.)\n');
try {
  const qr = createRequire(import.meta.url)('qrcode-terminal');
  qr.generate(phoneUrl, { small: true });
} catch {
  console.log('  (run npm install at the repo root for a QR code)');
}
console.log('\n  Ctrl+C stops everything.');
