import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

let heatLayerModule = null;

async function loadHeat(map) {
  if (heatLayerModule) return;
  await import("leaflet.heat");
  heatLayerModule = true;
}

export function WardMap({ wards, selectedWard, onSelectWard, latestPledgeWardId }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(new Map());
  const heatLayerRef = useRef(null);
  const [heatMode, setHeatMode] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, { center: [8.95, 76.62], zoom: 9, zoomControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors", maxZoom: 18
      }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Remove old heat layer
    if (heatLayerRef.current) { map.removeLayer(heatLayerRef.current); heatLayerRef.current = null; }

    // Clear markers
    for (const marker of markersRef.current.values()) map.removeLayer(marker);
    markersRef.current.clear();

    if (heatMode) {
      // Heatmap mode
      loadHeat(map).then(() => {
        const points = wards.map(w => {
          const { lat, lng } = w.centroid || { lat: 8.95, lng: 76.62 };
          const intensity = Math.min(1, (w.pledged_homes || 0) / (w.target_homes || 100));
          return [lat, lng, intensity];
        });
        if (window.L && L.heatLayer) {
          heatLayerRef.current = L.heatLayer(points, {
            radius: 40, blur: 25, maxZoom: 17,
            gradient: { 0.2: "#0284c7", 0.5: "#38bdf8", 0.75: "#fbbf24", 1.0: "#ef4444" }
          }).addTo(map);
        }
        // Still add clickable invisible markers
        wards.forEach((ward) => {
          const { lat, lng } = ward.centroid || { lat: 8.95, lng: 76.62 };
          const circle = L.circleMarker([lat, lng], { radius: 14, color: "transparent", fillColor: "transparent", fillOpacity: 0 }).addTo(map);
          circle.bindTooltip(`<div style="font-weight:600;font-size:13px;">${ward.name}</div><div style="color:#38bdf8;font-weight:bold;">${ward.pledged_homes} / ${ward.target_homes} Pledges</div>`, { permanent: false, direction: "top" });
          circle.on("click", () => onSelectWard(ward));
          markersRef.current.set(ward.ward_id, circle);
        });
      });
    } else {
      // Normal marker mode
      wards.forEach((ward) => {
        const { lat, lng } = ward.centroid || { lat: 8.95, lng: 76.62 };
        const isSelected = selectedWard && selectedWard.ward_id === ward.ward_id;
        const isRippling = latestPledgeWardId === ward.ward_id;
        const circleColor = isSelected ? "#38bdf8" : (isRippling ? "#10b981" : "#f59e0b");
        const radius = Math.max(12, Math.min(30, (ward.pledged_homes || 10) / 2));
        const circle = L.circleMarker([lat, lng], {
          radius, color: circleColor, weight: isSelected ? 3 : 2,
          fillColor: circleColor, fillOpacity: isSelected ? 0.6 : 0.35
        }).addTo(map);
        circle.bindTooltip(`<div style="font-weight:600;font-size:13px;">${ward.name}</div><div style="font-size:11px;opacity:0.85;">${ward.panchayat}</div><div style="color:#38bdf8;font-weight:bold;margin-top:4px;">${ward.pledged_homes} / ${ward.target_homes} Homes</div>`, { permanent: false, direction: "top" });
        circle.on("click", () => onSelectWard(ward));
        markersRef.current.set(ward.ward_id, circle);
      });
    }

    if (selectedWard && selectedWard.centroid) {
      map.panTo([selectedWard.centroid.lat, selectedWard.centroid.lng], { animate: true, duration: 0.8 });
    }
  }, [wards, selectedWard, latestPledgeWardId, onSelectWard, heatMode]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "380px" }}>
      <div id="ward-leaflet-map" ref={mapContainerRef} style={{ width: "100%", height: "100%", minHeight: "380px", borderRadius: "12px" }} />

      {/* Heatmap toggle button */}
      <button
        onClick={() => setHeatMode(h => !h)}
        style={{
          position: "absolute", top: "12px", right: "12px", zIndex: 1000,
          background: heatMode ? "rgba(56,189,248,0.9)" : "rgba(10,24,46,0.85)",
          backdropFilter: "blur(8px)", border: `1px solid ${heatMode ? "#38bdf8" : "rgba(56,189,248,0.3)"}`,
          color: heatMode ? "#0a182e" : "#38bdf8", borderRadius: "8px",
          padding: "6px 12px", fontSize: "11px", fontWeight: "600", cursor: "pointer",
          display: "flex", alignItems: "center", gap: "5px", transition: "all 0.2s"
        }}
      >
        <span style={{ fontSize: "13px" }}>🔥</span>
        {heatMode ? "Heatmap ON" : "Heatmap OFF"}
      </button>

      {/* Legend */}
      {heatMode && (
        <div style={{ position: "absolute", bottom: "12px", left: "12px", zIndex: 500, background: "rgba(10,24,46,0.9)", backdropFilter: "blur(8px)", padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(56,189,248,0.2)", fontSize: "10px", color: "#94a3b8" }}>
          <div style={{ marginBottom: "4px", fontWeight: "600", color: "#f8fafc" }}>Pledge Density</div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ display: "inline-block", width: "60px", height: "8px", background: "linear-gradient(90deg, #0284c7, #38bdf8, #fbbf24, #ef4444)", borderRadius: "4px" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", marginTop: "2px" }}>
            <span>Low</span><span>High</span>
          </div>
        </div>
      )}

      {!heatMode && (
        <div style={{ position: "absolute", bottom: "12px", left: "12px", zIndex: 500, background: "rgba(10,24,46,0.85)", backdropFilter: "blur(8px)", padding: "6px 12px", borderRadius: "8px", border: "1px solid rgba(56,189,248,0.2)", fontSize: "11px", color: "#94a3b8" }}>
          <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b", marginRight: "6px" }} />
          Click a ward circle to inspect aggregate potential
        </div>
      )}
    </div>
  );
}
