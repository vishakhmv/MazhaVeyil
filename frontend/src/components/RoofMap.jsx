import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TILES = {
  street: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 },
  sat: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics', maxZoom: 19 },
};

const roofStyle = { color: '#2386c4', weight: 1, fillColor: '#3fa1db', fillOpacity: 0.28 };
const roofSelected = { color: '#12213d', weight: 3, fillColor: '#f7b32b', fillOpacity: 0.6 };
const roofHover = { weight: 2, fillOpacity: 0.5 };

// Roof picker: mapped outlines from the engine (click one), or draw your own (tap the corners).
export const RoofMap = forwardRef(function RoofMap(
  { area, roofs, selectedRoofId, polygon, mode, baseLayer = 'street', onPickRoof, onDrawPoint, onTilesStatus, className },
  ref,
) {
  const el = useRef(null);
  const map = useRef(null);
  const tile = useRef(null);
  const roofLayer = useRef(null);
  const drawLayer = useRef(null);
  const cb = useRef({});
  const tileErrors = useRef(0);
  cb.current = { onPickRoof, onDrawPoint, mode, onTilesStatus, selectedRoofId };

  useImperativeHandle(ref, () => ({
    flyTo: (lon, lat, zoom = 18) => map.current?.flyTo([lat, lon], zoom, { duration: 0.8 }),
    fitBBox: (b) => map.current?.fitBounds([[b[1], b[0]], [b[3], b[2]]], { padding: [20, 20] }),
    invalidate: () => map.current?.invalidateSize(),
  }));

  // create the map once
  useEffect(() => {
    const m = L.map(el.current, { center: [10.0, 76.4], zoom: 8, zoomControl: true, preferCanvas: true });
    map.current = m;
    roofLayer.current = L.layerGroup().addTo(m);
    drawLayer.current = L.layerGroup().addTo(m);
    m.on('click', (e) => {
      if (cb.current.mode === 'draw') cb.current.onDrawPoint?.([e.latlng.lng, e.latlng.lat]);
    });
    const t = setTimeout(() => m.invalidateSize(), 200);
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => {
      clearTimeout(t);
      ro.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  // base layer (street or satellite); tile failures flip a flag so the page can say "outlines only"
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (tile.current) m.removeLayer(tile.current);
    tileErrors.current = 0;
    const def = TILES[baseLayer];
    const layer = L.tileLayer(def.url, { maxZoom: def.maxZoom, attribution: def.attribution });
    layer.on('tileload', () => { tileErrors.current = 0; cb.current.onTilesStatus?.(true); });
    layer.on('tileerror', () => { tileErrors.current += 1; if (tileErrors.current >= 3) cb.current.onTilesStatus?.(false); });
    layer.addTo(m);
    layer.bringToBack();
    tile.current = layer;
  }, [baseLayer]);

  // frame the chosen area
  useEffect(() => {
    if (!map.current || !area?.bbox) return;
    const b = area.bbox;
    map.current.fitBounds([[b[1], b[0]], [b[3], b[2]]], { padding: [10, 10], maxZoom: 18 });
  }, [area?.id]);

  // mapped roofs
  useEffect(() => {
    const g = roofLayer.current;
    if (!g) return;
    g.clearLayers();
    if (!roofs?.features?.length) return;
    L.geoJSON(roofs, {
      style: (f) => (f.properties.id === cb.current.selectedRoofId ? roofSelected : roofStyle),
      onEachFeature: (f, layer) => {
        layer.on('click', (e) => {
          if (cb.current.mode === 'draw') return;
          L.DomEvent.stopPropagation(e);
          cb.current.onPickRoof?.(f);
        });
        layer.on('mouseover', () => { if (f.properties.id !== cb.current.selectedRoofId && cb.current.mode !== 'draw') layer.setStyle(roofHover); });
        layer.on('mouseout', () => layer.setStyle(f.properties.id === cb.current.selectedRoofId ? roofSelected : roofStyle));
        layer.bindTooltip(Math.round(f.properties.area_m2) + ' m²', { sticky: true });
      },
    }).addTo(g);
  }, [roofs, selectedRoofId]);

  // the roof being drawn
  useEffect(() => {
    const g = drawLayer.current;
    if (!g) return;
    g.clearLayers();
    if (!polygon?.length) return;
    const ll = polygon.map(([lon, lat]) => [lat, lon]);
    if (ll.length >= 3) L.polygon(ll, { color: '#12213d', weight: 3, fillColor: '#f7b32b', fillOpacity: 0.55 }).addTo(g);
    else if (ll.length === 2) L.polyline(ll, { color: '#12213d', weight: 3, dashArray: '5 5' }).addTo(g);
    ll.forEach((p, i) => L.marker(p, { icon: L.divIcon({ className: 'mv-vertex', iconSize: [14, 14], iconAnchor: [7, 7] }), interactive: false, keyboard: false, zIndexOffset: i }).addTo(g));
  }, [polygon]);

  return <div ref={el} className={className} role="application" aria-label="Map" />;
});
