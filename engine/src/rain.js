// Roof rain: litres per day, tank simulation, tank recommendation. Pure functions; rules passed in.

export function dailyInflowLitres(rules, mmSeries, areaM2) {
  const { runoff, first_flush_mm } = rules.rain;
  return mmSeries.map((mm) => Math.max(0, mm - first_flush_mm) * areaM2 * runoff);
}

// Day by day: rain fills the tank (the rest overflows to the well), then the household draws what it needs.
export function simulateTank(inflow, demandPerDay, capacity) {
  let store = 0;
  let metDays = 0;
  let overflow = 0;
  for (const inL of inflow) {
    store += inL;
    if (store > capacity) {
      overflow += store - capacity;
      store = capacity;
    }
    const supply = Math.min(demandPerDay, store);
    store -= supply;
    if (supply >= demandPerDay - 1e-9) metDays++;
  }
  return { reliability: inflow.length ? metDays / inflow.length : 0, overflow };
}

// The knee of the curve: the smallest tank beyond which each extra day of stored demand adds under marginal_gain_pp_per_day points.
export function recommendTank(rules, inflow, demandPerDay) {
  const sizes = rules.rain.tank_sizes_l;
  const sims = sizes.map((c) => ({ litres: c, ...simulateTank(inflow, demandPerDay, c) }));
  let pick = sims.length - 1;
  for (let i = 0; i < sims.length - 1; i++) {
    const extraDays = (sims[i + 1].litres - sims[i].litres) / demandPerDay;
    if (((sims[i + 1].reliability - sims[i].reliability) * 100) / extraDays < rules.rain.marginal_gain_pp_per_day) {
      pick = i;
      break;
    }
  }
  const years = inflow.length / 365.25;
  const chosen = sims[pick];
  const next = sims[pick + 1] ?? null;
  return {
    tank_litres: chosen.litres,
    water_cover_pct: Math.round(chosen.reliability * 100),
    tank_curve: sims.map((s) => ({ litres: s.litres, cover_pct: Math.round(s.reliability * 100) })),
    well_recharge_litres_year: Math.round(chosen.overflow / years),
    next_tank: next ? { tank_litres: next.litres, water_cover_pct: Math.round(next.reliability * 100) } : null,
  };
}

// Calendar month (0-11) for each day of a series that starts on startStr (YYYY-MM-DD).
export function monthOfDay(startStr, n) {
  const out = new Array(n);
  const d = new Date(Date.UTC(+startStr.slice(0, 4), +startStr.slice(5, 7) - 1, +startStr.slice(8, 10)));
  for (let i = 0; i < n; i++) {
    out[i] = d.getUTCMonth();
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export function monthlyAverage(series, startStr) {
  const months = monthOfDay(startStr, series.length);
  const sums = new Array(12).fill(0);
  for (let i = 0; i < series.length; i++) sums[months[i]] += series[i];
  const years = series.length / 365.25;
  return sums.map((s) => s / years);
}

// Last-resort daily series built from typical monthly normals (flagged as typical data in every response).
export function typicalRainSeries(rules, years = 10, startStr = '2016-01-01') {
  const n = Math.round(years * 365.25);
  const months = monthOfDay(startStr, n);
  const dim = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const dayInMonth = new Array(12).fill(0);
  let lastMonth = -1;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const m = months[i];
    if (m !== lastMonth) {
      dayInMonth[m] = 0;
      lastMonth = m;
    }
    const mm = rules.typical_kerala.rain_mm_month[m];
    const rainDays = Math.min(24, Math.max(2, Math.round(mm / 12)));
    const d = dayInMonth[m]++;
    out[i] = Math.floor(((d + 1) * rainDays) / dim[m]) > Math.floor((d * rainDays) / dim[m]) ? mm / rainDays : 0;
  }
  return out;
}
