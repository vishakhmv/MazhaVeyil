# MazhaVeyil (മഴവെയിൽ)

### Every roof can harvest the sun and the rain.

നിങ്ങളുടെ മേൽക്കൂര, നിങ്ങളുടെ വെളിച്ചം, നിങ്ങളുടെ വെള്ളം _(Your roof. Your light. Your water.)_

|              |                                                                                     |
| ------------ | ----------------------------------------------------------------------------------- |
| **Event**    | NEXATHON Sustainability Hackathon, _Innovate for a Better Future_                   |
| **Category** | Software (website)                                                                  |
| **Team**     | Vishakh · Savio · Kishan                                                            |
| **SDGs**     | 7 Clean Energy · 6 Clean Water · 11 Sustainable Communities · 13 Climate Action     |
| **Name**     | _Mazha_ (മഴ) = rain, _Veyil_ (വെയിൽ) = sunshine: the two things every roof receives |

**How to use this file.** Read section 0 first (what changed). Sections 1–7 are the idea and the logic. Sections 8–9 are the work split. Sections 10–12 are how we win the room (proof, pitch, demo). Sections 13–17 are impact, business, Q&A, risks and open questions. Anything marked **VERIFY** is not confirmed yet. Do not show a VERIFY item to judges as a fact.

---

## 0. What changed from v3 (read this first)

| #   | Change                                                         | Why                                                                                   | Example                                                                                                                              |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Bill-cliff numbers updated. There are **five** cliffs, not one | v3 used Dec-2024 rates. KSEB's rates changed on 1 Apr 2025 and stay until 31 Mar 2027 | Now 250 → 251 units adds **₹261.75** (v3 said "3 units, ₹251"). 500 → 501 adds **₹484.20**                                           |
| 2   | New net-metering rules added to the money logic                | KSERC's 2025 rules started on 6 Nov 2025                                              | Extra units sent to the grid are paid **₹2.79** each. A 6 kW roof that sends out 3,000 spare units a year earns only ₹8,370 for them |
| 3   | Savings = bill before − bill after (never units × one rate)    | Slabs make one unit of solar worth ₹3 to one home and ₹12 to another                  | A home using 320 units that gets 100 units from solar really saves **₹1,254.50** a month, not ₹760                                   |
| 4   | Subsidy countdown and a "no subsidy" scenario                  | The scheme runs to FY 2026–27                                                         | Report says "Subsidy window: about 5 months left" and shows payback with and without ₹78,000                                         |
| 5   | Stronger "why now"                                             | The 2026 monsoon failed                                                               | Rain was 28% below normal (7th driest year since 1901). KSEB dams were at 57% against 79% a year earlier                             |
| 6   | Hook wording made safe                                         | Sources differ by 1 MW. "Same houses" cannot be proved                                | Say "about 6,200 MW" and "same summer, same state"                                                                                   |
| 7   | Golden Path and three tiers                                    | Template slides are small and time is short                                           | Cliff meter with typed units is now Tier 1. Bill photo scan is Tier 2. Installer quotes are Tier 3                                   |
| 8   | Proof kit added (survey, installer calls, real bills)          | Judges trust people's voices more than our estimates                                  | One call to an installer replaces our guessed group price                                                                            |
| 9   | Slide-by-slide script, run sheets and Q&A                      | The template has 8 fixed slides                                                       | Slide 4 is the live demo. Slide 2 holds four short lines                                                                             |
| 10  | Demo safety                                                    | An offline demo needs fonts and map pictures                                          | Self-host the Malayalam font. Save one satellite picture per demo area                                                               |
| 11  | Pilot made consistent                                          | v3 said "one ward" and also "one panchayat"                                           | Pilot = one ward. Break-even is about 100 installed homes                                                                            |

---

## 1. The idea in 30 seconds

On 23 April 2026 Kerala's power demand touched a record of about **6,200 MW** and KSEB had to switch off feeders. The same month, in Pozhiyoor, each home got only **2–3 pots** of tanker water. Then the 2026 monsoon came in **28% below normal**, and by 7 September KSEB's dams were at **57%** (79% a year earlier). Low dams can make next summer's evening peak harder to meet. Yet Kerala's roofs get about 3,000 mm of rain a year and strong sun. _Same summer, same state. The answer is on the roof._

**MazhaVeyil** is a Malayalam-first website. Click your roof on a satellite map and get a **Roof Report** in seconds: solar units, subsidy, payback, the rain you can catch, the right tank size and how much can recharge your well. All of it becomes one **Roof Score**. Type your KSEB units (or photograph the bill) to make it exact and to see KSEB's **bill cliffs**. Join your ward's **Koottam (കൂട്ടം)** for a group price. Let **Veyil Samayam (വെയിൽ സമയം)** tell you the best hours to run the motor and the washing machine. Your panchayat sees every roof's potential on a live **Ward Atlas**.

