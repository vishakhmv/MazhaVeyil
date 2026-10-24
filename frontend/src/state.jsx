import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { engine } from './lib/api.js';

export const PAGES = ['home', 'find', 'cliff', 'scan', 'veyil', 'today', 'koottam', 'atlas'];

const readHash = () => {
  const p = (window.location.hash || '').replace(/^#\/?/, '').split('?')[0];
  return PAGES.includes(p) ? p : 'home';
};

const AppContext = createContext(null);

const load = (key, fallback) => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
};
const save = (key, value) => {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* private window */ }
};

export function AppProvider({ children }) {
  const [page, setPage] = useState(readHash);
  useEffect(() => {
    const onHash = () => {
      setPage(readHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const go = useCallback((p) => {
    window.location.hash = '#/' + p;
  }, []);

  // What the household told us: shared by every page (type the units once, use them everywhere)
  const [units, setUnitsState] = useState(() => load('mv_units', { value: null, months: 1, phase: '1ph' }));
  const setUnits = useCallback((patch) => setUnitsState((u) => { const n = { ...u, ...patch }; save('mv_units', n); return n; }), []);

  // The roof: an engine roof id, or a drawn polygon of [lon, lat]
  const [roof, setRoofState] = useState(() => load('mv_roof', { areaId: null, roofId: null, polygon: null, areaM2: null, roofType: 'flat', shade: 'some', household: 4 }));
  const setRoof = useCallback((patch) => setRoofState((r) => { const n = { ...r, ...patch }; save('mv_roof', n); return n; }), []);

  const [report, setReport] = useState(null); // latest roof-report@1
  const [status, setStatus] = useState({ online: null, areas: [], checkedAt: null });
  const [areas, setAreas] = useState([]);
  const timer = useRef(null);

  // Engine heartbeat: a visible dot in the navbar, so trouble is noticed before the judges notice it
  const ping = useCallback(async () => {
    try {
      const h = await engine.health();
      setStatus({ online: true, areas: h.areas, offline: h.offline, rulesDate: h.rules_checked_on, checkedAt: Date.now() });
      return true;
    } catch {
      setStatus((s) => ({ ...s, online: false, checkedAt: Date.now() }));
      return false;
    }
  }, []);
  useEffect(() => {
    ping();
    timer.current = setInterval(ping, 15000);
    return () => clearInterval(timer.current);
  }, [ping]);
  useEffect(() => {
    if (status.online && areas.length === 0) engine.areas().then(setAreas).catch(() => {});
  }, [status.online, areas.length]);

  const value = useMemo(
    () => ({ page, go, units, setUnits, roof, setRoof, report, setReport, status, ping, areas }),
    [page, go, units, setUnits, roof, setRoof, report, status, ping, areas],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);

// units on the bill -> per month
export const monthlyOf = (units) => (units.value ? units.value / units.months : null);
