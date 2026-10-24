// Ward summary for Kishan's Atlas: what the roofs of a ward could make and catch if every home went solar.
// Atlas rule: counts and totals per ward only, never a name, a phone number or an exact house.
import { loadAreas, areaData } from './data.js';
import { roofCapacityKw, yieldPerKwYear, recommendKw } from './solar.js';
import { co2Tonnes } from './finance.js';
import { bboxPolygon } from './geo.js';
import { typicalRainSeries, dailyInflowLitres, recommendTank } from './rain.js';
import { roofScore } from './score.js';

const round = (x, d = 0) => Math.round(x * 10 ** d) / 10 ** d;

export function wardIds() {
  return loadAreas().map((a) => a.ward_id);
}

export function buildWard(rules, wardOrAreaId) {
  const area = loadAreas().find((a) => a.ward_id === wardOrAreaId || a.id === wardOrAreaId);
  if (!area) return null;
  const d = areaData(area.id);
  const w = rules.ward;
  const ghi = d.sun?.ghi ?? rules.typical_kerala.ghi_kwh_m2_day;
  const mm = d.rain?.mm ?? typicalRainSeries(rules);
  const yPerKw = yieldPerKwYear(rules, ghi, w.shade);
  const years = mm.length / 365.25;
  const litresPerM2 = (mm.reduce((s, v) => s + Math.max(0, v - rules.rain.first_flush_mm), 0) * rules.rain.runoff) / years;
  const useYear = rules.home_defaults.monthly_units * 12;

  // One home: sized to the default use (replace with the survey median), capped by what its roof can host.
  const perHome = (areaM2) => {
    const kwMax = Math.floor((areaM2 * w.usable_share) / rules.solar.m2_per_kw / rules.solar.step_kw + 1e-9) * rules.solar.step_kw;
    const kw = recommendKw(rules, { useYear, yieldPerKw: yPerKw, kwMax });
    return { kw, units_year: kw * yPerKw, litres_year: areaM2 * litresPerM2 };
  };

  const homes = d.roofs.features.filter((f) => f.properties.area_m2 >= w.home_min_m2 && f.properties.area_m2 <= w.home_max_m2);
  const sparse = homes.length < 30;
  const sample = sparse ? [perHome(w.default_home_roof_m2)] : homes.map((f) => perHome(f.properties.area_m2));
  const avgArea = sparse ? w.default_home_roof_m2 : homes.reduce((s, f) => s + f.properties.area_m2, 0) / homes.length;
  const avg = {
    kw: sample.reduce((s, h) => s + h.kw, 0) / sample.length,
    units_year: sample.reduce((s, h) => s + h.units_year, 0) / sample.length,
    litres_year: sample.reduce((s, h) => s + h.litres_year, 0) / sample.length,
  };
  const count = area.homes_in_ward ?? homes.length;
  const total = (k) => avg[k] * count;

  // The Roof Score of the ward's typical home roof, and what its tank should be.
  const kwMaxRef = Math.floor((avgArea * w.usable_share) / rules.solar.m2_per_kw / rules.solar.step_kw + 1e-9) * rules.solar.step_kw;
  const tank = recommendTank(rules, dailyInflowLitres(rules, mm, avgArea), rules.rain.household * rules.rain.non_drinking_lpcd);
  const typical = roofScore({ roofMaxUnitsYear: kwMaxRef * yPerKw, useYear, waterCoverPct: tank.water_cover_pct, nextTank: tank.next_tank });
  const at = (pct) => ({
    adoption_pct: pct,
    homes: Math.round((count * pct) / 100),
    kw: round((total('kw') * pct) / 100, 1),
    units_year: Math.round((total('units_year') * pct) / 100),
    litres_year: Math.round((total('litres_year') * pct) / 100),
    co2_t_year: co2Tonnes(rules, (total('units_year') * pct) / 100),
  });

  return {
    schema: 'ward-summary@1',
    ward_id: area.ward_id,
    name: { en: area.name.en + ' (approximate)', ml: area.name.ml },
    boundary_quality: 'approximate',
    boundary: { type: 'Polygon', coordinates: [bboxPolygon(area.bbox)] },
    roofs: count,
    roof_area_m2: Math.round(avgArea * count),
    potential: { kw: round(total('kw'), 1), units_year: Math.round(total('units_year')), litres_year: Math.round(total('litres_year')), co2_t_year: co2Tonnes(rules, total('units_year')) },
    per_home_avg: { kw: round(avg.kw, 2), units_year: Math.round(avg.units_year), litres_year: Math.round(avg.litres_year), co2_t_year: co2Tonnes(rules, avg.units_year) },
    typical_roof: { area_m2: Math.round(avgArea), score: typical.score, power: typical.power, water: typical.water, band: typical.band, tank_litres: tank.tank_litres },
    scenarios: [10, 25, 50, 100].map(at),
    quality: {
      data: d.sun && d.rain ? 'cached' : 'typical',
      roofs_source: area.homes_in_ward != null ? 'config' : 'osm_count',
      note: area.homes_in_ward != null ? area.homes_note : sparse ? 'few mapped roofs: per-home figures use a default roof' : null,
    },
  };
}
