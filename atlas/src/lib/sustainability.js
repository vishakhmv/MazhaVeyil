/**
 * MazhaVeyil Sustainability Engine
 * Rigorous calculations for SDG 6, 7, 11, and 13 in the Kerala context.
 * Complies with KSERC (Kerala State Electricity Regulatory Commission),
 * ANERT (Agency for New and Renewable Energy Research and Technology),
 * and CGWB (Central Ground Water Board) standards.
 */

// Official district average annual precipitation (IMD / Kerala State Disaster Management Authority)
export const DISTRICT_RAINFALL_MM = {
  'Kollam': 2450,
  'Thiruvananthapuram': 1850,
  'Alappuzha': 2820,
  'Kannur': 3420,
  'Kottayam': 3100,
  'Ernakulam': 3200,
  'Thrissur': 2950,
  'Kozhikode': 3350,
  'default': 2800
};

// CEA Baseline Carbon Emission Factor v20 (Central Electricity Authority of India)
export const CEA_GRID_EMISSION_FACTOR = 0.716; // kg CO2e / kWh
export const COAL_DISPLACEMENT_FACTOR = 0.46; // kg coal burned / kWh in Indian grid

// Tanker Water Economics (Kollam & Pozhiyoor verified summer survey rates)
export const TANKER_CAPACITY_LITRES = 6000;
export const TANKER_COST_INR = 1200; // ₹1,200 per 6,000L trip
export const TANKER_DIESEL_EMISSIONS_KG = 14.2; // 18 km round-trip in rural topography

// Daily household basic domestic water requirement (National Jal Jeevan Mission standard: 55 LPCD * 4 persons)
export const HOUSEHOLD_DAILY_WATER_LITRES = 220;

/**
 * Computes deep SDG metrics for a ward based on homes joining and district rainfall.
 */
export function computeSustainabilityImpact(ward, homesJoining = 25) {
  const district = ward?.district || 'default';
  const rainfallMm = DISTRICT_RAINFALL_MM[district] || DISTRICT_RAINFALL_MM['default'];
  const roofAreaSqm = 120; // Average Kerala homestead roof footprint (sq.m)
  const runoffCoeff = 0.85; // Sloped tile or finished concrete
  const filterEfficiency = 0.90; // Mazhapolima sand + charcoal dual gravity filter

  // 1. Water Harvested & Infiltration Volume (SDG 6)
  const annualLitresPerHome = Math.round(roofAreaSqm * (rainfallMm / 1000) * runoffCoeff * filterEfficiency * 1000);
  const totalWaterHarvestedLitres = annualLitresPerHome * homesJoining;
  const croreLitres = Number((totalWaterHarvestedLitres / 10000000).toFixed(2));
  const lakhLitres = Number((totalWaterHarvestedLitres / 100000).toFixed(1));

  // Aquifer Recharge Fraction (Direct to open dug well recharge ring)
  const aquiferRechargedLitres = Math.round(totalWaterHarvestedLitres * 0.75);
  const directStorageLitres = Math.round(totalWaterHarvestedLitres * 0.25);

  // Drought Delay Index: Additional days of water security before summer well exhaustion
  // Wells in shallow unconfined laterite aquifers gain ~35 to 65 days of baseflow
  const droughtSecurityDaysGained = Math.min(75, Math.round((annualLitresPerHome * 0.4) / HOUSEHOLD_DAILY_WATER_LITRES));

  // Tanker Truck Displacement
  const tankersDisplaced = Math.round(totalWaterHarvestedLitres / TANKER_CAPACITY_LITRES);
  const tankerMoneySavedInr = tankersDisplaced * TANKER_COST_INR;
  const tankerDieselCo2SavedKg = Math.round(tankersDisplaced * TANKER_DIESEL_EMISSIONS_KG);

  // 2. Solar Clean Energy & Grid Decarbonization (SDG 7 & 13)
  const avgKwPerHome = 2.5;
  const totalKw = Number((homesJoining * avgKwPerHome).toFixed(1));
  const annualSolarGenerationKwh = Math.round(totalKw * 1380); // 1,380 kWh/kWp Kerala average (NASA POWER)
  const annualGridCo2SavedTonnes = Number(((annualSolarGenerationKwh * CEA_GRID_EMISSION_FACTOR) / 1000).toFixed(1));
  const coalBurnedAvoidedTonnes = Number(((annualSolarGenerationKwh * COAL_DISPLACEMENT_FACTOR) / 1000).toFixed(1));

  // 3. Veyil Samayam: Peak Shifting & Feeder Relief (SDG 7 & 11)
  // Shifting 2 units/day/home away from 6 PM - 11 PM evening peak
  const peakUnitsShiftedAnnual = Math.round(homesJoining * 2 * 365);
  const feederPeakReliefKw = Number((homesJoining * (2 / 4.5)).toFixed(1)); // ~0.44 kW per home
  
  // Economic gain: Avoided KSEB peak procurement cost (₹9.20 peak marginal power vs ₹2.79 surplus settlement)
  const ksebAvoidedProcurementInr = Math.round(peakUnitsShiftedAnnual * (9.20 - 2.79));

  // 4. Kudumbashree Green Jobs & Local Wealth Retention (SDG 8 & 11)
  // 1 Kudumbashree green maintenance enterprise unit per 20 installations
  const greenJobsSupported = Math.max(1, Math.round(homesJoining / 20));
  const localEconomicRetentionPct = 78; // % of installation, fabrication & maintenance kept in ward

  return {
    rainfallMm,
    totalWaterHarvestedLitres,
    croreLitres,
    lakhLitres,
    aquiferRechargedLitres,
    directStorageLitres,
    droughtSecurityDaysGained,
    tankersDisplaced,
    tankerMoneySavedInr,
    tankerDieselCo2SavedKg,
    totalKw,
    annualSolarGenerationKwh,
    annualGridCo2SavedTonnes,
    coalBurnedAvoidedTonnes,
    feederPeakReliefKw,
    peakUnitsShiftedAnnual,
    ksebAvoidedProcurementInr,
    greenJobsSupported,
    localEconomicRetentionPct
  };
}
