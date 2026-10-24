import React from 'react';

/**
 * Resilient Mode Level 3: Plain Data Table
 * For extremely constrained 2G networks in rural panchayats.
 */
export function TableView({ wards, selectedWard, onSelectWard }) {
  return (
    <div style={{ background: '#071529', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '16px', overflowX: 'auto' }}>
      <div style={{ fontSize: '11px', color: '#f59e0b', marginBottom: '12px' }}>
        Ultra-Low-Bandwidth Mode: Tabular View (Zero graphics, minimal memory)
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'left', color: 'var(--text-muted)' }}>
            <th style={{ padding: '8px' }}>Ward</th>
            <th style={{ padding: '8px' }}>Panchayat</th>
            <th style={{ padding: '8px' }}>Pledged</th>
            <th style={{ padding: '8px' }}>Target</th>
            <th style={{ padding: '8px' }}>Progress</th>
            <th style={{ padding: '8px' }}>Status</th>
            <th style={{ padding: '8px' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {wards.map((w) => {
            const target = w.target_homes || 100;
            const pledged = w.pledged_homes || 0;
            const pct = Math.min(100, Math.round((pledged / target) * 100));
            const isSelected = selectedWard && selectedWard.ward_id === w.ward_id;

            return (
              <tr
                key={w.ward_id}
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  background: isSelected ? 'rgba(56, 189, 248, 0.1)' : 'transparent'
                }}
              >
                <td style={{ padding: '10px 8px', fontWeight: '600', color: '#f8fafc' }}>{w.name}</td>
                <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>{w.panchayat}</td>
                <td style={{ padding: '10px 8px', color: 'var(--accent-blue)', fontWeight: 'bold' }}>{pledged}</td>
                <td style={{ padding: '10px 8px' }}>{target}</td>
                <td style={{ padding: '10px 8px', color: 'var(--kerala-green)', fontWeight: '600' }}>{pct}%</td>
                <td style={{ padding: '10px 8px' }}>
                  <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)' }}>
                    {w.campaign_status || 'open'}
                  </span>
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => onSelectWard(w)}
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                  >
                    Select
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
