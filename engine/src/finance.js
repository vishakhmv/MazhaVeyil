// Subsidy, slab-aware savings, net-metering payout, payback, CO2. Pure functions; rules passed in.
import { selectTariff, energyPaise, rs } from './tariff.js';

export function subsidyFor(rules, kw, buildingUse = 'home') {
  const p = rules.pm_surya_ghar;
  if (buildingUse !== 'home' && p.residential_only) return 0;
  if (kw < p.min_kw) return 0;
  const first = p.per_kw_first_2kw * Math.min(kw, 2);
  const third = p.third_kw * Math.min(Math.max(kw - 2, 0), 1);
  return Math.min(Math.round(first + third), p.cap);
}

const utcDay = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
export function subsidyWindow(rules, dateStr) {
  const ends = rules.pm_surya_ghar.scheme_until;
  return { ends_on: ends, days_left: Math.max(0, Math.round((utcDay(ends) - utcDay(dateStr)) / 86400000)) };
}

export const surplusPayout = (rules, units) => rs(Math.round(units * rules.net_metering.surplus_rate_new * 100));

// One month, no banking: bill(use) minus bill(use - generation). Never "units x one rate".
export function monthSaving(rules, use, gen, date) {
  const { tariff: t } = selectTariff(rules, date);
  return rs(energyPaise(t, use) - energyPaise(t, Math.max(0, use - gen)));
}

// A year with banking: surplus units carry forward month to month; what is left at year end is paid at the surplus rate.
export function annualSavings(rules, monthlyUse, genMonths, date) {
  const { tariff: t } = selectTariff(rules, date);
  let bank = 0;
  let before = 0;
  let after = 0;
  const beforeM = [];
  const afterM = [];
  for (const gen of genMonths) {
    beforeM.push(energyPaise(t, monthlyUse));
    before += energyPaise(t, monthlyUse);
    const net = monthlyUse - gen - bank;
    if (net > 0) {
      after += energyPaise(t, net);
      afterM.push(energyPaise(t, net));
      bank = 0;
    } else {
      afterM.push(0);
      bank = -net;
    }
  }
  const payout = Math.round(bank * rules.net_metering.surplus_rate_new * 100);
  return {
    bill_before_year: rs(before),
    bill_after_year: rs(after),
    saving_year: rs(before - after),
    surplus_units: Math.round(bank),
    surplus_payout_year: rs(payout),
    benefit_year: rs(before - after + payout),
    bill_before_months: beforeM.map(rs),
    bill_after_months: afterM.map(rs),
  };
}

export function costRange(rules, kw) {
  const c = rules.solar.cost_per_kw;
  return [Math.round(kw * c.low), Math.round(kw * c.high)];
}

// Payback is always a range (cost low/high), with and without subsidy.
export function paybackYears(costRangeRupees, subsidy, benefitYear) {
  if (!(benefitYear > 0)) return { with_subsidy: null, without_subsidy: null };
  const f = (c) => Math.round((c / benefitYear) * 10) / 10;
  const [lo, hi] = costRangeRupees;
  return {
    with_subsidy: [f(Math.max(0, lo - subsidy)), f(Math.max(0, hi - subsidy))],
    without_subsidy: [f(lo), f(hi)],
  };
}

export const co2Tonnes = (rules, unitsYear) => Math.round(((unitsYear * rules.co2.kg_per_kwh) / 1000) * 100) / 100;
