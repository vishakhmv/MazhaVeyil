// Composes the core calculators into the contract payloads: roof-report@1 and bill-result@1.
import { billFor, cliffStatus, cliffList, curve, solarToBeatCliff, monthEnergy } from './tariff.js';
import { subsidyFor, subsidyWindow, annualSavings, costRange, paybackYears, co2Tonnes } from './finance.js';
import { roofCapacityKw, monthlyUnits, yieldPerKwYear, recommendKw } from './solar.js';
import { dailyInflowLitres, recommendTank, monthlyAverage } from './rain.js';
import { roofScore } from './score.js';
import { dataFor } from './data.js';
import { recommendBySavings, sizeOptions } from './sizing.js';
import { buildInsights } from './insights.js';

const round = (x, d = 0) => Math.round(x * 10 ** d) / 10 ** d;
const sum = (a) => a.reduce((s, v) => s + v, 0);

// Every number the user sees traces back to one of these. verified flips to true when its id is listed in rules.verified_ids.
function assumption(rules, id, value, source) {
  return { id, value, source, verified: (rules.verified_ids ?? []).includes(id) };
}

export function buildBill(rules, input, date) {
  const bill = billFor(rules, { ...input, date });
  const m = bill.monthly_units;
  return {
    schema: 'bill-result@1',
    rules_checked_on: rules.checked_on,
    tariff_id: bill.tariff_id,
    tariff_stale: bill.tariff_stale,
    bill: {
      units: bill.units,
      period_months: bill.period_months,
      monthly_units: m,
      phase: input.phase,
      energy: bill.energy,
      fixed: bill.fixed,
      total: bill.total,
      rate: bill.rate,
    },
    cliff: cliffStatus(rules, m, date),
    cliffs: cliffList(rules, date),
    curve: curve(rules, date),
    solar_to_beat_cliff: solarToBeatCliff(rules, m, date),
    assumptions: [
      assumption(rules, bill.tariff_id, bill.tariff_id, rules.tariffs.find((t) => t.id === bill.tariff_id).source),
      assumption(rules, 'solar_units_per_kw_month', rules.solar.units_per_kw_month_rule, 'idea doc 5.2 rule of thumb'),
      assumption(rules, 'bill_scope', 'energy charge + fixed charge', 'duty and fuel surcharge are not included'),
    ],
  };
}

function assumptionsFor(rules, input, data, ctx) {
  const { isHome, subsidy, demand, monthly, unitsSource, kw } = ctx;
  const typical = data.quality === 'typical';
  const list = [
    assumption(rules, 'sun_data', data.quality, typical ? rules.typical_kerala.source : 'NASA POWER monthly sun (' + (data.area ? 'cached, ' + data.area : 'live') + ')'),
    assumption(rules, 'rain_data', data.quality, typical ? rules.typical_kerala.source : rules.rain.source),
    assumption(rules, 'performance_ratio', rules.solar.performance_ratio, 'system efficiency, idea doc section 6'),
    assumption(rules, 'usable_roof_share', rules.solar.usable_share[input.roof_type], 'share of the roof that can hold panels (' + input.roof_type + ')'),
    assumption(rules, 'shade_factor', rules.solar.shade_factor[input.shade], 'shade: ' + input.shade),
    assumption(rules, 'cost_per_kw', [rules.solar.cost_per_kw.low, rules.solar.cost_per_kw.high], rules.solar.cost_per_kw.source),
    assumption(rules, 'rain_runoff', rules.rain.runoff, 'share of roof rain reaching the tank; the first ' + rules.rain.first_flush_mm + ' mm of each rainy day is discarded'),
    assumption(rules, 'water_demand_litres_day', demand, isHome ? rules.rain.household + ' people x ' + rules.rain.non_drinking_lpcd + ' L non-drinking use' : rules.public_building.source),
    assumption(rules, 'co2_kg_per_kwh', rules.co2.kg_per_kwh, rules.co2.source),
  ];
  if (isHome) {
    list.push(assumption(rules, 'pm_surya_ghar', subsidy, 'PM Surya Ghar subsidy, homes only; window ends ' + rules.pm_surya_ghar.scheme_until));
    list.push(assumption(rules, 'surplus_rate', rules.net_metering.surplus_rate_new, 'KSERC net metering: year-end surplus paid per unit'));
    if (kw > rules.net_metering.confirmed_net_metering_kw) list.push(assumption(rules, 'net_metering_above_3kw', kw, rules.net_metering.cap_note));
    list.push(assumption(rules, 'savings_basis', 'bill before - bill after', 'energy charge only, month by month, with banked units'));
  }
  if (unitsSource === 'default') {
    list.push(assumption(rules, 'default_units', round(monthly), isHome ? rules.home_defaults.source : rules.public_building.source));
  }
  return list;
}

