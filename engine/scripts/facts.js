// The pitch-numbers sheet: every number on the slides and in Q&A, computed by the same engine the demo uses.
// Usage: npm run facts            npm run facts -- --tests   (also runs the test suite and prints the pass count)
import { spawnSync } from 'node:child_process';
import { loadRules, ENGINE_ROOT } from '../src/rules.js';
import { today } from '../src/clock.js';
import { billFor, cliffList, cliffStatus, solarToBeatCliff } from '../src/tariff.js';
import { subsidyFor, subsidyWindow, monthSaving, surplusPayout } from '../src/finance.js';
import { loadAreas } from '../src/data.js';
import { buildReport } from '../src/services.js';
import { parseReportInput } from '../src/validate.js';
import { buildWard, wardIds } from '../src/wards.js';
import { buildSunPlan } from '../src/sunplan.js';
import { buildImpact } from '../src/impact.js';

process.env.OFFLINE = '1';
const rules = loadRules();
const date = today();
const inr = (n) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr0 = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const lakh = (n) => (n / 1e5).toFixed(2) + ' lakh';
const h = (t) => console.log('\n## ' + t);
const bill = (units, months = 1, phase = '1ph') => billFor(rules, { units, period_months: months, phase, date });

console.log('# MazhaVeyil facts sheet');
console.log('Date used for "today": ' + date + ' | rules checked: ' + rules.checked_on + ' | tariff: ' + bill(100).tariff_id + ' (valid ' + rules.tariffs[0].valid_from + ' to ' + rules.tariffs[0].valid_to + ')');
console.log('Everything below is computed by the engine. Items marked VERIFY are not confirmed: do not show them to judges as fact.');
for (const t of rules.tariffs) if (t.verified_on) console.log('VERIFIED ' + t.verified_on + ' (' + t.id + '): ' + t.verified_source);
console.log('VERIFIED ' + rules.checked_on + ': electricity duty is ' + rules.bill_extras.electricity_duty_pct_of_energy + '% of the energy charge (' + rules.bill_extras.source + ').');

h('1. KSEB bill cliffs (energy charge only; idea doc 5.2)');
console.log('units | energy charge | jump from the unit before');
for (const u of [249, 250, 251, 300, 301, 350, 351, 400, 401, 500, 501]) {
  const e = bill(u).energy;
  const j = [251, 301, 351, 401, 501].includes(u) ? inr(e - bill(u - 1).energy) : '';
  console.log(String(u).padStart(5) + ' | ' + inr(e).padStart(10) + ' | ' + j);
}
const c0 = cliffList(rules, date)[0];
const fixedJump = bill(251).fixed - bill(250).fixed;
console.log('Say on the slide: "One unit over 250 costs ' + inr0(c0.jump) + ' more."');
console.log('Q&A: with the fixed-charge jump (+' + inr0(fixedJump) + ' single phase) the first unit over 250 costs ' + inr(c0.jump + fixedJump) + ' more, before duty and fuel surcharge.');
const oldBill = (u) => billFor(rules, { units: u, period_months: 1, phase: '1ph', date: '2025-01-15' });
console.log('Old column (5 Dec 2024 - 31 Mar 2025), reproduced from kseb.in rates: 249 units = ' + inr(oldBill(249).energy) + ', 252 units = ' + inr(oldBill(252).energy) + '.');
console.log('Two-month bill, 502 units (251 a month): energy ' + inr(bill(502, 2).energy) + ' (VERIFY the two-month rule on KSEB\'s calculator).');

h('2. Cliff meter example (262 units a month)');
const cs = cliffStatus(rules, 262, date);
const sb = solarToBeatCliff(rules, 262, date);
console.log('262 units: ' + cs.last.over_by + ' units above the ' + cs.last.at + ' cliff. Using ' + cs.last.over_by + ' units less saves ' + inr(cs.last.saving_if_under) + ' a month.');
console.log('A ' + sb.kw + ' kW solar roof (about ' + rules.solar.units_per_kw_month_rule + ' units a month) takes you to about ' + sb.monthly_units_after + ' units and saves about ' + inr(sb.saving_month) + ' a month.');

