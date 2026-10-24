import React from 'react';
import { Activity, Radio } from 'lucide-react';

export function LiveTicker({ events, connectionStatus }) {
  const isLive = connectionStatus === 'connected';

  return (
    <div className="glass-panel" style={{ padding: '14px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="live-pulse" style={{ background: isLive ? 'var(--kerala-green)' : '#f59e0b' }} />
          <h4 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#f8fafc' }}>
            Live Koottam Activity
          </h4>
        </div>
        <span style={{
          fontSize: '11px',
          color: isLive ? 'var(--kerala-green)' : '#f59e0b',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <Radio size={13} />
          {isLive ? 'Realtime Connected' : 'Polling Sync Mode'}
        </span>
      </div>

      <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {events && events.length > 0 ? (
          events.slice(0, 5).map((ev, index) => (
            <div
              key={index}
              style={{
                fontSize: '12px',
                padding: '6px 10px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '6px',
                borderLeft: '3px solid #10b981',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>
                New pledge in <strong>{ev.ward_id}</strong>: {ev.pledged} of {ev.target} homes
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'}
              </span>
            </div>
          ))
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0' }}>
            Listening for ward pledges... Pledges appear here anonymously.
          </div>
        )}
      </div>
    </div>
  );
}
