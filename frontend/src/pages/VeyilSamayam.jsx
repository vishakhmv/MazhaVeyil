import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Droplets, Shirt, Flame, CarFront, ArrowRight, Sun, Zap, Minus, Plus, TriangleAlert, CloudSun, IndianRupee, Info } from 'lucide-react';
import { useLang } from '../i18n/index.jsx';
import { useApp, monthlyOf } from '../state.jsx';
import { engine } from '../lib/api.js';
import { Hero, Page, Card, CardTitle, Field, Btn, Chip, Notice, Spinner, EngineDown, Stat, inputCls, cx } from '../components/ui.jsx';
import { DayChart } from '../components/charts.jsx';
import { inr, num } from '../lib/format.js';

const APPS = [
  { id: 'motor', icon: Droplets },
  { id: 'washing_machine', icon: Shirt },
  { id: 'iron', icon: Flame },
  { id: 'ev_charger', icon: CarFront },
];

export default function VeyilSamayam() {
  const { t } = useLang();
  const { report, units, areas, go } = useApp();
  const [kw, setKw] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [apps, setApps] = useState(['motor', 'washing_machine', 'iron']);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  const useKw = kw ?? report?.sun.kw_recommended ?? 2.5;
  const useUnits = monthly ?? (units.value ? monthlyOf(units) : report?.home.monthly_units) ?? 262;
  const where = report?.roof.centroid || areas.find((a) => a.kind === 'home')?.center || areas[0]?.center;

  useEffect(() => {
    if (!where) return;
    const my = ++seq.current;
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const p = await engine.sunPlan({ lon: where[0], lat: where[1], kw: useKw, monthly_units: Math.round(useUnits), appliances: apps });
        if (my === seq.current) { setPlan(p); setError(null); }
      } catch (e) {
        if (my === seq.current) setError(e);
      } finally {
        if (my === seq.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [where?.[0], where?.[1], useKw, useUnits, apps.join(',')]);

  const toggle = (id) => setApps((a) => (a.includes(id) ? (a.length > 1 ? a.filter((x) => x !== id) : a) : [...a, id]));
  const appNames = useMemo(() => Object.fromEntries(APPS.map((a) => [a.id, t('appliance.' + a.id)])), [t]);
  const typ = plan?.typical_day;
  const ordered = plan ? [...plan.plan].sort((a, b) => a.start.localeCompare(b.start)) : [];

  return (
    <>
      <Hero icon={Clock} eyebrow={t('veyil.eyebrow')} title={t('veyil.title')} sub={t('veyil.sub')} />
      <Page>
        {error?.offline && <EngineDown error={error} />}
        {error && !error.offline && <Notice tone="cliff">{error.message}</Notice>}
        <div className="grid lg:grid-cols-[360px_1fr] gap-6 items-start">
          <Card className="p-5 space-y-5 lg:sticky lg:top-20">
            <CardTitle icon={Zap} tone="sun">{t('veyil.your_home')}</CardTitle>
            <Field label={t('veyil.kw')} hint={report && kw === null ? t('veyil.kw_from_report') : t('veyil.kw_hint')}>
              <div className="inline-flex items-center gap-3">
                <Btn size="sm" variant="outline" aria-label="−" onClick={() => setKw(Math.max(0.5, useKw - 0.5))}><Minus className="w-4 h-4" /></Btn>
                <span className="text-2xl font-extrabold text-sun-600 tabular-nums min-w-[6rem] text-center whitespace-nowrap">{useKw} kW</span>
                <Btn size="sm" variant="outline" aria-label="+" onClick={() => setKw(Math.min(20, useKw + 0.5))}><Plus className="w-4 h-4" /></Btn>
              </div>
            </Field>
            <Field label={t('veyil.units')} hint={t('veyil.units_hint')}>
              <input type="number" inputMode="numeric" className={inputCls} min="1" value={Math.round(useUnits)} onChange={(e) => setMonthly(Math.max(1, Number(e.target.value) || 1))} />
            </Field>
            <div>
              <p className="text-sm font-bold text-navy-800 mb-2">{t('veyil.appliances')}</p>
              <div className="grid grid-cols-2 gap-2">
                {APPS.map(({ id, icon: Icon }) => (
                  <button key={id} type="button" aria-pressed={apps.includes(id)} onClick={() => toggle(id)}
                    className={cx('flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-bold text-left min-h-[48px] transition', apps.includes(id) ? 'bg-sun-50 border-sun-300 text-navy-900' : 'bg-white border-navy-200 text-slate-500 hover:bg-navy-50')}>
                    <Icon className={cx('w-5 h-5 shrink-0', apps.includes(id) ? 'text-sun-600' : 'text-slate-400')} aria-hidden />
                    {appNames[id]}
                  </button>
                ))}
              </div>
              {apps.includes('ev_charger') && <p className="text-xs text-slate-500 mt-2 leading-snug">{t('veyil.ev_note')}</p>}
            </div>
            {!report && <Notice tone="navy" icon={Info}>{t('veyil.no_roof')}<button type="button" onClick={() => go('find')} className="ml-1 font-bold underline">{t('veyil.pick_roof')}</button></Notice>}
          </Card>

          <div className="space-y-6 min-w-0">
            {!plan && loading && <Spinner label={t('common.loading')} />}
            {plan && (
              <>
                {/* The answer */}
                <Card className={cx('p-5 sm:p-6 bg-gradient-to-br from-sun-50 to-white border-sun-200', loading && 'opacity-70')}>
                  <p className="text-xs font-bold uppercase tracking-widest text-sun-700">{t('veyil.best_hours')} · {plan.date}</p>
                  <ul className="mt-3 grid sm:grid-cols-2 gap-3">
                    {ordered.map((p) => {
                      const Icon = APPS.find((a) => a.id === p.appliance)?.icon || Zap;
                      return (
                        <li key={p.appliance} className="flex items-center gap-3 bg-white rounded-2xl border border-sun-200 p-3.5">
                          <span className="w-11 h-11 rounded-xl bg-sun-100 text-sun-700 flex items-center justify-center shrink-0"><Icon className="w-6 h-6" aria-hidden /></span>
                          <div className="min-w-0">
                            <p className="font-bold text-navy-900 leading-tight">{appNames[p.appliance]}</p>
                            <p className="text-sm text-slate-500">{t('veyil.run_at')} <b className="text-2xl text-leaf-700 tabular-nums align-middle">{p.start}</b></p>
                            <p className="text-[11px] text-slate-400">{t('veyil.instead_of', { time: p.usual_start })} · {p.kwh} {t('unit.units')}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Card>

                {/* Pitch numbers: a typical day, not tomorrow's weather */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <Card className="p-5">
                    <CardTitle icon={Sun} tone="sun">{t('veyil.selfuse')}</CardTitle>
                    <div className="flex items-center justify-center gap-4 py-2">
                      <div className="text-center"><p className="text-4xl font-extrabold text-slate-400 tabular-nums">{typ.self_use_pct.before}%</p><p className="text-xs text-slate-500">{t('veyil.usual_times')}</p></div>
                      <ArrowRight className="w-7 h-7 text-sun-500" aria-hidden />
                      <div className="text-center"><p className="text-5xl font-extrabold text-leaf-600 tabular-nums">{typ.self_use_pct.after}%</p><p className="text-xs text-slate-500">{t('veyil.best_times')}</p></div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{t('veyil.selfuse_note')}</p>
                  </Card>
                  <Card className="p-5 space-y-3">
                    <CardTitle icon={TriangleAlert} tone="cliff">{t('veyil.peak')}</CardTitle>
                    <Stat tone="cliff" big label={t('veyil.moved')} value={num(typ.units_moved_from_peak, 2) + ' ' + t('unit.units')} sub={t('veyil.moved_sub')} />
                    <p className="text-xs text-slate-500 leading-relaxed">{t('veyil.peak_note')}</p>
                  </Card>
                </div>

                {/* The day */}
                <Card className="p-5">
                  <CardTitle icon={CloudSun} tone="sun" aside={<Chip tone={plan.quality.data === 'forecast' ? 'leaf' : 'sun'}>{t('quality.data.' + plan.quality.data)}</Chip>}>{t('veyil.day_title', { date: plan.date })}</CardTitle>
                  <DayChart sun={plan.sun_hours_kw} plan={plan.plan} peak={['18:00', '22:00']} solarWindow={['08:00', '16:00']} appliances={appNames} labels={{ peak: t('veyil.peak_short'), aria: t('veyil.day_title', { date: plan.date }) }} />
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600 mt-2">
                    <span className="flex items-center gap-1.5"><i className="w-4 h-3 rounded bg-white border border-dashed border-cliff-500" />{t('veyil.legend_usual')}</span>
                    <span className="flex items-center gap-1.5"><i className="w-4 h-3 rounded bg-leaf-500" />{t('veyil.legend_best')}</span>
                    <span className="flex items-center gap-1.5"><i className="w-4 h-3 rounded bg-sun-300" />{t('veyil.legend_sun')}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-3">{t('veyil.forecast_selfuse', { before: plan.self_use_pct.before, after: plan.self_use_pct.after, kwh: num(plan.pv_day_kwh, 1) })}</p>
                </Card>

                {/* Alerts */}
                <Card className="p-5">
                  <CardTitle icon={TriangleAlert} tone="sun">{t('veyil.alerts')}</CardTitle>
                  <ul className="space-y-2">
                    {plan.alerts.map((a, i) => <li key={i} className="flex gap-3 rounded-xl bg-sun-50 border border-sun-100 p-3 text-sm text-navy-900"><TriangleAlert className="w-5 h-5 text-sun-600 shrink-0" aria-hidden />{t(a.key, a.params)}</li>)}
                  </ul>
                </Card>

                {/* Rupees (only where KSEB's time-of-day tariff applies) */}
                <Card className="p-5">
                  <CardTitle icon={IndianRupee} tone="leaf" aside={<Chip tone="leaf">{t('veyil.verified_tod')}</Chip>}>{t('veyil.tod_title')}</CardTitle>
                  {plan.tod.applies ? (
                    <div className="grid sm:grid-cols-3 gap-3">
                      <Stat tone="cliff" label={t('veyil.tod_before')} value={inr(plan.tod.cost_before_day, 2)} sub={t('veyil.per_day')} />
                      <Stat tone="leaf" label={t('veyil.tod_after')} value={inr(plan.tod.cost_after_day, 2)} sub={t('veyil.per_day')} />
                      <Stat tone="leaf" big label={t('veyil.tod_saving')} value={inr(plan.tod.saving_month)} sub={t('veyil.per_month')} />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600 leading-relaxed">{t('veyil.tod_na', { n: plan.tod.threshold_units })}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-3 leading-relaxed">{t('veyil.tod_note')}</p>
                </Card>
              </>
            )}
          </div>
        </div>
      </Page>
    </>
  );
}
