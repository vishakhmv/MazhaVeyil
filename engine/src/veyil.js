// Veyil Samayam: put flexible loads (motor, washing machine, iron) into the sunniest half-hours of a day.
// Pure functions. All inputs are 48 half-hour slots; energies are kWh per slot, powers kW.

export const SLOTS = 48;
const slotOf = (hhmm) => Number(hhmm.slice(0, 2)) * 2 + (Number(hhmm.slice(3, 5)) >= 30 ? 1 : 0);
export const slotLabel = (s) => String(Math.floor(s / 2)).padStart(2, '0') + ':' + (s % 2 ? '30' : '00');

// Hourly kW (24 values) -> kW per half-hour slot (48 values).
export const hourlyToSlots = (hourly) => Array.from({ length: SLOTS }, (_, s) => hourly[Math.floor(s / 2)] ?? 0);

// Daily use minus the flexible loads, spread over the day: part always-on (fridge, fans, standby), part shaped by the evening-heavy profile.
export function baseLoad(rules, dailyUseKwh, flexKwh) {
  const v = rules.veyil;
  const base = Math.max(0, dailyUseKwh - flexKwh);
  const w = v.base_profile_hourly;
  const wSum = w.reduce((s, x) => s + x, 0);
  return Array.from({ length: SLOTS }, (_, s) => base * (v.always_on_share / 24 / 2 + ((1 - v.always_on_share) * w[Math.floor(s / 2)]) / wSum / 2));
}

const selfUse = (pvE, loadE) => {
  const gen = pvE.reduce((s, x) => s + x, 0);
  if (gen <= 1e-9) return 0;
  return (pvE.reduce((s, x, i) => s + Math.min(x, loadE[i]), 0) / gen) * 100;
};

export function planDay(rules, { pvKw48, dailyUseKwh, appliances }) {
  const v = rules.veyil;
  const pvE = pvKw48.map((p) => p * 0.5);
  const flexKwh = appliances.reduce((s, a) => s + a.kwh, 0);
  const base = baseLoad(rules, dailyUseKwh, flexKwh);
  const slotsFor = (a) => Math.max(1, Math.ceil(a.minutes / 30));
  const [w0, w1] = [slotOf(v.solar_window[0]), slotOf(v.solar_window[1])];
  const [p0, p1] = [slotOf(v.peak[0]), slotOf(v.peak[1])];

  // Before: every appliance at its usual time.
  const before = [...base];
  const usual = appliances.map((a) => {
    const n = slotsFor(a);
    const s = slotOf(a.usual_start);
    for (let k = 0; k < n; k++) if (s + k < SLOTS) before[s + k] += a.kwh / n;
    return { a, s, n };
  });

  // After: biggest loads first, each into the start that uses the most otherwise-unused solar.
  const after = [...base];
  const placed = [];
  for (const { a, s: usualStart, n } of [...usual].sort((x, y) => y.a.kwh - x.a.kwh)) {
    let best = { s: usualStart, gain: 0 };
    for (let s = w0; s + n <= w1; s++) {
      let gain = 0;
      for (let k = 0; k < n; k++) gain += Math.min(a.kwh / n, Math.max(0, pvE[s + k] - after[s + k]));
      if (gain > best.gain + 1e-9) best = { s, gain };
    }
    for (let k = 0; k < n; k++) if (best.s + k < SLOTS) after[best.s + k] += a.kwh / n;
    placed.push({ appliance: a.id, start: slotLabel(best.s), minutes: a.minutes, kwh: a.kwh, usual_start: a.usual_start, appliance_def: a, _s: best.s, _n: n, _usualS: usualStart });
  }

  const inPeak = (s, n, kwh) => {
    let e = 0;
    for (let k = 0; k < n; k++) if (s + k >= p0 && s + k < p1) e += kwh / n;
    return e;
  };
  const movedFromPeak = placed.reduce((sum, p) => sum + inPeak(p._usualS, p._n, p.kwh) - inPeak(p._s, p._n, p.kwh), 0);

  return {
    plan: placed.map(({ appliance, start, minutes, kwh, usual_start, appliance_def }) => ({ appliance, start, minutes, kwh, usual_start, appliance_def })),
    self_use_pct: { before: Math.round(selfUse(pvE, before)), after: Math.round(selfUse(pvE, after)) },
    units_moved_from_peak: Math.round(movedFromPeak * 100) / 100,
    pv_day_kwh: Math.round(pvE.reduce((s, x) => s + x, 0) * 100) / 100,
  };
}

// A typical clear-ish day when no forecast is cached: a half-sine between sunrise and sunset scaled to the month's average sun.
export function typicalDayKw(rules, ghiKwhM2Day, kw, sunrise = 6.25, sunset = 18.5) {
  const hourly = new Array(24).fill(0);
  const span = sunset - sunrise;
  const area = (2 * span) / Math.PI; // integral of sin over the day, in hours
  for (let h = 0; h < 24; h++) {
    const mid = h + 0.5;
    if (mid > sunrise && mid < sunset) {
      const irr = (ghiKwhM2Day / area) * Math.sin((Math.PI * (mid - sunrise)) / span); // kW/m2
      hourly[h] = kw * irr * rules.solar.performance_ratio;
    }
  }
  return hourly;
}

// KSEB time-of-day factor for a half-hour slot (windows may wrap past midnight).
export function todFactor(rules, slot) {
  const h = slot / 2;
  for (const w of rules.tod_domestic.windows) {
    const inside = w.from < w.to ? h >= w.from && h < w.to : h >= w.from || h < w.to;
    if (inside) return w.factor;
  }
  return 1;
}

// Rupees for running each appliance at a given start: kWh x the home's ruling rate x the ToD factor of each half-hour it occupies.
export function todCostOf(rules, appliance, startHHMM, rate) {
  const n = Math.max(1, Math.ceil(appliance.minutes / 30));
  const s = slotOf(startHHMM);
  let cost = 0;
  for (let k = 0; k < n; k++) cost += (appliance.kwh / n) * rate * todFactor(rules, (s + k) % SLOTS);
  return cost;
}
