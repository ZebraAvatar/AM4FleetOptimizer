# Changelog

All notable changes to the AM4 Fleet Helper.

## v0.61
- Horizon mode: new "Horizon (days)" input (Advanced). When set, fleets are ranked by net profit at T days (profit/day × T − fleet cost); the winner is the argmax over the full cost/profit Pareto frontier, and fleets still underwater at day T are hidden. If nothing pays back within T, the tool says so instead of showing a winner
- Net @ T displayed on the winner card and runner-up rows, with a banner stating the ranking basis; scenario labels include the horizon (e.g. "@30d")
- Pareto frontier retention raised 8 → 60 so cheap short-horizon winners survive; output with horizon unset is unchanged (verified identical to v0.60)
- Layout: vertical Easy/Realism rail on the right; row 1 = 2x Range, Equalize, Manufacturers, Rep %; row 2 = Distance, Y, J, F, Op Hrs; everything else in a collapsible Advanced section with an "N set" badge when non-default
- Custom dark checkboxes (toggles + manufacturer list) replacing native white squares
- Label/layout robustness: labels never wrap, row 2 wraps as whole units only on very narrow screens

## v0.60
- Scenario comparison: every candidate (winner + Pareto runner-ups) gets a Lock as A button; the locked scenario persists in its own section across any input change and is excluded from the B options
- Locked candidate's own button becomes Unlock; Clear A also available on the Scenario A section
- Compare vs A on any remaining candidate opens a single crossover-analysis panel beneath it (toggle; resets when inputs change)
- Verdicts: dominance ("A/B is immediately and permanently more profitable.") or crossover ("It will take Scenario A/B X.X days to be more profitable.") with the math shown: Δcost ÷ Δprofit/day = X.X days

## v0.55
- Sustainable flight count formula: `min(ceil(opHrs × speed / dist), max(1, floor(24 × speed / dist)))` — caps at the rate sustainable across consecutive days, preventing schedule drift
- Renamed from "Fleet Optimizer" to "Fleet Helper"

## v0.50
- Pre-compiled JSX — removed Babel Standalone runtime dependency for faster page load on GitHub Pages

## v0.42
- Expandable runner-up fleets with full config detail (seat config, flight count, per-plane profit)
- Labels placed above checkboxes instead of inline
- Variable-width manufacturer dropdown

## v0.41
- Layout: right-aligned demand header controls
- Variable-width manufacturer trigger, 230px minimum panel

## v0.40
- Rep % field validation (clamped ≤ 100)
- Rep % field shrunk to 52px
- Flex-wrap overflow insurance on demand header row

## v0.39
- Runner-up fleets (up to 3 Pareto-optimal alternatives)
- Diagnostic empty-state messages (range, runway, budget, manufacturer, op hours, profitability)
- Demand paste: `620/270/42` or `620 270 42` into Economy field auto-fills all three
- Space/Tab advances between demand fields
- Recalculating indicator (results dim to 45% during debounce)
- Reset button (restores all defaults)
- Payback period shown under fleet cost
- Purchase price per aircraft in fleet table rows
- Code cleanup: removed unused `useCallback` import, stale algorithm comments, dead trim loop
- Fixed evalFleet budget path returning bare `-Infinity` instead of object

## v0.38
- 2× Range (stopovers) checkbox — doubles effective range of all aircraft

## v0.37
- Flight count changed from `floor` to `ceil` — counts flights that can start within operating hours
- 1 hour of op time is sufficient for any flight regardless of distance

## v0.36
- All remaining capacity filled as Y seats (AM4 requires full seat configuration)
- Applied to both normal and equalize allocation paths

## v0.35
- Equalize: fixed to use original maxRot from plane speed, not throttled rot from fleet selection
- Fixed maxRot display in equalize fleet entries

## v0.34
- Equalize: fixed-flight-count approach — all aircraft fly exactly F flights, optimizer tries each F
- Replaced demand-split approach which didn't actually equalize flight counts

## v0.33
- Equalize mode: checkbox next to manufacturer dropdown
- Initial implementation (demand-split approach)

