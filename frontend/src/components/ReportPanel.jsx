import React from 'react';
import { Sun, CloudRain, Zap, Printer, ShieldCheck, ShieldAlert, Leaf, Clock, Users, Gauge, Lightbulb, TrendingDown, CalendarClock, Landmark, Droplets, ChevronDown } from 'lucide-react';
import { useLang, hasKey } from '../i18n/index.jsx';
import { useApp } from '../state.jsx';
import { Card, CardTitle, Stat, Chip, Btn, Notice, cx } from './ui.jsx';
import { ScoreRings, MonthBars, SingleBars, TankGauge } from './charts.jsx';
import { inr, num, range, monthNames, big } from '../lib/format.js';

const INSIGHT_ICON = {
  'insight.cliff_over': Gauge,
  'insight.cliff_near': Gauge,
  'insight.subsidy_window': CalendarClock,
  'insight.tank_tip': Droplets,
  'insight.dry_months': CloudRain,
  'insight.water_days': Droplets,
  'insight.last_panels_earn_little': TrendingDown,
  'insight.roof_limits': Sun,
  'insight.big_system_rules': Landmark,
  'insight.public_building': Landmark,
  'insight.default_units': Lightbulb,
  'insight.typical_data': Lightbulb,
};
const WARN = new Set(['insight.cliff_over', 'insight.big_system_rules', 'insight.roof_limits']);

