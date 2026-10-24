# MazhaVeyil: Kishan's Implementation Plan

**Module:** Koottam + Ward Atlas + Bill Scanner ("the movement")
**Owner:** Kishan · **Team:** Vishakh (engine), Savio (citizen app)
**Plan date:** 24 Oct 2026 · **Key deadline:** subsidy window and KSEB tariff table both end 31 Mar 2027

> Anything marked **VERIFY** or **PROPOSAL** is not confirmed. PROPOSAL items are my own additions and are not in the team idea file. Agree them with Vishakh and Savio before building.

---

## 0. How to use this file in Antigravity

1. Put this file at the root of your folder as `PLAN.md`. Tell the agent: *"Read PLAN.md. Work on one task at a time. Show a short plan first, then code, then run the tests for that task, then stop."*
2. Work **phase by phase** (section 10). Do not ask the agent to "build everything".
3. Copy the **Task cards** (section 11) one at a time as prompts.
4. Review every diff. Run the tests yourself. Never paste a real API key into a prompt, keys live only in `.env`.
5. Stay inside your folders (section 3). If you need a change in someone else's folder, ask them.

---

## 1. What I am building (plain words)

One homeowner asking an installer for a discount gets nothing. **25 homes in one ward** can get a group price. My module turns single homeowners into a ward movement:

| Part | What it does | Tier |
| --- | --- | --- |
| **Koottam service** | Records pledges to join a ward group, tracks progress toward the group-price target, blocks duplicates, opens installer quotes when the target is hit, closes expired campaigns | 1 |
| **Ward Atlas** | Live map for the panchayat: roof potential vs pledges per ward, KPI tiles, what-if slider, live counters | 1 |
| **Survey + seed data** | Real survey answers feed the Atlas and give a real number for Slide 2 | 1 |
| **Bill scanner service** | Photo of a KSEB bill goes in, units / amount / billing period come out. Image never stored, consumer number masked | 2 |
| **Grama Sabha print page** | One A4 page of the Atlas for a village meeting | 2 |
| **Installer quote page** | Installers see a ward's confirmed demand | 3 |

**Also mine:** Slides 6 and 7 on stage, Q&A on data, privacy and business, and the survey (proof-kit item 1).

**Hard rules**
- The Atlas shows **counts per ward only**. Never a name, phone number or exact house.
- `.env` is in `.gitignore` from the first commit. Commit `.env.example` with key **names** only.
- Gemini free tier inputs may be read by Google, so use **sample or masked bills only**.
- Never show a number you did not collect. Seeded or demo data is labelled as demo.

---

## 2. Tech stack (matches the team's all-JavaScript stack)

| Layer | Choice | Why |
| --- | --- | --- |
| Service | Node + Express | Team standard |
| Database | SQLite via `better-sqlite3` | One file, no hosting, fast |
| Live updates | WebSocket (`ws`) with auto-reconnect and a polling fallback | You already know WebSockets from VibeStream |
| Atlas UI | React + Vite + Tailwind + Leaflet | Same as Savio, so styles and map code can match |
| Validation | `zod` | Rejects bad input at the door |
| Uploads | `multer` with **memory storage** | Bill image never touches disk |
| Tests | `vitest` + `supertest` | Fast, works for service and UI |
| Bill AI | Gemini (Google AI Studio free tier), server-side only | Doc decision. **VERIFY** the current model name in AI Studio before you code |

---

## 3. Folder layout (only touch these)

```
/community            # my service (Node + Express)
  /src
    server.js
    db.js               # schema + migrations
    routes/             # pledges, campaigns, atlas, bill, survey, print
    services/           # campaignStatus.js, privacy.js, billScanner.js, wardSummary.js
    realtime.js         # WebSocket hub
  /samples              # frozen sample JSON (agreed on Day 0)
  /tests
  .env.example
/atlas                # my Atlas front end (React + Vite)
  /src
    /components         # WardMap, KpiTiles, WhatIfSlider, LiveTicker, Leaderboard
    /lib                # api.js, socket.js, kpi.js
    /fallback           # SVG map, table view, text view (see 8.4)
/scripts
  seedDemo.js           # fake-but-labelled demo data
  importSurvey.js       # survey CSV to ward counts
```

---

## 4. Day-0 contracts (freeze these with the team, about 3 hours together)

Two of the five hand-off files are mine: **pledge** and **ward summary**. The bill result is also mine. Everything below is a **draft to propose**. After freezing, only additive changes that all three agree to.