## v0.32
- Max Aircraft constraint (caps total fleet size)
- Max Airframes constraint (caps distinct aircraft types; 1 = single-type search only)

## v0.31
- Manufacturer filter dropdown (multi-select, exclude by manufacturer)
- Fuel price changed from $/lb to $/1000 lb (enter game value directly)
- CO₂ price changed from $/kg to $/quota (1 quota = 1 metric ton)

## v0.28
- Throttled flight count passed from evalFleet into Step 2 allocation via rawFleet
- Fixed Step 2 overriding evalFleet's throttle by re-optimizing independently

## v0.27
- Removed false concavity early-exit from two-type evalFleet throttle loop
- Two-type profit over first aircraft's flight count is not concave due to interaction effects

## v0.26
- CO₂ cost charged per actual passenger, not aircraft capacity
- Cost split into fixedCPF (fuel + A-check per flight) and co2PP (per passenger per route)

## v0.25
- Budget-constrained search filters to affordable aircraft before taking top 15
- Fixed temporal dead zone crash (hasBudget/budget used before declaration)

## v0.24
- 250ms input debounce (useEffect + setTimeout)
- Require all three demand fields before evaluating
- Concavity early-exit in evalOne (single-aircraft profit is concave over flight count)
- Top candidates reduced from 20 to 15

## v0.23
- Removed premature capacity-based break conditions from search loops
- These conflicted with throttle search (broke when aircraft could theoretically cover all demand at max flights)

## v0.22
- Two-type search tries both pair orderings (j=0 instead of j=i)
- Ensures whichever aircraft benefits from throttling can be first

## v0.21
- Throttled evalFleet: tries all flight counts for first aircraft in two-type fleets
- Second aircraft mops up residual demand at its own optimal flight count

## v0.20
- Unified fleet selection with demand-aware evaluation
- Replaced cost-per-capacity proxy ranking with actual profit simulation (evalOneAt + evalOne)
- Both budget-constrained and unconstrained paths use the same evaluator

## v0.10
- Per-aircraft flight count optimization: tries flight counts 1..maxRot for each aircraft, picks most profitable
- Seats packed F > J > Y with `ceil(remaining_demand / flights)` — fewer flights = denser configs
- Identical configs merged in table display

## v0.09
- Display actual flights needed per aircraft batch (not just max flights)
- Flights column shows `actual/max` when they differ
- Cost charged only for actual flights flown

## v0.08
- Budget-constrained enumeration: searches all 1-type and 2-type fleet combinations within fleet budget
- Top 15 candidates by cost-per-capacity-unit, up to 20-30 qty per type
- Unconstrained path keeps fast greedy (no budget tradeoff to explore)

## v0.07
- Max Fleet Price constraint
- Null-safe inputs: distance and demand start empty, not zero

## v0.06
- Optimal pricing: autoprice × markup (×1.10 Y / ×1.08 J / ×1.06 F)
- Max Runway constraint
- Max Plane Price constraint
- Empty defaults for all input fields

## v0.05
- One-way flight model: `floor(opHrs × speed / dist)` instead of round-trip `/(2 × dist)`
- Demand is route-total, served by one-way flights

## v0.04
- Fixed seat allocation waste: `Math.ceil` → `Math.floor` for F and J seat batches
- Prevented oversupply of premium classes burning capacity that should go to economy

## v0.03
- Last-aircraft cost optimization: switches from cheapest-per-unit to minimum absolute cost for the final aircraft
- Conservative profitability gate using Y revenue as floor estimate

## v0.02
- Capacity-decoupled optimizer: rank aircraft by cost per capacity-unit-day
- Seat allocation separated from aircraft selection (F > J > Y priority)
- Marginal trim: drops last aircraft if operating cost exceeds revenue

## v0.01
- Initial build: greedy optimizer with round-trip flight model
- 309-aircraft database extracted from community spreadsheet
- Inputs: distance, game mode, fuel price ($/lb), CO₂ price ($/kg), operating hours, Y/J/F demand
- Dark mono theme (DM Mono), React artifact

---

*Versions v0.11–v0.19 were not released; development continued directly from v0.10 to v0.20 after a context restructure.*
