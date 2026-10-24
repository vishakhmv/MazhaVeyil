import React, { useState } from 'react';
import { 
  Leaf, Droplets, Sun, Shield, Users, ArrowUpRight, 
  Download, FileCheck, CheckCircle2, ChevronRight, BarChart2,
  AlertCircle
} from 'lucide-react';
import { computeSustainabilityImpact, DISTRICT_RAINFALL_MM } from '../lib/sustainability';

export function SustainabilityTab({ ward, adoptionPct = 25 }) {
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState(ward?.district || 'Kollam');

  if (!ward) {
    return (
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Select a ward on the map to evaluate sustainability and climate impact.
      </div>
    );
  }

  const homesJoining = Math.max(1, Math.round((ward.homes_estimated || 500) * (adoptionPct / 100)));
  const impact = computeSustainabilityImpact({ ...ward, district: selectedDistrict }, homesJoining);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* Overview Banner */}
      <div className="glass-panel" style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                background: 'rgba(5, 150, 105, 0.15)', color: '#34d399', 
                border: '1px solid rgba(5, 150, 105, 0.3)', padding: '2px 8px', 
                borderRadius: '4px', fontSize: '11px', fontWeight: '700' 
              }}>
                SDG 6 · 7 · 11 · 13
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                UN Sustainable Development Framework
              </span>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', marginTop: '6px' }}>
              Ward Sustainability & Resilience Model
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Ecological and grid impact modeled for {homesJoining} participating homes in {ward.name} ({ward.panchayat}).
            </p>
          </div>

          {/* District Rainfall Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>IMD Rain Baseline:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              style={{
                background: '#17243b',
                color: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {Object.keys(DISTRICT_RAINFALL_MM).filter(k => k !== 'default').map(d => (
                <option key={d} value={d}>{d} ({DISTRICT_RAINFALL_MM[d]} mm)</option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 Pillars Summary Grid */}
        <div style={{ 
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
          gap: '10px', marginTop: '14px' 
        }}>
          <div style={{ background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.2)', padding: '10px', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', color: '#38bdf8', fontWeight: '600', textTransform: 'uppercase' }}>SDG 6: Water</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }} className="tabular-nums">
              {impact.croreLitres} <span style={{ fontSize: '11px', fontWeight: '500' }}>Cr L</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Annual roof rain</div>
          </div>

          <div style={{ background: 'rgba(217, 119, 6, 0.08)', border: '1px solid rgba(217, 119, 6, 0.2)', padding: '10px', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', color: '#fbbf24', fontWeight: '600', textTransform: 'uppercase' }}>SDG 7: Solar</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }} className="tabular-nums">
              {impact.totalKw} <span style={{ fontSize: '11px', fontWeight: '500' }}>kW</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{Math.round(impact.annualSolarGenerationKwh / 1000)} MWh clean energy</div>
          </div>

          <div style={{ background: 'rgba(5, 150, 105, 0.08)', border: '1px solid rgba(5, 150, 105, 0.2)', padding: '10px', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', color: '#34d399', fontWeight: '600', textTransform: 'uppercase' }}>SDG 13: Climate</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }} className="tabular-nums">
              {impact.annualGridCo2SavedTonnes} <span style={{ fontSize: '11px', fontWeight: '500' }}>t CO₂e</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>CEA baseline offset</div>
          </div>

          <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)', padding: '10px', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', color: '#c084fc', fontWeight: '600', textTransform: 'uppercase' }}>SDG 11: Jobs</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }} className="tabular-nums">
              {impact.greenJobsSupported} <span style={{ fontSize: '11px', fontWeight: '500' }}>Units</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Kudumbashree green jobs</div>
          </div>
        </div>
      </div>

      {/* Pillar 1: Water Security & Well Recharge (SDG 6) */}
      <div className="glass-panel" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <div style={{ 
            width: '24px', height: '24px', borderRadius: '6px', 
            background: 'rgba(2, 132, 199, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' 
          }}>
            <Droplets size={14} />
          </div>
          <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
            ഭൂമി ജലം — Groundwater Recharge & Drought Resilience
          </h4>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
          <div style={{ background: '#17243b', padding: '10px', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Aquifer Recharge</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#38bdf8', marginTop: '2px' }} className="tabular-nums">
              {(impact.aquiferRechargedLitres / 100000).toFixed(1)} Lakh L
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
              Direct dug well injection
            </div>
          </div>

          <div style={{ background: '#17243b', padding: '10px', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Drought Security Days</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#34d399', marginTop: '2px' }} className="tabular-nums">
              +{impact.droughtSecurityDaysGained} Days
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
              Extended summer baseflow
            </div>
          </div>

          <div style={{ background: '#17243b', padding: '10px', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tankers Displaced</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fbbf24', marginTop: '2px' }} className="tabular-nums">
              {impact.tankersDisplaced} Trips
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
              Saves ₹{impact.tankerMoneySavedInr.toLocaleString()} &amp; {impact.tankerDieselCo2SavedKg} kg CO₂
            </div>
          </div>
        </div>

        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
          Kerala has over 55 lakh dug wells, but summer drought (monsoon 28% below normal) exhausts shallow water tables by February. 
          The Mazhapolima sand-charcoal gravity recharge method prevents saline intrusion in coastal wards and guarantees summer well water.
        </p>
      </div>

      {/* Pillar 2: Veyil Samayam & Feeder Relief (SDG 7) */}
      <div className="glass-panel" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <div style={{ 
            width: '24px', height: '24px', borderRadius: '6px', 
            background: 'rgba(217, 119, 6, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' 
          }}>
            <Sun size={14} />
          </div>
          <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
            വെയിൽ സമയം — Solar Self-Consumption &amp; 6,200 MW Peak Shaving
          </h4>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
          <div style={{ background: '#17243b', padding: '10px', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>11kV Feeder Relief</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fbbf24', marginTop: '2px' }} className="tabular-nums">
              {impact.feederPeakReliefKw} kW
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
              Evening peak shave (6-11 PM)
            </div>
          </div>

          <div style={{ background: '#17243b', padding: '10px', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Load Shifted / Year</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#38bdf8', marginTop: '2px' }} className="tabular-nums">
              {impact.peakUnitsShiftedAnnual.toLocaleString()} Units
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
              Pumps &amp; motors moved to noon
            </div>
          </div>

          <div style={{ background: '#17243b', padding: '10px', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Avoided Peak Power Cost</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#34d399', marginTop: '2px' }} className="tabular-nums">
              ₹{impact.ksebAvoidedProcurementInr.toLocaleString()}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
              Saves costly KSEB spot purchases
            </div>
          </div>
        </div>

        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
          On 23 April 2026 Kerala power demand hit a record ~6,200 MW, forcing KSEB to shed feeders. 
          Solar homes using power directly for agricultural pumps and washing machines between 10 AM and 2 PM 
          reduce evening peak stress and save KSEB from ₹500+ Cr annual banking deficits.
        </p>
      </div>

      {/* Pillar 3 & 4: Local Economy & Climate Action Resolution */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        background: '#131f33', border: '1px solid var(--border-subtle)', 
        borderRadius: '8px', padding: '12px 16px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileCheck size={18} color="#34d399" />
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#f8fafc' }}>
              Panchayat Climate Action Plan (PCAP) Briefing
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Exportable draft resolution for the upcoming Grama Sabha session
            </div>
          </div>
        </div>

        <button 
          onClick={() => setShowResolutionModal(true)}
          className="btn-secondary"
          style={{ fontSize: '11px', padding: '6px 12px' }}
        >
          View Draft Resolution <ChevronRight size={13} />
        </button>
      </div>

      {/* Resolution Modal */}
      {showResolutionModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '640px', width: '100%', padding: '22px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Leaf size={16} color="#34d399" />
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
                  ഗ്രാമസഭാ കർമ്മപദ്ധതി പ്രമേയം (Draft Resolution)
                </h3>
              </div>
              <button 
                onClick={() => setShowResolutionModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p>
                <strong>വാർഡ്:</strong> {ward.name} ({ward.panchayat}, {ward.district})
              </p>
              <p>
                <strong>വിഷയം:</strong> മഴവെയിൽ വാർഡ് കൂട്ടം ഊർജ്ജ-ജല സുസ്ഥിരതാ പദ്ധതി അംഗീകാരം.
              </p>
              <div style={{ background: '#0e1726', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <em>
                  "വാർഡിലെ {homesJoining} വീടുകൾക്കായി പ്രഖ്യാപിച്ചിരിക്കുന്ന <strong>{impact.totalKw} kW</strong> സൗരോർജ്ജ പദ്ധതിയും, 
                  വാർഷികം <strong>{impact.croreLitres} കോടി ലിറ്റർ</strong> മഴവെള്ളം ശേഖരിച്ച് കിണർ റീചാർജ്ജ് ചെയ്യുന്ന മഴപൊലിമ ഫിൽട്ടർ പദ്ധതിയും 
                  ഗ്രാമസഭ ഐകകണ്ഠ്യേന അംഗീകരിക്കുന്നു. വാർഷികം {impact.annualGridCo2SavedTonnes} ടൺ കാർബൺ പുറന്തള്ളൽ ഒഴിവാക്കുന്നതിലൂടെയും 
                  വേനൽക്കാലത്ത് കിണറുകളിൽ {impact.droughtSecurityDaysGained} അധിക ദിവസങ്ങളിലേക്ക് കുടിവെള്ള ലഭ്യത ഉറപ്പാക്കുന്നതിലൂടെയും 
                  വാർഡ് മാതൃകാ ഹരിത വാർഡായി മാറാൻ പ്രതിജ്ഞാബദ്ധമാകുന്നു."
                </em>
              </div>
              <ul style={{ paddingLeft: '18px', color: 'var(--text-muted)', fontSize: '11px' }}>
                <li>കുടുംബശ്രീ ഹരിത കർമ്മസേന വഴി പ്രാദേശിക ഫിൽട്ടർ സർവീസിംഗും സോളാർ പാനൽ പരിപാലനവും ഏകോപിപ്പിക്കും ({impact.greenJobsSupported} യൂണിറ്റുകൾ).</li>
                <li>വേനൽക്കാലത്ത് {impact.tankersDisplaced} ടാങ്കർ ലോഡ് കുടിവെള്ള ചെലവുകൾ ലാഭിക്കാൻ ലക്ഷ്യമിടുന്നു (ലാഭം: ₹{impact.tankerMoneySavedInr.toLocaleString()}).</li>
                <li>വൈകുന്നേരത്തെ 6-11 മണി പീക്ക് ലോഡ് {impact.feederPeakReliefKw} kW കുറയ്ക്കാൻ 'വെയിൽ സമയം' ലോഡ്-ഷിഫ്റ്റിംഗ് പ്രോത്സാഹിപ്പിക്കും.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <button 
                onClick={() => setShowResolutionModal(false)}
                className="btn-secondary"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  window.print();
                }}
                className="btn-primary"
              >
                <Download size={14} /> Print / Export Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
