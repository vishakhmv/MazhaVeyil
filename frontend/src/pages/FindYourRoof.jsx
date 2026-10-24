import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { MapPin, Search, Undo2, Trash2, PencilRuler, MousePointerClick, Ruler, Satellite, Map as MapIcon, Sparkles, WifiOff, Home as HomeIcon, Building2, Minus, Plus } from 'lucide-react';
import { useLang } from '../i18n/index.jsx';
import { useApp } from '../state.jsx';
import { engine, searchPlace } from '../lib/api.js';
import { Hero, Page, Card, CardTitle, Segmented, Field, inputCls, Btn, Chip, Notice, Spinner, EngineDown, cx } from '../components/ui.jsx';
import { RoofMap } from '../components/RoofMap.jsx';
import { ReportPanel } from '../components/ReportPanel.jsx';
import { num } from '../lib/format.js';

// Planar area of a [lon, lat] ring in m² (accurate to well under 1% at roof size)
function polyAreaM2(ring) {
  if (!ring || ring.length < 3) return 0;
  const lat0 = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const ky = 110540;
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = [ring[i][0] * kx, ring[i][1] * ky];
    const [x2, y2] = [ring[(i + 1) % ring.length][0] * kx, ring[(i + 1) % ring.length][1] * ky];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

export default function FindYourRoof() {
  const { t, lang } = useLang();
  const { areas, status, roof, setRoof, units, setUnits, report, setReport, go } = useApp();
  const mapRef = useRef(null);
  const [mode, setMode] = useState(roof.polygon?.length >= 3 ? 'draw' : 'pick');
  const [layer, setLayer] = useState('street');
  const [tilesOk, setTilesOk] = useState(true);
  const [roofs, setRoofs] = useState(null);
  const [draft, setDraft] = useState(roof.polygon || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const seq = useRef(0);
  const reportRef = useRef(null);
  const scrolledFor = useRef(null);

  const area = areas.find((a) => a.id === roof.areaId) || areas[0];
  const use = roof.use || (area?.kind === 'public' ? 'public' : 'home');
  const name = (a) => a.name[lang] || a.name.en;

  // choose a first area once the engine has told us what it has
  useEffect(() => {
    if (areas.length && !roof.areaId) setRoof({ areaId: areas[0].id, use: areas[0].kind });
  }, [areas, roof.areaId, setRoof]);

  useEffect(() => {
    if (!area) return;
    let live = true;
    setRoofs(null);
    engine.roofs(area.id).then((fc) => live && setRoofs(fc)).catch(() => live && setRoofs({ type: 'FeatureCollection', features: [] }));
    return () => { live = false; };
  }, [area?.id]);

  const chooseArea = (a) => {
    setRoof({ areaId: a.id, roofId: null, polygon: null, areaM2: null, point: null, use: a.kind });
    setDraft([]);
    setReport(null);
    setMode(a.kind === 'home' && a.id === 'pozhiyoor' ? 'draw' : 'pick');
  };

  const pickRoof = (f) => {
    setRoof({ roofId: f.properties.id, polygon: null, areaM2: f.properties.area_m2, point: null });
    setDraft([]);
  };
  const addPoint = (pt) => {
    setDraft((d) => {
      const next = [...d, pt];
      setRoof({ polygon: next.length >= 3 ? next : null, roofId: null, areaM2: null, point: null });
      return next;
    });
  };
  const undo = () => setDraft((d) => { const n = d.slice(0, -1); setRoof({ polygon: n.length >= 3 ? n : null }); return n; });
  const clearDraw = () => { setDraft([]); setRoof({ polygon: null, roofId: null, areaM2: null, point: null }); setReport(null); };

  const drawnArea = useMemo(() => polyAreaM2(draft), [draft]);
  const ready = Boolean(roof.roofId || roof.polygon?.length >= 3 || (roof.areaM2 && roof.point));

  const body = useMemo(() => {
    if (!ready || !area) return null;
    const b = {
      roof: roof.roofId ? { id: roof.roofId } : roof.polygon?.length >= 3 ? { polygon: roof.polygon } : { point: roof.point, area_m2: roof.areaM2 },
      roof_type: roof.roofType, shade: roof.shade, building_use: use, period_months: units.months, phase: units.phase, household: roof.household,
    };
    if (units.value) b.units = units.value;
    return b;
  }, [ready, area, roof, use, units]);

  const run = useCallback(async (b) => {
    const my = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const r = await engine.report(b);
      if (my === seq.current) setReport(r);
    } catch (e) {
      if (my === seq.current) {
        setError(e);
        if (!e.offline) toast.error(e.message);
      }
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [setReport]);

  // the report follows every change: type your units or drag a corner and the numbers move
  useEffect(() => {
    if (!body) return;
    const id = setTimeout(() => run(body), 350);
    return () => clearTimeout(id);
  }, [body, run]);

  // on a phone the report sits below the map: bring it into view once, the first time it appears for a roof
  useEffect(() => {
    if (!report || scrolledFor.current === report.roof.id) return;
    scrolledFor.current = report.roof.id;
    if (window.innerWidth < 1024) setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  }, [report]);

  const trySample = () => {
    if (!roofs?.features?.length) { setMode('draw'); toast.info(t('find.no_outlines')); return; }
    const f = roofs.features[Math.min(1, roofs.features.length - 1)] || roofs.features[0];
    pickRoof(f);
    setMode('pick');
    const [lon, lat] = f.geometry.coordinates[0][0];
    mapRef.current?.flyTo(lon, lat, 19);
  };

  const doSearch = async (e) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const local = areas.find((a) => Object.values(a.name).some((n) => n.toLowerCase().includes(q)) || a.id.includes(q));
    if (local) { chooseArea(local); return; }
    setSearching(true);
    try {
      const res = await searchPlace(query);
      if (!res.length) { toast.info(t('find.search_none')); return; }
      mapRef.current?.flyTo(res[0].lon, res[0].lat, 18);
      setMode('draw');
      toast.success(res[0].name.split(',').slice(0, 2).join(','));
    } catch {
      toast.warn(t('find.search_offline'));
    } finally {
      setSearching(false);
    }
  };

  const modes = [
    { value: 'pick', label: <span className="flex items-center gap-1.5"><MousePointerClick className="w-4 h-4" />{t('find.mode_pick')}</span> },
    { value: 'draw', label: <span className="flex items-center gap-1.5"><PencilRuler className="w-4 h-4" />{t('find.mode_draw')}</span> },
    { value: 'area', label: <span className="flex items-center gap-1.5"><Ruler className="w-4 h-4" />{t('find.mode_area')}</span> },
  ];

  return (
    <>
      <Hero icon={MapPin} eyebrow={t('find.eyebrow')} title={t('find.title')} sub={t('find.sub')} />
      <Page>
        {status.online === false && <EngineDown />}
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: map and inputs */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-20 no-print">
            <Card className="overflow-hidden">
              <div className="p-3 sm:p-4 space-y-3 border-b border-navy-100">
                <div className="flex flex-wrap gap-2" role="group" aria-label={t('find.areas')}>
                  {areas.map((a) => (
                    <button key={a.id} type="button" onClick={() => chooseArea(a)} aria-pressed={area?.id === a.id}
                      className={cx('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border transition min-h-[40px]', area?.id === a.id ? 'bg-navy-800 text-white border-navy-800' : 'bg-white text-navy-700 border-navy-200 hover:bg-navy-50')}>
                      {a.kind === 'public' ? <Building2 className="w-4 h-4" aria-hidden /> : <HomeIcon className="w-4 h-4" aria-hidden />}
                      {name(a)}
                    </button>
                  ))}
                </div>
                <form onSubmit={doSearch} className="flex gap-2">
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('find.search_ph')} className={inputCls} aria-label={t('find.search_ph')} />
                  <Btn type="submit" variant="outline" icon={Search} loading={searching} aria-label={t('find.search')} />
                </form>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Segmented value={mode} onChange={setMode} options={modes} />
                  <Segmented value={layer} onChange={setLayer} options={[{ value: 'street', label: <MapIcon className="w-4 h-4" aria-label={t('find.street')} /> }, { value: 'sat', label: <Satellite className="w-4 h-4" aria-label={t('find.satellite')} /> }]} />
                </div>
              </div>

              <div className="relative">
                <RoofMap
                  ref={mapRef} area={area} roofs={mode === 'area' ? null : roofs} selectedRoofId={roof.roofId} polygon={mode === 'draw' || roof.polygon ? draft : null}
                  mode={mode} baseLayer={layer} onPickRoof={pickRoof} onDrawPoint={addPoint} onTilesStatus={setTilesOk}
                  className="w-full h-[320px] sm:h-[400px] z-0"
                />
                {!tilesOk && (
                  <div className="absolute left-3 bottom-3 z-[500]"><Chip tone="sun" icon={WifiOff}>{t('find.tiles_offline')}</Chip></div>
                )}
                {mode === 'pick' && roofs && roofs.features.length === 0 && (
                  <div className="absolute inset-x-3 top-3 z-[500]"><Notice tone="sun" icon={PencilRuler}>{t('find.no_outlines')}</Notice></div>
                )}
              </div>

              <div className="p-3 sm:p-4 space-y-3">
                {mode === 'pick' && <p className="text-sm text-slate-600">{roof.roofId ? <>{t('find.selected')}: <b>{num(roof.areaM2)} m²</b></> : t('find.hint_pick')}</p>}
                {mode === 'draw' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-slate-600 flex-1 min-w-[160px]">{draft.length < 3 ? t('find.hint_draw', { n: draft.length }) : <>{t('find.drawn')}: <b>≈ {num(drawnArea)} m²</b></>}</p>
                    <Btn size="sm" variant="outline" icon={Undo2} onClick={undo} disabled={!draft.length}>{t('find.undo')}</Btn>
                    <Btn size="sm" variant="outline" icon={Trash2} onClick={clearDraw} disabled={!draft.length}>{t('find.clear')}</Btn>
                  </div>
                )}
                {mode === 'area' && (
                  <Field label={t('find.area_label')} hint={t('find.area_hint')}>
                    <input type="number" inputMode="numeric" min="8" max="20000" className={inputCls} placeholder="100"
                      value={roof.areaM2 && !roof.roofId && !roof.polygon ? roof.areaM2 : ''}
                      onChange={(e) => { const v = Number(e.target.value); setRoof({ areaM2: v > 0 ? v : null, roofId: null, polygon: null, point: area?.center }); setDraft([]); }} />
                  </Field>
                )}
                {!ready && <Btn variant="sun" icon={Sparkles} onClick={trySample} className="w-full">{t('find.try_sample')}</Btn>}
              </div>
            </Card>

            <Card className="p-4 sm:p-5 space-y-4">
              <CardTitle icon={HomeIcon} tone="rain">{t('find.about')}</CardTitle>
              <Field label={t('find.use')}>
                <Segmented value={use} onChange={(v) => setRoof({ use: v })} options={[{ value: 'home', label: t('use.home') }, { value: 'public', label: t('use.public') }]} />
              </Field>
              <Field label={t('find.roof_type')}>
                <Segmented value={roof.roofType} onChange={(v) => setRoof({ roofType: v })} options={[{ value: 'flat', label: t('roof.type.flat') }, { value: 'sloped', label: t('roof.type.sloped') }]} />
              </Field>
              <Field label={t('find.shade')}>
                <Segmented value={roof.shade} onChange={(v) => setRoof({ shade: v })} options={[{ value: 'little', label: t('roof.shade.little') }, { value: 'some', label: t('roof.shade.some') }, { value: 'a_lot', label: t('roof.shade.a_lot') }]} />
              </Field>
              <Field label={t('find.units')} hint={units.value ? t('find.units_hint_typed') : t('find.units_hint')}>
                <div className="flex gap-2">
                  <input type="number" inputMode="numeric" min="0" max="100000" className={inputCls} placeholder={t('find.units_ph')}
                    value={units.value ?? ''} onChange={(e) => setUnits({ value: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })} />
                  <Segmented value={units.months} onChange={(v) => setUnits({ months: v })} options={[{ value: 1, label: t('units.monthly') }, { value: 2, label: t('units.bimonthly') }]} />
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label={t('find.phase')}>
                  <Segmented value={units.phase} onChange={(v) => setUnits({ phase: v })} options={[{ value: '1ph', label: t('units.phase1') }, { value: '3ph', label: t('units.phase3') }]} />
                </Field>
                <Field label={t('find.household')}>
                  <div className="inline-flex items-center gap-2">
                    <Btn size="sm" variant="outline" aria-label="−" onClick={() => setRoof({ household: Math.max(1, (roof.household || 4) - 1) })}><Minus className="w-4 h-4" /></Btn>
                    <span className="w-8 text-center font-extrabold text-navy-900 tabular-nums">{roof.household || 4}</span>
                    <Btn size="sm" variant="outline" aria-label="+" onClick={() => setRoof({ household: Math.min(30, (roof.household || 4) + 1) })}><Plus className="w-4 h-4" /></Btn>
                  </div>
                </Field>
              </div>
            </Card>
          </div>

          {/* RIGHT: the report */}
          <div ref={reportRef} className="lg:col-span-7 space-y-5 scroll-mt-20">
            {error && !error.offline && <Notice tone="cliff" title={t('find.error')}>{error.message}</Notice>}
            {error?.offline && <EngineDown error={error} onRetry={() => body && run(body)} />}
            {!report && !loading && !error && (
              <Card className="p-8 text-center space-y-4 print-card">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-sun-50 border border-sun-100 flex items-center justify-center"><MapPin className="w-8 h-8 text-sun-600" aria-hidden /></div>
                <h2 className="text-xl font-extrabold text-navy-900">{t('find.empty_title')}</h2>
                <ol className="text-sm text-slate-600 space-y-1.5 max-w-md mx-auto text-left list-decimal pl-5">
                  <li>{t('find.step1')}</li><li>{t('find.step2')}</li><li>{t('find.step3')}</li>
                </ol>
                <Btn variant="sun" icon={Sparkles} onClick={trySample}>{t('find.try_sample')}</Btn>
              </Card>
            )}
            {loading && !report && <Spinner label={t('find.computing')} />}
            {report && (
              <div className={cx('transition-opacity', loading && 'opacity-60')} aria-busy={loading}>
                <ReportPanel report={report} onOpenCliff={() => go('cliff')} />
              </div>
            )}
          </div>
        </div>
      </Page>
    </>
  );
}