export function ReportPanel({ report: r, onOpenCliff }) {
  const { t, lang } = useLang();
  const { go } = useApp();
  const months = monthNames(lang);
  const isHome = r.roof.building_use === 'home';
  const words = { lakh: t('unit.lakh'), crore: t('unit.crore') };

  // insights: months arrive as numbers, show them as names
  const insight = (i) => {
    const params = { ...i.params };
    if (params.months) params.months = params.months.map((m) => months[m - 1]).join(', ');
    if (params.saving !== undefined) params.saving = num(params.saving);
    if (params.jump !== undefined) params.jump = num(params.jump);
    if (params.subsidy !== undefined) params.subsidy = num(params.subsidy);
    if (params.days !== undefined) params.days = num(params.days);
    if (params.monthly_units !== undefined) params.monthly_units = num(params.monthly_units);
    return t(i.key, params);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-rain-600">{t('rep.title')}</p>
            <p className="text-sm text-slate-600 mt-0.5">
              {num(r.roof.area_m2)} m² · {t('roof.type.' + r.roof.roof_type)} · {t('roof.shade.' + r.roof.shade)} · {isHome ? t('use.home') : t('use.public')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 no-print">
            <Chip tone={r.quality.data === 'cached' || r.quality.data === 'live' ? 'leaf' : 'sun'} icon={r.quality.data === 'cached' || r.quality.data === 'live' ? ShieldCheck : ShieldAlert}>{t('quality.data.' + r.quality.data)}</Chip>
            <Chip tone={r.quality.units === 'typed' ? 'leaf' : 'sun'}>{t('quality.units.' + r.quality.units)}</Chip>
            <Btn size="sm" variant="outline" icon={Printer} onClick={() => window.print()}>{t('rep.print')}</Btn>
          </div>
        </div>
      </Card>

      {/* Score */}
      <Card className="p-5 sm:p-6">
        <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-center">
          <div className="mx-auto"><ScoreRings power={r.score.power} water={r.score.water} score={r.score.score} bandLabel={t('band.' + r.score.band)} scoreLabel={t('rep.score')} /></div>
          <div className="space-y-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-navy-900">{t('rep.score')}</h2>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">{t('rep.score_explain')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-sun-50 border border-sun-100 p-3">
                <p className="flex items-center gap-1.5 text-xs font-bold text-sun-700"><Sun className="w-4 h-4" aria-hidden />{t('rep.power')}</p>
                <p className="text-2xl font-extrabold text-navy-900 tabular-nums">{r.score.power}<span className="text-sm text-slate-400">/100</span></p>
                <p className="text-xs text-slate-500">{t('rep.power_sub')}</p>
              </div>
              <div className="rounded-xl bg-rain-50 border border-rain-100 p-3">
                <p className="flex items-center gap-1.5 text-xs font-bold text-rain-700"><CloudRain className="w-4 h-4" aria-hidden />{t('rep.water')}</p>
                <p className="text-2xl font-extrabold text-navy-900 tabular-nums">{r.score.water}<span className="text-sm text-slate-400">/100</span></p>
                <p className="text-xs text-slate-500">{t('rep.water_sub')}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Insights */}
      {r.insights?.length > 0 && (
        <Card className="p-5">
          <CardTitle icon={Lightbulb} tone="sun">{t('rep.insights')}</CardTitle>
          <ul className="space-y-2.5">
            {r.insights.map((i, idx) => {
              const Icon = INSIGHT_ICON[i.key] || Lightbulb;
              const warn = WARN.has(i.key);
              return (
                <li key={idx} className={cx('flex gap-3 rounded-xl p-3 text-sm leading-relaxed border', warn ? 'bg-cliff-50 border-cliff-100' : 'bg-navy-50/60 border-navy-100')}>
                  <Icon className={cx('w-5 h-5 shrink-0 mt-0.5', warn ? 'text-cliff-600' : 'text-navy-500')} aria-hidden />
                  <span className="text-navy-900">{insight(i)}</span>
                </li>
              );
            })}
          </ul>
          {r.cliff && (
            <Btn size="sm" variant="outline" icon={Gauge} className="mt-3 no-print" onClick={onOpenCliff}>{t('rep.open_cliff')}</Btn>
          )}
        </Card>
      )}

      {/* Sun */}
      <Card className="p-5">
        <CardTitle icon={Sun} tone="sun">{t('rep.sun')}</CardTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat tone="sun" label={t('rep.kw_recommended')} value={r.sun.kw_recommended + ' kW'} sub={t('rep.kw_max', { kw: r.sun.kw_max })} />
          <Stat tone="sun" label={t('rep.units_year')} value={num(r.sun.units_year)} sub={t('rep.units_month_avg', { n: num(r.sun.units_year / 12) })} />
          <Stat tone="leaf" label={t('rep.co2')} value={r.sun.co2_t_year + ' t'} sub={t('rep.co2_sub')} />
          {isHome ? (
            <Stat tone="navy" label={t('rep.subsidy')} value={inr(r.sun.subsidy)} sub={r.sun.subsidy_days_left !== null ? t('rep.subsidy_days', { days: r.sun.subsidy_days_left }) : ''} />
          ) : (
            <Stat tone="navy" label={t('rep.cost')} value={range(r.sun.cost, (v) => big(v, words))} sub={t('rep.public_note')} />
          )}
        </div>
        <div className="mt-4">
          <p className="text-xs font-bold text-slate-500 mb-1">{t('rep.units_by_month')}</p>
          <SingleBars values={r.sun.units_month} labels={months} color="#f7b32b" unitLabel={t('unit.units')} />
        </div>
      </Card>

      {/* Size options */}
      {isHome && r.sun.options?.length > 0 && (
        <Card className="p-5">
          <CardTitle icon={Zap} tone="rain">{t('rep.options')}</CardTitle>
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">{t('rep.options_explain')}</p>
          <div className="grid gap-3 md:grid-cols-3">
            {r.sun.options.map((o) => {
              const rec = o.label === 'recommended';
              return (
                <div key={o.label} className={cx('rounded-2xl border p-4 space-y-2.5', rec ? 'border-rain-400 bg-rain-50/60 ring-2 ring-rain-200' : 'border-navy-100 bg-white')}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('option.' + o.label)}</span>
                    {rec && <Chip tone="rain">{t('rep.we_recommend')}</Chip>}
                  </div>
                  <p className="text-3xl font-extrabold text-navy-900 tabular-nums">{o.kw} <span className="text-base text-slate-400">kW</span></p>
                  <dl className="text-sm space-y-1.5">
                    <Row k={t('rep.saves_year')} v={inr(o.saving_year)} strong />
                    <Row k={t('rep.subsidy')} v={inr(o.subsidy)} />
                    <Row k={t('rep.net_cost')} v={range(o.net_cost, (v) => big(v, words))} />
                    <Row k={t('rep.payback')} v={o.payback_years ? t('rep.years', { y: range(o.payback_years) }) : '–'} strong />
                    <Row k={t('rep.payback_nosub')} v={o.payback_years_no_subsidy ? t('rep.years', { y: range(o.payback_years_no_subsidy) }) : '–'} />
                    <Row k={t('rep.benefit25')} v={big(o.net_benefit_25y, words)} />
                  </dl>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">{t('rep.options_footnote')}</p>
        </Card>
      )}

      {/* Money */}
      {isHome && r.money && (
        <Card className="p-5">
          <CardTitle icon={TrendingDown} tone="leaf">{t('rep.money')}</CardTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat tone="navy" label={t('rep.bill_before')} value={inr(r.money.bill_before_month)} sub={t('rep.per_month_energy')} />
            <Stat tone="leaf" label={t('rep.bill_after')} value={inr(r.money.bill_after_month)} sub={t('rep.per_month_avg')} />
            <Stat tone="leaf" label={t('rep.saving_month')} value={inr(r.money.saving_month)} sub={inr(r.money.saving_year) + ' ' + t('rep.per_year')} />
            <Stat tone="navy" label={t('rep.payout')} value={inr(r.money.surplus_payout_year)} sub={t('rep.payout_sub')} />
          </div>
          <div className="mt-4">
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600 mb-1">
              <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm" style={{ background: '#b9cce8' }} />{t('rep.before')}</span>
              <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm" style={{ background: '#23a26b' }} />{t('rep.after')}</span>
            </div>
            <MonthBars a={r.money.bill_before_months} b={r.money.bill_after_months} labels={months} aLabel={t('rep.before')} bLabel={t('rep.after')} />
          </div>
          <p className="text-xs text-slate-500 mt-2">{t('rep.money_footnote')}</p>
        </Card>
      )}

      {/* Rain */}
      <Card className="p-5">
        <CardTitle icon={CloudRain} tone="rain">{t('rep.rain')}</CardTitle>
        <div className="grid sm:grid-cols-[auto_1fr] gap-5 items-center">
          <div className="mx-auto text-center">
            <TankGauge pct={r.rain.water_cover_pct} litres={r.rain.tank_litres} label={t('rep.tank')} />
            <p className="text-sm font-extrabold text-navy-900 mt-1">{num(r.rain.tank_litres)} L</p>
            <p className="text-xs text-slate-500">{t('rep.tank_covers', { pct: r.rain.water_cover_pct })}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat tone="rain" label={t('rep.annual_rain')} value={num(r.rain.annual_mm) + ' mm'} sub={t('rep.rain_source')} />
            <Stat tone="rain" label={t('rep.harvest')} value={big(r.rain.harvest_litres_year, words) + ' L'} sub={t('rep.harvest_sub')} />
            <Stat tone="rain" label={t('rep.demand')} value={num(r.rain.demand_litres_day) + ' L'} sub={t('rep.demand_sub')} />
            <Stat tone="rain" label={t('rep.recharge')} value={big(r.rain.well_recharge_litres_year, words) + ' L'} sub={t('rep.recharge_sub')} />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-xs font-bold text-slate-500 mb-1">{t('rep.litres_by_month')}</p>
          <SingleBars values={r.rain.monthly_litres} labels={months} color="#2386c4" unitLabel="L" />
        </div>
        <div className="mt-4">
          <p className="text-xs font-bold text-slate-500 mb-1">{t('rep.tank_curve')}</p>
          <SingleBars values={r.rain.tank_curve.map((p) => p.cover_pct)} labels={r.rain.tank_curve.map((p) => (p.litres >= 1000 ? p.litres / 1000 + 'k' : p.litres))} color="#a6d8f4" unitLabel="%" highlight={[r.rain.tank_curve.findIndex((p) => p.litres === r.rain.tank_litres)]} />
        </div>
        <Notice tone="rain" icon={ShieldAlert} className="mt-4" title={t('rep.safety')}>
          <ul className="list-disc pl-5 space-y-0.5">{r.rain.safety.map((k) => <li key={k}>{t(k)}</li>)}</ul>
        </Notice>
      </Card>

      {/* Next steps */}
      <div className="grid sm:grid-cols-3 gap-3 no-print">
        <Btn variant="sun" icon={Clock} onClick={() => go('veyil')}>{t('rep.next_veyil')}</Btn>
        <Btn variant="rain" icon={Users} onClick={() => go('koottam')}>{t('rep.next_koottam')}</Btn>
        <Btn variant="outline" icon={Leaf} onClick={() => go('today')}>{t('rep.next_today')}</Btn>
      </div>

      {/* Assumptions and sources */}
      <details className="group bg-white rounded-2xl border border-navy-100 shadow-sm print-card">
        <summary className="list-none cursor-pointer flex items-center justify-between gap-3 p-5 font-bold text-navy-900">
          <span className="flex items-center gap-2.5"><ShieldCheck className="w-5 h-5 text-navy-500" aria-hidden />{t('rep.assumptions')}</span>
          <ChevronDown className="w-5 h-5 text-slate-400 transition group-open:rotate-180" aria-hidden />
        </summary>
        <div className="px-5 pb-5 space-y-3">
          <p className="text-xs text-slate-500">{t('rep.assumptions_sub', { date: r.rules_checked_on })}</p>
          <ul className="divide-y divide-navy-100 text-sm">
            {r.assumptions.map((a) => (
              <li key={a.id} className="py-2.5 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-navy-900">{hasKey('as.' + a.id) ? t('as.' + a.id) : a.id}</p>
                  <p className="text-xs text-slate-500 leading-snug">{a.source}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold tabular-nums text-navy-800">{Array.isArray(a.value) ? a.value.join(' – ') : String(a.value)}</span>
                  <Chip tone={a.verified ? 'leaf' : 'sun'}>{a.verified ? t('rep.verified') : t('rep.not_verified')}</Chip>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </details>
      <p className="text-xs text-slate-500 leading-relaxed px-1">{t('rep.disclaimer')}</p>
    </div>
  );
}

const Row = ({ k, v, strong }) => (
  <div className="flex items-baseline justify-between gap-3">
    <dt className="text-slate-500 text-xs">{k}</dt>
    <dd className={cx('tabular-nums text-right', strong ? 'font-extrabold text-navy-900' : 'font-semibold text-navy-800')}>{v}</dd>
  </div>
);
