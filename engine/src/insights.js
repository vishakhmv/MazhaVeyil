// Plain-language findings for the Roof Report, as i18n keys + numbers (Savio owns the sentences; see contracts/engine-strings.json).
// Ordered by how much a household should care. Pure.

export function buildInsights(rules, c) {
  const out = [];
  const add = (key, params = {}) => out.push({ key, params });

  if (c.unitsSource === 'default') add('insight.default_units', { monthly_units: Math.round(c.monthly) });
  if (c.isHome && c.cliff) {
    if (c.cliff.last) {
      add('insight.cliff_over', { units_over: c.cliff.last.over_by, cliff: c.cliff.last.at, saving: c.cliff.last.saving_if_under });
    } else if (c.cliff.next && c.cliff.next.units_to_go <= 25) {
      add('insight.cliff_near', { units_to_go: c.cliff.next.units_to_go, cliff: c.cliff.next.at, jump: c.cliff.next.jump });
    }
  }
  if (c.isHome && c.kw > 0 && c.kw < c.coverKw) add('insight.last_panels_earn_little', { kw: c.kw, cover_kw: c.coverKw });
  if (c.isHome && c.subsidy > 0 && c.daysLeft !== null && c.daysLeft <= 240) add('insight.subsidy_window', { days_left: c.daysLeft, subsidy: c.subsidy });
  if (c.isHome && c.score.power < 100) add('insight.roof_limits', { power: c.score.power, kw_max: c.kwMax });
  if (c.isHome && c.kw > rules.net_metering.confirmed_net_metering_kw) add('insight.big_system_rules', { kw: c.kw });
  if (!c.isHome) add('insight.public_building');
  if (c.score.tip) add('insight.tank_tip', c.score.tip);

  const dry = c.rainMonthly.map((l, m) => ({ l, m: m + 1 })).filter((x) => x.l < c.demand * 30 * 0.5).map((x) => x.m);
  if (dry.length) add('insight.dry_months', { months: dry });
  const days = Math.min(365, Math.round(c.harvestYear / c.demand));
  add('insight.water_days', { days, demand_litres_day: c.demand, cover_pct: c.score.water });
  if (c.quality !== 'cached' && c.quality !== 'live') add('insight.typical_data', { data: c.quality });
  return out;
}
