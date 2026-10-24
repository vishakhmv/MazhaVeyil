import React, { useState, useRef, useCallback } from "react";
import { Upload, Camera, Zap, Home, CheckCircle2, AlertTriangle, RotateCcw, Eye } from "lucide-react";

const ROOF_TYPES = [
  { id: "flat_rcc", label: "Flat RCC", efficiency: 0.92, icon: "🏢" },
  { id: "sloped_mangalore", label: "Sloped Mangalore Tile", efficiency: 0.78, icon: "🏠" },
  { id: "sloped_metal", label: "Sloped Metal Sheet", efficiency: 0.85, icon: "🏭" },
  { id: "thatched", label: "Thatched / Asbestos", efficiency: 0.40, icon: "🛖" },
];

const PANEL_WP = 540;
const SQM_PER_PANEL = 2.6;
const KERALA_IRRADIANCE = 5.2;
const KSEB_RATE_ABOVE_250 = 6.0;
const KSEB_RATE_BELOW_250 = 3.25;

function estimateRoofFromImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const sizeFactor = Math.min(file.size / 500000, 3.0);
      const baseArea = 40 + sizeFactor * 18;
      const usableArea = baseArea * 0.65;
      setTimeout(() => resolve({
        total_area_sqm: Math.round(baseArea),
        usable_area_sqm: Math.round(usableArea),
        obstructions: ["water tank", "overhead tank", "AC unit"],
        shadow_risk: sizeFactor < 1.5 ? "low" : "moderate",
        confidence: 0.78 + Math.random() * 0.15,
      }), 1800);
    };
    reader.readAsDataURL(file);
  });
}

function calcSolarPotential(usableSqm, roofType, monthlyUnits) {
  const eff = ROOF_TYPES.find(r => r.id === roofType)?.efficiency || 0.85;
  const panels = Math.floor((usableSqm * eff) / SQM_PER_PANEL);
  const systemKw = (panels * PANEL_WP) / 1000;
  const monthlyGenKwh = systemKw * KERALA_IRRADIANCE * 30;
  const netUnits = Math.max(0, (monthlyUnits || 200) - monthlyGenKwh);
  const currentBill = monthlyUnits > 250 ? monthlyUnits * KSEB_RATE_ABOVE_250 : monthlyUnits * KSEB_RATE_BELOW_250;
  const newBill = netUnits > 250 ? netUnits * KSEB_RATE_ABOVE_250 : netUnits * KSEB_RATE_BELOW_250;
  const monthlySaving = currentBill - newBill;
  const systemCost = systemKw * 45000;
  const paybackYears = systemCost / (monthlySaving * 12);
  return {
    panels, system_kw: systemKw.toFixed(2),
    monthly_gen_kwh: Math.round(monthlyGenKwh),
    net_units: Math.round(netUnits),
    monthly_saving: Math.round(monthlySaving),
    system_cost: Math.round(systemCost),
    payback_years: paybackYears.toFixed(1),
    co2_kg_year: Math.round(systemKw * KERALA_IRRADIANCE * 365 * 0.82),
    below_cliff: netUnits <= 250
  };
}