h('3. Why not "units x one rate" (slab-aware savings)');
const before = bill(320).energy;
const after = bill(220).energy;
console.log('A home using 320 units that gets 100 units from solar: bill before ' + inr(before) + ', bill after ' + inr(after) + ', real saving ' + inr(monthSaving(rules, 320, 100, date)) + '.');
console.log('A simple calculator says 100 x ₹7.60 = ₹760, which is ' + Math.round((1 - 760 / monthSaving(rules, 320, 100, date)) * 100) + '% too low.');

h('4. Subsidy (PM Surya Ghar, homes only) and net metering');
console.log('Subsidy: ' + [1, 2, 2.5, 3, 5].map((kw) => kw + ' kW = ' + inr0(subsidyFor(rules, kw))).join(' | '));
const w = subsidyWindow(rules, date);
console.log('Window ends ' + w.ends_on + ': ' + w.days_left + ' days left (about ' + Math.round(w.days_left / 30.4) + ' months). VERIFY there is no extension.');
console.log('Year-end surplus is paid ' + inr(rules.net_metering.surplus_rate_new) + ' a unit: 3,000 spare units earn ' + inr0(surplusPayout(rules, 3000)) + ' (so we size the system to the home\'s real yearly use).');

const rect = (lon, lat, wM, hM) => {
  const dLat = hM / 110540;
  const dLon = wM / (111320 * Math.cos((lat * Math.PI) / 180));
  return [[lon, lat], [lon + dLon, lat], [lon + dLon, lat + dLat], [lon, lat + dLat]];
};

h('5. Demo roofs (the numbers behind the live demo)');
for (const a of loadAreas()) {
  const isHome = a.kind === 'home';
  const [wM, hM] = isHome ? [10, 12] : [40, 30];
  const r = await buildReport(rules, parseReportInput({ roof: { polygon: rect(a.center[0], a.center[1], wM, hM) }, roof_type: 'flat', shade: isHome ? 'some' : 'little', building_use: a.kind, units: isHome ? 262 : undefined }), date);
  console.log('\n' + a.name.en + ' (' + a.kind + (r.quality.units === 'default' ? ', units = default ASSUMPTION' : ', 262 units typed') + ', ' + r.roof.area_m2 + ' m2 ' + r.roof.roof_type + ' roof, data: ' + r.quality.data + ')');
  console.log('  Sun: roof can host ' + r.sun.kw_max + ' kW, recommended ' + r.sun.kw_recommended + ' kW, ' + r.sun.units_year.toLocaleString('en-IN') + ' units a year, ' + r.sun.co2_t_year + ' t CO2 a year');
  if (isHome) {
    console.log('  Money: subsidy ' + inr0(r.sun.subsidy) + ', cost ' + lakh(r.sun.cost[0]) + ' to ' + lakh(r.sun.cost[1]) + ', net ' + lakh(r.sun.net_cost[0]) + ' to ' + lakh(r.sun.net_cost[1]));
    console.log('  Payback: ' + r.sun.payback_years.join(' to ') + ' years with subsidy, ' + r.sun.payback_years_no_subsidy.join(' to ') + ' years without. Saves ' + inr0(r.money.saving_year) + ' a year (energy charge)');
  } else {
    console.log('  Public building: no subsidy and no domestic-tariff payback shown');
  }
  console.log('  Rain: ' + r.rain.annual_mm + ' mm a year, ' + (r.rain.harvest_litres_year / 1e5).toFixed(2) + ' lakh litres catchable, ' + r.rain.tank_litres + ' L tank covers ' + r.rain.water_cover_pct + '% of days, up to ' + (r.rain.well_recharge_litres_year / 1e5).toFixed(2) + ' lakh L a year to the well');
  console.log('  Roof Score ' + r.score.score + ' (' + r.score.band + '): Power ' + r.score.power + ', Water ' + r.score.water + (r.score.tip ? '. Tip: a ' + r.score.tip.tank_litres + ' L tank lifts Water to ' + r.score.tip.water + ' and the score to ' + r.score.tip.score : ''));
}