> **One line:** Every roof gets a score. Every ward gets a plan.

**Why now (three dates):** the monsoon already failed (2026) · next summer's peak is coming (Apr–May 2027) · the PM Surya Ghar subsidy window and KSEB's current tariff table both end on **31 March 2027**.

**Tone rule.** Say it as a shared problem. Example: "KSEB had to switch off feeders", not "KSEB failed". Judges may include power or panchayat people.

---

## 2. Facts we can stand behind (checked 24 Oct 2026)

| Fact                          | What to say                                                                                                                                                                                          | Source  | Use it in              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------- |
| Record power peak             | "About 6,200 MW on 23 April 2026." Reports say 6,195 or 6,196 MW. KSEB switched off feeders. Evening demand was worst from 9:30 pm to midnight                                                       | S1, S2  | Slide 2, hook          |
| Kerala buys most of its power | Over 70% comes from outside the state. Hydro at full power meets about 25% of a day's need                                                                                                           | S2, S16 | Slide 2                |
| Water                         | Pozhiyoor (6 coastal wards, Kulathoor panchayat): 2–3 pots of tanker water per home, April 2026                                                                                                      | S3      | Slide 2, hook          |
| Monsoon 2026                  | 1,446.5 mm against 2,018.6 mm normal (28% less). 7th driest year since 1901                                                                                                                          | S4      | Slide 2                |
| Dams                          | KSEB reservoirs at 57% on 7 Sep 2026, against 79% a year earlier. **Refresh on the event day**                                                                                                       | S5      | Slide 2                |
| Solar self-use                | KSEB says solar homes use only 36% of what they make. About 45% of the exported power is drawn back at the evening peak. This "banking" cost KSEB over ₹500 crore in 2024–25                         | S6      | Slide 3, Veyil Samayam |
| Solar homes in Kerala         | Over 3 lakh homes (3.37 lakh reported under PM Surya Ghar)                                                                                                                                           | S12     | Slide 6                |
| Homes above 250 units         | Fewer than 5% of consumers (4.96 lakh, Dec 2024)                                                                                                                                                     | S8      | Q&A                    |
| Subsidy                       | ₹30,000 for 1 kW, ₹60,000 for 2 kW, ₹78,000 for 3 kW or more. Scheme runs to FY 2026–27. **VERIFY** that there is no extension                                                                       | S11     | Slides 3, 7            |
| KSEB tariff                   | Table valid 1 Apr 2025 – 31 Mar 2027 (section 5.2)                                                                                                                                                   | S7      | Slide 3                |
| Net metering                  | Homes can net-meter 1–20 kW (KSERC rules, in force from 6 Nov 2025). Year-end surplus is paid ₹2.79 a unit for new systems. No grid-support charge up to 10 kW. **VERIFY** this in the notified text | S9, S10 | Money logic            |
| Time-of-day tariff            | Homes using over 500 units a month: 90% of the rate from 6 am to 6 pm, 125% from 6 to 10 pm, 100% from 10 pm to 6 am                                                                                 | S7      | Veyil Samayam          |
| Google Solar API              | Now covers 300M+ buildings in India (Sep 2026). It is built for installers                                                                                                                           | S13     | Slide 3, Q&A           |
| Rain differs by district      | Normal June–August rain: Kollam 1,031 mm, Kannur 2,350 mm. The same 100 m² roof catches about 0.8 lakh litres in Kollam and 1.9 lakh litres in Kannur                                                | S14     | Slide 3, demo          |

**Dropped from v3 until you add a source:** "wells drying in Upper Kuttanad in mid-October" and "KSEB asked people to keep irons and pump sets off at night". What we could source: the minister asked people to avoid heavy use from 6 to 11 pm (S16), and KSEB asked people to avoid EV charging and other high-load appliances at peak (S2).

---

## 3. Why this can win

### 3.1 How judges will probably score us (the template shows what they look at)

NEXATHON's five basic requirements (problem, solution, SDG link, prototype, impact) are all covered by slides 2–6.

| Slide        | Judges ask                    | Our answer                                                            | Proof we show                           |
| ------------ | ----------------------------- | --------------------------------------------------------------------- | --------------------------------------- |
| 2 Problem    | Is it real, local and big?    | Record peak, tanker water, failed monsoon                             | Three sourced facts and our survey line |
| 3 Solution   | Is it new and clear?          | Click a roof → sun + rain + KSEB bill rules → ward plan, in Malayalam | One sentence and the competitor table   |
| 4 Prototype  | Does it work?                 | Live demo on the campus roof                                          | Working site and a backup video         |
| 5 Technology | Is it sensible and buildable? | Open data, simple stack, tests                                        | Tests pass. One diagram                 |
| 6 Impact     | Are the SDGs real?            | Each SDG tied to a feature and a number                               | Per-home, per-ward and state numbers    |
| 7 Business   | Can it live?                  | Who pays, how much, break-even                                        | Installer and panchayat voices          |
| 8 Team       | Who does what?                | Three owners, three demos                                             | Names and roles                         |

