// Compatibility layer for the first web prototype (frontend/src/pages/FindYourRoof.jsx), which posts to /api/v1/roof/calculate
// with {coordinates:[{lat,lng}], roofType, shadeLevel, monthlyElectricityConsumptionKwh} and reads a flat summary.
// It is a thin mapping onto the real engine: the full roof-report@1 comes back too, under "engine".
import { ApiError, parseReportInput } from './validate.js';
import { buildReport } from './services.js';

const ROOF = { flat_concrete: 'flat', sloped_tile: 'sloped', metal_sheet: 'sloped', composite: 'sloped' };
const SHADE = { none: 'little', low: 'little', moderate: 'some', high: 'a_lot' };
const mid = (r) => (r ? (r[0] + r[1]) / 2 : null);
const round = (x, d = 0) => (x === null ? null : Math.round(x * 10 ** d) / 10 ** d);
const grade = (s) => (s >= 80 ? 'A' : s >= 60 ? 'B' : s >= 40 ? 'C' : 'D');

export function parseLegacyRoof(body = {}) {
  const pts = body.coordinates;
  if (!Array.isArray(pts) || pts.length < 3) throw new ApiError(400, 'bad_roof', 'coordinates needs at least 3 points [{lat, lng}]', ['coordinates']);
  const polygon = pts.map((p) => (Array.isArray(p) ? [Number(p[1]), Number(p[0])] : [Number(p?.lng), Number(p?.lat)]));
  const roofType = body.roofType === undefined ? 'flat_concrete' : body.roofType;
  const shadeLevel = body.shadeLevel === undefined ? 'low' : body.shadeLevel;
  if (!(roofType in ROOF)) throw new ApiError(400, 'bad_input', 'roofType must be one of: ' + Object.keys(ROOF).join(', '), ['roofType']);
  if (!(shadeLevel in SHADE)) throw new ApiError(400, 'bad_input', 'shadeLevel must be one of: ' + Object.keys(SHADE).join(', '), ['shadeLevel']);
  return parseReportInput({ roof: { polygon }, roof_type: ROOF[roofType], shade: SHADE[shadeLevel], building_use: 'home', units: body.monthlyElectricityConsumptionKwh });
}

export async function legacyCalculate(rules, body, date) {
  const r = await buildReport(rules, parseLegacyRoof(body), date);
  const benefitYear = r.money.saving_year + r.money.surplus_payout_year;
  return {
    calculationId: 'MZV-' + r.roof.id.replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase() + '-' + date.replace(/-/g, ''),
    solar: {
      estimatedCapacityKw: r.sun.kw_recommended,
      monthlyGenerationKwh: Math.round(r.sun.units_year / 12),
      annualGenerationKwh: r.sun.units_year,
      panelCount: Math.ceil((r.sun.kw_recommended * 1000) / rules.solar.panel_wp),
    },
    financial: {
      monthlySavingsInr: Math.round(benefitYear / 12),
      annualSavingsInr: Math.round(benefitYear),
      netInvestmentInr: Math.round(mid(r.sun.net_cost)),
      paybackYears: round(mid(r.sun.payback_years), 1),
    },
    rainwater: {
      annualCollectionLiters: r.rain.harvest_litres_year,
      recommendedTankCapacityLiters: r.rain.tank_litres,
      drySeasonBufferDays: Math.round(r.rain.tank_litres / r.rain.demand_litres_day),
    },
    roofScore: { score: r.score.score, grade: grade(r.score.score) },
    disclaimer: 'Estimate from NASA POWER sun, 10 years of rain and the KSEB tariff table (rules checked ' + r.rules_checked_on + '). Savings use the energy charge only. Subsidy and prices are indicative. Not an offer.',
    engine: r,
  };
}
