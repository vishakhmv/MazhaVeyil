import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function WardMap({ wards, selectedWard, onSelectWard, latestPledgeWardId }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(new Map());

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center on Kerala coordinates (Kollam - Kulathoor - Alappuzha)
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [8.95, 76.62],
        zoom: 9,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    for (const marker of markersRef.current.values()) {
      map.removeLayer(marker);
    }
    markersRef.current.clear();

    // Add ward markers
    wards.forEach((ward) => {
      const { lat, lng } = ward.centroid || { lat: 8.95, lng: 76.62 };
      const isSelected = selectedWard && selectedWard.ward_id === ward.ward_id;
      const isRippling = latestPledgeWardId === ward.ward_id;

      const circleColor = isSelected ? '#38bdf8' : (isRippling ? '#10b981' : '#f59e0b');
      const radius = Math.max(12, Math.min(30, (ward.pledged_homes || 10) / 2));

      // Circular marker with glow
      const circle = L.circleMarker([lat, lng], {
        radius,
        color: circleColor,
        weight: isSelected ? 3 : 2,
        fillColor: circleColor,
        fillOpacity: isSelected ? 0.6 : 0.35
      }).addTo(map);

      // Tooltip
      circle.bindTooltip(`
        <div style="font-weight: 600; font-size: 13px;">${ward.name}</div>
        <div style="font-size: 11px; opacity: 0.85;">${ward.panchayat}</div>
        <div style="color: #38bdf8; font-weight: bold; margin-top: 4px;">${ward.pledged_homes} / ${ward.target_homes} Homes</div>
      `, { permanent: false, direction: 'top' });

      circle.on('click', () => {
        onSelectWard(ward);
      });

      markersRef.current.set(ward.ward_id, circle);
    });

    // If selected ward changes, pan map to it smoothly
    if (selectedWard && selectedWard.centroid) {
      map.panTo([selectedWard.centroid.lat, selectedWard.centroid.lng], {
        animate: true,
        duration: 0.8
      });
    }
  }, [wards, selectedWard, latestPledgeWardId, onSelectWard]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '380px' }}>
      <div
        id="ward-leaflet-map"
        ref={mapContainerRef}
        style={{ width: '100%', height: '100%', minHeight: '380px', borderRadius: '12px' }}
      />
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        zIndex: 500,
        background: 'rgba(10, 24, 46, 0.85)',
        backdropFilter: 'blur(8px)',
        padding: '6px 12px',
        borderRadius: '8px',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        fontSize: '11px',
        color: '#94a3b8'
      }}>
        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', marginRight: '6px' }}></span>
        Click a ward circle to inspect aggregate potential
      </div>
    </div>
  );
}
