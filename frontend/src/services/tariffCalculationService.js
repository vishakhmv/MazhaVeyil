/**
 * @file tariffCalculationService.js
 * @description Provisional KSEB LT-1A domestic tariff calculation engine.
 * Marked as provisional estimate for planning until Vishakh's engine is connected.
 */

export const KSEB_TARIFF_CONSTANTS = {
  cliffThresholdUnits: 250, // Monthly consumption threshold for LT-1A telescopic benefit
  bimonthlyCliffThresholdUnits: 500,
  dutyRate: 0.10, // 10% Kerala Electricity Duty
  fuelSurchargePerUnit: 0.19, // Provisional fuel surcharge ₹/kWh
  meterRentMonthly: 20,
  isProvisional: true,
  disclaimer: 'Provisional Estimate — Subject to KSEB LT-1A Tariff Regulations & Exact Bimonthly Billing Cycles.'
};

/**
 * Calculates telescopic domestic bill for consumption up to 250 units/month.
 * @param {number} units 
 * @returns {{ energyCost: number, slabBreakdown: Array<{ slab: string, units: number, rate: number, amount: number }> }}
 */
function calculateTelescopicEnergyCost(units) {
  let remaining = units;
  const breakdown = [];
  let energyCost = 0;

  const slabs = [
    { name: '0 - 40 units', max: 40, rate: 1.50 },
    { name: '41 - 50 units', max: 10, rate: 3.25 },
    { name: '51 - 100 units', max: 50, rate: 4.05 },
    { name: '101 - 150 units', max: 50, rate: 5.10 },
    { name: '151 - 200 units', max: 50, rate: 6.95 },
    { name: '201 - 250 units', max: 50, rate: 8.20 },
  ];

  for (const slab of slabs) {
    if (remaining <= 0) break;
    const unitsInSlab = Math.min(remaining, slab.max);
    const amount = unitsInSlab * slab.rate;
    energyCost += amount;
    breakdown.push({
      slab: slab.name,
      units: unitsInSlab,
      rate: slab.rate,
      amount: Math.round(amount),
    });
    remaining -= unitsInSlab;
  }

  return { energyCost, slabBreakdown: breakdown };
}

/**
 * Calculates non-telescopic domestic bill when consumption exceeds 250 units/month.
 * @param {number} units 
 * @returns {{ energyCost: number, slabBreakdown: Array<{ slab: string, units: number, rate: number, amount: number }> }}
 */
function calculateNonTelescopicEnergyCost(units) {
  // Non-telescopic domestic flat rate tiers
  let flatRate = 6.40;
  if (units > 500) {
    flatRate = 8.80;
  } else if (units > 400) {
    flatRate = 8.10;
  } else if (units > 350) {
    flatRate = 7.60;
  } else if (units > 300) {
    flatRate = 7.10;
  }

  const energyCost = units * flatRate;
  const breakdown = [
    {
      slab: `All ${units} units (Non-Telescopic)`,
      units: units,
      rate: flatRate,
      amount: Math.round(energyCost),
    }
  ];

  return { energyCost, slabBreakdown: breakdown };
}

/**
 * Calculates total bill for a given monthly consumption.
 * @param {number} monthlyUnits 
 * @returns {Object}
 */
export function calculateDomesticBill(monthlyUnits) {
  const units = Math.max(0, Number(monthlyUnits) || 0);
  const isCliffTriggered = units > KSEB_TARIFF_CONSTANTS.cliffThresholdUnits;

  let fixedCharge = 0;
  let energyCost = 0;
  let slabBreakdown = [];

  if (units === 0) {
    fixedCharge = 40;
    energyCost = 0;
  } else if (isCliffTriggered) {
    // Non-telescopic fixed charges
    fixedCharge = units > 400 ? 260 : units > 300 ? 220 : 180;
    const res = calculateNonTelescopicEnergyCost(units);
    energyCost = res.energyCost;
    slabBreakdown = res.slabBreakdown;
  } else {
    // Telescopic fixed charges
    fixedCharge = units <= 40 ? 40 : units <= 100 ? 75 : units <= 150 ? 100 : units <= 200 ? 130 : 160;
    const res = calculateTelescopicEnergyCost(units);
    energyCost = res.energyCost;
    slabBreakdown = res.slabBreakdown;
  }

  const fuelSurcharge = units * KSEB_TARIFF_CONSTANTS.fuelSurchargePerUnit;
  const electricityDuty = (energyCost + fixedCharge) * KSEB_TARIFF_CONSTANTS.dutyRate;
  const totalBill = Math.round(energyCost + fixedCharge + fuelSurcharge + electricityDuty + KSEB_TARIFF_CONSTANTS.meterRentMonthly);

  return {
    monthlyUnits: units,
    isCliffTriggered,
    energyCost: Math.round(energyCost),
    fixedCharge,
    fuelSurcharge: Math.round(fuelSurcharge),
    electricityDuty: Math.round(electricityDuty),
    meterRent: KSEB_TARIFF_CONSTANTS.meterRentMonthly,
    totalBill,
    effectiveRatePerUnit: units > 0 ? Number((totalBill / units).toFixed(2)) : 0,
    slabBreakdown,
  };
}

/**
 * Comprehensive Tariff & Cliff Assessment comparing grid-only vs solar-assisted consumption.
 * 
 * @param {Object} params
 * @param {number} params.monthlyConsumptionKwh - Total monthly usage
 * @param {number} [params.monthlySolarGenerationKwh=0] - Solar generation from report
 * @param {number} [params.solarCapacityKw=0] - Installed solar kWp
 * @returns {Object} Full comparison and savings impact
 */
export function calculateCliffAnalysis({
  monthlyConsumptionKwh,
  monthlySolarGenerationKwh = 0,
  solarCapacityKw = 0,
}) {
  const consumption = Math.max(0, Number(monthlyConsumptionKwh) || 0);
  const solarGen = Math.max(0, Number(monthlySolarGenerationKwh) || 0);

  // 1. Bill without solar (entire consumption drawn from grid)
  const withoutSolar = calculateDomesticBill(consumption);

  // 2. Net grid consumption with solar
  const netGridUnits = Math.max(0, consumption - solarGen);
  const withSolar = calculateDomesticBill(netGridUnits);

  // 3. Excess solar exported to grid if any (net-metering credit at KSEB average pooled purchase cost ~ ₹3.22/unit)
  const exportedUnits = Math.max(0, solarGen - consumption);
  const exportCredit = Math.round(exportedUnits * 3.22);

  // Net bill payable
  const finalPayableBill = Math.max(0, withSolar.totalBill - exportCredit);
  const monthlySavings = Math.max(0, withoutSolar.totalBill - finalPayableBill);
  const annualSavings = monthlySavings * 12;

  // Cliff Status
  const wasInCliff = withoutSolar.isCliffTriggered;
  const isNowInCliff = withSolar.isCliffTriggered;
  const avoidedCliff = wasInCliff && !isNowInCliff;

  return {
    consumptionKwh: consumption,
    solarGenerationKwh: solarGen,
    solarCapacityKw,
    netGridUnits,
    exportedUnits,
    exportCredit,
    withoutSolar,
    withSolar,
    finalPayableBill,
    monthlySavings,
    annualSavings,
    wasInCliff,
    isNowInCliff,
    avoidedCliff,
    cliffThreshold: KSEB_TARIFF_CONSTANTS.cliffThresholdUnits,
    disclaimer: KSEB_TARIFF_CONSTANTS.disclaimer,
    isProvisional: true,
  };
}
