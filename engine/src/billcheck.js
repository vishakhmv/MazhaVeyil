// "AI reads, rules check": cross-checks what the bill scanner read against our own tariff calculation. Pure; no AI, no key.
import { billFor } from './tariff.js';

const DAY = 86400000;
const parse = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s ?? '')) ? Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) : null);
const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

// scan: {units, amount, phase?, period_start?, period_end?, previous_reading?, current_reading?, period_months?, bill_date?}
export function checkScan(rules, scan, today) {
  const warnings = [];
  const units = Number(scan.units);
  const amount = Number(scan.amount);
  if (!Number.isFinite(units) || units < 0 || units > rules.bill_check.max_units_per_month * 2) {
    return { schema: 'bill-check@1', status: 'reject', reason: 'units_unreadable', warnings: [{ key: 'bill.units_unreadable', params: {} }], bill: null, expected_total: null, diff_pct: null };
  }

  // Billing period: from the dates when we have them (about 30 days = 1 month, about 60 = 2), else what the scanner said, else assume 1.
  let months = scan.period_months === 2 ? 2 : 1;
  let periodSource = scan.period_months ? 'scanner' : 'assumed';
  const [a, b] = [parse(scan.period_start), parse(scan.period_end)];
  if (a !== null && b !== null && b > a) {
    const days = Math.round((b - a) / DAY);
    if (days <= 40) months = 1;
    else if (days <= 75) months = 2;
    else warnings.push({ key: 'bill.period_unusual', params: { days } });
    if (days <= 75) periodSource = 'dates';
  } else if (periodSource === 'assumed') {
    warnings.push({ key: 'bill.period_assumed', params: { months: 1 } });
  }

  // Meter readings should agree with the units.
  const [prev, cur] = [Number(scan.previous_reading), Number(scan.current_reading)];
  if (Number.isFinite(prev) && Number.isFinite(cur) && cur >= prev && Math.abs(cur - prev - units) > 1) {
    warnings.push({ key: 'bill.readings_mismatch', params: { units, from_readings: round(cur - prev, 1) } });
  }

  const monthly = units / months;
  if (monthly > rules.bill_check.max_units_per_month) warnings.push({ key: 'bill.units_very_high', params: { monthly_units: round(monthly, 0) } });

  const phase = scan.phase === '3ph' ? '3ph' : '1ph';
  const date = (scan.bill_date && parse(scan.bill_date) !== null ? scan.bill_date : today).slice(0, 10);
  const bill = billFor(rules, { units, period_months: months, phase, date });
  const duty = round((bill.energy * rules.bill_extras.electricity_duty_pct_of_energy) / 100);
  const expected = { total: round(bill.total + duty), tariff_id: bill.tariff_id };
  let diffPct = null;
  if (Number.isFinite(amount) && amount > 0 && expected.total > 0) {
    diffPct = round(((amount - expected.total) / expected.total) * 100, 1);
    if (Math.abs(diffPct) > rules.bill_check.amount_tolerance * 100) {
      warnings.push({ key: 'bill.amount_differs', params: { amount, expected_total: expected.total, diff_pct: diffPct } });
    }
  } else {
    warnings.push({ key: 'bill.amount_unreadable', params: {} });
  }

  return {
    schema: 'bill-check@1',
    status: warnings.length ? 'warn' : 'ok',
    bill: { units, period_months: months, period_source: periodSource, monthly_units: round(monthly, 2), phase },
    expected_total: expected.total,
    expected_breakdown: { energy: bill.energy, fixed: bill.fixed, duty },
    amount: Number.isFinite(amount) ? amount : null,
    diff_pct: diffPct,
    tariff_id: expected.tariff_id,
    warnings,
  };
}