### 3.2 Why we are not "yet another solar calculator"

| Existing option                                                     | What it does                                                      | What it misses (as far as we found)                                               |
| ------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Installer and subsidy calculators (there are many)                  | Bill → kW → subsidy → payback, then a lead form for one installer | Rain and wells, Kerala's bill cliffs, Malayalam, ward view, neutrality            |
| Google Solar API                                                    | Roof data for installers, now 300M+ buildings in India            | Made for installers. No rain, no Malayalam, no ward view. We can plug it in later |
| Government portal and the PM Surya Ghar WhatsApp bot                | Apply for the subsidy and track it                                | Not a planning tool. **Team: check what its calculator shows and screenshot it**  |
| Rain-harvest guides and drives (for example Thrissur's Mazhapolima) | Manuals and training                                              | No per-roof numbers, no link to solar                                             |

**To-do:** each of you screenshots one competitor in week one. Slide 2 or 3 can show all three.

---

## 4. What we build

### 4.1 The Golden Path (this is the demo, and it must never fail)

Find the campus roof → Roof Report (sun + rain + Roof Score) → type the bill units → see the cliff → Veyil Samayam card → join Koottam from a phone → the Ward Atlas lights up.

### 4.2 Features by tier

| #   | Feature                                                                                                                                                                                    | Tier | Owner                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ---------------------------------------------------- |
| 1   | **Find a roof:** search, click a building outline, or draw it in four taps                                                                                                                 | 1    | Vishakh + Savio                                      |
| 2   | **Roof Report:** sun (kW, units a year, subsidy, cost, payback with and without subsidy, CO₂) + rain (litres, tank size, well recharge) + Roof Score + an "Assumptions and sources" drawer | 1    | Vishakh + Savio                                      |
| 3   | English / Malayalam interface                                                                                                                                                              | 1    | Savio                                                |
| 4   | **Cliff meter:** type your units, see your bill, the cliff chart and "units to the next cliff"                                                                                             | 1    | Vishakh (engine) + Savio (screen)                    |
| 5   | **Koottam:** join a ward group and watch progress toward the group price                                                                                                                   | 1    | Kishan + Savio                                       |
| 6   | **Ward Atlas:** map of roof potential vs pledges, what-if slider, live counters                                                                                                            | 1    | Kishan                                               |
| 7   | **Bill photo scan:** photo of the KSEB bill, AI reads the units and fills the units box                                                                                                    | 2    | Kishan (service) + Savio (screen) + Vishakh (checks) |
| 8   | **Veyil Samayam card:** tomorrow's best hours for motor, washing machine, iron and EV, plus an evening-peak alert                                                                          | 2    | Vishakh + Savio                                      |
| 9   | **"Today on your roof" card:** rain caught and power made today. Example: "Your roof caught about 1,800 litres of rain and could have made 9 units"                                        | 2    | Savio (data from Vishakh)                            |
| 10  | Grama Sabha one-page print view of the Atlas                                                                                                                                               | 2    | Kishan                                               |
| 11  | Installer quote request page                                                                                                                                                               | 3    | Kishan or Savio                                      |
| 12  | Malayalam voice, WhatsApp/PDF share, installable app, battery advisor, Google Solar API swap                                                                                               | 3    | Whoever is free                                      |

**Rules.** No Tier 2 work until Tier 1 passes its tests. No Tier 3 after code freeze.

---

## 5. Three things judges will remember

### 5.1 Roof Score (0–100)

- **Power cover** = what the roof can make ÷ what the home uses (capped at 100%).
- **Water cover** = share of days a right-sized tank meets non-drinking needs.
- **Roof Score** = the average of the two. Show them as **two rings** with the score in the middle.
- Bands: 0–39 _Starting_, 40–69 _Good_, 70–100 _Strong_.
- Always tell the user how to raise it. Example (numbers are only an example): "Roof Score 72. Power 85, Water 59. A 3,000 L tank lifts Water to about 75."

### 5.2 The bill cliffs

KSEB bills up to 250 units a month slab by slab. Above 250, **every** unit moves to one flat rate, and the rate steps up again at 300, 350, 400 and 500. At the current rates (valid 1 Apr 2025 – 31 Mar 2027):

| Units a month | Energy charge | Jump from the unit before |
| ------------- | ------------- | ------------------------- |
| 249           | ₹1,424.00     |                           |
| 250           | ₹1,432.50     |                           |
| 251           | ₹1,694.25     | **+₹261.75**              |
| 300           | ₹2,025.00     |                           |
| 301           | ₹2,287.60     | **+₹262.60**              |
| 350           | ₹2,660.00     |                           |
| 351           | ₹2,790.45     | +₹130.45                  |
| 400           | ₹3,180.00     |                           |
| 401           | ₹3,308.25     | +₹128.25                  |
| 500           | ₹4,125.00     |                           |
| 501           | ₹4,609.20     | **+₹484.20**              |

- **Say it in one line:** "One unit over 250 costs ₹262 more."
- This is the **energy charge only**. The bill also has fixed charge, duty and fuel surcharge. The fixed charge jumps too: single phase ₹160 → ₹220 at 251 units (+₹60), three phase ₹235 → ₹240 (+₹5).
- These are our own calculations from KSEB's official table (S7). **Test every row against KSEB's bill calculator (S15) before you show it.**
- **What v3 said:** 249 units = ₹1,399.15 and 252 units = ₹1,650.60. That was right only for 5 Dec 2024 – 31 Mar 2025. Keep it as an "old column" test case.
- **Two-month bills (VERIFY).** Many Kerala homes are billed every two months, and KSEB's slabs are per month. The engine must find the monthly slab first, then scale. Check the exact rule with the official calculator. Example: 502 units on a two-month bill is 251 a month, which is over the cliff.
- **Cliff meter text (example):** "You use 262 units. You are 12 units above the 250 cliff. Using 12 units less saves ₹336 a month. A 1 kW solar roof (about 110 units a month) takes you to about 152 units and saves about ₹1,107 a month."

**Slab-aware savings (the rule for the whole engine).** Savings = bill before − bill after. Example: a home uses 320 units and gets 100 units a month from solar. Bill before: 320 × ₹7.60 = ₹2,432.00. Net units after: 220, so the bill is ₹1,177.50. Real saving: **₹1,254.50**. A simple calculator says 100 × ₹7.60 = ₹760, which is 40% too low. (VERIFY with a real net-metered bill that KSEB bills on net units.)

### 5.3 Veyil Samayam (the best hours)

- **Why it matters:** KSEB says solar homes use only 36% of what they make. Evening demand is worst from 9:30 pm to midnight. The minister asked people to avoid heavy use from 6 to 11 pm. KSEB asked people to avoid EV charging and other high-load appliances at peak.
- **Where it saves real money:** homes on the time-of-day tariff (over 500 units a month) pay 125% from 6 to 10 pm and 90% from 6 am to 6 pm. Example: a 1.5-unit washing run at an ₹8.25 rate costs about ₹15.47 in the evening and ₹11.14 in the day.
- **Other homes:** show "solar used at home: 36% → X%" and the units moved out of the evening. **VERIFY** how the 2025 net-metering rules count evening draw (time-of-day factors) before you promise rupees.
- **How:** hourly sun forecast → fit flexible loads into the sunniest hours → show the share of solar used at home before and after.

---

## 6. How it works (logic only)

- **Roof:** the outline comes from open data (Google Open Buildings, OpenStreetMap) or the user draws it. Ask two quick questions: **roof type** (flat concrete / sloped tile or sheet) and **shade** (little / some / a lot). Usable area is about 45–60% of a flat roof at about 10 m² per kW. Start sloped roofs lower (about 35–45%) and fix the numbers after your installer calls. Google's Solar API can replace this step later (it needs a billing account).
- **Sun:** monthly sunshine (NASA POWER) × 0.75 system efficiency × shade factor. Sanity check: Kerala systems give about 3–5 units per kW per day. Compare with one real system (section 10).
- **Money:**
  - Always use bill before − bill after, with the slab table, for monthly and two-month bills.
  - Net metering: units billed = units taken from the grid − units sent. Spare units at year end are paid only ₹2.79, so **size to the home's real yearly use**. Example: 3,000 spare units earn ₹8,370. The same units used at home save ₹6–8 each.
  - Subsidy: ₹30,000 per kW for the first 2 kW plus ₹18,000 for the third, maximum ₹78,000. Show "window ends 31 Mar 2027".
  - Cost: about ₹55,000–70,000 per kW (indicative). **Replace with your two installers' real prices.**
  - Payback is always a range, shown **with and without** subsidy. Example: 2.5 kW costs about ₹1.38–1.75 lakh. After the ₹69,000 subsidy the net cost is about ₹0.69–1.06 lakh.
- **Rain:** 10 years of daily rain (Open-Meteo) for the exact spot × roof area × runoff factor 0.8, discarding the first millimetre of each rainy day. A day-by-day tank simulation picks the smallest tank where a bigger one adds under 5% more reliable days. Overflow goes to the well through a sand-and-charcoal filter (the Thrissur _Mazhapolima_ method). **Safety line in the report:** use for washing, gardening and toilets. Treat before drinking. Close the tank with a mesh (mosquitoes).
- **Bill reading:** a vision AI (Gemini, in Kishan's service, where the key lives) reads units, amount and billing period. Vishakh's engine cross-checks the amount against our own tariff calculation and warns if they differ by over 20%. The image is never stored. The consumer number is masked. The demo bill's result is cached so the scanner also works offline. Typed units always work.
- **Stack (all JavaScript, runs on our laptops):** React + Vite + Tailwind + Leaflet · Node + Express · SQLite (one file) · i18next · Gemini free tier for bills. **Add:** self-host the Malayalam font and serve a `vite build` for the demo.

---

## 7. The rules file (new, owned by Vishakh)

Every tariff, subsidy and policy number lives in **one file** with its source and date. The engine reads it. Every report prints "Rates last checked: 24 Oct 2026". If KSEB or KSERC changes a rule, you change one file.

```json
{
  "checked_on": "2026-10-24",
  "kseb_lt1_domestic": {
    "valid_from": "2025-04-01",
    "valid_to": "2027-03-31",
    "source": "kseb.in tariff table, LT-1 Domestic",
    "telescopic_up_to_250": [
      { "upto": 50, "rate": 3.35, "fixed_1ph": 50, "fixed_3ph": 130 },
      { "upto": 100, "rate": 4.25, "fixed_1ph": 85, "fixed_3ph": 175 },
      { "upto": 150, "rate": 5.35, "fixed_1ph": 105, "fixed_3ph": 205 },
      { "upto": 200, "rate": 7.2, "fixed_1ph": 140, "fixed_3ph": 215 },
      { "upto": 250, "rate": 8.5, "fixed_1ph": 160, "fixed_3ph": 235 }
    ],
    "flat_all_units_above_250": [
      { "upto": 300, "rate": 6.75, "fixed_1ph": 220, "fixed_3ph": 240 },
      { "upto": 350, "rate": 7.6, "fixed_1ph": 240, "fixed_3ph": 250 },
      { "upto": 400, "rate": 7.95, "fixed_1ph": 260, "fixed_3ph": 260 },
      { "upto": 500, "rate": 8.25, "fixed_1ph": 286, "fixed_3ph": 285 },
      { "upto": 99999, "rate": 9.2, "fixed_1ph": 310, "fixed_3ph": 310 }
    ]
  },
  "tod_domestic_over_500_units": {
    "normal_06_18": 0.9,
    "peak_18_22": 1.25,
    "offpeak_22_06": 1.0
  },
  "pm_surya_ghar": {
    "per_kw_first_2kw": 30000,
    "third_kw": 18000,
    "cap": 78000,
    "scheme_until": "2027-03-31",
    "verify": "any extension?"
  },
  "net_metering_kerala": {
    "domestic_max_kw": 20,
    "surplus_rate_new_solar": 2.79,
    "surplus_rate_existing": 3.08,
    "no_grid_support_charge_up_to_kw": 10,
    "in_force_from": "2025-11-06",
    "verify": "time-of-day factors for evening draw"
  },
  "old_column_for_tests": {
    "valid": "2024-12-05..2025-03-31",
    "units_249": 1399.15,
    "units_252": 1650.6
  }
}
```

---

## 8. Team split: three modules, built and tested alone

**Ground rules**

1. **Contract first.** On day 0, spend about 3 hours together and freeze sample files for every hand-off: roof report, bill result, sun plan, pledge, ward summary. After that, only additive changes that all three agree to.
2. **One owner per module.** Nobody edits another person's folder.
3. **Samples keep everyone moving.** Savio and Kishan build on the sample files until the real service is ready. Vishakh's engine runs offline on cached data. Every real response is checked against the same samples. If all three modules pass, integration works.
4. **Keys stay with their owner** in a `.env` file. `.env` is in `.gitignore` from the first commit. `.env.example` lists names only. On demo day each owner puts their own key on the demo laptop.
5. **Official sources are the answer key.** Write the tariff and subsidy tests from KSEB's own bill calculator and the scheme page _before_ writing code.
6. **Daily rhythm.** A 10-minute check-in every day. One integration branch. Code freeze 24 hours before the event. After freeze, fixes only.

**Accounts and keys**

| Item                                           | Used for                                         | Owner       | Notes                                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| GitHub account and repo                        | Code                                             | **Vishakh** | Adds Savio and Kishan. Make it public after the event with a README, screenshots and a licence                               |
| Satellite map key (MapTiler free tier or Esri) | Satellite background                             | **Savio**   | Restrict it to the addresses you demo from. Fallback: street map (no key) plus saved pictures (section 12)                   |
| Google account (official Open Buildings Colab) | One-time export of outlines for the 3 demo areas | **Savio**   | Hands the saved files to Vishakh                                                                                             |
| Gemini API key (Google AI Studio free tier)    | Bill scan                                        | **Kishan**  | Server side only. Free-tier inputs may be used by Google and read by human reviewers, so use **sample or masked bills only** |
| Hosting, domain, cloud database                | Not needed for the demo                          | Nobody      | SQLite file. Optional public read-only page: section 12                                                                      |

### Vishakh: Engine ("brain")

- **Builds:** repo and rules file · roof lookup from Savio's outline files and OpenStreetMap (3 demo areas cached) plus drawn outlines · solar, tariff and cliffs (monthly and two-month), slab-aware savings, subsidy with and without, net metering, rain, tank, well recharge and CO₂ calculators · bill cross-check (no AI, no key) · Roof Score · Veyil Samayam planner · ward summary file · one-command run-all
- **Tests alone (known answers):** 250 units → ₹1,432.50 · 251 → ₹1,694.25 · 501 → ₹4,609.20 · old column: 249 → ₹1,399.15 · 2.5 kW → ₹69,000 subsidy · 320 units with 100 from solar → saves ₹1,254.50 · a bigger roof never gives fewer kW · a bigger tank never lowers reliability · zero rain → zero water · results match 3 real bills
- **Done when:** every call returns the agreed format in under 1.5 s from cache, with no internet

### Savio: Citizen web app ("face")

- **Builds:** app shell and design (use the template's navy blue so slides and site look like one product) · English/Malayalam with a self-hosted font · map with search, click, draw and edit · Roof Report with charts and the "Assumptions and sources" drawer · cliff chart and cliff meter · bill flow screens (type units first, photo second) · Veyil Samayam card · "Today on your roof" card · join Koottam · map-picture fallback for the 3 demo areas · 90-second backup video · A4 leave-behind with a QR code · one-time Open Buildings export
- **Tests alone:** whole app on sample files with no backend · component tests · automated click-through of the three main flows · phone check at 360 px width
- **Done when:** the full demo flow works on samples and on real services, with no console errors, and feels smooth on a mid-range phone

### Kishan: Koottam + Ward Atlas ("movement")

- **Builds:** pledge and campaign service with SQLite · **bill scanner service** (holds the Gemini key, returns units, amount and billing period in the agreed format, masks the consumer number, never stores the image, caches the demo bill's result) · Atlas with map, KPI tiles, what-if slider and live counters · seed data from the real survey (section 10) · Grama Sabha one-page print (Tier 2) · landing-page counters · installer quote page only if Tier 1 and 2 are done (Tier 3)
- **Tests alone:** service tests (duplicate pledge rejected, target reached opens quotes, expired campaign closed) · bill scanner on 5 sample bill photos (right units on all, a warning on blurry ones, offline demo cache works) · Atlas on a sample ward file with fake live updates
- **Done when:** a pledge from a phone updates the Atlas in under 2 seconds
- **Privacy rule:** the Atlas shows counts per ward only. Never a name, a phone number or an exact house.

**On stage (proposal).** Vishakh opens and closes and speaks slides 2, 3 and 5. Savio runs the live demo (slide 4). Kishan runs the Atlas on the second screen and speaks slides 6 and 7. In Q&A: Vishakh answers numbers and rules, Savio answers app and users, Kishan answers data, privacy and business.

**If someone is overloaded:** cut Tier 3 first, then the Grama Sabha print. Savio takes Kishan's installer page if it is kept. Vishakh writes the scanner's checks and prompt against sample responses (no key needed).

---

## 9. Build order

**Day 0 (about 3 hours, together):** freeze the sample files · Vishakh sets up the repo and the rules file · pick 3 demo areas (host campus, one village or ward, one town) · Savio starts the Open Buildings export the same day · Kishan opens the survey form (section 10).

**Track A: we have 10 days or more**

1. **Days 1–5:** all Tier 1, each person alone on samples. Proof kit running (survey open, 2 installer calls, 3 real bills).
2. **Day 6:** first integration. Web ↔ engine and web ↔ community. Fix mismatches in the shared samples, never by patching one module.
3. **Days 7–8:** Tier 2 (bill scan, Veyil Samayam, Today card). Cache everything for the demo areas, including the demo bill's scan.
4. **Day 9:** polish for phones, backup video, three timed run-throughs, re-check facts (section 16), code freeze.
5. **Day 10:** rehearse, print the leave-behind, charge everything.

**Track B: we only have 24–36 hours:** build Tier 1 only. Typed units only, scanner if time is left. Show a clearly labelled **target** group discount, not a promised price. Precompute the Atlas.

---

## 10. Proof kit (do this in week one)

Judges trust voices more than estimates. Each task gives you one line for a slide.

| #   | Do this                                                                                                                                 | Who     | Gives you                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------ |
| 1   | **Survey** (10 questions below). Share it in college groups and ask students to take it home. Aim for 100 answers from 10 or more wards | Kishan  | A slide-2 line, and real data for the Atlas      |
| 2   | **Call 2 installers:** price per kW, discount for 25 homes in one ward, time from order to meter, shade and roof problems               | Vishakh | A real group-price range that replaces our guess |
| 3   | **Talk to 1 ward member or panchayat staff:** would the Atlas and Grama Sabha page help? Under which budget head could they pay?        | Savio   | A slide-7 line                                   |
| 4   | **Test 3 real bills** (with permission, masked)                                                                                         | Vishakh | "Our engine matches the bill within X%"          |
| 5   | **Check one real roof:** compare our yearly estimate with a real system's meter data (a neighbour's or the campus plant)                | Savio   | "Our estimate was X% from the real meter"        |

**Survey questions (keep it under 3 minutes)**

1. Your panchayat or municipality and ward number.
2. Do you own the house? Roof type: flat concrete / sloped tile or sheet / other.
3. Average electricity units a month (from your last bill; say if the bill is for two months).
4. Do you have solar now, plan to, or not?
5. If not, what stops you? Cost / roof / paperwork / trust in installers / did not know.
6. Did you know that above 250 units a month, all units move to one higher rate? Yes / No.
7. Did your household face a water shortage this year? How did you manage? Tanker / bought water / well.
8. Do you have a well? Did it dry this year? Any rain harvesting at home?
9. Would you join a ward group to get a lower price? Yes / Maybe / No.
10. Would you use this in Malayalam? Phone type. _(Optional, separate box: contact for a pilot, with consent.)_

Start the form with one consent line: "Your answers are used only for this hackathon project. Ward-level counts only."

**Slide-2 line to aim for (use REAL numbers only):** "[__] of [__] homes we asked had a water problem last summer. [__]% did not know the 250-unit rule. [__]% would join a ward group." Never show a number you did not collect.

---

## 11. The pitch: 8 slides, same template

The template's text area is small. Put **three or four short lines and one picture** on each slide. Put the rest in speaker notes. Paste Malayalam text as a **picture** (fonts can break on the college PC). Slide 1 asks for a team name, so choose one. Do not change the template or its design.

| Slide | Template title                     | On the slide                                                                                                                                                                                                                                                                | Picture                       | Who and time (5-minute pitch) |
| ----- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------- |
| 1     | PROJECT NAME                       | MazhaVeyil (മഴവെയിൽ) · _Every roof gets a score. Every ward gets a plan._ · team name and 3 names                                                                                                                                                                           | Sun + raindrop logo           | Vishakh, 5 s                  |
| 2     | OUR PROBLEM                        | 1) April 2026: record ~6,200 MW, feeders switched off, 2–3 pots of tanker water per home in Pozhiyoor. 2) Monsoon 28% short, dams 57% (79% last year). 3) Solar calculators exist but ignore rain, Kerala's bill cliffs, Malayalam and wards. 4) Our survey: [real numbers] | One chart (monsoon or demand) | Vishakh, 35 s                 |
| 3     | OUR SOLUTION                       | Click your roof → Roof Score (sun + rain) · Type your units → see the bill cliffs · Join your ward's Koottam → group price · Panchayat sees a live Ward Atlas                                                                                                               | Roof Report screenshot        | Vishakh, 30 s                 |
| 4     | PROTOTYPE                          | **Live demo** + QR · status: ✔ Roof Report ✔ Cliff meter ✔ Koottam ✔ Atlas                                                                                                                                                                                                  | 3 screenshots                 | Savio, 2 min 30 s             |
| 5     | TECHNOLOGY STACK                   | React + Vite + Tailwind + Leaflet · Node + Express · SQLite · NASA POWER, Open-Meteo, OpenStreetMap, Open Buildings · Gemini reads bills                                                                                                                                    | One flow diagram              | Vishakh, 15 s                 |
| 6     | SUSTAINABILITY IMPACT              | SDG 7, 6, 11, 13 with one number each: [kWh] · [litres] · [wards] · [t CO₂]                                                                                                                                                                                                 | 4 SDG icons                   | Kishan, 25 s                  |
| 7     | BUSINESS MODEL AND REVENUE STREAMS | Homes: free · Installers: success fee ₹1,500–2,500 per installed home · Panchayats: ₹25,000 a year · Banks and CSR: referrals and grants · Pilot ₹1.5–2 lakh · one ward pays for its pilot                                                                                  | Money-flow picture            | Kishan, 30 s                  |
| 8     | THANK YOU                          | Names and roles · _"Let us pilot this in one ward."_ · QR                                                                                                                                                                                                                   | QR code                       | Vishakh, 10 s                 |

