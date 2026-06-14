# AM4 Fleet Helper

A fleet planning tool for [Airline Manager 4](https://www.airlinemanager.com/). Given a route's distance, passenger demand, and operating constraints, it recommends a fleet of up to two aircraft types with seat configurations, flight counts, and a cost breakdown.

**Live tool:** https://zebraavatar.github.io/AM4FleetOptimizer/

> **Note:** This tool finds high-quality fleet recommendations, not guaranteed global optima. It searches up to two aircraft types from the top 15 cost-efficient candidates, applies heuristics like throttle search and concavity pruning, and caps flight counts at sustainable daily rates rather than theoretical burst capacity. The results are designed to be practical — fleets a human can actually set up and run day-to-day — not mathematically perfect. Always verify configurations in-game before committing to a purchase.

---

## Features

- **Fleet selection** — enumerates single- and two-type fleets, with throttle search to find cases where flying fewer flights per aircraft and using a cheap mopper yields higher profit than running one plane at full utilization
- **Accurate cost model** — fuel ($/1000 lb), CO₂ ($/quota, where 1 quota = 1 metric ton), and A-check amortization per flight; CO₂ charged against actual passengers carried, not aircraft capacity
- **Sustainable flight count** — flights that can start within operating hours, capped at the rate sustainable across consecutive days (no schedule drift)
- **Equalize mode** — forces all aircraft to fly the same number of flights per day, for simpler scheduling; tries all valid equal flight counts and picks the most profitable
- **Single Type mode** — restricts the fleet to one aircraft type with a uniform seat configuration and flight count across all copies, modelling real-world fleet assignment
- **2× Range (stopovers)** — doubles each aircraft's effective range, opening short-haul planes to long routes via intermediate stops
- **Expandable runner-up fleets** — up to 3 Pareto-optimal alternatives (higher profit or lower fleet cost than any dominated option), each with full config and flight detail
- **Diagnostic empty states** — specific messages when constraints eliminate all options (range, runway, budget, manufacturer filter)
- **Demand paste** — paste `620/270/42`, `620 270 42`, or newline-separated demand copied from the game into the Economy field to fill all three demand boxes at once; Space/Tab advances between fields

### Constraints
| Field | Description |
|-------|-------------|
| Max Runway (ft) | Excludes aircraft requiring a longer runway |
| Max Plane $ | Per-aircraft purchase price ceiling |
| Max Fleet $ | Total fleet purchase price ceiling |
| Max Aircraft | Maximum total number of aircraft |
| Max Airframes | Maximum number of distinct aircraft types (1 = single-type only) |
| Manufacturers | Exclude specific manufacturers from consideration |
| Rep % | Scales demand down by your current reputation percentage |

---

## Aircraft database

309 aircraft sourced from community spreadsheet data. Fields: name, manufacturer, range (km), speed (km/h), fuel burn (lbs/km), CO₂ rate (kg/pax/km), capacity (units), A-check interval (hrs), A-check cost ($), purchase price ($), runway requirement (ft).

Capacity units follow AM4's 1Y : 2J : 3F ratio — one First class seat occupies three capacity units.

---

## How it works

**Pricing (Easy mode):**
- Economy: `(0.4 × dist + 170) × 1.10`
- Business: `(0.8 × dist + 560) × 1.08`
- First: `(1.2 × dist + 1200) × 1.06`

Realism mode uses lower base prices with smaller markups.

**Cost per flight:**
```
fixedCPF = (fuel_lbs/km × speed × fuel$/lb + A-check$ / A-check_hrs) × dist / speed
CO2      = CO2_rate × actual_passengers × dist × CO2$/kg
```

**Flight count:**
```
rot = min(
    ceil(opHrs × speed / dist),        -- flights that can START in the op window
    max(1, floor(24 × speed / dist))   -- sustainable daily cap (no schedule drift)
)
```

**Fleet selection:** The top 15 aircraft by cost-per-capacity-unit are enumerated as single-type fleets (up to 20 aircraft) and two-type pairs (up to 10 each, both orderings). For each two-type pair, the outer aircraft's flight count is iterated to find the throttle point where the second aircraft's mopping of residual demand yields the best combined profit. Budget and aircraft limits are applied before enumeration.

**Seat allocation:** Seats are packed F → J → Y per flight (most revenue per capacity unit first), with unused capacity always filled as Y seats. Revenue is capped at actual demand.

---

## Usage

### Live
Just use it: **https://zebraavatar.github.io/AM4FleetOptimizer/**

### Local / self-hosted
Download `index.html` and open it in any browser. No server or build step required — just React from CDN. To host your own copy on GitHub Pages, fork the repo and enable Pages under Settings → Pages → Deploy from branch → main.

---

## Caveats

- Demand values are the raw game numbers before reputation scaling; set Rep % if yours is below 100
- CO₂ quota price fluctuates in-game (~100–200); the default of 120 is conservative
- Equal mode uses the same fleet as the unequalized result; the optimal fleet for equalized operation may sometimes differ

---

## Downloads

[StandaloneHelper.html](https://github.com/ZebraAvatar/AM4FleetOptimizer/raw/main/StandaloneHelper.html) — self-contained offline version (no internet required after download)

## Recent changes

| Version | Changes |
|---------|---------|
| v0.6.3 | Single Type mode (uniform config); manufacturer Select All/None; demand paste fix; px-to-rem conversion |
| v0.6.2 | Web worker (non-blocking compute); planes.js split (planes.js + StandaloneHelper.html) |
| v0.61 | Horizon mode (rank fleets by net profit at T days); compact two-row layout with Advanced accordion |
| v0.60 | Scenario comparison: lock any result as A, compare candidates, crossover analysis |
| v0.55 | Sustainable flight count formula (no schedule drift); renamed to Fleet Helper |

[Full changelog →](CHANGELOG.md)

---

## License

MIT — see [LICENSE](LICENSE). Attribution appreciated if you build on this.

---

*Not affiliated with Edo Interactive or Airline Manager 4.*
