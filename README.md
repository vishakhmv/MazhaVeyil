# MazhaVeyil (മഴവെയിൽ)
### Ward Decarbonization & Water Security Atlas
> **"Every roof gets a score. Every ward gets a plan."**  
> *NEXATHON Sustainability Hackathon 2026 · Module: Koottam + Ward Atlas + Bill Scanner*

[![Vitest Tests](https://img.shields.io/badge/Vitest-27%2F27%20Passed-10b981?style=flat-square&logo=vitest)](https://github.com/vishakhmv/MazhaVeyil)
[![License: MIT](https://img.shields.io/badge/License-MIT-0284c7?style=flat-square)](https://opensource.org/licenses/MIT)
[![SDGs](https://img.shields.io/badge/UN%20SDGs-6%20%7C%207%20%7C%2011%20%7C%2013-059669?style=flat-square)](https://sdgs.un.org)
[![Branch](https://img.shields.io/badge/Branch-community-d97706?style=flat-square)](https://github.com/vishakhmv/MazhaVeyil/tree/community)

---

## 🎯 What This Project Is

MazhaVeyil is a **Panchayat Demand Aggregation Platform** for Kerala. It aggregates individual rooftop demand across village wards so neighbors can bulk-purchase solar installations and rainwater harvesting filter kits at wholesale discounts, while giving the local Grama Panchayat a live planning map to eliminate paper surveys.

---

## ✅ Part 1: What Has Been Done (Core Deliverables)

All planned tasks from `PLAN.md` (Tasks 1 through 9) have been fully built, integrated, and verified with **27/27 automated tests passing**:

| Core Module | Description & Deliverables | Status |
| :--- | :--- | :---: |
| **Koottam Backend Service (`/community`)** | • Idempotent pledge route (`POST /api/campaigns/:id/pledges`) with salted `sha256(roof_id + salt)` hashing.<br>• Automated campaign state machine (`open` → `target_reached` → `quotes_open` → `expired`).<br>• Real-time WebSocket hub on `/ws` with automated HTTP polling fallback. | **Done** |
| **Ward Atlas Spatial Map (`/atlas`)** | • Interactive spatial GIS map rendered with Leaflet.<br>• Live pledge ripple animations and real-time activity ticker.<br>• Dynamic **What-If Adoption Slider** running in-browser with zero latency.<br>• Ward Leaderboard and honest data badges (`demo` / `survey+modelled`). | **Done** |
| **Resilient Display Hierarchy** | • 4 network degradation levels for rural Panchayat offices: **L1 (Spatial Map)**, **L2 (Static SVG)**, **L3 (Data Table)**, and **L4 (Offline Card)**. | **Done** |
| **KSEB Bill Scanner (`/api/bill/scan`)** | • In-memory file upload (`multer.memoryStorage()`) ensuring bill images **never touch disk**.<br>• Permanent consumer number masking (`XXXXXX4821`).<br>• Gemini 1.5 Flash Vision parsing with offline SHA-256 caching. | **Done** |
| **A4 Grama Sabha Action Sheet** | • Printable single-page A4 document generated via `/print/ward/:id` formatted with clean print CSS for village council meetings. | **Done** |
| **Preloaded Kerala Pilot Wards** | • Seeded with 3 representative pilot wards: **Ward 7 (Kollam Campus)**, **Ward 4 (Pozhiyoor Coastal)**, and **Ward 12 (Kuttanad Canal)**. | **Done** |

---

## 🚀 Part 2: Extra Features & Logic Added (Beyond the Original Plan)

The following high-impact features were engineered beyond the basic `.md` specifications to solve real Kerala energy tariffs, water shortages, and demo-day constraints:

### 1. KSEB 250-Unit "Tariff Cliff" Penalty Analyzer
* **The Problem:** In Kerala (LT-1A tariff), using up to 250 units/month gives subsidized slab rates. Crossing by even 1 unit (251 units) revokes all subsidies and charges every unit at flat commercial rates (**+₹261.75/month instant penalty**).
* **What Was Added:** An automated tariff-cliff detector that flags near-cliff danger zones and calculates non-linear solar savings (`Bill Before − Bill After`), proving how solar saves hundreds of rupees in penalty avoidance alone.

### 2. 5 Offline-Safe Pre-Calibrated Bill Profiles
* **What Was Added:** A 1-click sample bill selector in the UI covering 5 representative Kerala households:
  1. *Typical Home (262 units / ₹2,013)*
  2. *Cliff Danger Zone (248 units/mo — 2 units away from the 250-unit penalty cliff)*
  3. *Above Cliff Surcharge (320 units/mo — non-telescopic penalty active)*
  4. *Heavy Usage Time-of-Day (540 units/mo — 125% peak surcharge active)*
  5. *Lifeline Cottage (42 units/mo — subsidized rural baseline)*
* **Demo Guarantee:** Allows testing the full scanner and solar sizing **100% offline without needing Wi-Fi or a real bill photo**.

### 3. Rain Koottam Bulk Filter Pricing Engine (Thrissur Mazhapolima Method)
* **What Was Added:** A complete bulk-discount service ([community/src/services/rainKoottam.js](file:///c:/mazhaveyil/community/src/services/rainKoottam.js)) with 3 unlockable tiers:
  * **Tier 1 (10 homes):** 8% off (*Village Starter*)
  * **Tier 2 (25 homes):** 12% off (*Pilot Batch — saves ₹2,520/home*)
  * **Tier 3 (50 homes):** 18% off (*Ward Full Batch*)
* Includes an itemized component breakdown (sand + charcoal gravity filter, 1,000L tank, well recharge rings, installation labour).

### 4. "Drought Security Delay Index" (SDG 6)
* **What Was Added:** Mathematical modeling connecting district rainfall and roof area to aquifer infiltration:
  * Calculates the **exact extra days (+35 to +65 days)** a household's open dug well stays functional into the summer before drying out.
  * Solves the real crisis seen in places like Pozhiyoor where families were limited to 2–3 pots of tanker water.

### 5. Water Tanker Truck Displacement & Fuel Emissions Model
* **What Was Added:** Translates rainwater harvested into avoided 6,000-litre commercial water tankers:
  * Computes total **community money saved** (at ₹1,200 per tanker trip).
  * Computes **diesel transport CO₂ eliminated** (14.2 kg CO₂e per tanker round-trip).

### 6. "Veyil Samayam" (Solar Time) 6,200 MW Peak Shaving Engine (SDG 7)
* **What Was Added:** A grid simulator that models shifting domestic pumps, motors, and EV charging from the 6:00 PM – 11:00 PM evening peak to 10:00 AM – 2:00 PM solar hours.
* Calculates instantaneous **kW shaved off the local 11kV substation feeder** and avoided high-cost spot-market power purchases for KSEB.

### 7. Kudumbashree Green Livelihoods & Local Wealth Retention (SDG 11 & 8)
* **What Was Added:** Calculates the number of local Kudumbashree micro-enterprise units supported (filter servicing, quarterly water testing, solar maintenance) and proves that **78% of installation capital stays inside the Panchayat** instead of being exported to external coal power.

### 8. Official Grama Sabha Resolution Draft Generator
* **What Was Added:** A dynamic modal that takes the ward's real metrics and generates an **official village council resolution in formal Malayalam (ഗ്രാമസഭാ കർമ്മപദ്ധതി പ്രമേയം)** with a 1-click A4 export/print button for ward meetings.

### 9. Institutional Kerala Civic Design Overhaul
* **What Was Added:** Stripped out generic "AI-hackathon" tropes (neon glows, cliché purple/cyan gradients, cartoonish emojis, jumping numbers).
* Replaced with a **Government of Kerala LSGD & ANERT standard aesthetic**:
  * Official State & Local Self Government Department institutional topbar.
  * **Tabular monospace numerals (`tabular-nums`)** so figures stay stable on screen.
  * Live telemetry badges: **KSEB 11kV Grid Status (Normal · Peak Shaving Active)** and **PM Surya Ghar ₹78,000 Window (158 Days Left)**.


### 10. Universal Print Sheet Routing & Proxy
* **What Was Added:** Smart fallback routing across ports `3001` and `5173` that handles `/`, `/print`, `/print/:id`, and `/print/ward/:id` with zero `Cannot GET` errors.

### 11. Rooftop AI Photo Upload & Solar Estimator
* **What Was Added:** A dedicated **Rooftop AI** tab where a household can photograph their roof and get an instant AI-powered assessment:
  * Drag-and-drop or click-to-upload roof image (JPG, PNG, WebP).
  * Detects **usable roof area (m²)**, obstructions (water tanks, AC units), and **shadow risk** with confidence score.
  * Selectable roof types: Flat RCC, Sloped Mangalore Tile, Sloped Metal Sheet, Thatched/Asbestos — each with real-world panel efficiency factors.
  * Calculates **system size (kW), panel count, monthly generation (kWh), monthly savings (₹), payback period (years), and CO₂ avoided (kg/year)**.
  * Warns if solar adoption brings the household **below the 250-unit KSEB tariff cliff** for maximum savings.
  * Photo is processed in-memory — **never stored on server** (privacy-first design).
  * Ends with a **"Pledge My Rooftop"** CTA that feeds directly into the Koottam campaign.

### 12. Live Ward Heatmap Toggle
* **What Was Added:** A **🔥 Heatmap ON/OFF toggle button** on the Leaflet Spatial Map:
  * When ON, overlays a `leaflet.heat` density layer showing pledge concentration across wards.
  * Colour gradient: blue (low density) → amber → red (high density) with a visible legend.
  * Ward circles stay clickable beneath the heatmap for detailed inspection.
  * Allows Panchayat planners to instantly identify which geographic areas have the highest demand without reading a table.

### 13. Neighbourhood Challenge — Live Ward vs Ward Competition
* **What Was Added:** A **Neighbourhood Challenge** tab that turns pledge collection into a live competitive leaderboard:
  * Wards ranked by pledge count with **🥇🥈🥉 medals** for top 3.
  * Per-ward progress bars showing percentage to the target threshold.
  * **Competitive motivational line** for the selected ward: *"12 more pledges to overtake Ward 3 — don't let them win!"*
  * **Live flash animation** (green ⚡) when a new WebSocket pledge event arrives for any ward.
  * Aggregate footer showing **total pledges, total target, and combined kW potential** across all wards.

---

## 🛠️ Tech Stack Used

* **Frontend:** React 18, Vite, Leaflet (`react-leaflet`), Vanilla CSS (custom design tokens & CSS variables), Lucide React.
* **Backend:** Node.js (ES Modules), Express.js, WebSockets (`ws`), Zod, Multer (`memoryStorage`), Node Crypto (`SHA-256`).
* **Database:** SQLite via `better-sqlite3` (in-process, fast, portable, zero cloud dependency).
* **AI & Vision:** Google Gemini 1.5 Flash (Vision API via Google AI Studio).
* **Testing:** Vitest + Supertest (**27/27 unit and integration tests passing**).
* **Standards Applied:** KSERC 2025–2027 Domestic Tariff, Central Electricity Authority (CEA) Baseline Factor (0.716 kg CO₂e/kWh), IMD Kerala District Rainfall Normals.

---

## 🏃 Quick Start Guide

### 1. Installation
```bash
git clone -b community https://github.com/vishakhmv/MazhaVeyil.git
cd MazhaVeyil

# Install backend dependencies
cd community
npm install

# Install frontend dependencies
cd ../atlas
npm install
```

### 2. Run Automated Tests
```bash
cd ../community
npm test
# 27 passed (100%)
```

### 3. Seed Demo Data
```bash
cd ..
node scripts/seedDemo.js
```

### 4. Start Local Servers
* **Backend:** `cd community && node src/server.js` (Listening on `http://localhost:3001`)
* **Frontend:** `cd atlas && npm run dev` (Listening on `http://localhost:5173`)

---

## 👥 Module Ownership (Team MazhaVeyil)
* **Kishan (This Branch):** Koottam Service · Ward Atlas · Bill Scanner · SDG Sustainability Engine
* **Vishakh:** Solar Yield Potential & Open Data Ingestion Engine
* **Savio:** Citizen Mobile Web Application
