// The generated browser module must agree with the engine to the paisa, so the Cliff Meter screen and the API can never disagree.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules } from '../src/rules.js';
import { billFor, cliffList } from '../src/tariff.js';
import { bill, monthEnergy, cliffs, cliffMeterNumbers } from '../../contracts/cliffMath.js';

const rules = loadRules();
const D = '2026-10-24';

test('cliffMath matches the engine for every unit count, both periods and phases', () => {
  for (const months of [1, 2]) {
    for (const phase of ['1ph', '3ph']) {
      for (let u = 0; u <= 1300; u += 1) {
        const e = billFor(rules, { units: u, period_months: months, phase, date: D });
        const b = bill(u, months, phase);
        assert.equal(b.energy, e.energy, u + ' units energy');
        assert.equal(b.fixed, e.fixed, u + ' units fixed');
      }
    }
  }
});

test('cliffMath: the golden numbers and the cliff list', () => {
  assert.equal(monthEnergy(250), 1432.5);
  assert.equal(monthEnergy(251), 1694.25);
  assert.equal(monthEnergy(501), 4609.2);
  assert.deepEqual(cliffs(), cliffList(rules, D));
});

test('cliffMeterNumbers: 520 units over two months with 3 kW', () => {
  const n = cliffMeterNumbers(520, 3);
  assert.equal(n.monthlyUnits, 260);
  assert.equal(n.isCliffTriggered, true);
  assert.equal(n.rawEnergyCostWithoutSolar, 520 * 6.75);
  assert.equal(n.solarGenBimonthly, 660);
  assert.equal(n.netUnitsWithSolar, 0);
  assert.equal(n.totalBillWithSolar, 0);
  assert.equal(n.netSavings, n.totalBillWithoutSolar);
  const small = cliffMeterNumbers(520, 1);
  assert.equal(small.netUnitsWithSolar, 300);
  assert.equal(small.isCliffTriggeredWithSolar, false);
  assert.ok(small.netSavings > 0 && small.netSavings < small.totalBillWithoutSolar);
});