**If the slot is 7 minutes:** give the demo 4 minutes (full script below). **If it is 3 minutes:** slides 2 and 3, a 90-second demo (roof → report → cliff), then slides 7 and 8.

### Demo script (4 minutes)

1. **Hook (30 s):** "About 6,200 MW, and KSEB had to switch off feeders. The same month, two or three pots of water per home. Then the monsoon failed. The answer was on the roof."
2. **The judges' own roof (45 s):** open the host campus, click the main block, show live kW, litres and Roof Score.
3. **A typical home (60 s):** full report, then type the bill units (or snap a sample bill). _"One unit over 250 costs ₹262."_ Show the cliff chart. The plan resizes.
4. **Veyil Samayam (30 s):** "Run the motor at 11:30, the washing machine at 1." Show solar self-use before and after.
5. **Koottam (45 s):** join from a phone and watch the Atlas on the second screen light up live. Slide to 25% adoption for ward totals.
6. **Close (30 s):** four SDG icons, a one-line business model, and the ask: _"Let us pilot this in one ward."_

For the **5-minute pitch**, the demo is steps 2, 3 and 5 (2 min 30 s).

---

## 12. Demo set-up and backups (no hosting needed)

- **Everything runs on one laptop.** The demo phone and the laptop join the same hotspot (our own, because venue Wi-Fi often blocks device-to-device traffic). The phone opens the laptop's address, shown as a QR code on screen. The Atlas runs on a second screen or a second laptop on the same hotspot.
- **Serve a production build** (`vite build`) from Node. It has fewer parts to break than the dev server. Keep `vite --host` as the fallback.
- **"Use my location"** needs HTTPS or localhost, so on the phone use search or click instead.
- **Fonts:** self-host the Malayalam font (no Google Fonts link), or offline mode will show boxes instead of Malayalam.
- **Map pictures:** if the internet fails, map tiles fail. Save one satellite picture per demo area and draw the outlines on top as SVG. Use it as an automatic fallback.
- **Optional, test at home first:** a free HTTPS tunnel can let judges scan a QR and join Koottam from their own phones. Do not depend on it at the venue.
- **Optional, after judging:** a read-only public copy (static page with seeded data) on free static hosting. Put its link in the README and on the leave-behind.
- **Leave-behind:** print 5 copies of one A4 page with a Roof Score example, three key numbers, a QR code and the team names.
- **Backups:** offline cached mode · the 90-second video · a second laptop with the same set-up and keys · the slides as a PDF on a phone.
- **Day-before checklist:** all devices charged · hotspot data ready · demo bill cached · rules file date updated · fonts load offline · map pictures saved · QR codes tested · slides open in the template.

