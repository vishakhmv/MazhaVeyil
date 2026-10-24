import React from 'react';
import { Sun, CloudRain, Zap, ShieldCheck, Clock, Award, Leaf } from 'lucide-react';

export function KpiTiles({ ward, whatIfMetrics }) {
  if (!ward) {
    return (
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Select a ward on the map to view aggregate metrics.
      </div>
    );
  }

  const m = whatIfMetrics;
  const target = ward.target_homes || 100;
  const pledged = ward.pledged_homes || 0;
  const firm = ward.firm_homes || 0;
  const percent = Math.min(100, Math.round((pledged / target) * 100));

  // Quality badge style
  const qualityBadgeClass =
    ward.data_quality === 'real' ? 'badge-real' :
    ward.data_quality === 'survey+modelled' ? 'badge-survey' : 'badge-demo';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Info */}
      <div className="glass-panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc' }}>{ward.name}</h2>
              <span className={`badge-quality ${qualityBadgeClass}`}>{ward.data_quality}</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {ward.panchayat}, {ward.district} · {ward.homes_estimated} estimated homes ({ward.roofs_mapped} mapped)
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#fbbf24'
          }}>
            <Clock size={15} />
            <span>Subsidy Window: <strong>~158 days left</strong> (31 Mar 2027)</span>
          </div>
        </div>

        {/* Group Price Progress */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Koottam Group Discount Target</span>
            <span style={{ fontWeight: '600', color: 'var(--accent-blue)' }}>
              <strong>{pledged}</strong> of {target} homes ({percent}%) · {firm} firm
            </span>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            height: '12px',
            borderRadius: '999px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              width: `${percent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #0284c7 0%, #10b981 100%)',
              borderRadius: '999px',
              transition: 'width 0.4s ease'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>
            <span>Tier 1 (25 Homes)</span>
            <span>Tier 2 (50 Homes)</span>
            <span>Tier 3 (100 Homes)</span>
          </div>
        </div>
      </div>

      {/* KPI 4-Card Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px'
      }}>
        {/* Solar kW */}
        <div className="glass-panel" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--solar-amber)', marginBottom: '6px' }}>
            <Sun size={18} />
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: '600' }}>Group Solar</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }} className="tabular-nums">
            {m ? `${m.kwPlanned} kW` : (ward.potential_kw ? `${ward.potential_kw} kW` : 'Waiting...')}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
            {m ? `${m.gwhYear} GWh/yr generation` : 'Annual generation'}
          </div>
        </div>

        {/* Rain Harvest */}
        <div className="glass-panel" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--rain-cyan)', marginBottom: '6px' }}>
            <CloudRain size={18} />
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: '600' }}>Rain Harvest</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }} className="tabular-nums">
            {m ? `${m.rainCroreLitres} Cr L` : '3.6 Cr L'}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
            Well recharge &amp; storage
          </div>
        </div>

        {/* CO2 Offset */}
        <div className="glass-panel" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--kerala-green)', marginBottom: '6px' }}>
            <Leaf size={18} />
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: '600' }}>CO₂ Avoided</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }} className="tabular-nums">
            {m ? `${m.co2Tonnes} t/yr` : '300 t/yr'}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
            CEA baseline offset
          </div>
        </div>

        {/* Evening Peak Relief */}
        <div className="glass-panel" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: '#a78bfa', marginBottom: '6px' }}>
            <Zap size={18} />
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: '600' }}>Peak Relief</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }} className="tabular-nums">
            {m ? `${m.peakReliefKw} kW` : '56 kW'}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
            11kV evening peak shave
          </div>
        </div>
      </div>
    </div>
  );
}
