# MazhaVeyil (മഴവെയിൽ)

**Every roof gets a score. Every ward gets a plan.**
*Your roof. Your light. Your water.* (നിങ്ങളുടെ മേൽക്കൂര, നിങ്ങളുടെ വെളിച്ചം, നിങ്ങളുടെ വെള്ളം)

*Mazha* (rain) and *Veyil* (sunshine) are the two things every Kerala roof receives. MazhaVeyil is a Malayalam-first website: click your roof on a map and see the sun and rain it gets, what KSEB's bill rules really cost you, and the best hours to run your motor. Neighbours then join their ward's **Koottam** for a group price, and the panchayat sees every roof's potential on a live **Ward Atlas**.

Built by **Vishakh, Savio and Kishan** for the NEXATHON Sustainability Hackathon. SDG 7 Clean energy · SDG 6 Clean water · SDG 11 Sustainable communities · SDG 13 Climate action.

| | |
|---|---|
| ![Home](docs/screenshots/home.png) | ![Roof report](docs/screenshots/find.png) |
| ![Cliff meter](docs/screenshots/cliff.png) | ![Ward Atlas](docs/screenshots/atlas.png) |

## Why

April 2026: Kerala's power demand hit a record (about 6,195 MW) and KSEB had to restrict feeders for up to 30 minutes between 6 pm and midnight. The same month, homes in the six coastal wards of Pozhiyoor got two or three pots of water per tanker delivery. Then the 2026 monsoon fell 28% short. Solar homes use only about 36% of what they make, and KSEB says the evening "banking" cost it over ₹500 crore in 2024–25. Yet every roof gets strong sun and about 3,000 mm of rain a year.

## What it does

| Tool | What you get |
|---|---|
| **Your roof** | Pick a mapped building, draw your roof or type its size. A live report: **Roof Score** (two rings: power cover and water cover), plain-language insights, three solar sizes (smaller, recommended, larger) with subsidy, payback and 25-year benefit, month-by-month bills before and after, rain you can catch and the right tank size, and an "Assumptions and sources" drawer. Prints cleanly. |
| **Cliff meter** | KSEB bills slab by slab up to 250 units a month; one unit above, every unit moves to one higher flat rate. Drag to see exactly where you stand (the five cliffs, ₹262 for the first unit over 250) and how solar brings you back under. Runs offline. |
| **Scan bill** | A photo is read by an AI, then **our own tariff maths checks the amount**. Sample bills and typed numbers always work. |
| **Veyil Samayam** | The best hours to run the motor, washing machine, iron and EV charger from the sun forecast, with rupees for homes on KSEB's time-of-day tariff. |
| **Today** | Rain your roof is expected to catch and power it could make today, from the saved forecast. |
| **Koottam** | Join your ward's campaign, watch the live counter, see the rain-harvest group-price tiers (labelled targets, never promised prices). |
| **Ward Atlas** | Ward map shaded by pledges, the typical roof's score, an adoption slider ("what if 25% of homes join?") with SDG numbers, and the Kerala ceiling estimate. Grama Sabha print page. |

English and Malayalam throughout (button in the navbar).

## How it fits together

```
 phone / laptop browser
          │
          ▼
  scripts/serve-web.js  :8080   serves the built app and routes /api
     ├── /api/engine/*, /api/v1/*  ──► engine/     :8081   Node + Express, pure calculators, no keys
     └── /api/*, /ws, /print/*     ──► community/  :3001   Express + SQLite + WebSocket (Koottam, Atlas, bill scanner)

  frontend/   React + Vite + Tailwind + Leaflet (built to frontend/dist)
  contracts/  shared sample JSON, English/Malayalam message files, the KSEB bill maths for the browser
```

| Folder | What it is |
|---|---|
| `engine/` | The brain: KSEB bill and cliffs, solar sizing, subsidy, rain and tank simulation, Roof Score, Veyil Samayam, ward numbers, bill cross-check. Every tariff, subsidy and assumption lives in one file, `engine/rules/rules.json`, with its source and date. |
| `community/` | Pledges, campaigns, rain Koottam pricing, Atlas data, live updates, the bill scanner, the Grama Sabha print page. |
| `frontend/` | The web app. |
| `contracts/` | The agreement between the three services: sample JSON for every hand-off (`npm --prefix engine run samples`), message strings (`npm --prefix engine run strings`), `cliffMath.js`. |
| `scripts/` | `demo.js` (start everything), `check-demo.js` (prove it works), `serve-web.js`, `seed-community.js`. |
| `docs/` | `FRONTEND.md`, pitch notes, validation log, slide diagram. |
| `CONTRACT.md` | Ports, routes and fields. |