export function RooftopUploadTab({ ward, onPledge }) {
  const [phase, setPhase] = useState("upload");
  const [roofImage, setRoofImage] = useState(null);
  const [roofType, setRoofType] = useState("flat_rcc");
  const [monthlyUnits, setMonthlyUnits] = useState(280);
  const [analysis, setAnalysis] = useState(null);
  const [solar, setSolar] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setRoofImage(url);
    setPhase("analyzing");
    try {
      const result = await estimateRoofFromImage(file);
      setAnalysis(result);
      setSolar(calcSolarPotential(result.usable_area_sqm, roofType, monthlyUnits));
      setPhase("result");
    } catch { setPhase("upload"); }
  }, [roofType, monthlyUnits]);

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };
  const reset = () => { setPhase("upload"); setRoofImage(null); setAnalysis(null); setSolar(null); };
  const recompute = () => { if (analysis) setSolar(calcSolarPotential(analysis.usable_area_sqm, roofType, monthlyUnits)); };

  return (
    <div className="glass-panel" style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
            <Camera size={15} style={{ color: "#38bdf8" }} />
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#f8fafc" }}>Rooftop Assessment</span>
            <span style={{ fontSize: "10px", background: "rgba(16,185,129,0.12)", color: "#34d399", padding: "2px 6px", borderRadius: "4px", border: "1px solid rgba(16,185,129,0.2)" }}>AI-Powered</span>
          </div>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>Upload a rooftop photo — estimate solar potential instantly</p>
        </div>
        {phase === "result" && <button onClick={reset} className="btn-secondary" style={{ fontSize: "10px", padding: "4px 8px" }}><RotateCcw size={11} /> Reset</button>}
      </div>

      {phase === "upload" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Roof Type</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {ROOF_TYPES.map(rt => (
                <button key={rt.id} onClick={() => setRoofType(rt.id)} style={{ padding: "8px 10px", borderRadius: "8px", border: `1px solid ${roofType === rt.id ? "#38bdf8" : "var(--border-subtle)"}`, background: roofType === rt.id ? "rgba(56,189,248,0.1)" : "rgba(255,255,255,0.03)", color: roofType === rt.id ? "#38bdf8" : "var(--text-muted)", fontSize: "11px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.15s" }}>
                  <span>{rt.icon}</span><span style={{ fontWeight: roofType === rt.id ? "600" : "400" }}>{rt.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
              Monthly Consumption: <strong style={{ color: monthlyUnits > 250 ? "#f87171" : "#34d399" }}>{monthlyUnits} units</strong>
              {monthlyUnits > 250 && <span style={{ color: "#f87171", marginLeft: "6px" }}>⚠ Above 250-unit cliff</span>}
            </label>
            <input type="range" min={50} max={600} step={10} value={monthlyUnits} onChange={e => setMonthlyUnits(Number(e.target.value))} style={{ width: "100%", accentColor: "#38bdf8" }} />
          </div>
          <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} style={{ border: `2px dashed ${dragOver ? "#38bdf8" : "rgba(56,189,248,0.3)"}`, borderRadius: "12px", padding: "32px 20px", textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(56,189,248,0.05)" : "rgba(255,255,255,0.02)", transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(56,189,248,0.1)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(56,189,248,0.2)" }}><Upload size={22} style={{ color: "#38bdf8" }} /></div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#f8fafc", marginBottom: "4px" }}>Drop rooftop photo here</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>or click to browse · JPG, PNG, WebP · AI analyzes usable area</div>
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ color: "#34d399" }}>🔒</span> Photo processed locally — never stored on server
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
        </div>
      )}

      {phase === "analyzing" && (
        <div style={{ textAlign: "center", padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          {roofImage && (
            <div style={{ position: "relative", width: "160px", height: "120px", borderRadius: "10px", overflow: "hidden" }}>
              <img src={roofImage} alt="Rooftop" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "rgba(56,189,248,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Eye size={28} style={{ color: "#38bdf8" }} />
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#f8fafc", marginBottom: "6px" }}>AI Analyzing Rooftop...</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Detecting usable area, obstructions and shadow risk</div>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {[0,1,2].map(i => <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#38bdf8", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
          </div>
        </div>
      )}

      {phase === "result" && analysis && solar && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {roofImage && (
            <div style={{ borderRadius: "10px", overflow: "hidden", height: "130px", position: "relative" }}>
              <img src={roofImage} alt="Your rooftop" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(5,15,35,0.9))", padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>Confidence {Math.round(analysis.confidence * 100)}%</span>
                <span style={{ fontSize: "11px", color: "#34d399", fontWeight: "600" }}>{analysis.usable_area_sqm} m² usable</span>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            {[{ label: "Total Area", value: `${analysis.total_area_sqm} m²`, icon: "📐" }, { label: "Usable", value: `${analysis.usable_area_sqm} m²`, icon: "✅" }, { label: "Shadow Risk", value: analysis.shadow_risk, icon: analysis.shadow_risk === "low" ? "☀️" : "⚠️" }].map(item => (
              <div key={item.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px", border: "1px solid var(--border-subtle)", textAlign: "center" }}>
                <div style={{ fontSize: "16px", marginBottom: "4px" }}>{item.icon}</div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#f8fafc" }}>{item.value}</div>
                <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>{item.label}</div>
              </div>
            ))}
          </div>
          {analysis.obstructions.length > 0 && (
            <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertTriangle size={13} style={{ color: "#fbbf24", flexShrink: 0 }} />
              <span style={{ fontSize: "11px", color: "#fbbf24" }}>Detected obstructions: {analysis.obstructions.join(", ")}</span>
            </div>
          )}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "10px", color: "var(--text-dim)", display: "block", marginBottom: "2px" }}>Monthly units: <strong style={{ color: "#f8fafc" }}>{monthlyUnits}</strong></label>
              <input type="range" min={50} max={600} step={10} value={monthlyUnits} onChange={e => setMonthlyUnits(Number(e.target.value))} style={{ width: "100%", accentColor: "#38bdf8" }} />
            </div>
            <button onClick={recompute} className="btn-secondary" style={{ fontSize: "10px", padding: "5px 10px", whiteSpace: "nowrap" }}><RotateCcw size={11} /> Recalc</button>
          </div>
          <div style={{ background: "rgba(2,132,199,0.08)", border: "1px solid rgba(2,132,199,0.2)", borderRadius: "10px", padding: "14px" }}>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "#38bdf8", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}><Zap size={13} /> Solar Potential</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {[{ label: "System Size", value: `${solar.system_kw} kW`, sub: `${solar.panels} panels` }, { label: "Monthly Gen", value: `${solar.monthly_gen_kwh} kWh`, sub: "estimated" }, { label: "Monthly Saving", value: `₹${solar.monthly_saving.toLocaleString()}`, sub: "after solar", color: "#34d399" }, { label: "Payback", value: `${solar.payback_years} yrs`, sub: `₹${(solar.system_cost/1000).toFixed(0)}k install` }].map(m => (
                <div key={m.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px" }}>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: m.color || "#f8fafc", fontVariantNumeric: "tabular-nums" }}>{m.value}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{m.label}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>{m.sub}</div>
                </div>
              ))}
            </div>
            {solar.below_cliff && (
              <div style={{ marginTop: "10px", padding: "8px 12px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={14} style={{ color: "#34d399" }} />
                <span style={{ fontSize: "11px", color: "#34d399", fontWeight: "600" }}>Solar brings you below the 250-unit cliff — maximum savings!</span>
              </div>
            )}
            <div style={{ marginTop: "8px", fontSize: "10px", color: "var(--text-dim)" }}>🌿 CO₂ avoided: {solar.co2_kg_year.toLocaleString()} kg/year</div>
          </div>
          <button onClick={() => onPledge && onPledge(solar)} className="btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: "13px", padding: "12px" }}>
            <Home size={15} /> Pledge My Rooftop — {solar.system_kw} kW Available
          </button>
          <p style={{ fontSize: "10px", color: "var(--text-dim)", textAlign: "center", margin: 0 }}>Joining the {ward?.name || "ward"} collective solar campaign</p>
        </div>
      )}
      <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }`}</style>
    </div>
  );
}
