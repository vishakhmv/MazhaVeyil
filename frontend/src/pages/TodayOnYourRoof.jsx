import React, { useCallback, useEffect, useState } from 'react';
import { CloudSun, CloudRain, Sun, RefreshCw, Clock, MapPin, Info, Zap } from 'lucide-react';
import { useLang } from '../i18n/index.jsx';
import { useApp } from '../state.jsx';
import { engine } from '../lib/api.js';
import { num } from '../lib/format.js';
import { Hero, Page, Card, CardTitle, Chip, Notice, Spinner, Btn, Stat, EngineDown } from '../components/ui.jsx';
import { TankGauge, DayChart } from '../components/charts.jsx';

export default function TodayOnYourRoof() {
  const { t } = useLang();
  const { report, areas, go } = useApp();
  const [data, setData] = useState(null);
  const [sun, setSun] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const where = report?.roof.centroid || areas.find((a) => a.kind === 'home')?.center || areas[0]?.center;
  const area = report?.roof.area_m2 ?? 120;
  const kw = report?.sun.kw_recommended ?? 2.5;
  const tank = report?.rain.tank_litres ?? 5000;

  const load = useCallback(async () => {
    if (!where) return;
    setLoading(true);
    try {
      const [d, p] = await Promise.all([
        engine.today({ lon: where[0], lat: where[1], area_m2: area, kw }),
        engine.sunPlan({ lon: where[0], lat: where[1], kw, monthly_units: Math.round(report?.home.monthly_units ?? 262), date: new Date().toISOString().slice(0, 10) }),
      ]);
      setData(d);
      setSun(p);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [where?.[0], where?.[1], area, kw]);
  useEffect(() => { load(); }, [load]);

  const fill = data ? Math.min(100, (data.rain_litres_caught / tank) * 100) : 0;
  const quality = data?.quality.data;

  return (
    <>
      <Hero icon={CloudSun} eyebrow={t('today.eyebrow')} title={t('today.title')} sub={t('today.sub')}>
        <Btn variant="outline" icon={RefreshCw} loading={loading} onClick={load} className="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20">{t('today.refresh')}</Btn>
      </Hero>
      <Page>
        {error && (error.offline ? <EngineDown error={error} onRetry={load} /> : <Notice tone="cliff">{error.message}</Notice>)}
        {!data && !error && <Spinner label={t('common.loading')} />}
        {data && (
          <>
            <Card className="p-5 sm:p-8 bg-gradient-to-br from-rain-50 via-white to-sun-50 border-rain-100">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Chip tone={quality === 'forecast' ? 'leaf' : 'sun'}>{t('quality.data.' + quality)}</Chip>
                <Chip tone="slate" icon={MapPin}>{report ? t('today.your_roof', { area: num(area), kw }) : t('today.sample_roof', { area: num(area), kw })}</Chip>
                <span className="text-xs text-slate-500">{data.date}</span>
              </div>
              <p className="text-2xl sm:text-4xl font-extrabold text-navy-900 leading-snug text-balance">
                {t('today.sentence', { litres: num(data.rain_litres_caught), units: num(data.units_made, 1) })}
              </p>
              <p className="text-sm text-slate-600 mt-3 max-w-2xl">{quality === 'forecast' ? t('today.forecast_note') : t('today.typical_note')}</p>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <CardTitle icon={CloudRain} tone="rain">{t('today.rain')}</CardTitle>
                <div className="flex items-center gap-6">
                  <TankGauge pct={fill} litres={data.rain_litres_caught} label={t('today.rain')} />
                  <div className="space-y-2 min-w-0">
                    <p className="text-4xl font-extrabold text-rain-700 tabular-nums">{num(data.rain_litres_caught)} <span className="text-lg text-slate-400">L</span></p>
                    <p className="text-sm text-slate-600">{t('today.rain_mm', { mm: data.rain_mm })}</p>
                    <p className="text-xs text-slate-500">{t('today.fills', { pct: Math.round(fill), tank: num(tank) })}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-4 leading-relaxed">{t('today.rain_note')}</p>
              </Card>
              <Card className="p-6">
                <CardTitle icon={Sun} tone="sun">{t('today.power')}</CardTitle>
                <p className="text-4xl font-extrabold text-sun-600 tabular-nums">{num(data.units_made, 1)} <span className="text-lg text-slate-400">{t('unit.units')}</span></p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Stat tone="sun" label={t('today.system')} value={kw + ' kW'} sub={t('today.system_sub')} />
                  <Stat tone="leaf" label={t('today.peak')} value={sun ? Math.max(...sun.sun_hours_kw).toFixed(1) + ' kW' : '–'} sub={t('today.peak_sub')} />
                </div>
                <p className="text-xs text-slate-500 mt-4 leading-relaxed">{t('today.power_note')}</p>
              </Card>
            </div>

            {sun && (
              <Card className="p-5">
                <CardTitle icon={Zap} tone="sun">{t('today.hourly')}</CardTitle>
                <DayChart sun={sun.sun_hours_kw} plan={[]} peak={['18:00', '22:00']} solarWindow={['08:00', '16:00']} appliances={{}} labels={{ peak: t('veyil.peak_short'), aria: t('today.hourly') }} />
                <div className="flex flex-wrap gap-3 mt-3 no-print">
                  <Btn variant="sun" icon={Clock} onClick={() => go('veyil')}>{t('rep.next_veyil')}</Btn>
                  {!report && <Btn variant="outline" icon={MapPin} onClick={() => go('find')}>{t('today.get_roof')}</Btn>}
                </div>
              </Card>
            )}
            <Notice tone="navy" icon={Info}>{t('today.honest')}</Notice>
          </>
        )}
      </Page>
    </>
  );
}
