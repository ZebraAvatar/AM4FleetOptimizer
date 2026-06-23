# AM4 Fleet Helper

A fleet planning tool for [Airline Manager 4](https://www.airlinemanager.com/). Given a route's distance, passenger demand, and operating constraints, it recommends a fleet of up to two aircraft types with seat configurations, flight counts, and a cost breakdown.

**Live tool:** https://zebraavatar.github.io/AM4FleetOptimizer/

> **Note:** This tool finds high-quality fleet recommendations, not guaranteed global optima. It searches up to two aircraft types from a pool of up to 27 candidates (the 15 most cost-efficient and the 12 cheapest qualifying aircraft), applies heuristics like throttle search and concavity pruning, and caps flight counts at sustainable daily rates rather than theoretical burst capacity. The results are designed to be practical — fleets a human can actually set up and run day-to-day — not mathematically perfect. Always verify configurations in-game before committing to a purchase.

---

## Features

- **Fleet selection** — enumerates single- and two-type fleets, with throttle search to find cases where flying fewer flights per aircraft and using a cheap mopper yields higher profit than running one plane at full utilization
- **Airframe consolidation** — collapses each aircraft type to the fewest airframes flying their maximum daily rotations, with one uniform seat configuration per type, so a recommendation never spreads demand across more (or pricier) planes than needed
- **Accurate cost model** — fuel ($/1000 lb), CO₂ ($/quota, where 1 quota = 1 metric ton), and A-check amortization per flight; CO₂ charged against actual passengers carried, not aircraft capacity
- **Sustainable flight count** — flights that can start within operating hours, capped at the rate sustainable across consecutive days (no schedule drift)
- **Equalize mode** — forces all aircraft to fly the same number of flights per day, for simpler scheduling; tries all valid equal flight counts and picks the most profitable
- **Single Type** — a one-tap shortcut that limits the fleet to a single aircraft type (equivalent to Max Aircraft Types = 1); when an anchor is set, restricts the complement to the same type as the anchor
- **Anchor Aircraft** — designate owned planes the fleet must always include; anchors are sunk cost (never counted in purchase, payback, or net — only the complement is); surplus anchors are shown as redundant; exempt from Max # Aircraft and Max Aircraft Types
- **2× Range (stopovers)** — doubles each aircraft's effective range, opening short-haul planes to long routes via intermediate stops
- **Horizon mode** — ranks fleets by net profit at N days (profit/day × N − fleet cost) rather than daily profit alone; the candidate pool includes both the most cost-efficient and the cheapest qualifying aircraft so short-payback options aren't missed
- **Scenario comparison** — lock any candidate as Scenario A; compare against any other candidate to see dominance or crossover days
- **Expandable runner-up fleets** — up to 3 Pareto-optimal alternatives (higher profit or lower fleet cost than any dominated option), each with full config and flight detail
- **Diagnostic empty states** — specific messages when constraints eliminate all options (range, runway, budget, manufacturer filter)
- **Demand paste** — paste `620/270/42`, `620 270 42`, or newline-separated demand copied from the game into the Economy field to fill all three demand boxes at once; Space/Tab advances between fields

### Constraints
| Field | Description |
|-------|-------------|
| Max Runway (ft) | Excludes aircraft requiring a longer runway |
| Max Plane $ | Per-aircraft purchase price ceiling |
| Max Fleet $ | Total fleet purchase price ceiling (0 = buy nothing; returns anchors-only if anchors are set) |
| Min # Aircraft | Minimum total aircraft in the fleet; prefers a smaller all-flying type over parked planes |
| Max # Aircraft | Maximum total aircraft, counting anchors |
| Max Aircraft Types | Maximum number of distinct aircraft types (1 = single-type only) |
| Manufacturers | Exclude specific manufacturers; searchable (prefix match; Enter toggles the top result) |
| Rep % | Scales demand down by your current reputation percentage |

---

## Aircraft database

309 aircraft sourced from community spreadsheet data. Fields: name, manufacturer, range (km), speed (km/h), fuel burn (lbs/km), CO₂ rate (kg/pax/km), capacity (units), A-check interval (hrs), A-check cost ($), purchase price ($), runway requirement (ft).

---

## Offline use

Download [`StandaloneHelper.html`](StandaloneHelper.html) — a fully self-contained build with the aircraft database inlined. No network connection required.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
