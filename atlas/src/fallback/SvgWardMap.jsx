import React from 'react';

/**
 * Resilient Mode Level 2: Lightweight Static SVG Map
 * Renders Kerala coastline contour and ward centroids with zero Leaflet/tile overhead.
 */
export function SvgWardMap({ wards, selectedWard, onSelectWard }) {
  // Normalize Kerala lat/lng (Lat ~8.3 to ~10.0, Lng ~76.0 to ~77.5) to SVG viewport (500x380)
  const minLat = 8.1, maxLat = 10.2;
  const minLng = 75.8, maxLng = 77.4;

  const project = (lat, lng) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 460 + 20;
    const y = 360 - (((lat - minLat) / (maxLat - minLat)) * 340 + 20);
    return { x, y };
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '380px', background: '#071529', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '10px' }}>
      <div style={{ position: 'absolute', top: '10px', left: '14px', zIndex: 10, fontSize: '11px', color: '#38bdf8', background: 'rgba(5, 13, 26, 0.8)', padding: '4px 8px', borderRadius: '4px' }}>
        Low-Bandwidth Mode: Static SVG Vector Map (Zero Map-Tile Network Overhead)
      </div>

      <svg viewBox="0 0 500 380" style={{ width: '100%', height: '100%' }}>
        {/* Simplified Kerala Coastline */}
        <path
          d="M 60,40 Q 120,120 180,200 T 320,310 T 420,360"
          fill="none"
          stroke="rgba(56, 189, 248, 0.25)"
          strokeWidth="3"
          strokeDasharray="6 4"
        />

        {/* Wards */}
        {wards.map((w) => {
          const { lat, lng } = w.centroid || { lat: 8.95, lng: 76.62 };
          const pt = project(lat, lng);
          const isSelected = selectedWard && selectedWard.ward_id === w.ward_id;
          const radius = Math.max(14, Math.min(26, (w.pledged_homes || 10) / 2));

          return (
            <g key={w.ward_id} onClick={() => onSelectWard(w)} style={{ cursor: 'pointer' }}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={radius}
                fill={isSelected ? '#38bdf8' : '#f59e0b'}
                fillOpacity={isSelected ? 0.8 : 0.45}
                stroke={isSelected ? '#ffffff' : '#fbbf24'}
                strokeWidth={isSelected ? 3 : 1.5}
              />
              <text
                x={pt.x}
                y={pt.y - radius - 6}
                textAnchor="middle"
                fill="#f8fafc"
                fontSize="11"
                fontWeight="600"
              >
                {w.name} ({w.pledged_homes}/{w.target_homes})
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
