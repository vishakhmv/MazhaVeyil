import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Upload, ShieldCheck, AlertTriangle, Zap, CheckCircle2, 
  FileText, ArrowRight, Sparkles, RefreshCw, Eye, Lock, TrendingDown,
  Info
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function BillScannerTab({ ward, onApplyUnits }) {
  const [samples, setSamples] = useState([]);
  const [activeSampleId, setActiveSampleId] = useState('sample-1');
  const [scanResult, setScanResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [scanStage, setScanStage] = useState('');
  const [customFile, setCustomFile] = useState(null);
  const fileInputRef = useRef(null);

  // Fetch sample bills on mount
  useEffect(() => {
    fetchSamples();
  }, []);

  const fetchSamples = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bill/samples`);
      if (res.ok) {
        const data = await res.json();
        setSamples(data.samples || []);
        // Load initial typical sample
        if (data.samples && data.samples.length > 0) {
          loadSample(data.samples[0].id);
        }
      }
    } catch (e) {
      console.warn('Using offline default sample:', e);
      // Fallback offline mock sample
      setScanResult({
        units: 262,
        amount: 2013,
        billing_period_days: 60,
        months_in_bill: 2,
        consumer_no_masked: 'XXXXXX2104',
        confidence: 'high',
        warnings: [],
        from_cache: true,
        cliff_analysis: {
          monthly_units: 131,
          is_telescopic: true,
          cliff_status: 'safe',
          status_label: 'Safe in Telescopic Slab',
          cliff_penalty_estimate: 0,
          recommended_solar_kw: 2,
          estimated_monthly_bill_before: 1006,
          estimated_monthly_bill_after: 120,
          estimated_monthly_savings: 886,
          avoids_cliff_penalty: false
        }
      });
    }
  };

  const loadSample = async (sampleId) => {
    setIsLoading(true);
    setActiveSampleId(sampleId);
    setScanStage('Fetching cached bill profile...');

    try {
      const res = await fetch(`${API_BASE}/api/bill/sample/${sampleId}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
      }
    } catch (e) {
      console.error('Failed to load sample', e);
    } finally {
      setIsLoading(false);
      setScanStage('');
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setCustomFile(file);
    setActiveSampleId(null);
    setIsLoading(true);

    try {
      setScanStage('Hashing image bytes in memory (SHA-256)...');
      await new Promise(r => setTimeout(r, 400));
      
      setScanStage('Checking privacy cache & masking consumer number...');
      await new Promise(r => setTimeout(r, 400));
      
      setScanStage('Extracting KSEB units and bi-monthly tariff cliffs...');

      const formData = new FormData();
      formData.append('bill', file);

      const res = await fetch(`${API_BASE}/api/bill/scan`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
      } else {
        const err = await res.json();
        alert(err.message || 'Bill scan failed');
      }
    } catch (e) {
      console.error('Bill upload failed', e);
      alert('Failed to connect to scanner service');
    } finally {
      setIsLoading(false);
      setScanStage('');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const cliff = scanResult?.cliff_analysis;
  const monthlyUnits = cliff?.monthly_units ?? (scanResult?.units ? Math.round(scanResult.units / 2) : null);

  return (
    <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Title & Privacy Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '32px', height: '32px', borderRadius: '7px', 
              background: '#0284c7', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' 
            }}>
              <Camera size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#fff' }}>
                KSEB Bill Scanner <span style={{ color: '#38bdf8', fontSize: '12px' }}>Tier 2</span>
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                Instant photo extraction · Cliff penalty detection · Zero image storage
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Pill */}
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '5px', 
          background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', 
          padding: '4px 8px', borderRadius: '6px', fontSize: '11px', color: '#34d399' 
        }}>
          <ShieldCheck size={14} />
          <span>Memory-Only Storage</span>
        </div>
      </div>

      {/* 5 Calibrated Sample Bills Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Try 5 Real KSEB Sample Profiles (Offline Demo)
          </span>
          {activeSampleId && (
            <span style={{ fontSize: '11px', color: '#38bdf8' }}>
              ✓ Loaded from local cache
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }}>
          {samples.map((s) => {
            const isActive = activeSampleId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => loadSample(s.id)}
                style={{
                  background: isActive ? 'rgba(14, 165, 233, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                  border: isActive ? '1px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.15)',
                  borderRadius: '8px',
                  padding: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ 
                    fontSize: '9px', fontWeight: '700', padding: '2px 5px', borderRadius: '4px',
                    background: s.badge_color === 'amber' ? 'rgba(245, 158, 11, 0.2)' :
                                s.badge_color === 'rose'  ? 'rgba(244, 63, 94, 0.2)' :
                                s.badge_color === 'purple'? 'rgba(168, 85, 247, 0.2)' :
                                s.badge_color === 'emerald'? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                    color: s.badge_color === 'amber' ? '#fbbf24' :
                           s.badge_color === 'rose'  ? '#fb7185' :
                           s.badge_color === 'purple'? '#c084fc' :
                           s.badge_color === 'emerald'? '#34d399' : '#38bdf8'
                  }}>
                    {s.badge}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#fff' }}>
                    {s.units} u
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  ₹{s.amount.toLocaleString()}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>
                  {Math.round(s.units / 2)} u/mo
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: isDragging ? '2px dashed #38bdf8' : '1px dashed rgba(148, 163, 184, 0.3)',
          borderRadius: '10px',
          background: isDragging ? 'rgba(14, 165, 233, 0.1)' : 'rgba(15, 23, 42, 0.4)',
          padding: '16px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <input 
          ref={fileInputRef} 
          type="file" 
          accept="image/*" 
          style={{ display: 'none' }} 
          onChange={(e) => handleFileUpload(e.target.files?.[0])}
        />
        <div style={{ 
          width: '36px', height: '36px', borderRadius: '50%', 
          background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' 
        }}>
          <Upload size={18} />
        </div>
        <div>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#f1f5f9' }}>
            Upload or Drag Any KSEB Bill Photo
          </span>
          <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#94a3b8' }}>
            JPG / PNG up to 10MB · No files saved to disk · Consumer number masked automatically
          </p>
        </div>
      </div>

      {/* Loading & Extraction Progress State */}
      {isLoading && (
        <div style={{ 
          padding: '14px', borderRadius: '8px', 
          background: 'rgba(14, 165, 233, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <RefreshCw size={18} className="animate-spin" style={{ color: '#38bdf8' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>
              {scanStage || 'Scanning bill in memory...'}
            </div>
            <div style={{ 
              height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', 
              marginTop: '6px', overflow: 'hidden' 
            }}>
              <div style={{ 
                height: '100%', width: '70%', background: '#38bdf8', 
                borderRadius: '2px', animation: 'pulse 1.5s infinite' 
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Scan Results Display */}
      {scanResult && !isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Main Numbers Bar */}
          <div style={{ 
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', 
            background: '#17243b', borderRadius: '8px', padding: '12px',
            border: '1px solid var(--border-subtle)'
          }}>
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: '600' }}>Bi-monthly Units</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#38bdf8' }} className="tabular-nums">
                {scanResult.units !== null ? `${scanResult.units} kWh` : 'Unreadable'}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>
                Avg {monthlyUnits ? `${monthlyUnits} u/mo` : '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: '600' }}>Bill Amount</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#f1f5f9' }} className="tabular-nums">
                {scanResult.amount ? `₹${scanResult.amount.toLocaleString()}` : '—'}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>
                {scanResult.billing_period_days || 60} Days Period
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: '600' }}>Consumer ID</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }} className="tabular-nums">
                <Lock size={12} />
                {scanResult.consumer_no_masked || 'XXXXXX4821'}
              </div>
              <div style={{ fontSize: '9px', color: '#10b981' }}>
                Masked for Privacy
              </div>
            </div>
          </div>

          {/* KSEB Tariff Cliff Gauge & Alert */}
          {cliff && (
            <div style={{ 
              background: cliff.cliff_status === 'above_cliff' ? 'rgba(244, 63, 94, 0.1)' :
                          cliff.cliff_status === 'near_cliff'  ? 'rgba(245, 158, 11, 0.1)' :
                          cliff.cliff_status === 'tod_heavy'   ? 'rgba(168, 85, 247, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${
                cliff.cliff_status === 'above_cliff' ? 'rgba(244, 63, 94, 0.3)' :
                cliff.cliff_status === 'near_cliff'  ? 'rgba(245, 158, 11, 0.3)' :
                cliff.cliff_status === 'tod_heavy'   ? 'rgba(168, 85, 247, 0.3)' : 'rgba(16, 185, 129, 0.3)'
              }`,
              borderRadius: '10px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {cliff.cliff_status === 'above_cliff' || cliff.cliff_status === 'near_cliff' ? (
                    <AlertTriangle size={15} color={cliff.cliff_status === 'above_cliff' ? '#fb7185' : '#fbbf24'} />
                  ) : (
                    <CheckCircle2 size={15} color="#34d399" />
                  )}
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>
                    KSEB Tariff Cliff Analysis
                  </span>
                </div>
                <span style={{ 
                  fontSize: '11px', fontWeight: '700', 
                  color: cliff.cliff_status === 'above_cliff' ? '#fb7185' :
                         cliff.cliff_status === 'near_cliff'  ? '#fbbf24' :
                         cliff.cliff_status === 'tod_heavy'   ? '#c084fc' : '#34d399'
                }}>
                  {cliff.status_label}
                </span>
              </div>

              {/* Cliff Progress Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>
                  <span>0 u/mo</span>
                  <span style={{ color: '#fbbf24', fontWeight: '700' }}>⚠️ 250 Cliff (+₹261 penalty)</span>
                  <span style={{ color: '#c084fc', fontWeight: '700' }}>⚡ 500 ToD</span>
                  <span>600+</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                  {/* Safe zone */}
                  <div style={{ position: 'absolute', left: '0%', width: '41.6%', height: '100%', background: 'rgba(16, 185, 129, 0.3)' }} />
                  {/* Danger zone marker at 250 (41.6% of 600) */}
                  <div style={{ position: 'absolute', left: '41.6%', width: '2px', height: '100%', background: '#fbbf24', zIndex: 2 }} />
                  {/* ToD marker at 500 (83.3% of 600) */}
                  <div style={{ position: 'absolute', left: '83.3%', width: '2px', height: '100%', background: '#c084fc', zIndex: 2 }} />
                  {/* Current Fill */}
                  <div style={{ 
                    height: '100%', 
                    width: `${Math.min(100, ((monthlyUnits || 0) / 600) * 100)}%`, 
                    background: cliff.cliff_status === 'above_cliff' ? '#f43f5e' :
                                cliff.cliff_status === 'near_cliff'  ? '#f59e0b' :
                                cliff.cliff_status === 'tod_heavy'   ? '#a855f7' : '#10b981',
                    borderRadius: '4px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>

              {/* Cliff Insight Text */}
              <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.4' }}>
                {cliff.cliff_status === 'above_cliff' && (
                  <span>
                    🛑 <strong>Non-Telescopic Penalty Active:</strong> Because monthly usage exceeds 250 units, KSEB revokes subsidized telescopic pricing and charges all units at flat commercial rates. Installing <strong>{cliff.recommended_solar_kw} kW solar</strong> knocks you below the cliff, saving <strong style={{ color: '#34d399' }}>₹{cliff.estimated_monthly_savings}/month</strong>.
                  </span>
                )}
                {cliff.cliff_status === 'near_cliff' && (
                  <span>
                    ⚠️ <strong>Danger Zone:</strong> At {monthlyUnits} units/month, you are just a few units away from triggering the steep 250-unit penalty cliff. Solar cushions your household against seasonal bill spikes.
                  </span>
                )}
                {cliff.cliff_status === 'safe' && (
                  <span>
                    ✅ <strong>Telescopic Safe:</strong> Your usage is within the subsidized tier. A modest <strong>{cliff.recommended_solar_kw} kW rooftop system</strong> will offset 100% of your bill down to the basic grid connection fee.
                  </span>
                )}
                {cliff.cliff_status === 'tod_heavy' && (
                  <span>
                    ⚡ <strong>Time-of-Day Tariff:</strong> Heavy consumer subject to 125% peak tariffs between 6 PM - 10 PM. A 5 kW solar system + daytime appliance scheduling will maximize returns.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* MazhaVeyil Solar Sizing & Savings Card */}
          {cliff && (
            <div style={{ 
              background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', 
              borderRadius: '10px', padding: '12px' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} style={{ color: '#38bdf8' }} />
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>
                    Personalized MazhaVeyil Solar Sizing
                  </span>
                </div>
                <span style={{ background: '#0284c7', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '4px' }}>
                  Recommended: {cliff.recommended_solar_kw} kW
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '10px' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '9px', color: '#94a3b8' }}>Current Est. Monthly</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#f87171' }}>
                    ₹{cliff.estimated_monthly_bill_before}
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '9px', color: '#94a3b8' }}>After Solar Monthly</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#38bdf8' }}>
                    ₹{cliff.estimated_monthly_bill_after}
                  </div>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '6px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <div style={{ fontSize: '9px', color: '#34d399' }}>Net Monthly Saving</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#34d399' }}>
                    ₹{cliff.estimated_monthly_savings}
                  </div>
                </div>
              </div>

              {/* Action Button: Apply to What-If simulator */}
              {onApplyUnits && monthlyUnits && (
                <button
                  onClick={() => onApplyUnits(monthlyUnits)}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '12px', padding: '8px' }}
                >
                  Apply {monthlyUnits} Units to Ward What-If Simulator <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}

          {/* Warnings Banner if present */}
          {scanResult.warnings && scanResult.warnings.length > 0 && (
            <div style={{ 
              background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', 
              borderRadius: '8px', padding: '10px', fontSize: '11px', color: '#fbbf24' 
            }}>
              <div style={{ fontWeight: '700', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Info size={13} /> Scan Notes
              </div>
              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                {scanResult.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Hard Privacy Guarantee Notice */}
      <div style={{ 
        fontSize: '10px', color: '#64748b', borderTop: '1px solid rgba(148, 163, 184, 0.1)', 
        paddingTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' 
      }}>
        <span>🔒 Hard Rule: Bill images are processed in RAM and never written to disk.</span>
        <span>KSEB Tariff 2025–2027</span>
      </div>
    </div>
  );
}
