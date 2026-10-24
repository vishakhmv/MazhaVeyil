import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Layers, Radio, Zap, Droplets, Landmark, Leaf, Printer, Users, Home as HomeIcon, Building2, WifiOff, Info } from 'lucide-react';
import { useLang } from '../i18n/index.jsx';
import { useApp } from '../state.jsx';
import { community, engine } from '../lib/api.js';
import { num, big } from '../lib/format.js';
import { Hero, Page, Card, CardTitle, Chip, Notice, Spinner, Progress, Stat, Btn, EngineDown, cx } from '../components/ui.jsx';
import { WardMap } from '../components/WardMap.jsx';
import { ScoreRings } from '../components/charts.jsx';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SDG = [
  { n: 7, icon: Zap, color: '#fcc30b', fg: '#12213d' },
  { n: 6, icon: Droplets, color: '#26bde2', fg: '#12213d' },
  { n: 11, icon: Landmark, color: '#fd9d24', fg: '#12213d' },
  { n: 13, icon: Leaf, color: '#3f7e44', fg: '#ffffff' },
];

export default function WardAtlas() {
  const { t, lang } = useLang();
  const { areas, go, status } = useApp();
  const [wards, setWards] = useState(null); // the engine's ward summaries (boundary, potential, scenarios)
  const [pledges, setPledges] = useState({}); // ward_id -> {pledged, target, status}
  const [impact, setImpact] = useState(null);
  const [adoption, setAdoption] = useState(25);
  const [selected, setSelected] = useState(null);
  const [live, setLive] = useState('connecting');
  const [tilesOk, setTilesOk] = useState(true);
  const [error, setError] = useState(null);
  const [communityDown, setCommunityDown] = useState(false);
  const refetchTimer = useRef(null);
  const wardsRef = useRef([]);

  const loadPledges = useCallback(async () => {
    try {
      const r = await community.atlas();
      const m = {};
      for (const w of r.wards) m[w.ward_id] = { pledged: w.pledged_homes, firm: w.firm_homes, target: w.target_homes, status: w.campaign_status };
      setPledges(m);
      setCommunityDown(false);
    } catch {
      setCommunityDown(true);
    }
  }, []);

  useEffect(() => {
    engine.wards().then((w) => { setWards(w); setSelected((s) => s || w.find((x) => x.ward_id !== 'campus-w1')?.ward_id || w[0]?.ward_id); }).catch(setError);
    loadPledges();
  }, [loadPledges]);

  useEffect(() => {
    const id = setTimeout(() => engine.impact(adoption).then(setImpact).catch(() => {}), 150);
    return () => clearTimeout(id);
  }, [adoption]);

  const nameOf = useCallback((id) => wardsRef.current.find((w) => w.ward_id === id)?.name?.[lang] || wardsRef.current.find((w) => w.ward_id === id)?.name?.en || id, [lang]);
  useEffect(() => { wardsRef.current = wards || []; }, [wards]);

  // live pledges: shade the map and move the counters the moment a phone joins
  useEffect(() => community.live((ev) => {
    if (!ev.polled) toast.info(t('atlas.new_pledge', { ward: nameOf(ev.ward_id), n: ev.pledged ?? '' }), { icon: '👋', autoClose: 2500 });
    clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(loadPledges, 150);
  }, setLive), [loadPledges, t, nameOf]);

  const kindOf = (id) => areas.find((a) => a.ward_id === id)?.kind || 'home';

  const rows = useMemo(() => (wards || []).map((w) => {
    const p = pledges[w.ward_id];
    const target = p?.target ?? 25;
    const pledged = p?.pledged ?? 0;
    return { ...w, kind: kindOf(w.ward_id), pledged, target, pct: Math.min(1, pledged / target), cstatus: p?.status, hasCampaign: Boolean(p) };
  }), [wards, pledges, areas]);

  const mapWards = rows.map((w) => ({ ward_id: w.ward_id, boundary: w.boundary, kind: w.kind, pct: w.pct, name: esc(w.name[lang] || w.name.en), short: esc((w.name[lang] || w.name.en).replace(/\s*\(.*\)/, '')), label: w.kind === 'public' ? esc(t('atlas.public')) : esc(w.pledged + ' / ' + w.target) }));
  const sel = rows.find((w) => w.ward_id === selected);
  const homeRows = rows.filter((w) => w.kind === 'home');
  const totalPledged = homeRows.reduce((s, w) => s + w.pledged, 0);
  const pledgedKw = homeRows.reduce((s, w) => s + w.pledged * w.per_home_avg.kw, 0);
  const words = { lakh: t('unit.lakh'), crore: t('unit.crore') };
  const sdgText = (n) => {
    if (!impact) return ['–', ''];
    const s = impact.sdg[n];
    if (n === 7) return [num(s.kw_planned, 0) + ' kW', t('atlas.sdg7', { gwh: (s.kwh_year / 1e6).toFixed(2) })];
    if (n === 6) return [big(s.litres_year, words) + ' L', t('atlas.sdg6', { n: num(s.homes_non_drinking_need_covered) })];
    if (n === 11) return [num(s.homes_pledged), t('atlas.sdg11', { n: s.wards_with_a_plan })];
    return [num(s.co2_t_year) + ' t', t('atlas.sdg13')];
  };
  const k = impact?.kerala_ceiling;

  return (
    <>
      <Hero icon={Layers} eyebrow={t('atlas.eyebrow')} title={t('atlas.title')} sub={t('atlas.sub')}>
        <Chip tone={live === 'live' ? 'leaf' : 'sun'} icon={Radio} className="!text-sm !px-3 !py-1.5">{t('koottam.live_' + live)}</Chip>
      </Hero>
      <Page>
        {(error?.offline || status.online === false) && <EngineDown error={error} />}
        {communityDown && <Notice tone="sun" icon={WifiOff} title={t('atlas.community_down')}>{t('atlas.community_down_body')}</Notice>}
        {!wards && !error && <Spinner label={t('common.loading')} />}
        {wards && (
          <>
            {/* live counters */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat tone="navy" label={t('atlas.k_wards')} value={homeRows.length} sub={t('atlas.k_wards_sub')} big />
              <Stat tone="leaf" label={t('atlas.k_pledged')} value={totalPledged} sub={t('atlas.k_pledged_sub')} big />
              <Stat tone="sun" label={t('atlas.k_kw')} value={'≈ ' + num(pledgedKw, 1) + ' kW'} sub={t('atlas.k_kw_sub')} big />
              <Stat tone="rain" label={t('atlas.k_potential')} value={num(homeRows.reduce((s, w) => s + w.potential.kw, 0)) + ' kW'} sub={t('atlas.k_potential_sub')} big />
            </div>

            <div className="grid lg:grid-cols-12 gap-6 items-start">
              <Card className="lg:col-span-7 overflow-hidden">
                <div className="relative">
                  <WardMap wards={mapWards} selectedId={selected} onSelect={setSelected} onTilesStatus={setTilesOk} className="w-full h-[360px] sm:h-[440px] z-0" />
                  {!tilesOk && <div className="absolute left-3 bottom-3 z-[500]"><Chip tone="sun" icon={WifiOff}>{t('find.tiles_offline')}</Chip></div>}
                  <div className="absolute right-3 bottom-3 z-[500] bg-white/95 rounded-xl border border-navy-100 p-2.5 text-[11px] font-semibold text-slate-600 shadow">
                    <p className="mb-1">{t('atlas.legend')}</p>
                    <div className="h-2.5 w-28 rounded-full" style={{ background: 'linear-gradient(90deg, rgb(166,216,244), rgb(35,162,107))' }} />
                    <div className="flex justify-between"><span>0%</span><span>100%</span></div>
                  </div>
                </div>
              </Card>

              <div className="lg:col-span-5 space-y-4">
                {sel && (
                  <Card className="p-5 space-y-4 mv-rise" key={sel.ward_id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">{sel.kind === 'public' ? <Building2 className="w-3.5 h-3.5" /> : <HomeIcon className="w-3.5 h-3.5" />}{t('atlas.ward')}</p>
                        <h3 className="text-xl font-extrabold text-navy-900">{sel.name[lang] || sel.name.en}</h3>
                      </div>
                      {sel.kind === 'home' && sel.hasCampaign && <Chip tone={sel.pledged >= sel.target ? 'leaf' : 'rain'}>{sel.pledged >= sel.target ? t('koottam.status_target_reached') : t('koottam.status_open')}</Chip>}
                    </div>
                    {sel.kind === 'home' ? (
                      <div>
                        <div className="flex items-baseline justify-between text-sm"><span className="font-bold text-navy-800">{t('koottam.homes_pledged')}</span><span className="font-extrabold tabular-nums text-navy-900">{sel.pledged} / {sel.target}</span></div>
                        <Progress value={sel.pledged} max={sel.target} tone={sel.pledged >= sel.target ? 'leaf' : 'rain'} className="mt-1.5" />
                      </div>
                    ) : <Notice tone="navy" icon={Info}>{t('atlas.public_note')}</Notice>}
                    <div className="grid grid-cols-[auto_1fr] gap-4 items-center">
                      <ScoreRings power={sel.typical_roof.power} water={sel.typical_roof.water} score={sel.typical_roof.score} bandLabel={t('band.' + sel.typical_roof.band)} scoreLabel={t('rep.score')} size={130} />
                      <div className="space-y-1.5 text-sm">
                        <p className="font-bold text-navy-900">{t('atlas.typical_roof')}</p>
                        <p className="text-slate-600">{num(sel.typical_roof.area_m2)} m² · {t('atlas.tank', { n: num(sel.typical_roof.tank_litres) })}</p>
                        <p className="text-slate-600">{t('atlas.per_home', { kw: sel.per_home_avg.kw, units: num(sel.per_home_avg.units_year) })}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      <Stat tone="sun" label={t('atlas.homes')} value={num(sel.roofs)} sub={sel.quality?.roofs_source === 'config' ? t('atlas.homes_assumed') : t('atlas.homes_mapped')} />
                      <Stat tone="sun" label={t('koottam.potential')} value={num(sel.potential.kw) + ' kW'} />
                      <Stat tone="leaf" label={t('rep.co2')} value={num(sel.potential.co2_t_year) + ' t'} sub={t('atlas.per_year_all')} />
                    </div>
                    <div className="flex flex-wrap gap-2 no-print">
                      {sel.kind === 'home' && <Btn size="sm" variant="sun" icon={Users} onClick={() => go('koottam')}>{t('atlas.join')}</Btn>}
                      <a href={community.printUrl(sel.ward_id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-navy-200 bg-white text-xs font-bold text-navy-800 hover:bg-navy-50 min-h-[36px]"><Printer className="w-4 h-4" aria-hidden />{t('koottam.print')}</a>
                    </div>
                  </Card>
                )}
              </div>
            </div>

            {/* what-if */}
            <Card className="p-5 sm:p-7 space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-navy-900">{t('atlas.whatif')}</h2>
                  <p className="text-sm text-slate-600 mt-1 max-w-xl">{t('atlas.whatif_sub')}</p>
                </div>
                <p className="text-5xl font-extrabold text-rain-600 tabular-nums">{adoption}%<span className="text-base text-slate-400 font-bold"> {t('atlas.of_homes')}</span></p>
              </div>
              <input type="range" min="0" max="100" step="5" value={adoption} onChange={(e) => setAdoption(Number(e.target.value))} className="w-full h-3" aria-label={t('atlas.whatif')} />
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {SDG.map(({ n, icon: Icon, color, fg }) => {
                  const [v, sub] = sdgText(n);
                  return (
                    <div key={n} className="rounded-2xl border border-navy-100 p-4 bg-white">
                      <div className="flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-lg flex items-center justify-center font-extrabold text-sm" style={{ background: color, color: fg }}>{n}</span>
                        <Icon className="w-5 h-5 text-slate-400" aria-hidden />
                        <span className="text-xs font-bold text-slate-500 leading-tight">{t('atlas.sdg_name_' + n)}</span>
                      </div>
                      <p className="text-3xl font-extrabold text-navy-900 tabular-nums mt-2">{v}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-snug">{sub}</p>
                    </div>
                  );
                })}
              </div>
              {k && (
                <div className="rounded-2xl bg-navy-950 text-white p-5 grid md:grid-cols-[1fr_auto] gap-4 items-center">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-sun-300">{t('atlas.ceiling')}</p>
                    <p className="text-sm text-navy-100 mt-1 leading-relaxed">{t('atlas.ceiling_body', { homes: num(k.solar_homes), units: k.units_moved_per_home_day })}</p>
                    <p className="text-xs text-navy-300 mt-2">{t('atlas.ceiling_note')}</p>
                  </div>
                  <div className="flex gap-4 text-center">
                    <div><p className="text-3xl font-extrabold text-sun-300 tabular-nums">{k.mw_if_5_hours}–{k.mw_if_4_hours}</p><p className="text-xs text-navy-300">MW</p></div>
                    <div><p className="text-3xl font-extrabold text-sun-300 tabular-nums">{k.pct_of_record_5_hours}–{k.pct_of_record_4_hours}%</p><p className="text-xs text-navy-300">{t('atlas.of_record', { mw: num(k.record_peak_mw) })}</p></div>
                  </div>
                </div>
              )}
            </Card>

            {/* table */}
            <Card className="p-5">
              <CardTitle icon={Layers} tone="rain">{t('atlas.table')}</CardTitle>
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm min-w-[560px]">
                  <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="py-2 px-1">{t('atlas.ward')}</th><th className="py-2 px-1">{t('atlas.homes')}</th><th className="py-2 px-1">{t('koottam.potential')}</th><th className="py-2 px-1">{t('rep.score')}</th><th className="py-2 px-1 w-44">{t('koottam.homes_pledged')}</th></tr></thead>
                  <tbody>
                    {rows.map((w) => (
                      <tr key={w.ward_id} onClick={() => setSelected(w.ward_id)} className={cx('border-t border-navy-100 cursor-pointer hover:bg-navy-50/60', w.ward_id === selected && 'bg-sun-50/60')}>
                        <td className="py-2.5 px-1 font-bold text-navy-900">{w.name[lang] || w.name.en}{w.kind === 'public' && <Chip tone="slate" className="ml-2">{t('atlas.public')}</Chip>}</td>
                        <td className="py-2.5 px-1 tabular-nums">{num(w.roofs)}</td>
                        <td className="py-2.5 px-1 tabular-nums">{num(w.potential.kw)} kW</td>
                        <td className="py-2.5 px-1 tabular-nums">{w.typical_roof.score}</td>
                        <td className="py-2.5 px-1">{w.kind === 'home' ? <div className="flex items-center gap-2"><Progress value={w.pledged} max={w.target} tone={w.pledged >= w.target ? 'leaf' : 'rain'} className="flex-1 !h-2.5" /><span className="text-xs font-bold tabular-nums w-12 text-right">{w.pledged}/{w.target}</span></div> : '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">{t('atlas.privacy')}</p>
            </Card>
          </>
        )}
      </Page>
    </>
  );
}
