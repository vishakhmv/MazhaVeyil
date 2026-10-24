import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Atlas map: one tile per ward, shaded by how close its Koottam is to the target. Counts only, never a house.
const shade = (p) => {
  const t = Math.max(0, Math.min(1, p));
  // pale rain blue -> leaf green
  const a = [166, 216, 244];
  const b = [35, 162, 107];
  return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
};

export function WardMap({ wards, selectedId, onSelect, className, onTilesStatus }) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const cb = useRef({});
  const errors = useRef(0);
  cb.current = { onSelect, onTilesStatus };

  useEffect(() => {
    const m = L.map(el.current, { center: [8.45, 77.0], zoom: 10, zoomControl: true, scrollWheelZoom: false });
    map.current = m;
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' });
    tiles.on('tileload', () => { errors.current = 0; cb.current.onTilesStatus?.(true); });
    tiles.on('tileerror', () => { errors.current += 1; if (errors.current >= 3) cb.current.onTilesStatus?.(false); });
    tiles.addTo(m);
    layer.current = L.layerGroup().addTo(m);
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const g = layer.current;
    if (!g || !wards?.length) return;
    g.clearLayers();
    const bounds = [];
    for (const w of wards) {
      if (!w.boundary) continue;
      const ring = w.boundary.coordinates[0].map(([lon, lat]) => [lat, lon]);
      bounds.push(...ring);
      const sel = w.ward_id === selectedId;
      const poly = L.polygon(ring, { color: sel ? '#12213d' : '#2f4f82', weight: sel ? 4 : 2, fillColor: w.kind === 'public' ? '#c3cee0' : shade(w.pct), fillOpacity: w.kind === 'public' ? 0.5 : 0.75, dashArray: w.kind === 'public' ? '6 4' : undefined });
      poly.bindTooltip('<b>' + w.name + '</b><br>' + w.label, { sticky: true });
      poly.on('click', () => cb.current.onSelect?.(w.ward_id));
      poly.addTo(g);
      const c = poly.getBounds().getCenter();
      // a marker that stays visible at any zoom (a 1 km ward is a few pixels on a district map)
      const dot = L.circleMarker(c, { radius: sel ? 17 : 14, color: sel ? '#12213d' : '#2f4f82', weight: sel ? 4 : 2, fillColor: w.kind === 'public' ? '#c3cee0' : shade(w.pct), fillOpacity: 0.95 });
      dot.bindTooltip('<b>' + w.name + '</b><br>' + w.label, { sticky: true });
      dot.on('click', () => cb.current.onSelect?.(w.ward_id));
      dot.addTo(g);
      L.marker(c, { interactive: false, icon: L.divIcon({ className: '', iconSize: [110, 22], iconAnchor: [55, -20], html: '<div style="font:800 12px system-ui;white-space:nowrap;color:#12213d;text-align:center;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff">' + w.short + '</div>' }) }).addTo(g);
    }
    if (bounds.length && !map.current._mvFitted) {
      map.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
      map.current._mvFitted = true;
    }
  }, [wards, selectedId]);

  return <div ref={el} className={className} role="application" aria-label="Ward map" />;
}