### 4.1 Pledge (Savio sends, I store)

Request: `POST /api/campaigns/:campaignId/pledges` with header `Idempotency-Key: <uuid>`

```json
{
  "ward_id": "KLM-W07",
  "roof_id": "osm:way/123456789",
  "kind": "solar",
  "strength": "firm",
  "est_kw": 2.5,
  "contact_consent": false
}
```

- `kind`: `solar` | `rain` | `both` (PROPOSAL, see 8.6)
- `strength`: `firm` | `maybe` (PROPOSAL, see 8.5)
- No name or phone. If `contact_consent` is true, a separate optional contact field is stored apart from pledges and never reaches the Atlas.

Response (201):

```json
{
  "pledge_id": "p_8f3a...",
  "campaign": { "id": "c_01", "pledged": 63, "target": 100, "status": "open", "days_left": 158 },
  "duplicate": false
}
```

Errors: `409 duplicate_pledge`, `409 campaign_closed`, `422 invalid_input`.

### 4.2 Ward summary (Vishakh's engine produces the potential, I merge pledges)

```json
{
  "ward_id": "KLM-W07",
  "name": "Ward 7",
  "panchayat": "Example Panchayat",
  "district": "Kollam",
  "centroid": { "lat": 8.95, "lng": 76.62 },
  "homes_estimated": 500,
  "roofs_mapped": 312,
  "potential_kw": 780.0,
  "avg_roof_score": 68,
  "pledged_homes": 63,
  "firm_homes": 41,
  "target_homes": 100,
  "campaign_status": "open",
  "data_quality": "survey+modelled",
  "updated_at": "2026-10-24T10:00:00+05:30"
}
```

`data_quality` is one of `real`, `survey+modelled`, `demo`. The Atlas shows a badge for anything that is not `real`.

### 4.3 Bill result (my scanner returns, Savio fills the units box, Vishakh cross-checks)

```json
{
  "units": 262,
  "amount": 2013.0,
  "billing_period_days": 60,
  "months_in_bill": 2,
  "consumer_no_masked": "XXXXXX4821",
  "confidence": "high",
  "warnings": [],
  "from_cache": false
}
```

`warnings` examples: `blurry_image`, `units_not_found`, `two_month_bill_check_slab`. **VERIFY** the two-month bill rule with Vishakh and KSEB's official calculator.

---

## 5. Database schema (SQLite)

```sql
CREATE TABLE wards (
  id TEXT PRIMARY KEY, name TEXT, panchayat TEXT, district TEXT,
  lat REAL, lng REAL, homes_estimated INTEGER
);

CREATE TABLE ward_potential (            -- loaded from Vishakh's ward summary file
  ward_id TEXT PRIMARY KEY REFERENCES wards(id),
  roofs_mapped INTEGER, potential_kw REAL, avg_roof_score INTEGER,
  data_quality TEXT, updated_at TEXT
);

CREATE TABLE campaigns (
  id TEXT PRIMARY KEY, ward_id TEXT REFERENCES wards(id),
  title TEXT, target_homes INTEGER, tiers_json TEXT,   -- e.g. [25,50,100]
  opens_at TEXT, closes_at TEXT,
  status TEXT CHECK (status IN ('open','target_reached','quotes_open','expired','closed'))
);

CREATE TABLE pledges (
  id TEXT PRIMARY KEY, campaign_id TEXT REFERENCES campaigns(id),
  ward_id TEXT, household_key TEXT,        -- sha256(roof_id + server salt), never the raw roof
  kind TEXT, strength TEXT, est_kw REAL,
  source TEXT CHECK (source IN ('app','survey','seed')),
  is_demo INTEGER DEFAULT 0,
  idem_key TEXT UNIQUE, created_at TEXT,
  UNIQUE (campaign_id, household_key)      -- duplicate pledge rejected here
);

CREATE TABLE contacts (                    -- optional, consented, never joined into Atlas queries
  pledge_id TEXT PRIMARY KEY REFERENCES pledges(id), phone TEXT, created_at TEXT
);

CREATE TABLE survey_responses (
  id TEXT PRIMARY KEY, ward_id TEXT, owns_house INTEGER, roof_type TEXT,
  monthly_units INTEGER, bill_is_two_month INTEGER, solar_status TEXT,
  barrier TEXT, knew_250_rule INTEGER, water_shortage INTEGER,
  water_coping TEXT, has_well INTEGER, well_dried INTEGER, rain_harvest INTEGER,
  would_join TEXT, would_use_malayalam INTEGER, consent INTEGER, created_at TEXT
);

CREATE TABLE events (                      -- feeds the live ticker (ward + type only)
  id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, ward_id TEXT, at TEXT
);

CREATE TABLE bill_cache (                  -- hash of image bytes, never the image
  image_hash TEXT PRIMARY KEY, result_json TEXT, created_at TEXT
);
```

