import { initDatabase, getDb, closeDatabase } from '../community/src/db.js';
import { hashHousehold } from '../community/src/services/privacy.js';

// 3 Demo Areas agreed: Host Campus (Kollam), One Village Ward (Pozhiyoor/Kulathoor), One Town Ward (Alappuzha/Kottayam)
const DEMO_WARDS = [
  {
    id: 'KLM-W07',
    name: 'Ward 7 (Campus Enclave)',
    panchayat: 'Kottamkara Panchayat',
    district: 'Kollam',
    lat: 8.9502,
    lng: 76.6214,
    homes_estimated: 500,
    roofs_mapped: 312,
    potential_kw: 780.0,
    avg_roof_score: 68,
    target_homes: 100,
    pledge_count: 63,
    firm_count: 41
  },
  {
    id: 'TVM-P04',
    name: 'Ward 4 (Pozhiyoor Coastal)',
    panchayat: 'Kulathoor Panchayat',
    district: 'Thiruvananthapuram',
    lat: 8.3056,
    lng: 77.0734,
    homes_estimated: 420,
    roofs_mapped: 245,
    potential_kw: 610.0,
    avg_roof_score: 59,
    target_homes: 80,
    pledge_count: 72,
    firm_count: 55
  },
  {
    id: 'ALP-K12',
    name: 'Ward 12 (Kuttanad Canal)',
    panchayat: 'Champakulam Panchayat',
    district: 'Alappuzha',
    lat: 9.4042,
    lng: 76.4258,
    homes_estimated: 380,
    roofs_mapped: 210,
    potential_kw: 520.0,
    avg_roof_score: 64,
    target_homes: 75,
    pledge_count: 24,
    firm_count: 14
  }
];

export function seedDemoData() {
  const db = getDb();
  console.log('Seeding demo data for MazhaVeyil...');

  for (const w of DEMO_WARDS) {
    // 1. Insert or replace ward
    db.prepare(`
      INSERT OR REPLACE INTO wards (id, name, panchayat, district, lat, lng, homes_estimated)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(w.id, w.name, w.panchayat, w.district, w.lat, w.lng, w.homes_estimated);

    // 2. Insert or replace potential (strictly labelled 'demo')
    db.prepare(`
      INSERT OR REPLACE INTO ward_potential (
        ward_id, roofs_mapped, potential_kw, avg_roof_score, data_quality, updated_at
      ) VALUES (?, ?, ?, ?, 'demo', ?)
    `).run(w.id, w.roofs_mapped, w.potential_kw, w.avg_roof_score, new Date().toISOString());

    // 3. Campaign
    const campaignId = `c_${w.id.toLowerCase().replace('-', '_')}`;
    db.prepare(`
      INSERT OR REPLACE INTO campaigns (
        id, ward_id, title, target_homes, tiers_json, opens_at, closes_at, status
      ) VALUES (?, ?, ?, ?, '[25, 50, 100]', '2026-10-01T00:00:00Z', '2027-03-31T23:59:59Z', 'open')
    `).run(campaignId, w.id, `${w.name} Solar & Rain Koottam`, w.target_homes);

    // 4. Seed demo pledges
    for (let i = 1; i <= w.pledge_count; i++) {
      const isFirm = i <= w.firm_count;
      const roofId = `demo:${w.id}:roof_${i}`;
      const householdKey = hashHousehold(roofId);
      const pledgeId = `p_seed_${w.id}_${i}`;

      // Vary kind across solar, both, and rain so Rain Koottam activates
      const kind = (i % 3 === 0) ? 'both' : (i % 5 === 0) ? 'rain' : 'solar';

      try {
        db.prepare(`
          INSERT OR REPLACE INTO pledges (
            id, campaign_id, ward_id, household_key, kind, strength,
            est_kw, source, is_demo, idem_key, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 2.5, 'seed', 1, ?, ?)
        `).run(
          pledgeId,
          campaignId,
          w.id,
          householdKey,
          kind,
          isFirm ? 'firm' : 'maybe',
          `seed_idem_${pledgeId}`,
          new Date(Date.now() - (w.pledge_count - i) * 3600000).toISOString()
        );
      } catch {
        // Ignore duplicate in seed
      }
    }
  }

  console.log(`Successfully seeded ${DEMO_WARDS.length} demo wards with labelled demo pledges.`);
}

if (process.argv[1] && process.argv[1].endsWith('seedDemo.js')) {
  initDatabase();
  seedDemoData();
  closeDatabase();
}
