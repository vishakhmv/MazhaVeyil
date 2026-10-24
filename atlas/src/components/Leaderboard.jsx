import React from 'react';
import { Trophy, TrendingUp } from 'lucide-react';

export function Leaderboard({ wards, selectedWard, onSelectWard }) {
  // Sort wards by percentage towards target descending
  const sortedWards = [...wards].sort((a, b) => {
    const pctA = (a.pledged_homes || 0) / (a.target_homes || 100);
    const pctB = (b.pledged_homes || 0) / (b.target_homes || 100);
    return pctB - pctA;
  });

  return (
    <div className="glass-panel" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <Trophy size={18} color="var(--solar-amber)" />
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>
          Ward Group Progress Leaderboard
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sortedWards.map((w, idx) => {
          const target = w.target_homes || 100;
          const pledged = w.pledged_homes || 0;
          const pct = Math.min(100, Math.round((pledged / target) * 100));
          const isSelected = selectedWard && selectedWard.ward_id === w.ward_id;

          return (
            <div
              key={w.ward_id}
              onClick={() => onSelectWard(w)}
              style={{
                cursor: 'pointer',
                padding: '10px 14px',
                borderRadius: '8px',
                background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                border: isSelected ? '1px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: idx === 0 ? '#fbbf24' : (idx === 1 ? '#94a3b8' : '#cd7f32'),
                    color: '#050d1a',
                    fontWeight: '800',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>
                    {w.name}
                  </span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--rain-cyan)' }}>
                  {pct}%
                </span>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.06)',
                height: '6px',
                borderRadius: '999px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #0284c7 0%, #10b981 100%)',
                  borderRadius: '999px'
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
