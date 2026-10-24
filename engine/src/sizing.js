// Size by money, not by roof: keep adding 0.5 kW while the extra panels pay back quickly; show smaller / recommended / larger.
// Pure functions; rules passed in.
import { annualSavings, subsidyFor, costRange, paybackYears } from './finance.js';
import { monthlyUnits } from './solar.js';

const sum = (a) => a.reduce((s, v) => s + v, 0);
const mid = (r) => (r[0] + r[1]) / 2;

export function evaluateKw(rules, { kw, monthly, ghi, shade, date, buildingUse = 'home' }) {
  const gen = monthlyUnits(rules, kw, ghi, shade);
  const ann = annualSavings(rules, monthly, gen, date);
  const subsidy = subsidyFor(rules, kw, buildingUse);
  const cost = costRange(rules, kw);
  const pb = paybackYears(cost, subsidy, ann.benefit_year);
  const z = rules.sizing;
  let benefit25 = 0;
  for (let y = 0; y < z.life_years; y++) benefit25 += ann.benefit_year * (1 - z.degradation) ** y;
  return { kw, gen, ann, subsidy, cost, pb, units_year: sum(gen), net_benefit_25y: Math.round(benefit25 - mid(cost) + subsidy) };
}

// Never above what covers the home's own use (ctx.coverKw), and stop at the first 0.5 kW step whose extra cost (after the extra subsidy)
// takes longer than marginal_payback_years to earn back. The last units a home removes are its cheapest slab units, so the last panel earns least.
export function recommendBySavings(rules, ctx) {
  const s = rules.solar;
  const cap = Math.min(ctx.kwMax, s.max_advice_kw_home, ctx.coverKw ?? Infinity);
  if (cap <= 0) return 0;
  let best = Math.min(s.min_advice_kw, cap);
  let prev = evaluateKw(rules, { ...ctx, kw: best });
  for (let i = 1; best + s.step_kw <= cap + 1e-9; i++) {
    const cur = evaluateKw(rules, { ...ctx, kw: best + s.step_kw });
    const extraCost = mid(cur.cost) - mid(prev.cost) - (cur.subsidy - prev.subsidy);
    const extraBenefit = cur.ann.benefit_year - prev.ann.benefit_year;
    if (extraBenefit > 0 && extraCost / extraBenefit <= rules.sizing.marginal_payback_years) {
      best = best + s.step_kw;
      prev = cur;
    } else break;
  }
  return best;
}

// Up to three distinct sizes around the recommendation: one kW smaller, the recommendation, one kW larger.
export function sizeOptions(rules, ctx, recKw) {
  const s = rules.solar;
  const cap = Math.min(ctx.kwMax, s.max_advice_kw_home);
  const picks = [['smaller', recKw - 1], ['recommended', recKw], ['larger', recKw + 1]].filter(([label, kw], i, all) => (label === 'recommended' || (kw >= Math.min(s.min_advice_kw, cap) && kw <= cap)) && kw > 0);
  return picks.map(([label, kw]) => {
    const e = evaluateKw(rules, { ...ctx, kw });
    return {
      label,
      kw,
      units_year: Math.round(e.units_year),
      saving_year: e.ann.saving_year,
      surplus_units: e.ann.surplus_units,
      surplus_payout_year: e.ann.surplus_payout_year,
      subsidy: e.subsidy,
      cost: e.cost,
      net_cost: e.cost.map((c) => Math.max(0, c - e.subsidy)),
      payback_years: e.pb.with_subsidy,
      payback_years_no_subsidy: e.pb.without_subsidy,
      net_benefit_25y: e.net_benefit_25y,
    };
  });
}
