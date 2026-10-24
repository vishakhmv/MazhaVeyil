// "Today on your roof" card data: rain caught and power made today (today@1), from the cached forecast of the nearest demo area.
import { forecastDay } from './sunplan.js';
import { areaData } from './data.js';
import { typicalDayKw } from './veyil.js';

const DIM = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function buildToday(rules, { lat, lon, area_m2, kw }, todayStr) {
  const { near, fc } = forecastDay(lon, lat, todayStr);
  const month = Number((fc?.date ?? todayStr).slice(5, 7)) - 1;
  const pr = rules.solar.performance_ratio;
  let rainMm;
  let units;
  if (fc) {
    rainMm = fc.rainMm;
    units = fc.wm2.reduce((s, w) => s + kw * (w / 1000) * pr, 0);
  } else {
    const ghi = (near && areaData(near.a.id).sun?.ghi?.[month]) ?? rules.typical_kerala.ghi_kwh_m2_day[month];
    rainMm = rules.typical_kerala.rain_mm_month[month] / DIM[month];
    units = typicalDayKw(rules, ghi, kw).reduce((s, x) => s + x, 0);
  }
  const litres = Math.max(0, rainMm - rules.rain.first_flush_mm) * area_m2 * rules.rain.runoff;
  return {
    schema: 'today@1',
    date: fc?.date ?? todayStr,
    kw,
    area_m2,
    rain_mm: Math.round(rainMm * 10) / 10,
    rain_litres_caught: Math.round(litres),
    units_made: Math.round(units * 10) / 10,
    quality: { data: fc ? (fc.exact ? 'forecast' : 'forecast-stale') : 'typical' },
  };
}
