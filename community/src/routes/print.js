import { Router } from 'express';
import { getDb } from '../db.js';
import { calculateDaysLeft } from '../services/campaignStatus.js';
import { computeRainGroupPrice, INDIVIDUAL_TOTAL } from '../services/rainKoottam.js';

export const printRouter = Router();

function handlePrintRequest(req, res) {
  const db = getDb();
  let wardId = req.params.id;

  // If no ward ID provided in URL, default to first ward or KLM-W07
  if (!wardId || wardId === 'undefined') {
    const firstWard = db.prepare('SELECT id FROM wards LIMIT 1').get();
    wardId = firstWard ? firstWard.id : 'KLM-W07';
  }

  const ward = db.prepare(`
    SELECT
      w.*,
      wp.roofs_mapped,
      wp.potential_kw,
      wp.avg_roof_score,
      wp.data_quality,
      c.id AS campaign_id,
      c.title AS campaign_title,
      c.target_homes,
      c.closes_at
    FROM wards w
    LEFT JOIN ward_potential wp ON w.id = wp.ward_id
    LEFT JOIN campaigns c ON w.id = c.ward_id
    WHERE w.id = ?
  `).get(wardId);

  if (!ward) {
    return res.status(404).send(`Ward ${wardId} not found`);
  }

  const counts = db.prepare(`
    SELECT
      COUNT(*) AS total_pledged,
      SUM(CASE WHEN strength = 'firm' THEN 1 ELSE 0 END) AS firm_pledged,
      SUM(CASE WHEN kind IN ('rain', 'both') THEN 1 ELSE 0 END) AS rain_pledged
    FROM pledges
    WHERE ward_id = ?
  `).get(wardId);

  const pledged = counts ? (counts.total_pledged || 0) : 0;
  const firm = counts ? (counts.firm_pledged || 0) : 0;
  const rainPledged = counts ? (counts.rain_pledged || 0) : 0;
  const target = ward.target_homes || 100;
  const daysLeft = ward.closes_at ? calculateDaysLeft(ward.closes_at) : 158;
  const percent = Math.min(100, Math.round((pledged / target) * 100));

  // Rain Koottam group pricing
  const rainPricing = computeRainGroupPrice(rainPledged);

  // Ward KPIs from PLAN.md section 7
  const estKw = Math.round(pledged * 2.5);
  const yearlyKwh = Math.round(estKw * 1380);
  const co2Tonnes = Math.round((yearlyKwh * 0.75) / 1000);
  const rainLitresCrores = ((pledged * 120 * 2500 * 0.8) / 10000000).toFixed(2);
  const peakReliefKw = Math.round(pledged * 0.45);


  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Grama Sabha Report - ${ward.name}</title>
  <style>
    @page { size: A4 portrait; margin: 1.2cm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.4;
      margin: 0;
      padding: 0;
    }
    .header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .title h1 {
      margin: 0 0 4px 0;
      font-size: 22px;
      color: #0369a1;
    }
    .title h2 {
      margin: 0;
      font-size: 14px;
      color: #475569;
      font-weight: 500;
    }
    .badge {
      background: #e0f2fe;
      color: #0369a1;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .progress-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .progress-bar-wrap {
      background: #e2e8f0;
      border-radius: 9999px;
      height: 16px;
      overflow: hidden;
      margin: 10px 0;
    }
    .progress-bar-fill {
      background: linear-gradient(90deg, #0284c7, #10b981);
      height: 100%;
      width: ${percent}%;
      transition: width 0.3s;
    }
    .tier-labels {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #64748b;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
      background: #ffffff;
    }
    .kpi-val {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 4px;
    }
    .kpi-lbl {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .callout {
      border-left: 4px solid #f59e0b;
      background: #fffbeb;
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
      font-size: 12px;
      margin-bottom: 20px;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #64748b;
    }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">
      <h1>മഴവെയിൽ വാർഡ് കർമ്മപദ്ധതി (MazhaVeyil Action Plan)</h1>
      <h2>${ward.name} · ${ward.panchayat}, ${ward.district}</h2>
    </div>
    <div>
      <span class="badge">${ward.data_quality} verified</span>
    </div>
  </div>

  <div class="progress-box">
    <div style="display: flex; justify-content: space-between; align-items: baseline;">
      <strong style="font-size: 15px;">Koottam Group Price Progress</strong>
      <span style="font-size: 14px; color: #0284c7; font-weight: 700;">${pledged} of ${target} Homes (${percent}%)</span>
    </div>
    <div class="progress-bar-wrap">
      <div class="progress-bar-fill"></div>
    </div>
    <div class="tier-labels">
      <span>Tier 1 (25 Homes - 5% discount)</span>
      <span>Tier 2 (50 Homes - 10% discount)</span>
      <span>Tier 3 (100 Homes - 15% discount)</span>
    </div>
  </div>

  <div class="callout">
    <strong>⏰ PM Surya Ghar Subsidy Window:</strong> Approximately <strong>${daysLeft} days remaining</strong> (Deadline: 31 March 2027). Securing group pledges unlocks bulk installer discounts before tariff revisions.
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-lbl">Current Group Solar</div>
      <div class="kpi-val">${estKw} kW</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">Yearly Clean Power</div>
      <div class="kpi-val">${yearlyKwh.toLocaleString()} kWh</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">Rainwater Harvest</div>
      <div class="kpi-val">${rainLitresCrores} Cr L</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">CO₂ Emissions Avoided</div>
      <div class="kpi-val">${co2Tonnes} Tonnes/yr</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">Evening Peak Relief</div>
      <div class="kpi-val">${peakReliefKw} kW</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-lbl">Firm Commitments</div>
      <div class="kpi-val">${firm} Homes</div>
    </div>
  </div>

  <!-- Rain Koottam Group Pricing Section -->
  <div style="border: 1px solid #0891b2; border-radius: 6px; padding: 12px; margin-bottom: 14px; font-size: 12px; background: #f0fdf4;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <strong style="color: #0e7490; font-size: 13px;">💧 മഴ കൂട്ടം — Rain Koottam: Filter Kit Group Pricing</strong>
      ${rainPricing.active_tier
        ? `<span style="background: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700;">${rainPricing.discount_pct}% Group Discount UNLOCKED</span>`
        : `<span style="background: #fefce8; color: #854d0e; padding: 3px 8px; border-radius: 4px;">${rainPricing.homes_until_next_tier} homes needed to unlock first discount</span>`
      }
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; text-align: center;">
      <div><div style="font-size: 16px; font-weight: 800; color: #0e7490;">${rainPledged}</div><div style="color: #64748b;">Rain Pledges</div></div>
      <div><div style="font-size: 16px; font-weight: 800; color: #0e7490;">₹${INDIVIDUAL_TOTAL.toLocaleString()}</div><div style="color: #64748b;">Individual Price</div></div>
      <div><div style="font-size: 16px; font-weight: 800; color: #166534;">₹${rainPricing.discounted_unit_cost.toLocaleString()}</div><div style="color: #64748b;">Group Price/Home</div></div>
      <div><div style="font-size: 16px; font-weight: 800; color: #c2410c;">₹${rainPricing.savings_per_home.toLocaleString()}</div><div style="color: #64748b;">Saving/Home</div></div>
    </div>
    <p style="margin: 8px 0 0; color: #64748b; font-size: 11px;">
      Includes: gravity filter kit (sand + charcoal) + 1,000 L tank + well recharge ring + installation. Mazhapolima method. Safe for washing, gardening, toilets — treat before drinking.
      <strong style="color: #b45309"> Target prices — pending real supplier quotes.</strong>
    </p>
  </div>

  <!-- KSEB Bill Scanner Section -->
  <div style="border: 1px solid #0284c7; border-radius: 6px; padding: 12px; margin-bottom: 14px; font-size: 12px; background: #f0f9ff;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
      <strong style="color: #0369a1;">📷 KSEB ബിൽ സ്കാനർ — Instant Bill Scan & Tariff Cliff Check</strong>
      <span style="background: #e0f2fe; color: #0284c7; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px;">Tier 2 Privacy Verified</span>
    </div>
    <p style="margin: 4px 0 0; color: #0c4a6e; line-height: 1.5;">
      Snap your 2-month KSEB electricity bill on your smartphone. The scanner automatically detects units, analyzes whether you are paying the steep 250-unit non-telescopic cliff surcharge, masks your consumer number for total privacy, and sizes your exact solar needs to knock your bill down to zero.
    </p>
    <p style="margin: 6px 0 0; color: #0284c7; font-size: 11px;">
      🔒 <strong>Privacy Guarantee:</strong> Bill photos are processed in memory only — never stored on disk or server. Consumer numbers are masked (e.g., XXXXXX4821).
    </p>
  </div>

  <div style="border: 1px dashed #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 12px;">
    <strong>Grama Sabha Action Resolution:</strong>
    <p style="margin: 6px 0 0 0; color: #334155;">
      Resolved to support the Ward Koottam initiative to aggregate household demand for rooftop solar and rainwater harvesting filter kits. Authorized Kudumbashree ambassadors to facilitate home energy scans and group installer price discovery.
    </p>
  </div>


  <div class="footer">
    <div>
      <strong>Privacy Guard:</strong> Ward aggregates only. No individual names, phone numbers, or exact addresses are stored or printed.
    </div>
    <div>
      MazhaVeyil · NEXATHON 2026
    </div>
  </div>
</body>
</html>`;

  res.send(html);
}

printRouter.get('/', handlePrintRequest);
printRouter.get('/ward/:id', handlePrintRequest);
printRouter.get('/:id', handlePrintRequest);

