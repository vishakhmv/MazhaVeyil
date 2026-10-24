// Rooftop solar sizing and yield. Pure functions; rules passed in.
const DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Biggest system the roof can host, in whole steps of step_kw (rounded down).
export function roofCapacityKw(rules, areaM2, roofType) {
  const s = rules.solar;
  const raw = (areaM2 * s.usable_share[roofType]) / s.m2_per_kw;
  return Math.floor(raw / s.step_kw + 1e-9) * s.step_kw;
}

// Units per month for a system: kW x sun (kWh/m2/day) x days x performance ratio x shade.
export function monthlyUnits(rules, kw, ghi, shade) {
  const f = rules.solar.performance_ratio * rules.solar.shade_factor[shade];
  return ghi.map((g, i) => kw * g * DAYS[i] * f);
}

export const yieldPerKwYear = (rules, ghi, shade) => monthlyUnits(rules, 1, ghi, shade).reduce((s, v) => s + v, 0);

// Cover the yearly use, rounded to 0.5 kW, at least the minimum advice and never above what the roof can host.
export function recommendKw(rules, { useYear, yieldPerKw, kwMax, buildingUse = 'home' }) {
  const s = rules.solar;
  if (kwMax <= 0) return 0;
  const want = Math.round(useYear / yieldPerKw / s.step_kw) * s.step_kw;
  const cap = buildingUse === 'home' ? Math.min(kwMax, s.max_advice_kw_home) : kwMax;
  return Math.max(Math.min(s.min_advice_kw, cap), Math.min(want, cap));
}
