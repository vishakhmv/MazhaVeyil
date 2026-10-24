import React, { useState } from 'react';
import { Copy, Check, Printer, WifiOff } from 'lucide-react';

/**
 * Resilient Mode Level 4: Complete Offline Snapshot & WhatsApp Leave-Behind Copy
 */
export function OfflineCard({ ward }) {
  const [copied, setCopied] = useState(false);

  if (!ward) return null;

  const summaryText = `*മഴവെയിൽ വാർഡ് റിപ്പോർട്ട് (MazhaVeyil Action Summary)*\nWard: ${ward.name} (${ward.panchayat}, ${ward.district})\nPledges: ${ward.pledged_homes}/${ward.target_homes} homes (${Math.round((ward.pledged_homes / ward.target_homes) * 100)}% to group price)\nGroup Solar: ${Math.round(ward.pledged_homes * 2.5)} kW | Est. Rain: 3.6 Cr Litres\nPM Surya Ghar Subsidy Deadline: 31 Mar 2027\nJoin your ward: https://mazhaveyil.kerala.gov.in`;

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(244, 63, 94, 0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f43f5e', marginBottom: '12px' }}>
        <WifiOff size={20} />
        <h4 style={{ fontSize: '15px', fontWeight: '700' }}>
          Offline Mode Active (Cached Snapshot)
        </h4>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
        No internet connection detected. Displaying the last verified panchayat snapshot. You can print the official Grama Sabha resolution sheet or copy the WhatsApp summary below.
      </p>

      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '12px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#e2e8f0',
        whiteSpace: 'pre-wrap',
        marginBottom: '14px'
      }}>
        {summaryText}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="btn-secondary" onClick={handleCopy}>
          {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
          {copied ? 'Copied to Clipboard!' : 'Copy WhatsApp Summary'}
        </button>

        <a
          href={`http://localhost:3001/print/ward/${ward.ward_id}`}
          target="_blank"
          rel="noreferrer"
          className="btn-primary"
          style={{ textDecoration: 'none', padding: '8px 14px', fontSize: '13px' }}
        >
          <Printer size={15} />
          Print Grama Sabha Sheet (A4)
        </a>
      </div>
    </div>
  );
}
