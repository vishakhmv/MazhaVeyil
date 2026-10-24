import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Users, Sun, PartyPopper, Radio, Printer, ShieldCheck, Handshake, Info, Droplets, Layers, CheckCircle2 } from 'lucide-react';
import { useLang } from '../i18n/index.jsx';
import { useApp } from '../state.jsx';
import { community } from '../lib/api.js';
import { deviceId, num, inr } from '../lib/format.js';
import { Hero, Page, Card, CardTitle, Segmented, Btn, Chip, Notice, Spinner, Progress, Stat, EngineDown, cx } from '../components/ui.jsx';

const wardArea = (wardId) => wardId.replace(/-w\d+$/, '');
const campaignOf = (wardId) => 'c_' + wardArea(wardId);

export default function Koottam() {
  const { t, lang } = useLang();
  const { report, roof, areas, go } = useApp();
  const [wards, setWards] = useState(null);
  const [wardId, setWardId] = useState(null);
  const [camp, setCamp] = useState(null);
  const [rain, setRain] = useState(null);
  const [error, setError] = useState(null);
  const [live, setLive] = useState('connecting');
  const [kind, setKind] = useState('both');
  const [strength, setStrength] = useState('firm');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(null);
  const [pulse, setPulse] = useState(false);
  const wardRef = useRef(null);
  wardRef.current = wardId;

  const kw = report?.sun.kw_recommended ?? 2.5;
  const homeAreas = areas.filter((a) => a.kind === 'home').map((a) => a.ward_id);

  // wards that can have a Koottam: homes only (a campus is a public building)
  useEffect(() => {
    community.atlas()
      .then((r) => {
        const list = r.wards.filter((w) => homeAreas.length === 0 || homeAreas.includes(w.ward_id));
        setWards(list);
        const mine = roof.areaId ? roof.areaId + '-w1' : null;
        setWardId((cur) => cur || (list.find((w) => w.ward_id === mine) ? mine : list[0]?.ward_id) || null);
      })
      .catch((e) => setError(e));
  }, [areas.length]);

  const load = useCallback(async (id) => {
    if (!id) return;
    try {
      const c = await community.campaign(campaignOf(id));
      setCamp(c);
      setError(null);
      community.rainKoottam(campaignOf(id)).then(setRain).catch(() => setRain(null));
    } catch (e) {
      setCamp(null);
      setError(e);
    }
  }, []);
  useEffect(() => { setCamp(null); setJoined(null); load(wardId); }, [wardId, load]);

  // live: every pledge anywhere moves the counter
  useEffect(() => community.live((ev) => {
    if (!ev.polled && ev.ward_id === wardRef.current) { setPulse(true); setTimeout(() => setPulse(false), 1200); }
    if (ev.ward_id === wardRef.current) load(wardRef.current);
  }, setLive), [load]);

  const join = async () => {
    setJoining(true);
    try {
      const rid = report?.roof.id && !String(report.roof.id).startsWith('drawn:') ? report.roof.id : 'device:' + deviceId() + ':' + wardId;
      const res = await community.pledge(campaignOf(wardId), { ward_id: wardId, roof_id: rid, kind, strength, est_kw: kw, contact_consent: false, source: 'app' }, 'idem-' + deviceId() + '-' + wardId + '-' + kind);
      setJoined({ n: res.campaign.pledged, target: res.campaign.target, replay: Boolean(res.replayed) });
      load(wardId);
      toast.success(t('koottam.joined_toast'));
    } catch (e) {
      if (e.code === 'duplicate_pledge') { setJoined({ duplicate: true }); toast.info(t('koottam.duplicate')); }
      else if (e.code === 'campaign_closed') toast.error(t('koottam.closed'));
      else toast.error(e.message);
    } finally {
      setJoining(false);
    }
  };

  const ward = wards?.find((w) => w.ward_id === wardId);
  const reached = camp && camp.pledged_homes >= camp.target_homes;
  const rainPricing = rain?.pricing;
  const nextTier = rainPricing?.next_tier;
  const tierName = (x) => (lang === 'ml' && x?.label_ml ? x.label_ml : x?.label);

  return (
    <>
      <Hero icon={Users} eyebrow={t('koottam.eyebrow')} title={t('koottam.title')} sub={t('koottam.sub')}>
        <Chip tone={live === 'live' ? 'leaf' : 'sun'} icon={Radio} className="!text-sm !px-3 !py-1.5">{t('koottam.live_' + live)}</Chip>
      </Hero>
      <Page>
        {error?.offline && <EngineDown error={error} onRetry={() => load(wardId)} />}
        {error && !error.offline && !wards && <Notice tone="cliff">{error.message}</Notice>}
        {!wards && !error && <Spinner label={t('common.loading')} />}
        {wards && wards.length === 0 && <Notice tone="sun">{t('koottam.no_wards')}</Notice>}
        {wards && wards.length > 0 && (
          <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
            <div className="space-y-6 min-w-0">
              <Card className="p-4">
                <div className="flex flex-wrap gap-2" role="group" aria-label={t('koottam.pick_ward')}>
                  {wards.map((w) => (
                    <button key={w.ward_id} type="button" aria-pressed={wardId === w.ward_id} onClick={() => setWardId(w.ward_id)}
                      className={cx('px-4 py-2.5 rounded-xl text-sm font-bold border min-h-[44px] transition', wardId === w.ward_id ? 'bg-navy-800 text-white border-navy-800' : 'bg-white text-navy-700 border-navy-200 hover:bg-navy-50')}>
                      {w.name} <span className="font-normal opacity-70">· {w.pledged_homes}/{w.target_homes}</span>
                    </button>
                  ))}
                </div>
              </Card>

              {camp && ward && (
                <Card className={cx('p-5 sm:p-7 space-y-5', reached && 'border-leaf-400 ring-2 ring-leaf-100')}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-widest text-rain-600">{t('koottam.campaign')}</p>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900">{camp.title}</h2>
                      <p className="text-sm text-slate-500 mt-1">{t('koottam.days_left', { n: camp.days_left })} · {ward.district}</p>
                    </div>
                    <Chip tone={reached ? 'leaf' : 'rain'}>{t('koottam.status_' + camp.status)}</Chip>
                  </div>

                  <div>
                    <div className="flex items-end justify-between gap-3 mb-2">
                      <p className={cx('text-5xl sm:text-6xl font-extrabold tabular-nums transition-transform', pulse ? 'scale-110 text-leaf-600' : 'text-navy-900')} aria-live="polite">{camp.pledged_homes}<span className="text-2xl text-slate-400 font-bold"> / {camp.target_homes}</span></p>
                      <p className="text-sm font-bold text-slate-500 text-right">{t('koottam.homes_pledged')}<br /><span className="font-normal text-xs">{t('koottam.firm', { n: camp.firm_homes })}</span></p>
                    </div>
                    <Progress value={camp.pledged_homes} max={camp.target_homes} tone={reached ? 'leaf' : 'rain'} className="!h-4" />
                    <div className="flex justify-between text-xs text-slate-500 mt-1.5">
                      {camp.tiers.map((x) => <span key={x} className={cx(camp.pledged_homes >= x && 'font-bold text-leaf-700')}>{camp.pledged_homes >= x ? '✓ ' : ''}{x}</span>)}
                    </div>
                  </div>

                  {reached ? (
                    <Notice tone="leaf" icon={PartyPopper} title={t('koottam.target_reached')}>{t('koottam.target_reached_body')}</Notice>
                  ) : (
                    <p className="text-sm text-navy-800 leading-relaxed">{t('koottam.to_go', { n: camp.target_homes - camp.pledged_homes })}</p>
                  )}

                  <div className="grid sm:grid-cols-3 gap-3">
                    <Stat tone="sun" label={t('koottam.potential')} value={num(ward.potential_kw) + ' kW'} sub={t('koottam.potential_sub', { n: num(ward.homes_estimated) })} />
                    <Stat tone="leaf" label={t('koottam.score')} value={ward.avg_roof_score + '/100'} sub={t('koottam.score_sub')} />
                    <Stat tone="navy" label={t('koottam.mapped')} value={num(ward.roofs_mapped)} sub={t('koottam.mapped_sub')} />
                  </div>
                </Card>
              )}

              {/* Group price: honest, a target and not a promised price */}
              {rainPricing && (
                <Card className="p-5 sm:p-6 space-y-4">
                  <CardTitle icon={Handshake} tone="rain" aside={<Chip tone="sun">{t('koottam.indicative')}</Chip>}>{t('koottam.group_price')}</CardTitle>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <Stat tone="navy" label={t('koottam.single_price')} value={inr(rainPricing.individual_unit_cost)} sub={t('koottam.single_sub')} />
                    <Stat tone="leaf" label={t('koottam.group_target')} value={rainPricing.discount_pct ? inr(rainPricing.discounted_unit_cost) : '–'} sub={rainPricing.discount_pct ? t('koottam.off', { pct: rainPricing.discount_pct }) : t('koottam.no_tier')} />
                    <Stat tone="leaf" label={t('koottam.save_each')} value={inr(rainPricing.savings_per_home)} sub={nextTier ? t('koottam.next_tier', { n: rainPricing.homes_until_next_tier, pct: nextTier.discount_pct }) : t('koottam.top_tier')} />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2">
                    {rain.available_tiers.map((x) => (
                      <div key={x.threshold} className={cx('rounded-xl border p-3 text-sm', rain.rain_pledge_count >= x.threshold ? 'bg-leaf-50 border-leaf-400' : 'bg-white border-navy-100')}>
                        <p className="font-extrabold text-navy-900 flex items-center gap-1.5">{rain.rain_pledge_count >= x.threshold && <CheckCircle2 className="w-4 h-4 text-leaf-600" aria-hidden />}{x.threshold} {t('koottam.homes')} · {x.discount_pct}%</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{tierName(x)}</p>
                      </div>
                    ))}
                  </div>
                  <ul className="text-xs text-slate-600 grid sm:grid-cols-2 gap-x-6 gap-y-1">
                    {rain.component_breakdown.map((c) => <li key={c.component} className="flex justify-between border-b border-navy-50 py-1"><span>{t('koottam.part_' + c.component)}</span><span className="tabular-nums font-semibold">{inr(c.group_price)}</span></li>)}
                  </ul>
                  <Notice tone="sun" icon={Info}>{t('koottam.price_note')}</Notice>
                </Card>
              )}
            </div>

            {/* Join */}
            <div className="space-y-5 lg:sticky lg:top-20">
              <Card className="p-5 space-y-4 border-2 border-sun-200">
                <CardTitle icon={Users} tone="sun">{t('koottam.join_title')}</CardTitle>
                {joined && !joined.duplicate && (
                  <Notice tone="leaf" icon={PartyPopper} title={t('koottam.you_are_in')}>{t('koottam.you_are', { n: joined.n, target: joined.target })}</Notice>
                )}
                {joined?.duplicate && <Notice tone="rain" icon={CheckCircle2} title={t('koottam.already')}>{t('koottam.duplicate')}</Notice>}
                {!joined && (
                  <>
                    <div>
                      <p className="text-sm font-bold text-navy-800 mb-2">{t('koottam.kind')}</p>
                      <Segmented value={kind} onChange={setKind} options={[
                        { value: 'solar', label: <span className="flex items-center gap-1"><Sun className="w-4 h-4" />{t('koottam.kind_solar')}</span> },
                        { value: 'rain', label: <span className="flex items-center gap-1"><Droplets className="w-4 h-4" />{t('koottam.kind_rain')}</span> },
                        { value: 'both', label: <span className="flex items-center gap-1"><Layers className="w-4 h-4" />{t('koottam.kind_both')}</span> },
                      ]} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-navy-800 mb-2">{t('koottam.strength')}</p>
                      <Segmented value={strength} onChange={setStrength} options={[{ value: 'firm', label: t('koottam.firm_yes') }, { value: 'maybe', label: t('koottam.maybe') }]} />
                    </div>
                    <p className="text-sm text-slate-600">{report ? t('koottam.with_report', { kw }) : t('koottam.no_report', { kw })}{!report && <button type="button" onClick={() => go('find')} className="ml-1 font-bold underline text-rain-700">{t('koottam.get_report')}</button>}</p>
                    <Btn variant="sun" size="lg" icon={Handshake} onClick={join} loading={joining} disabled={!camp || camp.status === 'closed' || camp.status === 'expired'} className="w-full">{t('koottam.join')}</Btn>
                  </>
                )}
                <p className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed"><ShieldCheck className="w-4 h-4 shrink-0 text-leaf-600 mt-0.5" aria-hidden />{t('koottam.privacy')}</p>
              </Card>
              <div className="flex flex-wrap gap-3 no-print">
                <Btn variant="rain" icon={Layers} onClick={() => go('atlas')}>{t('koottam.see_atlas')}</Btn>
                {wardId && <a href={community.printUrl(wardId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-navy-200 bg-white text-sm font-bold text-navy-800 hover:bg-navy-50 min-h-[40px]"><Printer className="w-4 h-4" aria-hidden />{t('koottam.print')}</a>}
              </div>
            </div>
          </div>
        )}
      </Page>
    </>
  );
}
