// Small geometry helpers (pure). Rings are arrays of [lon, lat]. Local equirectangular projection is accurate to well under 1% at roof scale.

const M_PER_DEG_LAT = 110540;
const M_PER_DEG_LON_EQ = 111320;

const stripClosing = (ring) => {
  const n = ring.length;
  return n > 1 && ring[0][0] === ring[n - 1][0] && ring[0][1] === ring[n - 1][1] ? ring.slice(0, -1) : ring;
};

export function polygonAreaM2(ring) {
  const pts = stripClosing(ring);
  if (pts.length < 3) return 0;
  const lat0 = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const kx = M_PER_DEG_LON_EQ * Math.cos((lat0 * Math.PI) / 180);
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = [pts[i][0] * kx, pts[i][1] * M_PER_DEG_LAT];
    const [x2, y2] = [pts[(i + 1) % pts.length][0] * kx, pts[(i + 1) % pts.length][1] * M_PER_DEG_LAT];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

export function centroid(ring) {
  const pts = stripClosing(ring);
  const n = pts.length || 1;
  return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n];
}

export function pointInPolygon([x, y], ring) {
  const pts = stripClosing(ring);
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function distanceKm([lon1, lat1], [lon2, lat2]) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function segmentsCross(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}

// A drawn polygon is usable if it has 3+ distinct points, no crossing edges and a roof-sized area.
export function validatePolygon(ring, { minM2 = 8, maxM2 = 20000 } = {}) {
  if (!Array.isArray(ring) || ring.length < 3) return 'polygon needs at least 3 points';
  for (const p of ring) {
    if (!Array.isArray(p) || p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return 'polygon points must be [lon, lat]';
    if (p[0] < 60 || p[0] > 100 || p[1] < 0 || p[1] > 40) return 'polygon is outside India';
  }
  const pts = stripClosing(ring);
  if (pts.length < 3) return 'polygon needs at least 3 distinct points';
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      if (Math.abs(i - j) === 1 || (i === 0 && j === pts.length - 1)) continue;
      if (segmentsCross(pts[i], pts[(i + 1) % pts.length], pts[j], pts[(j + 1) % pts.length])) return 'polygon edges cross each other';
    }
  }
  const area = polygonAreaM2(pts);
  if (area < minM2) return `roof is too small (${Math.round(area)} m2)`;
  if (area > maxM2) return `roof is too large (${Math.round(area)} m2)`;
  return null;
}

export const bboxPolygon = ([w, s, e, n]) => [[w, s], [e, s], [e, n], [w, n], [w, s]];
export const inBbox = ([x, y], [w, s, e, n]) => x >= w && x <= e && y >= s && y <= n;
