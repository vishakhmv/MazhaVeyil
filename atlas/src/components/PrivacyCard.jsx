import React from 'react';
import { ShieldCheck, Lock, EyeOff, FileText } from 'lucide-react';

export function PrivacyCard() {
  return (
    <div className="glass-panel" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <ShieldCheck size={18} color="var(--kerala-green)" />
        <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Privacy-by-Design Architecture
        </h4>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '12px' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ color: 'var(--kerala-green)', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={14} /> What We Never Store
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Bill photo images never touch disk (RAM-only). No consumer names, exact GPS addresses, or full consumer numbers are stored or mapped.
          </p>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ color: 'var(--accent-blue)', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <EyeOff size={14} /> Ward-Level Aggregates Only
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            The Ward Atlas displays counts per ward only. Households are salted with SHA-256 (`household_key`). Wards under 5 pledges are masked.
          </p>
        </div>
      </div>
    </div>
  );
}
