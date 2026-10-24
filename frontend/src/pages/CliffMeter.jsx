import React, { useMemo } from 'react';
import { Gauge, TrendingUp, ShieldCheck, Sun, MapPin } from 'lucide-react';
import { useLang } from '../i18n/index.jsx';
import { useApp } from '../state.jsx';
import { Hero, Page, Card, CardTitle, Segmented, Field, Notice, Btn, Chip, Stat, inputCls, cx } from '../components/ui.jsx';
import { CliffChart } from '../components/charts.jsx';
import { monthEnergy, bill, cliffs as listCliffs, TARIFF, SOLAR_UNITS_PER_KW_MONTH } from '../../../contracts/cliffMath.js';
import { inr, num, numT } from '../lib/format.js';

const EXAMPLE_UNITS = 262; // shown until the household types its own

export default function CliffMeter() {
  const { t } = useLang();
  const { units, setUnits, report, go, status } = useApp();
  const [solarKw, setSolarKw] = React.useState(null);

  const typed = Boolean(units.value);
  const total = units.value ?? EXAMPLE_UNITS;
  const months = units.months;
  const monthly = total / months;
  const kw = solarKw ?? report?.sun.kw_recommended ?? 1;

  const curve = useMemo(() => Array.from({ length: 601 }, (_, u) => ({ units: u, energy: monthEnergy(u) })), []);
  const cliffs = useMemo(() => listCliffs(), []);

  const m = useMemo(() => {
    const before = bill(total, months, units.phase);
    const solarUnits = Math.round(kw * SOLAR_UNITS_PER_KW_MONTH * months);
    const netTotal = Math.max(0, total - solarUnits);
    const after = netTotal === 0 ? { energy: 0, fixed: 0, duty: 0, total: 0 } : bill(netTotal, months, units.phase);
    const last = [...cliffs].reverse().find((c) => c.at < monthly) || null;
    const next = cliffs.find((c) => c.at >= monthly) || null;
    const overBy = last ? Math.round((monthly - last.at) * 100) / 100 : 0;
    const savingIfUnder = last ? Math.round((monthEnergy(monthly) - monthEnergy(last.at)) * 100) / 100 : 0;
    // the smallest whole-or-half kW that brings you back under the cliff you are over
    let need = null;
    if (last) {
      for (let k = 1; k <= 10; k += 0.5) {
        if (monthly - k * SOLAR_UNITS_PER_KW_MONTH <= last.at) { need = k; break; }
      }
    }
    return { before, after, solarUnits, netTotal, monthlyAfter: netTotal / months, last, next, overBy, savingIfUnder, need, saving: Math.max(0, before.total - after.total) };
  }, [total, months, units.phase, kw, monthly, cliffs]);

  const over = Boolean(m.last);
  const first = cliffs[0];

  return (
    <>
      <Hero icon={Gauge} eyebrow={t('cliff.eyebrow')} title={t('cliff.title')} sub={t('cliff.sub')}>
        <Chip tone="leaf" icon={ShieldCheck} className="!text-sm !px-3 !py-1.5">{t('cliff.verified', { from: TARIFF.valid_from, to: TARIFF.valid_to })}</Chip>
      </Hero>
      <Page>
        <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
          {/* Controls */}
          <Card className="p-5 space-y-5 lg:sticky lg:top-20">
            <CardTitle icon={TrendingUp} tone="rain">{t('cliff.your_units')}</CardTitle>
            <Segmented value={months} onChange={(v) => setUnits({ months: v })} options={[{ value: 1, label: t('units.monthly') }, { value: 2, label: t('units.bimonthly') }]} />
            <Field label={months === 1 ? t('cliff.units_month') : t('cliff.units_bimonth')} right={<span className="text-2xl font-extrabold text-navy-900 tabular-nums">{num(total)}</span>}>
              <input type="range" min="0" max={700 * months} step="1" value={Math.min(total, 700 * months)} onChange={(e) => setUnits({ value: Number(e.target.value) })} className="w-full h-3" aria-label={t('cliff.your_units')} />
              <input type="number" inputMode="numeric" min="0" className={cx(inputCls, 'mt-2')} value={units.value ?? ''} placeholder={t('cliff.type_units', { n: EXAMPLE_UNITS * months })} onChange={(e) => setUnits({ value: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })} />
            </Field>
            {!typed && <Notice tone="sun" icon={Gauge}>{t('cliff.example_note')}</Notice>}
            {months === 2 && <Notice tone="navy" icon={ShieldCheck}>{t('cliff.two_month_note', { n: numT(monthly, 1) })}</Notice>}
            <Field label={t('cliff.solar_kw')} right={<span className="text-xl font-extrabold text-sun-600 tabular-nums">{kw} kW</span>} hint={report && solarKw === null ? t('cliff.kw_from_report') : t('cliff.kw_hint', { n: SOLAR_UNITS_PER_KW_MONTH })}>
              <input type="range" min="0" max="6" step="0.5" value={kw} onChange={(e) => setSolarKw(Number(e.target.value))} className="w-full h-3" aria-label={t('cliff.solar_kw')} />
            </Field>
            <Field label={t('find.phase')}>
              <Segmented value={units.phase} onChange={(v) => setUnits({ phase: v })} options={[{ value: '1ph', label: t('units.phase1') }, { value: '3ph', label: t('units.phase3') }]} />
            </Field>
          </Card>

          <div className="space-y-6 min-w-0">
            {/* Headline */}
            <Card className={cx('p-5 sm:p-6 border-2', over ? 'border-cliff-100 bg-cliff-50/50' : 'border-leaf-100 bg-leaf-50/50')} aria-live="polite">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2 min-w-0">
                  <p className={cx('text-xs font-bold uppercase tracking-widest', over ? 'text-cliff-600' : 'text-leaf-700')}>{t('cliff.you_use', { n: numT(monthly, 1) })}</p>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900 leading-tight text-balance">
                    {over ? t('cliff.over_headline', { n: numT(m.overBy, 1), cliff: m.last.at }) : t('cliff.under_headline', { n: numT(m.next ? m.next.at - monthly : 0, 1), cliff: m.next?.at ?? 250 })}
                  </h2>
                  <p className="text-navy-800/90 leading-relaxed">
                    {over
                      ? t('cliff.over_body', { n: numT(m.overBy, 1), save: num(m.savingIfUnder, 0) })
                      : t('cliff.under_body', { jump: num(m.next?.jump ?? first.jump, 0), cliff: m.next?.at ?? first.at })}
                  </p>
                </div>
                <div className="rounded-2xl bg-white border border-navy-100 p-4 text-center shrink-0">
                  <p className="text-xs font-bold text-slate-500 uppercase">{t('cliff.one_unit')}</p>
                  <p className="text-3xl font-extrabold text-cliff-600 tabular-nums">{inr(first.jump, 0)}</p>
                  <p className="text-xs text-slate-500">{t('cliff.one_unit_sub', { cliff: first.at })}</p>
                </div>
              </div>
              {over && m.need && (
                <div className="mt-4 rounded-xl bg-white border border-sun-200 p-3.5 flex items-start gap-3">
                  <Sun className="w-5 h-5 text-sun-600 shrink-0 mt-0.5" aria-hidden />
                  <p className="text-sm text-navy-900 leading-relaxed">{t('cliff.solar_beats', { kw: m.need, units: num(m.need * SOLAR_UNITS_PER_KW_MONTH), after: num(monthly - m.need * SOLAR_UNITS_PER_KW_MONTH), save: num(monthEnergy(monthly) - monthEnergy(Math.max(0, monthly - m.need * SOLAR_UNITS_PER_KW_MONTH)), 0) })}</p>
                </div>
              )}
            </Card>

            {/* Chart */}
            <Card className="p-5">
              <CardTitle icon={Gauge} tone="cliff">{t('cliff.chart_title')}</CardTitle>
              <CliffChart curve={curve} cliffs={cliffs} monthly={monthly} monthlyAfter={kw > 0 ? m.monthlyAfter : null} labels={{ axis: t('cliff.axis'), now: t('cliff.now'), after: t('cliff.after'), aria: t('cliff.chart_title') }} />
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{t('cliff.chart_note')}</p>
            </Card>

            {/* Before / after */}
            <div className="grid md:grid-cols-2 gap-4">
              <BillCard tone="navy" title={t('cliff.bill_before')} b={m.before} months={months} t={t} />
              <BillCard tone="leaf" title={t('cliff.bill_after', { kw })} b={m.after} months={months} t={t} sub={t('cliff.net_units', { n: num(m.netTotal) })} />
            </div>
            <Card className="p-5 bg-leaf-50/60 border-leaf-100">
              <div className="grid sm:grid-cols-3 gap-3">
                <Stat tone="leaf" label={t('cliff.you_save')} value={inr(m.saving)} sub={months === 1 ? t('cliff.per_month') : t('cliff.per_bill')} big />
                <Stat tone="navy" label={t('cliff.simple_calc')} value={inr(Math.round(m.solarUnits * (total > 0 ? m.before.energy / total : 0)))} sub={t('cliff.simple_calc_sub', { real: num(Math.round(m.before.energy - m.after.energy)) })} />
                <Stat tone="navy" label={t('cliff.units_gen', { kw })} value={num(m.solarUnits)} sub={t('cliff.units_gen_sub')} />
              </div>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">{t('cliff.slab_aware')}</p>
            </Card>

            {/* The five cliffs */}
            <Card className="p-5">
              <CardTitle icon={Gauge} tone="cliff">{t('cliff.table_title')}</CardTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="py-2 pr-4">{t('cliff.col_at')}</th><th className="py-2 pr-4">{t('cliff.col_before')}</th><th className="py-2 pr-4">{t('cliff.col_after')}</th><th className="py-2">{t('cliff.col_jump')}</th></tr></thead>
                  <tbody>
                    {cliffs.map((c) => (
                      <tr key={c.at} className={cx('border-t border-navy-100', monthly > c.at && monthly <= (cliffs.find((x) => x.at > c.at)?.at ?? 1e9) && 'bg-cliff-50/60')}>
                        <td className="py-2 pr-4 font-bold text-navy-900 tabular-nums">{c.at}</td>
                        <td className="py-2 pr-4 tabular-nums">{inr(monthEnergy(c.at), 2)}</td>
                        <td className="py-2 pr-4 tabular-nums">{inr(monthEnergy(c.at + 1), 2)}</td>
                        <td className="py-2 font-extrabold text-cliff-600 tabular-nums">+{inr(c.jump, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">{t('cliff.table_note')}</p>
            </Card>

            <div className="flex flex-wrap gap-3 no-print">
              <Btn variant="rain" icon={MapPin} onClick={() => go('find')}>{t('cliff.to_roof')}</Btn>
              <Btn variant="sun" icon={Sun} onClick={() => go('veyil')}>{t('rep.next_veyil')}</Btn>
              {status.rulesDate && <span className="self-center text-xs text-slate-500">{t('footer.rates_checked', { date: status.rulesDate })}</span>}
            </div>
          </div>
        </div>
      </Page>
    </>
  );
}

function BillCard({ tone, title, b, months, t, sub }) {
  const border = tone === 'leaf' ? 'border-leaf-100' : 'border-navy-100';
  return (
    <Card className={cx('p-5 space-y-3', border)}>
      <p className="text-sm font-bold text-navy-900">{title}</p>
      <p className={cx('text-3xl font-extrabold tabular-nums', tone === 'leaf' ? 'text-leaf-700' : 'text-navy-900')}>{inr(b.total)}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
      <dl className="text-sm space-y-1.5 border-t border-navy-100 pt-3">
        <div className="flex justify-between"><dt className="text-slate-500">{t('cliff.energy')}</dt><dd className="font-semibold tabular-nums">{inr(b.energy, 2)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">{t('cliff.fixed')}</dt><dd className="font-semibold tabular-nums">{inr(b.fixed, 2)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">{t('cliff.duty')}</dt><dd className="font-semibold tabular-nums">{inr(b.duty, 2)}</dd></div>
      </dl>
      <p className="text-[11px] text-slate-500 leading-snug">{t('cliff.bill_note', { n: months })}</p>
    </Card>
  );
}
