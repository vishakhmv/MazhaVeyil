import React from 'react';
import { Sliders, Sparkles } from 'lucide-react';

export function WhatIfSlider({ adoptionPct, onChangeAdoption, homesEstimated }) {
  const PRESETS = [10, 25, 50, 100];
  const homesAtCurrent = Math.round((homesEstimated || 500) * (adoptionPct / 100));

  return (
    <div className="glass-panel" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} color="var(--rain-cyan)" />
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>
            Ward Adoption "What-If" Simulator
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} className="tabular-nums">
          <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--rain-cyan)' }}>
            {adoptionPct}%
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            ({homesAtCurrent} of {homesEstimated || 500} Homes)
          </span>
        </div>
      </div>

      <input
        id="what-if-adoption-slider"
        type="range"
        min="0"
        max="100"
        step="1"
        value={adoptionPct}
        onChange={(e) => onChangeAdoption(Number(e.target.value))}
        style={{ marginBottom: '14px' }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
          Quick scenarios:
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {PRESETS.map((p) => (
            <button
              key={p}
              id={`preset-btn-${p}`}
              className={`btn-secondary ${adoptionPct === p ? 'active' : ''}`}
              onClick={() => onChangeAdoption(p)}
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              {p === 25 ? `${p}% (Pilot Benchmark)` : `${p}%`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
