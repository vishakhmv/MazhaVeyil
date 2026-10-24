// Roof Score: average of power cover and water cover, with a tip on how to raise it.

export const bandOf = (score) => (score >= 70 ? 'strong' : score >= 40 ? 'good' : 'starting');

export function roofScore({ roofMaxUnitsYear, useYear, waterCoverPct, nextTank }) {
  const power = Math.min(100, Math.round((roofMaxUnitsYear / Math.max(useYear, 1)) * 100));
  const water = Math.min(100, Math.max(0, waterCoverPct));
  const score = Math.round((power + water) / 2);
  let tip = null;
  if (nextTank && nextTank.water_cover_pct > water) {
    tip = {
      tank_litres: nextTank.tank_litres,
      water: nextTank.water_cover_pct,
      score: Math.round((power + nextTank.water_cover_pct) / 2),
    };
  }
  return { power, water, score, band: bandOf(score), tip };
}
