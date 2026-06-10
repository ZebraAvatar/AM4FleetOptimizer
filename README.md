# AM4 Fleet Optimizer

A route profitability optimizer for [Airline Manager 4](https://www.airlinemanager.com/). Given a route's distance, passenger demand, and operating constraints, it finds the fleet of up to two aircraft types that maximizes daily profit — including seat configuration, flight count, and cost breakdown.

**Live tool:** https://zebraavatar.github.io/AM4FleetOptimizer/

---

## Features

- **Optimal fleet selection** — enumerates single- and two-type fleets, with throttle search to find cases where flying fewer flights per aircraft and using a cheap mopper yields higher profit than running one plane at full utilization
- **Accurate cost model** — fuel ($/1000 lb), CO₂ ($/quota, where 1 quota = 1 metric ton), and A-check amortization per flight; CO₂ charged against actual passengers carried, not aircraft capacity
- **Flight count** based on flights that can *start* within operating hours, not complete — a 1-hour window allows any flight regardless of distance
- **Equalize mode** — forces all aircraft to fly the same number of flights per day, for simpler real-world scheduling; tries all valid equal flight counts and picks the most profitable
- **2× Range (stopovers)** — doubles each aircraft's effective range, opening short-haul planes to long routes via intermediate stops
- **Expandable runner-up fleets** — up to 3 Pareto-optimal alternatives (higher profit or lower fleet cost than any dominated option), each with full config and flight detail
- **Diagnostic empty states** — specific messages when constraints eliminate all options (range, runway, budget, manufacturer filter)
- **Demand paste** — paste `620/270/42` or `620 270 42` into the Economy field to fill all three demand boxes at once; Space/Tab advances between fields

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

**Fleet selection:** The top 15 aircraft by cost-per-capacity-unit are enumerated as single-type fleets (up to 20 aircraft) and two-type pairs (up to 10 each, both orderings). For each two-type pair, the outer aircraft's flight count is iterated to find the throttle point where the second aircraft's mopping of residual demand yields the best combined profit. Budget and aircraft limits are applied before enumeration.

**Seat allocation:** Seats are packed F → J → Y per flight (most revenue per capacity unit first), with unused capacity always filled as Y seats. Revenue is capped at actual demand.

---

## Usage

### Live
Just use it: **https://zebraavatar.github.io/AM4FleetOptimizer/**

### Local / self-hosted
Download `index.html` and open it in any browser. No server, build step, or internet connection required (except to load React/Babel from CDN on first open). To host your own copy on GitHub Pages, fork the repo and enable Pages under Settings → Pages → Deploy from branch → main.

---

## Caveats

- Demand values are the raw game numbers before reputation scaling; set Rep % if yours is below 100
- CO₂ quota price fluctuates in-game (~100–200); the default of 120 is conservative
- The optimizer is a helper, not a guarantee — always verify configs in-game before committing to a large purchase
- Equal mode uses the same fleet as the unequalized result; the optimal fleet for equalized operation may sometimes differ

---

## License

MIT — see [LICENSE](LICENSE). Attribution appreciated if you build on this.

---

*Not affiliated with Edo Interactive or Airline Manager 4.*
