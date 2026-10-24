import React, { useState, useEffect } from 'react';
import { 
  Sun, CloudRain, Shield, Wifi, Printer, Send, Layers, 
  RefreshCw, Camera, Leaf, Clock, Award, Activity, CheckCircle2, Home, Trophy
} from 'lucide-react';
import { fetchAtlasSummary } from './lib/api';
import { ResilientLiveHub } from './lib/socket';
import { computeWardWhatIf } from './lib/kpi';
import { WardMap } from './components/WardMap';
import { KpiTiles } from './components/KpiTiles';
import { WhatIfSlider } from './components/WhatIfSlider';
import { LiveTicker } from './components/LiveTicker';
import { Leaderboard } from './components/Leaderboard';
import { PrivacyCard } from './components/PrivacyCard';
import { RainKoottamTab } from './components/RainKoottamTab';
import { BillScannerTab } from './components/BillScannerTab';
import { SustainabilityTab } from './components/SustainabilityTab';
import { RooftopUploadTab } from './components/RooftopUploadTab';
import { NeighbourhoodChallenge } from './components/NeighbourhoodChallenge';
import { SvgWardMap } from './fallback/SvgWardMap';
import { TableView } from './fallback/TableView';
import { OfflineCard } from './fallback/OfflineCard';

export function App() {
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState(null);
  const [adoptionPct, setAdoptionPct] = useState(25); // 25% pilot benchmark
  const [events, setEvents] = useState([]);
  const [rightTab, setRightTab] = useState('solar'); // 'solar' | 'rain' | 'bill' | 'sustainability' | 'rooftop' | 'challenge'
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [resilientLevel, setResilientLevel] = useState(1); // 1: Map, 2: SVG, 3: Table, 4: Offline
  const [latestPledgeWardId, setLatestPledgeWardId] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // 1. Initial Data Load
  useEffect(() => {
    loadWards();
  }, []);

  const loadWards = async () => {
    try {
      const { data } = await fetchAtlasSummary();
      if (data && data.wards) {
        setWards(data.wards);
        if (!selectedWard && data.wards.length > 0) {
          setSelectedWard(data.wards[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load wards', e);
    }
  };

  // 2. Realtime WebSocket Hub Setup
  useEffect(() => {
    const hub = new ResilientLiveHub(
      (newEvent) => {
        setEvents((prev) => [newEvent, ...prev]);
        setLatestPledgeWardId(newEvent.ward_id);

        // Update local ward count immediately
        setWards((prevWards) =>
          prevWards.map((w) => {
            if (w.ward_id === newEvent.ward_id) {
              const updated = {
                ...w,
                pledged_homes: newEvent.pledged,
                firm_homes: (w.firm_homes || 0) + (newEvent.strength === 'firm' ? 1 : 0)
              };
              if (selectedWard && selectedWard.ward_id === w.ward_id) {
                setSelectedWard(updated);
              }
              return updated;
            }
            return w;
          })
        );

        // Reset ripple highlight after 2.5s
        setTimeout(() => setLatestPledgeWardId(null), 2500);
      },
      (status) => setConnectionStatus(status)
    );

    hub.connect();
    return () => hub.close();
  }, [selectedWard]);

  // 3. Dynamic What-If Metrics
  const whatIfMetrics = selectedWard
    ? computeWardWhatIf(selectedWard, adoptionPct)
    : null;

  // 4. Quick Demo Simulator: Post a real test pledge to demonstrate live updates to judges
  const handleSimulateTestPledge = async () => {
    if (!selectedWard || isSimulating) return;
    setIsSimulating(true);

    try {
      const campaignId = `c_${selectedWard.ward_id.toLowerCase().replace('-', '_')}`;
      const fakeRoofId = `osm:way/demo_${Date.now()}`;

      await fetch(`http://localhost:3001/api/campaigns/${campaignId}/pledges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ward_id: selectedWard.ward_id,
          roof_id: fakeRoofId,
          strength: 'firm',
          kind: 'solar',
          est_kw: 2.5
        })
      });
    } catch {
      // In offline/mock mode, simulate local event
      const newCount = (selectedWard.pledged_homes || 0) + 1;
      const mockEvent = {
        type: 'pledge',
        ward_id: selectedWard.ward_id,
        pledged: newCount,
        target: selectedWard.target_homes || 100,
        strength: 'firm',
        timestamp: new Date().toISOString()
      };
      setEvents((prev) => [mockEvent, ...prev]);
      setLatestPledgeWardId(selectedWard.ward_id);
      setSelectedWard({ ...selectedWard, pledged_homes: newCount });
      setTimeout(() => setLatestPledgeWardId(null), 2500);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Institutional Kerala Civic Topbar */}
      <div className="civic-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: '700', color: '#f8fafc' }}>
            Government of Kerala · തദ്ദേശ സ്വയംഭരണ വകുപ്പ് (LSGD)
          </span>
          <span style={{ color: 'var(--border-subtle)' }}>|</span>
          <span style={{ color: 'var(--text-muted)' }}>
            ANERT · Suchitwa Mission · KSERC Clean Energy Policy Framework
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#34d399', fontSize: '11px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            KSEB 11kV Grid: Normal (Peak Shaving Active)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#fbbf24', fontSize: '11px' }}>
            <Clock size={12} />
            PM Surya Ghar Window: 158 Days (Ends 31 Mar 2027)
          </span>
        </div>
      </div>

      <div style={{ maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '16px 20px', flex: 1 }}>
        {/* Main Header */}
        <header className="glass-panel" style={{ padding: '12px 18px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            
            {/* Title / Identity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}>
                <Sun size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h1 style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.3px', color: '#f8fafc', margin: 0 }}>
                    MazhaVeyil <span style={{ color: '#38bdf8', fontWeight: '600' }}>വാർഡ് അറ്റ്ലസ്</span>
                  </h1>
                  <span style={{ 
                    fontSize: '10px', background: 'rgba(2, 132, 199, 0.12)', 
                    color: '#38bdf8', padding: '2px 7px', borderRadius: '4px', 
                    fontWeight: '600', border: '1px solid rgba(2, 132, 199, 0.25)' 
                  }}>
                    Ward Decarbonization &amp; Water Security
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Panchayat Rooftop Solar Demand Aggregation · Aquifer Recharge · KSEB Tariff Sizing
                </p>
              </div>
            </div>

            {/* Resilient Display Level Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0e1726', padding: '4px 6px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)', marginRight: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Layers size={12} /> View:
              </span>
              {[
                { lvl: 1, label: 'L1: Spatial Map' },
                { lvl: 2, label: 'L2: Static SVG' },
                { lvl: 3, label: 'L3: Data Table' },
                { lvl: 4, label: 'L4: Offline' }
              ].map(({ lvl, label }) => (
                <button
                  key={lvl}
                  id={`resilient-mode-${lvl}`}
                  className={`btn-secondary ${resilientLevel === lvl ? 'active' : ''}`}
                  onClick={() => setResilientLevel(lvl)}
                  style={{ padding: '3px 7px', fontSize: '10px' }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                id="simulate-pledge-btn"
                className="btn-primary"
                onClick={handleSimulateTestPledge}
                disabled={isSimulating}
                style={{ fontSize: '11px', padding: '7px 12px' }}
              >
                <Send size={13} />
                {isSimulating ? 'Pledging...' : 'Simulate Citizen Pledge'}
              </button>

              <a
                id="print-ward-action-btn"
                href={`http://localhost:3001/print/ward/${selectedWard ? selectedWard.ward_id : 'KLM-W07'}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{ textDecoration: 'none', fontSize: '11px', padding: '7px 11px' }}
              >
                <Printer size={13} />
                Grama Sabha A4
              </a>
            </div>
          </div>
        </header>

        {/* Main Dashboard Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
          gap: '18px',
          alignItems: 'start'
        }}>
          
          {/* Left Column: Spatial Demand Map, Live Feed, Privacy Standard */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '14px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#f8fafc' }}>
                  Panchayat Spatial Demand Map
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {wards.length} Active Pilot Wards (Kollam, Pozhiyoor, Kuttanad)
                </span>
              </div>

              {resilientLevel === 1 && (
                <WardMap
                  wards={wards}
                  selectedWard={selectedWard}
                  onSelectWard={setSelectedWard}
                  latestPledgeWardId={latestPledgeWardId}
                />
              )}

              {resilientLevel === 2 && (
                <SvgWardMap
                  wards={wards}
                  selectedWard={selectedWard}
                  onSelectWard={setSelectedWard}
                />
              )}

              {resilientLevel === 3 && (
                <TableView
                  wards={wards}
                  selectedWard={selectedWard}
                  onSelectWard={setSelectedWard}
                />
              )}

              {resilientLevel === 4 && (
                <OfflineCard ward={selectedWard} />
              )}
            </div>

            <LiveTicker events={events} connectionStatus={connectionStatus} />
            <PrivacyCard />
          </div>

          {/* Right Column: Tabbed Civic Modules */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Tab Selector Bar — Row 1 */}
            <div className="glass-panel" style={{ padding: '5px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {[
                { id: 'solar', icon: <Sun size={13}/>, label: 'Solar Koottam' },
                { id: 'rain',  icon: <CloudRain size={13}/>, label: 'Rain Koottam' },
                { id: 'bill',  icon: <Camera size={13}/>, label: 'Bill Scanner' },
                { id: 'sustainability', icon: <Leaf size={13}/>, label: 'SDG Impact' },
                { id: 'rooftop', icon: <Home size={13}/>, label: 'Rooftop AI' },
                { id: 'challenge', icon: <Trophy size={13}/>, label: 'Challenge' },
              ].map(tab => (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  className={`btn-secondary ${rightTab === tab.id ? 'active' : ''}`}
                  onClick={() => setRightTab(tab.id)}
                  style={{ flex: '1 1 auto', minWidth: '80px', justifyContent: 'center', fontSize: '10px', padding: '6px 4px' }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Solar Koottam */}
            {rightTab === 'solar' && (
              <>
                <KpiTiles ward={selectedWard} whatIfMetrics={whatIfMetrics} />
                <WhatIfSlider
                  adoptionPct={adoptionPct}
                  onChangeAdoption={setAdoptionPct}
                  homesEstimated={selectedWard ? selectedWard.homes_estimated : 500}
                />
                <Leaderboard
                  wards={wards}
                  selectedWard={selectedWard}
                  onSelectWard={setSelectedWard}
                />
              </>
            )}

            {/* Tab 2: Rain Koottam */}
            {rightTab === 'rain' && (
              <RainKoottamTab
                campaignId={selectedWard ? `c_${selectedWard.ward_id.toLowerCase().replace('-', '_')}` : null}
                ward={selectedWard}
              />
            )}

            {/* Tab 3: KSEB Bill Scanner */}
            {rightTab === 'bill' && (
              <BillScannerTab
                ward={selectedWard}
                onApplyUnits={(units) => {
                  setRightTab('solar');
                }}
              />
            )}

            {/* Tab 4: SDG Impact & Sustainability Model */}
            {rightTab === 'sustainability' && (
              <SustainabilityTab
                ward={selectedWard}
                adoptionPct={adoptionPct}
              />
            )}

            {/* Tab 5: Rooftop AI Upload */}
            {rightTab === 'rooftop' && (
              <RooftopUploadTab
                ward={selectedWard}
                onPledge={(solar) => {
                  setRightTab('solar');
                }}
              />
            )}

            {/* Tab 6: Neighbourhood Challenge */}
            {rightTab === 'challenge' && (
              <NeighbourhoodChallenge
                wards={wards}
                selectedWard={selectedWard}
                onSelectWard={setSelectedWard}
                events={events}
              />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