export async function buildReport(rules, input, date) {
  const { roof } = input;
  const isHome = input.building_use === 'home';
  const data = await dataFor(roof.centroid[0], roof.centroid[1], rules);

  // Use: typed units win; otherwise a clearly flagged default.
  const unitsSource = input.units != null ? 'typed' : 'default';
  const monthly = input.units != null
    ? input.units / input.period_months
    : isHome
      ? rules.home_defaults.monthly_units
      : round(roof.area_m2 * rules.public_building.default_kwh_per_roof_m2_month);
  const useYear = monthly * 12;

  // Sun
  const kwMax = roofCapacityKw(rules, roof.area_m2, input.roof_type);
  const yPerKw = yieldPerKwYear(rules, data.ghi, input.shade);
  const coverKw = recommendKw(rules, { useYear, yieldPerKw: yPerKw, kwMax, buildingUse: input.building_use });
  const sizingCtx = { monthly, ghi: data.ghi, shade: input.shade, date, kwMax };
  const kw = isHome ? recommendBySavings(rules, { ...sizingCtx, coverKw }) : coverKw;
  const options = isHome && kw > 0 ? sizeOptions(rules, sizingCtx, kw) : [];
  const gen = monthlyUnits(rules, kw, data.ghi, input.shade);
  const unitsYear = sum(gen);
  const subsidy = subsidyFor(rules, kw, input.building_use);
  const cost = costRange(rules, kw);

  // Money: homes only (the domestic tariff and PM Surya Ghar do not apply to public buildings)
  let money = null;
  let payback = { with_subsidy: null, without_subsidy: null };
  if (isHome) {
    const ann = annualSavings(rules, monthly, gen, date);
    money = {
      bill_before_month: monthEnergy(rules, monthly, date),
      bill_after_month: round(ann.bill_after_year / 12, 2),
      saving_month: round(ann.saving_year / 12, 2),
      saving_year: ann.saving_year,
      surplus_payout_year: ann.surplus_payout_year,
      bill_before_months: ann.bill_before_months,
      bill_after_months: ann.bill_after_months,
    };
    payback = paybackYears(cost, subsidy, ann.benefit_year);
  }
  const cliff = isHome && input.units != null ? { ...cliffStatus(rules, monthly, date), solar_to_beat_cliff: solarToBeatCliff(rules, monthly, date) } : null;
  const window = isHome ? subsidyWindow(rules, date) : { ends_on: null, days_left: null };

  // Rain
  const demand = isHome ? (input.household ?? rules.rain.household) * rules.rain.non_drinking_lpcd : rules.public_building.water_demand_litres_day;
  const inflow = dailyInflowLitres(rules, data.rainMm, roof.area_m2);
  const years = inflow.length / 365.25;
  const tank = recommendTank(rules, inflow, demand);
  const score = roofScore({ roofMaxUnitsYear: kwMax * yPerKw, useYear, waterCoverPct: tank.water_cover_pct, nextTank: tank.next_tank });

  const rainMonthly = monthlyAverage(inflow, data.rainStart);
  const insights = buildInsights(rules, {
    isHome, unitsSource, monthly, kw, coverKw, kwMax, subsidy, cliff, score, demand, rainMonthly, quality: data.quality,
    daysLeft: window.days_left, harvestYear: sum(inflow) / years,
  });

  return {
    schema: 'roof-report@1',
    rules_checked_on: rules.checked_on,
    roof: { id: roof.id, area_m2: roof.area_m2, centroid: roof.centroid.map((v) => round(v, 6)), roof_type: input.roof_type, shade: input.shade, building_use: input.building_use },
    home: { monthly_units: round(monthly, 2), period_months: input.period_months, phase: input.phase, units_source: unitsSource },
    sun: {
      kw_max: kwMax,
      kw_recommended: kw,
      units_year: Math.round(unitsYear),
      units_month: gen.map((v) => Math.round(v)),
      subsidy,
      cost,
      net_cost: cost.map((c) => Math.max(0, c - subsidy)),
      payback_years: payback.with_subsidy,
      payback_years_no_subsidy: payback.without_subsidy,
      options,
      subsidy_days_left: window.days_left,
      subsidy_ends_on: window.ends_on,
      co2_t_year: co2Tonnes(rules, unitsYear),
    },
    money,
    cliff,
    insights,
    rain: {
      annual_mm: Math.round(sum(data.rainMm) / years),
      harvest_litres_year: Math.round(sum(inflow) / years),
      monthly_litres: rainMonthly.map(Math.round),
      tank_litres: tank.tank_litres,
      water_cover_pct: tank.water_cover_pct,
      tank_curve: tank.tank_curve,
      well_recharge_litres_year: tank.well_recharge_litres_year,
      demand_litres_day: demand,
      safety: ['safety.non_drinking_use', 'safety.treat_before_drinking', 'safety.mesh_on_tank'],
    },
    score: { power: score.power, water: score.water, score: score.score, band: score.band, tip: score.tip },
    assumptions: assumptionsFor(rules, input, data, { isHome, subsidy, demand, monthly, unitsSource, kw }),
    quality: { data: data.quality, units: unitsSource },
  };
}
