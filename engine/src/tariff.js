// KSEB LT-1A domestic tariff: energy + fixed charge, bill cliffs, "solar to beat the cliff".
// Pure functions (no fs, no network): rules are passed in. Money is integer paise inside, rupees at the edge.

const toPaise = (rupees) => Math.round(rupees * 100);
export const rs = (paise) => Math.round(paise) / 100;

export function selectTariff(rules, dateStr) {
  const t = rules.tariffs.find((x) => dateStr >= x.valid_from && dateStr <= x.valid_to);
  if (t) return { tariff: t, stale: false };
  const latest = [...rules.tariffs].sort((a, b) => (a.valid_to < b.valid_to ? 1 : -1))[0];
  return { tariff: latest, stale: true };
}

const slabLimit = (t) => t.telescopic_up_to_250[t.telescopic_up_to_250.length - 1].upto;

// Energy charge in paise for ONE month of m units (m may be fractional).
export function energyPaise(t, m) {
  if (!(m > 0)) return 0;
  if (m <= slabLimit(t)) {
    let lo = 0;
    let total = 0;
    for (const s of t.telescopic_up_to_250) {
      if (m > lo) total += (Math.min(m, s.upto) - lo) * toPaise(s.rate);
      lo = s.upto;
    }
    return Math.round(total);
  }
  const band = t.flat_all_units_above_250.find((b) => m <= b.upto) ?? t.flat_all_units_above_250.at(-1);
  return Math.round(m * toPaise(band.rate));
}

function row(t, m) {
  if (m <= slabLimit(t)) return t.telescopic_up_to_250.find((s) => m <= s.upto) ?? t.telescopic_up_to_250[0];
  return t.flat_all_units_above_250.find((b) => m <= b.upto) ?? t.flat_all_units_above_250.at(-1);
}

export const marginalRate = (t, m) => row(t, m).rate;
export function fixedPaise(t, m, phase) {
  return toPaise(row(t, m)[phase === '3ph' ? 'fixed_3ph' : 'fixed_1ph']);
}

// A whole bill. Slabs are per month, so a 2-month bill is judged on units/2 and scaled back up.
export function billFor(rules, { units, period_months = 1, phase = '1ph', date }) {
  const { tariff, stale } = selectTariff(rules, date);
  const p = period_months === 2 ? 2 : 1;
  const m = units / p;
  const energy = p * energyPaise(tariff, m);
  const fixed = p * fixedPaise(tariff, m, phase);
  return {
    tariff_id: tariff.id,
    tariff_stale: stale,
    units,
    period_months: p,
    monthly_units: Math.round(m * 100) / 100,
    energy: rs(energy),
    fixed: rs(fixed),
    total: rs(energy + fixed),
    rate: marginalRate(tariff, m),
  };
}

// Monthly energy charge in rupees (used by savings).
export const monthEnergy = (rules, m, date) => rs(energyPaise(selectTariff(rules, date).tariff, m));

// Cliff boundaries come from the table itself: the end of the slab zone, then every flat band edge except the open top.
export function cliffBoundaries(t) {
  const bounds = [slabLimit(t)];
  for (const b of t.flat_all_units_above_250) if (b.upto < 99999) bounds.push(b.upto);
  return bounds;
}

export function cliffList(rules, date) {
  const { tariff: t } = selectTariff(rules, date);
  return cliffBoundaries(t).map((at) => ({ at, jump: rs(energyPaise(t, at + 1) - energyPaise(t, at)) }));
}

export function cliffStatus(rules, monthlyUnits, date) {
  const { tariff: t } = selectTariff(rules, date);
  const bounds = cliffBoundaries(t);
  const lastAt = [...bounds].reverse().find((b) => b < monthlyUnits);
  const nextAt = bounds.find((b) => b >= monthlyUnits);
  const jumpAt = (b) => rs(energyPaise(t, b + 1) - energyPaise(t, b));
  return {
    last:
      lastAt === undefined
        ? null
        : {
            at: lastAt,
            over_by: Math.round((monthlyUnits - lastAt) * 100) / 100,
            saving_if_under: rs(energyPaise(t, monthlyUnits) - energyPaise(t, lastAt)),
          },
    next:
      nextAt === undefined
        ? null
        : { at: nextAt, units_to_go: Math.round((nextAt - monthlyUnits) * 100) / 100, jump: jumpAt(nextAt) },
  };
}

// Smallest solar size (0.5 kW steps from the minimum) that brings the home back under the cliff it is over.
export function solarToBeatCliff(rules, monthlyUnits, date) {
  const status = cliffStatus(rules, monthlyUnits, date);
  if (!status.last) return null;
  const { tariff: t } = selectTariff(rules, date);
  const s = rules.solar;
  const perKw = s.units_per_kw_month_rule;
  for (let kw = s.min_advice_kw; kw <= s.max_advice_kw_home; kw += s.step_kw) {
    const after = Math.max(0, monthlyUnits - perKw * kw);
    if (after <= status.last.at) {
      return {
        kw,
        monthly_units_after: Math.round(after),
        saving_month: rs(energyPaise(t, monthlyUnits) - energyPaise(t, after)),
      };
    }
  }
  return null;
}

export function curve(rules, date, maxUnits = 600) {
  const { tariff: t } = selectTariff(rules, date);
  const out = [];
  for (let u = 0; u <= maxUnits; u++) out.push({ units: u, energy: rs(energyPaise(t, u)) });
  return out;
}