h('6. Ward numbers (Atlas; all homes go solar, then the adoption slider scales them)');
for (const id of wardIds()) {
  const wd = buildWard(rules, id);
  const q = 0.25;
  console.log(wd.name.en + ': ' + wd.roofs + ' homes (' + wd.quality.roofs_source + ') | all homes: ' + wd.potential.kw + ' kW, ' + (wd.potential.units_year / 1e6).toFixed(2) + ' GWh, ' + (wd.potential.litres_year / 1e7).toFixed(2) + ' crore L, ' + wd.potential.co2_t_year + ' t CO2');
  console.log('   at 25% adoption (' + Math.round(wd.roofs * q) + ' homes): ' + Math.round(wd.potential.kw * q) + ' kW, ' + ((wd.potential.units_year * q) / 1e6).toFixed(2) + ' GWh, ' + ((wd.potential.litres_year * q) / 1e7).toFixed(2) + ' crore L, ' + Math.round(wd.potential.co2_t_year * q) + ' t CO2');
}

h('7. Kerala ceiling (our estimate: show the maths)');
const homes = 337000;
const kwh = homes * 2;
console.log(homes.toLocaleString('en-IN') + ' solar homes x 2 units moved out of the evening peak = ' + kwh.toLocaleString('en-IN') + ' kWh.');
console.log('Spread over 4 hours: ' + (kwh / 4 / 1000).toFixed(1) + ' MW (' + ((kwh / 4 / 1000 / 6200) * 100).toFixed(1) + '% of the 6,200 MW record). Spread over 5 hours (6 to 11 pm): ' + (kwh / 5 / 1000).toFixed(1) + ' MW (' + ((kwh / 5 / 1000 / 6200) * 100).toFixed(1) + '%).');

h('8. Veyil Samayam (best hours) for a typical 262-unit home with a 2.5 kW system');
const home = loadAreas().find((a) => a.kind === 'home');
const sp = buildSunPlan(rules, { lat: home.center[1], lon: home.center[0], kw: 2.5, monthly_units: 262, date: null }, date);
console.log('Forecast day ' + sp.date + ' (' + sp.quality.data + '): ' + sp.plan.map((p) => p.appliance.replace('_', ' ') + ' at ' + p.start).join(', '));
console.log('Forecast day: solar used at home ' + sp.self_use_pct.before + '% -> ' + sp.self_use_pct.after + '% (a cloudy day has little solar to waste, so the gain is smaller).');
console.log('Typical day for the month (the pitch number): solar used at home ' + sp.typical_day.self_use_pct.before + '% -> ' + sp.typical_day.self_use_pct.after + '%, ' + sp.typical_day.units_moved_from_peak + ' units moved out of the 6-10 pm peak. KSEB reports solar homes use only 36%; our household profile is an ASSUMPTION tuned to that.');

h('9. Yield sanity check (Kerala systems give about 3 to 5 units per kW per day)');
for (const a of loadAreas()) {
  const r = await buildReport(rules, parseReportInput({ roof: { polygon: rect(a.center[0], a.center[1], 10, 12) }, roof_type: 'flat', shade: 'little', units: 262 }), date);
  console.log(a.name.en + ': ' + (r.sun.units_year / r.sun.kw_recommended / 365.25).toFixed(2) + ' units per kW per day (little shade)');
}

