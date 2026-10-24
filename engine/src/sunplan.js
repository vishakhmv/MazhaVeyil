// Veyil Samayam service: tomorrow's best hours for the motor, washing machine and iron (sun-plan@1).
// Forecast comes from the cached Open-Meteo file of the nearest demo area (refresh it with npm run fetch on event morning);
// without one, a typical day for the month is used and flagged quality.data = typical.
import { loadAreas, areaData } from './data.js';
import { distanceKm } from './geo.js';
import { planDay, hourlyToSlots, typicalDayKw, todCostOf } from './veyil.js';
import { selectTariff, marginalRate } from './tariff.js';
import { ApiError } from './validate.js';

const addDays = (d, n) => {
  const x = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10) + n));
  return x.toISOString().slice(0, 10);
};
const NEAR_KM = 10;

export function forecastDay(lon, lat, target) {
  const near = loadAreas()
    .filter((a) => a.cached)
    .map((a) => ({ a, km: distanceKm([lon, lat], a.center) }))
    .sort((x, y) => x.km - y.km)[0];
  if (!near || near.km > NEAR_KM) return { near, fc: null };
  const fc = areaData(near.a.id).forecast;
  if (!fc?.hourly?.time) return { near, fc: null };
  const days = [...new Set(fc.hourly.time.map((t) => t.slice(0, 10)))];
  const date = days.includes(target) ? target : days.at(-1);
  const rows = fc.hourly.time.map((t, i) => ({ t, w: fc.hourly.shortwave_radiation[i] ?? 0, c: fc.hourly.cloud_cover?.[i] ?? 0 })).filter((r) => r.t.startsWith(date));
  const wm2 = new Array(24).fill(0);
  for (const r of rows) wm2[Number(r.t.slice(11, 13))] = r.w;
  const di = fc.daily?.time?.indexOf(date) ?? -1;
  return { near, fc: { date, wm2, rainMm: di >= 0 ? fc.daily.precipitation_sum?.[di] ?? 0 : 0, exact: date === target } };
}

export function buildSunPlan(rules, input, today) {
  const { lat, lon, kw, monthly_units } = input;
  const target = input.date ?? addDays(today, 1);
  const { near, fc } = forecastDay(lon, lat, target);
  const pr = rules.solar.performance_ratio;
  const month = Number((fc?.date ?? target).slice(5, 7)) - 1;
  const ghiTypical = (near && areaData(near.a.id).sun?.ghi?.[month]) ?? rules.typical_kerala.ghi_kwh_m2_day[month];
  const typicalHourly = typicalDayKw(rules, ghiTypical, kw);
  const hourly = fc ? fc.wm2.map((w) => (kw * (w / 1000) * pr)) : typicalHourly;
  const catalog = { ...rules.veyil.appliances, ...rules.veyil.optional_appliances };
  const ids = input.appliances ?? Object.keys(rules.veyil.appliances);
  const unknown = ids.filter((id) => !catalog[id]);
  if (unknown.length) throw new ApiError(400, 'bad_input', 'unknown appliance: ' + unknown.join(', ') + '. Choose from: ' + Object.keys(catalog).join(', '), ['appliances']);
  const apps = ids.map((id) => ({ id, ...catalog[id] }));
  const dailyUseKwh = monthly_units / 30.4;
  const day = planDay(rules, { pvKw48: hourlyToSlots(hourly), dailyUseKwh, appliances: apps });
  // The pitch number: the same plan on a typical day for the month (not tied to tomorrow's weather).
  const typ = planDay(rules, { pvKw48: hourlyToSlots(typicalHourly), dailyUseKwh, appliances: apps });

  const alerts = [{ key: 'alert.evening_peak', params: { from: rules.veyil.peak[0], to: rules.veyil.peak[1] } }];
  const typicalKwh = typicalHourly.reduce((s, x) => s + x, 0);
  const dayKwh = hourly.reduce((s, x) => s + x, 0);
  if (fc && typicalKwh > 0 && dayKwh / typicalKwh < 0.6) alerts.push({ key: 'alert.cloudy_day', params: { sun_pct_of_typical: Math.round((dayKwh / typicalKwh) * 100) } });
  if (fc && fc.rainMm >= 10) alerts.push({ key: 'alert.heavy_rain', params: { mm: Math.round(fc.rainMm) } });

  // Time-of-day tariff: only homes above the threshold pay it, so only they get rupees.
  const { tariff } = selectTariff(rules, today);
  const tod = { applies: monthly_units > rules.tod_domestic.above_monthly_units, threshold_units: rules.tod_domestic.above_monthly_units, source: rules.tod_domestic.source };
  if (tod.applies) {
    const rate = marginalRate(tariff, monthly_units);
    const before = day.plan.reduce((sum, p) => sum + todCostOf(rules, p.appliance_def, p.usual_start, rate), 0);
    const after = day.plan.reduce((sum, p) => sum + todCostOf(rules, p.appliance_def, p.start, rate), 0);
    Object.assign(tod, { rate, cost_before_day: Math.round(before * 100) / 100, cost_after_day: Math.round(after * 100) / 100, saving_day: Math.round((before - after) * 100) / 100, saving_month: Math.round((before - after) * 30.4 * 100) / 100 });
  }

  return {
    schema: 'sun-plan@1',
    date: fc?.date ?? target,
    kw,
    sun_hours_kw: hourly.map((x) => Math.round(x * 100) / 100),
    plan: day.plan.map(({ appliance_def, ...p }) => p),
    tod,
    self_use_pct: day.self_use_pct,
    units_moved_from_peak: day.units_moved_from_peak,
    pv_day_kwh: day.pv_day_kwh,
    typical_day: { self_use_pct: typ.self_use_pct, units_moved_from_peak: typ.units_moved_from_peak, pv_day_kwh: typ.pv_day_kwh },
    alerts,
    quality: { data: fc ? (fc.exact ? 'forecast' : 'forecast-stale') : 'typical' },
    assumptions: [
      { id: 'household_profile', value: 'typical Kerala home', source: rules.veyil.profile_note, verified: false },
      { id: 'appliances', value: Object.keys(rules.veyil.appliances), source: 'assumed sizes and usual times (rules.veyil.appliances)', verified: false },
    ],
  };
}
