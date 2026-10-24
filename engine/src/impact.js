// Impact for slide 6 and the Atlas slider: SDG numbers at an adoption share, plus the Kerala ceiling estimate with its maths.
import { loadAreas } from './data.js';
import { buildWard } from './wards.js';
import { co2Tonnes } from './finance.js';

const round = (x, d = 0) => Math.round(x * 10 ** d) / 10 ** d;

export function keralaCeiling(rules) {
  const k = rules.kerala;
  const kwh = k.solar_homes * k.units_moved_per_day;
  const mw = (hours) => round(kwh / hours / 1000, 1);
  return {
    solar_homes: k.solar_homes,
    units_moved_per_home_day: k.units_moved_per_day,
    kwh_moved_per_day: kwh,
    record_peak_mw: k.peak_record_mw,
    mw_if_4_hours: mw(4),
    mw_if_5_hours: mw(5),
    pct_of_record_4_hours: round((kwh / 4 / 1000 / k.peak_record_mw) * 100, 1),
    pct_of_record_5_hours: round((kwh / 5 / 1000 / k.peak_record_mw) * 100, 1),
    note: 'Our estimate, not a measurement: the maths is homes x units moved out of the evening peak, spread over 4 hours (6-10 pm) or 5 hours (6-11 pm).',
    source: k.source,
  };
}

// adoptionPct: share of homes in every demo ward that install the planned system (0-100).
export function buildImpact(rules, adoptionPct) {
  const wards = loadAreas().filter((a) => a.kind === 'home').map((a) => buildWard(rules, a.id));
  const f = adoptionPct / 100;
  const rows = wards.map((w) => ({
    ward_id: w.ward_id,
    name: w.name,
    homes_total: w.roofs,
    homes_adopting: Math.round(w.roofs * f),
    kw: round(w.potential.kw * f, 1),
    units_year: Math.round(w.potential.units_year * f),
    litres_year: Math.round(w.potential.litres_year * f),
    co2_t_year: co2Tonnes(rules, w.potential.units_year * f),
  }));
  const sum = (key) => rows.reduce((s, r) => s + r[key], 0);
  const total = { homes_total: sum('homes_total'), homes_adopting: sum('homes_adopting'), kw: round(sum('kw'), 1), units_year: sum('units_year'), litres_year: sum('litres_year'), co2_t_year: round(sum('co2_t_year'), 2) };
  return {
    schema: 'impact@1',
    adoption_pct: adoptionPct,
    wards: rows,
    total,
    sdg: {
      7: { goal: 'Affordable and clean energy', kw_planned: total.kw, kwh_year: total.units_year },
      6: { goal: 'Clean water and sanitation', litres_year: total.litres_year, homes_non_drinking_need_covered: Math.round(total.litres_year / (rules.rain.household * rules.rain.non_drinking_lpcd * 365)) },
      11: { goal: 'Sustainable cities and communities', wards_with_a_plan: rows.length, homes_pledged: total.homes_adopting },
      13: { goal: 'Climate action', co2_t_year: total.co2_t_year },
    },
    kerala_ceiling: keralaCeiling(rules),
    quality: { data: 'cached', note: 'Ward totals use the roofs we could map (or a configured household count) and a default household use; see each ward summary.' },
  };
}