---

## 13. Impact and SDGs

| SDG                                   | Contribution                                                                        | Feature                                 | How we measure                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **7** Clean Energy (7.1, 7.2)         | Right-sized rooftop solar, lower bills, more solar used at home                     | Roof Report, cliff meter, Veyil Samayam | kW planned, kWh a year, % of solar used at home                                                 |
| **6** Clean Water (6.4)               | Rain harvesting, tank sizing and well recharge reduce the load on tankers and wells | Rain report                             | Litres caught, days of non-drinking water covered                                               |
| **11** Sustainable Communities (11.3) | Ward Atlas for participatory local planning                                         | Koottam + Ward Atlas                    | Wards with a plan, homes pledged                                                                |
| **13** Climate Action (13.1)          | CO₂ avoided, drought resilience, rain alerts                                        | Report and alerts                       | Tonnes of CO₂ a year (India's grid factor is about 0.7–0.8 kg a unit; use the latest CEA value) |

_Illustrative numbers (the engine produces the real ones):_

- **One home** (120 m² roof, 260 units a month): 2.5 kW system, about 3,400 units a year, ₹69,000 subsidy, about 2.5 t CO₂ avoided a year. At Kerala's average rain (about 3,000 mm), about 2.9 lakh litres fall on that roof a year. **Rain depends on the district**, so use the engine's number for the demo spot.
- **One ward** (500 homes, 25% join = 125 homes): about 312 kW, 0.43 GWh and about 300 t CO₂ a year, and about 3.6 crore litres of roof rain.
- **Kerala ceiling (our estimate, show the maths):** if all 3.37 lakh solar homes moved 2 units a day out of the evening peak, evening demand would fall by about **135–170 MW** (2–3% of April's record) with no new power plant. The 170 MW figure spreads 2 units over 4 hours. The 135 MW figure spreads it over 5 hours (6 to 11 pm).

**Social benefits:** lower and steadier bills, water in April–May, paid local work for Kudumbashree women as ward ambassadors, Malayalam access for elderly users.

---
