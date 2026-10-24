/**
 * Atlas KPI calculations according to PLAN.md section 7 and team doc rules.
 * All computations run locally in the browser so the slider is instantaneous and works 100% offline.
 */

export const DEFAULT_ASSUMPTIONS = {
  avg_kw_per_home: 2.5,
  yield_kwh_per_kw: 1380, // Kerala solar yield standard
  grid_factor_co2: 0.75, // CEA emission factor kg CO2 / kWh
  avg_roof_area_sqm: 120,
  annual_rainfall_mm: 2800, // Average Kerala rainfall in mm
  runoff_factor: 0.8,
  evening_peak_units_moved: 2, // 2 units moved out of peak
  peak_hours_spread: 4.5 // 4-5 hours evening spread (6-11 pm)
};

/**
 * Computes What-If KPIs for a given ward and adoption percentage (0 to 100)
 */
export function computeWardWhatIf(ward, adoptionPct, customAssumptions = {}) {
  const p = { ...DEFAULT_ASSUMPTIONS, ...customAssumptions };
  const totalHomes = ward.homes_estimated || 500;
  const pct = Math.max(0, Math.min(100, adoptionPct));

  const homesJoining = Math.round(totalHomes * (pct / 100));
  const kwPlanned = Number((homesJoining * p.avg_kw_per_home).toFixed(1));
  const kwhYear = Math.round(kwPlanned * p.yield_kwh_per_kw);
  const co2Tonnes = Math.round((kwhYear * p.grid_factor_co2) / 1000);

  // Rain: Area (m2) * rainfall (m) * runoff * 1000 L/m3
  const litresRainYear = Math.round(homesJoining * p.avg_roof_area_sqm * (p.annual_rainfall_mm / 1000) * p.runoff_factor * 1000);
  const rainCroreLitres = Number((litresRainYear / 10000000).toFixed(2));

  // Evening peak demand relief: 2 units over 4.5 hours = ~0.44-0.45 kW per home
  const peakReliefKw = Number((homesJoining * (p.evening_peak_units_moved / p.peak_hours_spread)).toFixed(1));

  return {
    adoptionPct: pct,
    homesJoining,
    kwPlanned,
    kwhYear,
    co2Tonnes,
    litresRainYear,
    rainCroreLitres,
    peakReliefKw,
    gwhYear: Number((kwhYear / 1000000).toFixed(2))
  };
}
