/**
 * Rain Koottam Bulk Filter Kit Pricing Engine
 *
 * Homeowners pledging for rainwater harvesting (kind: 'rain' or 'both') unlock
 * bulk purchase pricing on filter assemblies and well-recharge kits.
 *
 * This mirrors the Mazhapolima method used in Thrissur:
 *   sand + charcoal filter → overflow goes to well recharge.
 *
 * Tiers are deliberately labelled as TARGET discounts until two real installer /
 * distributor quotes are collected (same rule as the solar Koottam).
 *
 * Data sources for unit costs:
 *   - Approximate Kerala market rates for gravity-filter + tank assemblies (2026)
 *   - Replace with real distributor quotes after the installer calls
 *
 * VERIFY: Confirm unit costs with actual Kerala filter suppliers before the demo.
 */

/** Approximate individual retail price for each rain component (INR) */
export const UNIT_PRICES = {
  gravity_filter_kit: 8500, // sand-charcoal-gravel gravity filter + mesh cover
  storage_tank_1000L: 6200, // 1,000 L poly tank (buried or surface)
  well_recharge_ring: 2800, // perforated ring set for overflow-to-well
  installation_labour: 3500 // per-home installation (plumber, half-day)
};

/** Computed individual total for a basic 3-component home setup */
export const INDIVIDUAL_TOTAL =
  UNIT_PRICES.gravity_filter_kit +
  UNIT_PRICES.storage_tank_1000L +
  UNIT_PRICES.well_recharge_ring +
  UNIT_PRICES.installation_labour; // ≈ ₹21,000 per home

/**
 * Rain Koottam discount tiers.
 * discount_pct: target group discount (pending real quotes — labelled accordingly).
 * subsidy_eligible: MNREGS / local-body grants often cover up to ₹5,000 for water conservation.
 */
export const RAIN_TIERS = [
  {
    threshold: 10,
    label: 'Tier 1 — Village Starter',
    discount_pct: 8,
    subsidy_note: 'Ward panchayat may cover ₹5,000 from water conservation budget',
    label_ml: 'ടയർ 1 — ഗ്രാമ തുടക്കം'
  },
  {
    threshold: 25,
    label: 'Tier 2 — Pilot Batch',
    discount_pct: 12,
    subsidy_note: 'District water conservation grant may apply',
    label_ml: 'ടയർ 2 — പൈലറ്റ് ബാച്ച്'
  },
  {
    threshold: 50,
    label: 'Tier 3 — Ward Full Batch',
    discount_pct: 18,
    subsidy_note: 'Kudumbashree co-operative bulk order eligible',
    label_ml: 'ടയർ 3 — വാർഡ് ഫുൾ ബാച്ച്'
  }
];

/**
 * Compute Rain Koottam group pricing for a given pledge count.
 *
 * @param {number} pledgeCount  – number of rain / both pledges in the ward
 * @returns {object}            – current tier, unit cost, savings, total for batch
 */
export function computeRainGroupPrice(pledgeCount) {
  // Find highest unlocked tier
  let activeTier = null;
  for (const tier of [...RAIN_TIERS].reverse()) {
    if (pledgeCount >= tier.threshold) {
      activeTier = tier;
      break;
    }
  }

  const nextTier = RAIN_TIERS.find((t) => t.threshold > pledgeCount) || null;
  const homesUntilNextTier = nextTier ? nextTier.threshold - pledgeCount : 0;

  const discountPct = activeTier ? activeTier.discount_pct : 0;
  const discountedUnitCost = Math.round(INDIVIDUAL_TOTAL * (1 - discountPct / 100));
  const savingsPerHome = INDIVIDUAL_TOTAL - discountedUnitCost;
  const batchTotalSavings = savingsPerHome * pledgeCount;

  return {
    pledge_count: pledgeCount,
    individual_unit_cost: INDIVIDUAL_TOTAL,
    active_tier: activeTier,
    next_tier: nextTier,
    homes_until_next_tier: homesUntilNextTier,
    discount_pct: discountPct,
    discounted_unit_cost: discountedUnitCost,
    savings_per_home: savingsPerHome,
    batch_total_savings: batchTotalSavings,
    is_price_indicative: true, // always true until real installer quotes replace this
    price_note:
      'Target discount pending real supplier quotes. Replace with actual prices after Tier B installer call.'
  };
}

/**
 * Slab-like savings breakdown per home:
 * Shows where the ₹ goes (good for judges / panchayat decision-makers).
 */
export function getComponentBreakdown(discountPct) {
  return Object.entries(UNIT_PRICES).map(([key, price]) => ({
    component: key,
    retail_price: price,
    group_price: Math.round(price * (1 - discountPct / 100)),
    saving: Math.round(price * (discountPct / 100))
  }));
}