## Quick start

Needs **Node 22.5 or newer** (the community service uses the built-in SQLite).

```bash
npm install                        # repo root (QR code for the phone)
(cd engine && npm install)
(cd community && npm install)
(cd frontend && npm install)
cp community/.env.example community/.env     # then edit it (see Configuration)

npm run seed                       # once: demo wards and campaigns into the community database
npm run demo                       # engine + community + app on http://localhost:8080, with a LAN address and QR code
```

Open `http://localhost:8080`, or scan the QR code on a phone joined to the same hotspot. Then prove everything works:

```bash
npm run check -- --web http://localhost:8080 --community http://localhost:3001
```

It walks the whole demo path against the running services (every call must answer in under 1.5 s) and ends with "all checks passed".

For frontend development: `npm run dev` (port 5173, proxies `/api`). The launcher rebuilds the app unless you pass `--no-build`.

## Configuration

Almost nothing needs a key. The sun (NASA POWER), rain (Open-Meteo) and building outlines (OpenStreetMap) are free, keyless and saved in `engine/data/cache`, so the demo runs offline. Only map pictures need the internet; roof outlines still draw without them.

`community/.env` (never commit it):

| Variable | Meaning |
|---|---|
| `PORT` | Community service port (default 3001) |
| `HOUSEHOLD_SALT` | Secret salt for anonymous household keys. Change it before the event |
| `GEMINI_API_KEY` | Optional. For reading bill **photos**. Free key: https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | Optional. Pin one model (default: tries `gemini-3.5-flash-lite`, then `gemini-3.6-flash`, then `gemini-2.5-flash`) |

**The bill scanner and the key.** Without a key, a photo is answered with a clearly flagged built-in sample bill ("This is the sample bill, not your photo"); sample bills and typed numbers always work. With a key, run `cd community && npm run check:gemini`: it scans a test bill through the real code and prints PASS or FAIL with a specific fix. Failures (wrong key, rate limit, no internet, blurry photo) are clear errors, never made-up bills. Use only sample or masked bills: free-tier inputs may be read by Google. Photos are read in memory and never stored; only the last four digits of the consumer number are kept.

## Tests

```bash
npm test                           # engine: 97 tests (golden KSEB numbers, physics, API, fuzz)
(cd community && npm test)         # community: 41 tests (pledges, rain Koottam, scanner with a fake Gemini, WebSocket)
(cd frontend && npm run check:i18n)   # every English and Malayalam string present, placeholders match
npm run facts -- --tests           # every pitch number, the open VERIFY items, and the live test count
```

## How the numbers are made, and how far to trust them

- **Bills:** KSEB's LT-1A tariff table, **checked row by row against kseb.in** (current and the December-2024 column; electricity duty is 10% of the energy charge). Savings are always *bill before minus bill after*, slab by slab with banked units, never units times one rate.
- **Sun:** NASA POWER monthly sunshine × 0.75 system efficiency × shade. Our estimate is **1.4% to 7.8% below the EU's PVGIS model**, so it errs on the safe side (`docs/validation.md`).
- **Rain:** 10 years of daily rain × roof area × 0.8, the first millimetre of each rainy day discarded, then a day-by-day tank simulation. Roof rain is for washing, gardening and toilets: treat it before drinking and cover the tank with a mesh.
- **Sizing:** panels up to what covers your own use, stopping where the next 0.5 kW takes over 10 years to pay back; three sizes are always shown so you decide.
- **Honesty:** every report lists its assumptions and whether each is checked. **Not yet confirmed** (marked `verify` in the rules file, never shown as fact): the two-month billing rule, the net-metering size limit and the ₹2.79 surplus rate, the PM Surya Ghar end date, installer prices. Prices are indicative until installer quotes replace them. The Malayalam is a draft that needs a native reader.

## Demo day

1. `npm run seed` and `npm run demo`, then the check command above.
2. Run `npm --prefix engine run forecast` on the morning (fresh 3-day sun forecast).
3. Switch Wi-Fi off and walk the path once: roof → report → cliff → Veyil Samayam → Koottam → Atlas.
4. Phone on your own hotspot; on Windows allow Node through the firewall on Public networks.
5. Do one bill scan before judges arrive (the first call after startup can take about 10 seconds).

## Privacy

The Atlas shows counts per ward only. No names, phone numbers or exact houses are shown, and household keys are salted hashes. Bill photos are never stored.

## Data sources and licences

OpenStreetMap contributors (ODbL), NASA POWER, Open-Meteo (CC BY 4.0), KSEB's published tariff table, PM Surya Ghar scheme rules. Estimates, not offers: check prices and rules with an installer and KSEB before you decide.
