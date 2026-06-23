# Changelog

All notable changes to the AM4 Fleet Helper.

## v0.6.5

- **Anchor Aircraft:** New "Anchor Aircraft" section lets you designate owned planes the fleet must always include. Anchors are treated as sunk cost — they contribute operating profit but are never counted in purchase cost, payback, or net (only the complement fleet you'd buy is). Surplus anchors beyond what demand requires are shown as redundant (0 flights/day). Anchors are exempt from Max # Aircraft and Max Aircraft Types. Global toggle to let the tool choose the optimal seat configuration for anchors, or enter your own. Works under Equalize (anchors join the shared flight count, surplus parked) and Horizon (anchors-only / buy nothing is always shown as a valid baseline)
- **Winner-selection accuracy:** Fixed a bug where the no-horizon winner was picked using the search's profit estimate rather than the actual allocator. When they disagreed, a runner-up could out-earn the winner, or the horizon winner could show higher daily profit than the no-horizon winner. Both modes now allocate every Pareto-frontier fleet and pick by actual profit/net. Also fixed: distinct search combinations that allocate to the same actual fleet are now deduplicated by signature, so the same fleet can't appear as both winner and runner-up
- **Compute hang fix:** Anchors on short routes (under ~300 km) could hang for tens of seconds or indefinitely. Root cause: the flight-count scan failed to break when residual demand ran out, and the two-type throttle loop compounding it created O(rot²) complexity. Both loops now terminate at the demand-saturation point. No output change across all baselines
- **Horizon net-ranking fix:** With no fleet price cap, the horizon search could miss the true net-profit winner. The candidate pool was sorted by cost-per-seat (operating efficiency), so cheap long-range planes ranked past 15th and were never evaluated. The pool now combines the 15 most cost-efficient planes with the 12 cheapest qualifying planes (with a demand-relative size floor to prevent tiny jets from exploding computation on short routes). The Pareto frontier now retains both ends — cheap fleets (short-horizon net winners) can no longer be truncated. Representative fix: a 10,539 km route at 30d horizon previously returned 5×B787-8 at net $185.87M; now returns 2×DC-8-72 + 2×A340-200 at net $221.43M
- **Min # Aircraft:** New "Min # Aircraft" field in Advanced. Prefers a fleet where all N planes fly at a profit — usually a smaller airframe than the unconstrained winner, at a slight daily-profit reduction — and falls back to redundant (parked) planes only when demand can't keep N busy. Anchors count toward the floor
- **Anchor constraint fixes:** Max # Aircraft now counts anchors toward the total (setting Max=1 with 1 anchor gives anchors-only, not anchors + 1 more). Max Fleet $ = 0 now means "buy nothing" — null remains unlimited, 0 blocks the complement (returns anchors-only if anchors are set). Single Type now restricts the complement to the same aircraft type as the anchor(s) so the whole fleet stays one type
- **Display:** Horizon mode "Net" in winner card and runner-up list is now bold and capitalized. Runner-up section header dynamically reads "Runner-up fleets ranked by net profit @ N days" in horizon mode. Compact input row on narrow screens

## v0.6.4
- Airframe consolidation: each aircraft type now collapses to the fewest airframes flying their maximum daily rotations. The winner could previously be padded with redundant copies each flying a fraction of what it could — e.g. 7 planes at 8 rotations where 4 at 14 served the same demand — when the profit/day gap was negligible but the extra purchase cost was not. Consolidation is profit-neutral and always on
- Uniform seat configuration per type: all copies of an aircraft type now share one seat layout, so the recommended fleet is clean to set up in-game; the efficiency cost is negligible in realistic demand ratios
- Single Type is now a one-tap shortcut for Max Aircraft Types = 1, and clears itself when that field is set to anything else; the separate single-type allocator is retired in favour of the always-on consolidation + uniform-config path
- Manufacturer search: a search box in the dropdown's sticky header, autofocused when the dropdown opens (mobile keyboard pops up); prefix match (typing "t" shows Tupolev, not Aérospatiale); Enter toggles the top filtered result
- Mobile input flow: demand fields show a "next" key instead of a checkmark, and Enter advances focus like Space; the Distance field now tabs into Economy
- Relabels: "Max Airframes" → "Max Aircraft Types" (it was always the distinct-type cap); "Max Aircraft" → "Max # Aircraft"

## v0.6.3
- Single Type mode: new checkbox forces a single aircraft type with uniform seat configuration and flight count across all copies — models real-world fleet assignment where an airline flies one subfleet type on each route
- Manufacturer filter: sticky Select All / Select None buttons at the top of the dropdown
- Demand paste fix: pasting multiline demand from the game (one number per line) no longer drops the J value; a focus-advance race condition caused the middle field to appear blank despite correct state
- Label: "Horizon (days)" renamed to "Best fleet after (days)" for clarity
- Full px-to-rem conversion: all inline pixel values converted to rem units for consistent scaling; Advanced grid uses `auto-fit` to wrap instead of overflow on narrow screens

## v0.6.2
- Web worker: optimizer now runs off the main thread, eliminating UI freezes on heavy computations (60-fleet horizon searches). Sync fallback preserved for environments without Worker support
- Architecture: plane database extracted to `planes.js`; `index.html` fetches it at runtime (GitHub Pages). `StandaloneHelper.html` added as a fully self-contained offline build with P inlined — suitable for download and local use
- `index-dev.html` established as the RC testing URL: https://zebraavatar.github.io/AM4FleetOptimizer/index-dev.html
- Computing animation: pulsing "computing..." indicator with CSS fade-in delay (hidden for fast results)

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