---

## 6. API surface

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/campaigns/:id/pledges` | Join a ward group (idempotent) |
| GET | `/api/campaigns/:id` | Progress, tiers, days left |
| GET | `/api/atlas/summary` | All ward summaries (the Atlas data) |
| GET | `/api/wards/:id/summary` | One ward |
| WS | `/ws` | Live pledge events and counters |
| POST | `/api/bill/scan` | Bill photo to bill result (multipart, memory only) |
| POST | `/api/survey` | Save one survey response |
| GET | `/print/ward/:id` | Grama Sabha one-page print (HTML) |
| GET | `/api/health` | For the demo-day check |

### Campaign status rules (`services/campaignStatus.js`)

```
open ──(pledged >= target)──▶ target_reached ──(quotes enabled)──▶ quotes_open
open ──(now > closes_at)────▶ expired
any ──(admin)───────────────▶ closed
```

- A pledge to `expired` or `closed` returns `409 campaign_closed`.
- Status is computed in **one function** that both the pledge route and a scheduled check call. Do not duplicate this logic.

---

## 7. Atlas maths (keep it simple and checkable)

The what-if slider runs **in the browser** from the ward summary, so it is instant and works offline.

```
homes_joining      = homes_estimated × adoption%
kw_planned         = homes_joining × avg_kw_per_home
kwh_per_year       = kw_planned × yield_kwh_per_kw      // from Vishakh's engine, not guessed here
co2_tonnes         = kwh_per_year × grid_factor / 1000  // latest CEA value, rules file
peak_relief_kw     = homes_joining × (2 units ÷ 4–5 h)  // = about 0.4–0.5 kW per home (team doc maths)
```

**Sanity test from the team doc** (use as a unit test with loose tolerance): 500 homes at 25% = 125 homes, about 312 kW, about 0.43 GWh a year, about 300 t CO₂ a year, about 3.6 crore litres of roof rain. If your KPI code is far from these, check the inputs.

**Rule:** the Atlas never computes tariffs or solar yield itself. It reads Vishakh's numbers. If a number is missing, show "waiting for engine data", not a guess.

---

## 8. Unique additions (PROPOSAL, ordered by value for the demo)

These make the project different from "another solar calculator". Build only after Tier 1 passes its tests.

### 8.1 Resilient Atlas (best fit with your own background)
Panchayat offices and ward meetings often have weak internet. Borrow the idea from **Resilient Stream**: change the *format*, not just the quality, when the network gets bad.

| Level | Condition | What the Atlas shows |
| --- | --- | --- |
| 1 | Good network | Live map, ripples, slider |
| 2 | Slow network | Static SVG ward map with the last counts, updates every 30 s |
| 3 | Very bad network | Plain table: ward, pledged, target, % |
| 4 | Offline | Last saved snapshot plus a printable page and a one-line text summary to copy into WhatsApp |

Detect with a socket heartbeat and the browser's `navigator.onLine`. This is also your **demo-safety story**, which judges like, and it fits the doc's offline-demo rule. **VERIFY** it works with the saved-satellite-picture fallback Savio builds.

### 8.2 Pledge ripple + live ticker
Each new pledge creates a ripple on the ward and a ticker line: *"New pledge in Ward 7, 63 of 100."* Ward only, no identity. Cheap, and it is the moment judges remember.

### 8.3 Tiered group price bar
Show tiers (for example 25 / 50 / 100 homes) and light them up as pledges grow. Label them **target discounts, not promised prices** until the two installer calls give a real range (the doc's Track B rule). Replace the numbers after the installer calls.

### 8.4 Subsidy-deadline countdown on every campaign
"Subsidy window: about 5 months left (31 Mar 2027). Ward needs 37 more homes." This ties your module to the "why now" story. **VERIFY** the scheme end date has no extension before showing it as fact.

### 8.5 Pledge confidence layer
Count pledges as **firm** vs **maybe** vs **survey interest**. The panchayat then sees realistic demand, and installers trust it more. Show firm as a solid colour and maybe as hatched.

### 8.6 Rain Koottam (SDG 6, not only solar)
Let a ward pledge for **rain tanks and well recharge** too, not just solar. Bulk filter kits and tanks can also get a group price. This is what makes MazhaVeyil really about *both* rain and sun, and no competitor in the doc's table does it. It only needs the `kind` field you already have.

### 8.7 Ward evening-peak relief KPI
Show "evening peak relief: about X kW if this ward joins", using the team's 2 units over 4–5 hours maths from section 7. It is a number a power-sector judge understands immediately, and it links to the 6,200 MW hook.

### 8.8 Ward leaderboard
"Ward 7 is 62% to its group price." A little friendly competition between wards helps real adoption. Small and easy.

### 8.9 Privacy-by-design, shown on screen
- **Small-number masking:** if a ward has fewer than 5 pledges, show "fewer than 5" and no exact count or map dot. (Choose the threshold with the team.)
- A one-screen **Privacy card** in the Atlas: what we store, what we never store, bill images never saved.
This helps a lot in Q&A on data and privacy, which is your area.

### 8.10 Malayalam voice readout (links to your TTS research)
A button on the Atlas or print page that speaks the ward summary in Malayalam, useful for elderly Grama Sabha members. Plan:
- **Demo version:** pre-generated Malayalam audio clips for a few fixed sentences, or the browser's built-in speech if a Malayalam voice is available. **VERIFY** on the demo laptop, because Malayalam voice support differs by browser and device.
- **Talking point:** "We can swap in our own research model (ProTTS) for natural emphasis on the key number." Do not claim ProTTS is integrated unless it really is.
- This is the doc's Tier 3 "Malayalam voice". Agree ownership first.

### 8.11 Kudumbashree ambassador view
A very simple screen for a ward ambassador: pledged vs target and who to follow up (counts only, no names in the Atlas). The doc lists paid local work for Kudumbashree women as a social benefit but has no feature for it.

### 8.12 Honest-data badges
Every ward carries a badge: **Real**, **Survey + modelled** or **Demo**. Judges see you are careful with numbers. This directly follows the doc's rule never to show a number you did not collect.

---

## 9. Bill scanner details (Tier 2)

**Flow:** photo upload (memory only) → hash the bytes → check `bill_cache` → if hit, return cached result → if miss, call Gemini with a strict JSON prompt → validate with `zod` → mask the consumer number → return.

**Prompt rules for Gemini:** return **only JSON**, no preamble, no markdown fences. Fields: units consumed, bill amount, billing period start and end, consumer number. If a field is not visible, return `null`, never guess.

**After the model answers (in your code, not the model):**
- Strip markdown fences before `JSON.parse`, wrap in try/catch.
- Mask the consumer number to the last 4 digits.
- Add a `blurry_image` warning if units are `null` or confidence is low.
- Vishakh's engine separately cross-checks the amount against his tariff maths and warns if they differ by more than 20%. That is his code, so just return the fields he needs.

**Privacy:** `multer.memoryStorage()`, no `fs.writeFile` of the upload, no logging of the image or the full consumer number. Add a test that fails if any file appears in the project after a scan.

**Demo safety:** the demo bill's result is pre-cached so the scanner works with no internet. Typed units always work as the fallback, and Savio's screen should say so.

---

## 10. Build order (phases)

### Track A: 10+ days
| Day | Work | Done when |
| --- | --- | --- |
| **0** | Freeze contracts with the team (section 4). Repo access, `.gitignore`, `.env.example`. **Open the survey form.** Pick 3 demo areas with the team | Sample JSON files committed in `/community/samples` |
| **1** | DB schema, pledge route, duplicate rejection, idempotency key | Pledge tests pass |
| **2** | Campaign status logic, tiers, expiry check, ward summary merge | Status tests pass |
| **3** | WebSocket hub, event table, polling fallback | A pledge appears on a test client in under 2 s |
| **4** | Atlas map, KPI tiles, what-if slider on the sample ward file | Atlas works with fake live updates |
| **5** | Seed script (labelled demo data), survey import, ticker and ripple | Atlas looks alive with seed data |
| **6** | **Integration with Savio and Vishakh.** Fix mismatches in the shared samples, never by patching one module | Phone pledge lights up the Atlas |
| **7** | Bill scanner service, cache, masking, 5 sample bills | Scanner tests pass |
| **8** | Grama Sabha print page, tier bar, countdown, confidence layer, privacy card | Print page is clean on A4 |
| **9** | Resilient Atlas modes, polish, phone check, three timed run-throughs, re-check facts. **Code freeze** | No console errors |
| **10** | Rehearse, run-sheets, print leave-behind, charge devices | Demo runs on the hotspot |

### Track B: only 24–36 hours
Tier 1 only: pledge service, Atlas on precomputed data, live update. Typed units only (scanner if time is left). Show a clearly labelled **target** discount. Precompute the Atlas.

**Rules:** no Tier 2 until Tier 1 passes its tests. No Tier 3 after code freeze. Code freeze is 24 hours before the event.

---

## 11. Task cards (copy one at a time into Antigravity)

### Task 1: Project setup
> Read PLAN.md. Create `/community` with Node + Express and `better-sqlite3`. Add `.gitignore` (include `.env`, `*.sqlite`), `.env.example` with key names only (`GEMINI_API_KEY`, `HOUSEHOLD_SALT`, `PORT`), and a `/api/health` route. Add vitest and supertest. Do not add features yet. Show the plan first.

### Task 2: Schema and pledge route
> Using the schema in PLAN.md section 5, create `db.js` with migrations. Implement `POST /api/campaigns/:id/pledges` with zod validation, an `Idempotency-Key` header, `household_key = sha256(roof_id + HOUSEHOLD_SALT)`, and the UNIQUE constraint for duplicates. Return the response shapes from section 4.1. Write tests: valid pledge, duplicate rejected, same idempotency key returns the same result, closed campaign returns 409.

### Task 3: Campaign status
> Create `services/campaignStatus.js` with one function that computes status from pledged count, target and `closes_at` (rules in section 6). Use it from the pledge route and a periodic check. Tests: reaching the target gives `target_reached`, an expired campaign blocks pledges, status never goes backwards except by admin.

### Task 4: Live updates
> Add a WebSocket hub (`ws`) at `/ws`. After each accepted pledge, broadcast `{type:"pledge", ward_id, pledged, target}` only. No personal data. Write a test client that confirms the message arrives in under 2 seconds. Add a polling endpoint as a fallback.

### Task 5: Atlas
> In `/atlas`, create a React + Vite + Tailwind + Leaflet app. Load `/community/samples/ward-summary.sample.json`. Build WardMap, KpiTiles, WhatIfSlider (computed in the browser, formulas in PLAN.md section 7) and LiveTicker. Use the navy blue from the team template. Show "waiting for engine data" if a value is missing. Do not compute tariffs or solar yield.

### Task 6: Seed and survey
> Create `scripts/seedDemo.js` that generates demo pledges for a few wards, all marked `is_demo=1` and `data_quality: "demo"`. Create `scripts/importSurvey.js` that reads a CSV and writes ward-level counts. Never write names or phone numbers.

### Task 7: Bill scanner
> Implement `POST /api/bill/scan` per PLAN.md section 9. Use `multer.memoryStorage()`. Hash the bytes, check `bill_cache`, call Gemini server-side with a JSON-only prompt, validate with zod, mask the consumer number, return the 4.3 shape. Add a test that no file is written to disk during a scan.

### Task 8: Print page
> Add `GET /print/ward/:id` returning a clean one-page A4 HTML: ward name, pledged vs target, tier bar, subsidy countdown, KPI numbers, QR code to the join page. Counts only. Print stylesheet with no navigation.

### Task 9: Resilient modes
> Implement the four Atlas display levels in PLAN.md section 8.1. Use a socket heartbeat and `navigator.onLine`. Add a manual toggle for testing each level.

---

## 12. Tests I own

**Community service**
- Duplicate pledge is rejected (same roof, same campaign)
- Same `Idempotency-Key` returns the same result without a second pledge
- Reaching the target changes status to `target_reached` and opens quotes
- Expired campaign blocks new pledges
- Invalid input returns 422
- Pledge response never contains personal data
- Small-number masking hides counts below the chosen threshold

**Atlas**
- KPI maths close to the team-doc sanity numbers (section 7)
- Slider at 0% and 100% behaves sensibly
- Works on the sample ward file with fake live updates
- Missing data shows "waiting for engine data", not zero
- Each Resilient level renders

**Bill scanner**
- Right units on all 5 sample bills
- Warning on blurry images
- Demo bill works offline from the cache
- Consumer number is masked in every response and log
- No file is written during a scan

**Done when:** a pledge from a phone updates the Atlas in **under 2 seconds**.

---

## 13. Proof-kit tasks that are mine

**Survey** (under 3 minutes, aim for 100 answers from 10+ wards). Start with the consent line: *"Your answers are used only for this hackathon project. Ward-level counts only."*

1. Your panchayat or municipality and ward number.
2. Do you own the house? Roof type: flat concrete / sloped tile or sheet / other.
3. Average electricity units a month (say if the bill is for two months).
4. Do you have solar now, plan to, or not?
5. If not, what stops you? Cost / roof / paperwork / trust in installers / did not know.
6. Did you know that above 250 units a month, all units move to one higher rate? Yes / No.
7. Did your household face a water shortage this year? How did you manage? Tanker / bought water / well.
8. Do you have a well? Did it dry this year? Any rain harvesting at home?
9. Would you join a ward group to get a lower price? Yes / Maybe / No.
10. Would you use this in Malayalam? Phone type. *(Optional, separate box: contact for a pilot, with consent.)*

**Slide-2 line to aim for (real numbers only):** "[__] of [__] homes we asked had a water problem last summer. [__]% did not know the 250-unit rule. [__]% would join a ward group."

---

## 14. My slides and talking points

**Slide 6, Sustainability Impact (25 s)**
SDG 7, 6, 11, 13, one number each, from the engine and Atlas: kWh, litres, wards, tonnes CO₂. Add the peak-relief line (8.7) if it is built.

**Slide 7, Business Model (30 s)**
- Homes: free
- Installers: success fee about ₹1,500–2,500 per installed home
- Panchayats: about ₹25,000 a year
- Banks and CSR: referrals and grants
- Pilot about ₹1.5–2 lakh, one ward pays for its own pilot
- Break-even about 100 installed homes

These are the team doc's figures. **VERIFY** the installer fee after Vishakh's two installer calls and the panchayat figure after Savio's ward-member talk.

**Q&A prep (data, privacy, business)**
| Likely question | Short answer |
| --- | --- |
| Where does the data come from? | Open data (NASA POWER, Open-Meteo, OpenStreetMap, Open Buildings), our survey, and the user's own input. Each ward shows a Real / Survey+modelled / Demo badge |
| What about privacy? | Ward-level counts only. No names, phones or exact houses on the Atlas. Bill images are never stored and the consumer number is masked |
| Is the group price real? | Currently a target. We replace it with a range from installer quotes |
| How does it make money? | Installer success fee, panchayat subscription, referrals and grants. One ward pays for its pilot |
| What if the internet is bad? | Resilient Atlas drops to a static map, a table, then an offline printable page |
| Why would a panchayat use it? | It gives them a ward plan and a Grama Sabha page without any survey work of their own |

---

## 15. Demo-day checklist (my part)

- [ ] Service starts with one command and `/api/health` is green
- [ ] Production build of the Atlas served from Node
- [ ] Hotspot joined by laptop, phone and the second screen
- [ ] Seed data loaded and every demo ward shows a Demo or Survey badge
- [ ] A live pledge from the phone updates the Atlas in under 2 s (test 5 times)
- [ ] Demo bill cached and scanner works with Wi-Fi off
- [ ] My own Gemini key is on the demo laptop, in `.env`, not in the repo
- [ ] Atlas fallback levels tested
- [ ] Print page tested on A4
- [ ] Malayalam text renders offline (self-hosted font)
- [ ] Slides 6 and 7 rehearsed to time

---

## 16. Risks and fallbacks

| Risk | Fallback |
| --- | --- |
| Venue Wi-Fi blocks device-to-device traffic | Use our own hotspot, as in the team doc |
| WebSocket fails | Polling every 2 s, same Atlas screen |
| Gemini fails or hits a limit | Cached demo bill, typed units always work |
| Survey gets fewer than 100 answers | Show the real count honestly (for example "42 homes across 6 wards") |
| Someone is overloaded | Cut Tier 3 first, then the Grama Sabha print. Vishakh can write the scanner's checks against sample responses |
| An integration mismatch appears | Fix it in the shared sample files, never by patching one module |

---

## 17. Open questions to settle on Day 0

1. Final names and formats of the **pledge**, **ward summary** and **bill result** files (section 4).
2. The three demo areas and their ward IDs.
3. Tier sizes for the group price (25 / 50 / 100?) and the small-number masking threshold.
4. Who owns the **Malayalam voice** idea, if the team wants it.
5. Whether `kind: rain` pledges (8.6) are accepted by Savio's app and Vishakh's engine.
6. How the two-month bill rule works (ask Vishakh to confirm with KSEB's official calculator).
7. Whether the subsidy window has been extended past 31 Mar 2027.