h('9b. Size by money: three options for the 262-unit Pozhiyoor home (the neutrality story)');
{
  const a = loadAreas().find((x) => x.kind === 'home');
  const r = await buildReport(rules, parseReportInput({ roof: { polygon: rect(a.center[0], a.center[1], 10, 12) }, roof_type: 'flat', shade: 'some', building_use: 'home', units: 262 }), date);
  for (const o of r.sun.options) {
    console.log('  ' + o.label.padEnd(12) + String(o.kw).padStart(4) + ' kW | saves ' + inr0(o.saving_year) + ' a year | subsidy ' + inr0(o.subsidy) + ' | payback ' + o.payback_years.join(' to ') + ' yr (' + o.payback_years_no_subsidy.join(' to ') + ' without subsidy) | 25-year net ' + lakh(o.net_benefit_25y));
  }
  console.log('  Rule: add panels up to what covers your own use, and stop when the next 0.5 kW takes over ' + rules.sizing.marginal_payback_years + ' years to pay back. The last units you remove are your cheapest slab units.');
  console.log('  Monthly bill after solar (energy charge, Jan to Dec): ' + r.money.bill_after_months.map((x) => Math.round(x)).join(', ') + ' (before: ' + Math.round(r.money.bill_before_month) + ' every month)');
}

h('9c. Time-of-day tariff (KSEB, verified): homes above 500 units a month');
{
  const a = loadAreas().find((x) => x.kind === 'home');
  const t = buildSunPlan(rules, { lat: a.center[1], lon: a.center[0], kw: 5, monthly_units: 620, date: null, appliances: ['motor', 'washing_machine', 'iron', 'ev_charger'] }, date).tod;
  console.log('  620 units a month: rate ' + inr(t.rate) + '. Running motor, washing machine, iron and EV charger at their usual evening times costs ' + inr(t.cost_before_day) + ' a day, in the sunny hours ' + inr(t.cost_after_day) + ': saves ' + inr(t.saving_day) + ' a day, about ' + inr0(t.saving_month) + ' a month.');
  console.log('  Check: a 1.5 unit wash at the ₹9.20 rate is ' + inr(1.5 * 9.2 * 1.25) + ' in the 6 to 10 pm peak and ' + inr(1.5 * 9.2 * 0.9) + ' in the day.');
}

h('9d. Impact for slide 6 (the demo wards, 25% of homes adopt)');
{
  const i = buildImpact(rules, 25);
  console.log('  ' + i.total.homes_adopting + ' of ' + i.total.homes_total + ' homes in ' + i.sdg[11].wards_with_a_plan + ' wards: SDG 7 ' + i.sdg[7].kw_planned + ' kW and ' + (i.sdg[7].kwh_year / 1e6).toFixed(2) + ' GWh a year | SDG 6 ' + (i.sdg[6].litres_year / 1e7).toFixed(2) + ' crore litres of roof rain, enough for ' + i.sdg[6].homes_non_drinking_need_covered + ' homes of non-drinking water | SDG 13 ' + Math.round(i.sdg[13].co2_t_year) + ' t CO2 a year | SDG 11 ' + i.sdg[11].wards_with_a_plan + ' wards with a plan.');
}

h('10. Open VERIFY items (not confirmed: never present as fact)');
const walk = (o, path) => {
  for (const [k, v] of Object.entries(o)) {
    if (k === 'verify' || k === 'profile_verify') console.log('- ' + (path || 'rules') + ': ' + v);
    else if (v && typeof v === 'object') walk(v, (path ? path + '.' : '') + (Array.isArray(o) ? '[' + k + ']' : k));
  }
};
walk(rules, '');

if (process.argv.includes('--tests')) {
  h('11. Tests');
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap'], { cwd: ENGINE_ROOT, encoding: 'utf8', env: { ...process.env, QUIET: '1', NO_COLOR: '1', FORCE_COLOR: '0' } });
  const plain = (r.stdout || '').replace(new RegExp(String.fromCharCode(27) + '[[][0-9;]*m', 'g'), '');
  const num = (name) => (plain.match(new RegExp('# ' + name + ' ([0-9]+)')) || [])[1];
  console.log(num('pass') + ' of ' + num('tests') + ' tests pass (' + num('fail') + ' fail).' + (r.status === 0 ? '' : ' TESTS FAILING'));
}
