import { useState, useEffect, useRef } from "react";

// ── Aircraft database (309 planes) ──────────────────────────────────────────
// n=name, m=manufacturer, r=range(km), s=speed(km/h), f=fuel(lbs/km),
// c=CO2(kg/pax/km), p=PAX(capacity units), h=hrs between A-checks,
// a=A-check cost($), $=purchase price, rw=runway(ft)
const P = PLANES_DATA;

// ── Pricing formulas (optimal = autoprice × markup) ─────────────────────────
const PRICING = {
  easy:    { y: [0.4, 170],  j: [0.8, 560],  f: [1.2, 1200] },
  realism: { y: [0.3, 150],  j: [0.6, 500],  f: [0.9, 1000] },
};
const MARKUP = { y: 1.10, j: 1.08, f: 1.06 };

const fmt = (n) => {
  if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
  return `$${Math.round(n)}`;
};
const fmtN = (n) => n.toLocaleString();
// Ticket prices: show the exact whole-dollar fare the game would set, not fmt()'s K/M
// abbreviation. AM4's own autoprice rounds down to the dollar (see AM4Utilities-Lite.html:
// Math.floor(y*1.1) / Math.floor(j*1.08) / Math.floor(f*1.06)) — yP/jP/fP below already
// include the markup, so a plain floor matches the game exactly.
const fmtPrice = (n) => `$${Math.floor(n)}`;
// Single-flight duration, always (h)h:mm:ss — no truncated units, no leading zero on hours.
const fmtDuration = (hrs) => {
  const t = Math.round(hrs * 3600);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};
// px-equivalent values expressed in rem so the UI scales with root font size
const rem = (...v) => v.map((x) => (x === 0 ? "0" : `${x / 16}rem`)).join(" ");
const MFRS = [...new Set(P.map(p => p.m))].sort();

// ── Number input that allows empty state ────────────────────────────────────
function NumInput({ value, onChange, label, placeholder, small, max, innerRef, advanceRef, onOverflow }) {
  const [raw, setRaw] = useState(value != null ? String(value) : "");
  const selfRef = useRef(null);
  const setRefs = (el) => {
    selfRef.current = el;
    if (innerRef) innerRef.current = el;
    if (el) el.setAttribute("enterkeyhint", advanceRef ? "next" : "done");
  };

  // Keep display in sync when value changes externally (reset, paste-split)
  useEffect(() => {
    if (document.activeElement !== selfRef.current) {
      setRaw(value != null ? String(value) : "");
    }
  }, [value]);

  const sync = (s) => {
    // Multi-value entry ("620/270/42", "620 270 42") for fields with onOverflow
    if (onOverflow && /[\s/,]/.test(s)) {
      const nums = s.split(/[\s/,]+/).filter(Boolean).map(parseFloat).filter((v) => !isNaN(v));
      if (nums.length > 0) {
        setRaw(String(nums[0]));
        onChange(nums[0]);
        if (nums.length > 1) onOverflow(nums.slice(1));
        if (nums.length === 1 && advanceRef && advanceRef.current) advanceRef.current.focus();
      } else {
        setRaw(s.replace(/[\s/,]+/g, ""));
      }
      return;
    }
    setRaw(s);
    if (s === "" || s === "-") { onChange(null); return; }
    const v = parseFloat(s);
    if (isNaN(v)) return;
    if (max != null && v > max) { setRaw(String(max)); onChange(max); return; }
    onChange(v);
  };
  const handleKey = (e) => {
    if ((e.key === " " || e.key === "Enter") && advanceRef && advanceRef.current) {
      e.preventDefault();
      advanceRef.current.focus();
    }
  };
  const handleBlur = () => {
    if (raw === "") return; // stay empty
    if (isNaN(parseFloat(raw))) setRaw(value != null ? String(value) : "");
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: rem(3) }}>
      {label && <label style={{ fontSize: rem(11), color: "#8a8a8a", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{label}</label>}
      <input
        ref={setRefs}
        type="text"
        inputMode="decimal"
        value={raw}
        placeholder={placeholder || ""}
        onChange={(e) => sync(e.target.value)}
        onKeyDown={handleKey}
        onBlur={handleBlur}
        style={{
          background: "#1a1a1a", border: "0.0625rem solid #333", borderRadius: rem(4),
          color: "#e0e0e0", padding: small ? rem(5, 8) : rem(8, 10),
          fontSize: small ? rem(13) : rem(14), fontFamily: "'DM Mono', monospace",
          width: small ? rem(52) : "100%", boxSizing: "border-box",
          outline: "none",
        }}
        onFocus={(e) => e.target.style.borderColor = "#5a7"}
        onBlurCapture={(e) => e.target.style.borderColor = "#333"}
      />
    </div>
  );
}
const n = (v) => v || 0; // null-safe: treat null as 0

// ── Manufacturer filter dropdown ────────────────────────────────────────────
const CHECK_TICK = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.5 8.5l3 3 6-7' stroke='%237c8' stroke-width='2.2' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

function Check({ checked, onChange, size = 15 }) {
  return (
    <input type="checkbox" checked={checked} onChange={onChange} style={{
      appearance: "none", WebkitAppearance: "none", MozAppearance: "none",
      width: rem(size), height: rem(size), margin: 0, cursor: "pointer", flexShrink: 0,
      background: checked ? "#2a3a2a" : "#1a1a1a",
      backgroundImage: checked ? CHECK_TICK : "none",
      backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundSize: rem(size - 4),
      border: checked ? "0.0625rem solid #5a7" : "0.0625rem solid #333",
      borderRadius: rem(3), outline: "none",
    }} />
  );
}

function MfrFilter({ excluded, setExcluded }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const searchRef = useRef(null);
  const count = excluded.size;
  const toggle = (m) => {
    const next = new Set(excluded);
    next.has(m) ? next.delete(m) : next.add(m);
    setExcluded(next);
  };
  useEffect(() => {
    if (!open) { setQuery(""); return; }
    if (searchRef.current) searchRef.current.focus();
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  const q = query.trim().toLowerCase();
  const shown = q ? MFRS.filter((m) => m.toLowerCase().startsWith(q)) : MFRS;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <label style={{ fontSize: rem(11), color: "#8a8a8a", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: rem(3), whiteSpace: "nowrap" }}>Manufacturers</label>
      <button onClick={() => setOpen(!open)} style={{
        background: "#1a1a1a", border: "0.0625rem solid #333", borderRadius: rem(4),
        color: count > 0 ? "#c86" : "#666", padding: rem(5, 8), fontSize: rem(13),
        fontFamily: "'DM Mono', monospace", cursor: "pointer", width: "100%",
        textAlign: "left", whiteSpace: "nowrap",
      }}>
        {count > 0 ? `${MFRS.length - count}/${MFRS.length}` : "All"} ▾
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", right: 0, minWidth: rem(230), zIndex: 10,
          background: "#1a1a1a", border: "0.0625rem solid #333", borderRadius: rem(4),
          maxHeight: rem(260), overflowY: "auto", marginTop: rem(2),
        }}>
          <div style={{
            padding: rem(6, 10),
            borderBottom: "0.0625rem solid #2a2a2a",
            position: "sticky", top: 0, background: "#1a1a1a", zIndex: 1,
          }}>
            <div style={{ display: "flex", gap: rem(6), marginBottom: rem(6) }}>
              {[["Select All", () => setExcluded(new Set())], ["Select None", () => setExcluded(new Set(MFRS))]].map(([txt, fn]) => (
                <button key={txt} onClick={fn} style={{
                  flex: 1, background: "#222", border: "0.0625rem solid #333", borderRadius: rem(3),
                  color: "#888", padding: rem(3, 8), fontSize: rem(10),
                  fontFamily: "'DM Mono', monospace", cursor: "pointer", whiteSpace: "nowrap",
                }}>{txt}</button>
              ))}
            </div>
            <input
              ref={searchRef}
              type="text"
              value={query}
              placeholder="Search…"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && shown.length > 0) { e.preventDefault(); toggle(shown[0]); } }}
              style={{
                background: "#141414", border: "0.0625rem solid #333", borderRadius: rem(3),
                color: "#ccc", padding: rem(4, 8), fontSize: rem(12),
                fontFamily: "'DM Mono', monospace", width: "100%", boxSizing: "border-box",
                outline: "none",
              }}
              onFocus={(e) => e.target.style.borderColor = "#5a7"}
              onBlur={(e) => e.target.style.borderColor = "#333"}
            />
          </div>
          {shown.length === 0 ? (
            <div style={{ padding: rem(10), fontSize: rem(12), color: "#666", fontFamily: "'DM Mono', monospace" }}>No matches</div>
          ) : shown.map((m) => (
            <label key={m} style={{
              display: "flex", alignItems: "center", gap: rem(8), padding: rem(6, 10),
              fontSize: rem(12), color: excluded.has(m) ? "#555" : "#ccc", cursor: "pointer",
              fontFamily: "'DM Mono', monospace",
            }}>
              <Check checked={!excluded.has(m)} onChange={() => toggle(m)} size={13} />
              {m}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Single-aircraft picker (searchable, for anchors) ────────────────────────
function PlanePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const searchRef = useRef(null);
  useEffect(() => {
    if (!open) { setQuery(""); return; }
    if (searchRef.current) searchRef.current.focus();
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  const q = query.trim().toLowerCase();
  const shown = (q ? P.filter((p) => p.n.toLowerCase().includes(q) || p.m.toLowerCase().includes(q)) : P).slice(0, 80);
  const pick = (p) => { onChange(p.n); setOpen(false); };
  return (
    <div ref={ref} style={{ position: "relative", flex: `1 1 ${rem(150)}`, minWidth: rem(130) }}>
      <button onClick={() => setOpen(!open)} style={{
        background: "#1a1a1a", border: "0.0625rem solid #333", borderRadius: rem(4),
        color: value ? "#cfcfcf" : "#666", padding: rem(6, 8), fontSize: rem(13),
        fontFamily: "'DM Mono', monospace", cursor: "pointer", width: "100%",
        textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", boxSizing: "border-box",
      }}>
        {value || "Select aircraft"} ▾
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, minWidth: rem(240), zIndex: 20,
          background: "#1a1a1a", border: "0.0625rem solid #333", borderRadius: rem(4),
          maxHeight: rem(300), overflowY: "auto", marginTop: rem(2),
        }}>
          <div style={{ padding: rem(6, 10), borderBottom: "0.0625rem solid #2a2a2a", position: "sticky", top: 0, background: "#1a1a1a", zIndex: 1 }}>
            <input ref={searchRef} type="text" value={query} placeholder="Search name or maker…"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && shown.length > 0) { e.preventDefault(); pick(shown[0]); } }}
              style={{ background: "#141414", border: "0.0625rem solid #333", borderRadius: rem(3), color: "#ccc", padding: rem(4, 8), fontSize: rem(12), fontFamily: "'DM Mono', monospace", width: "100%", boxSizing: "border-box", outline: "none" }}
              onFocus={(e) => e.target.style.borderColor = "#5a7"} onBlur={(e) => e.target.style.borderColor = "#333"} />
          </div>
          {shown.length === 0 ? (
            <div style={{ padding: rem(10), fontSize: rem(12), color: "#666", fontFamily: "'DM Mono', monospace" }}>No matches</div>
          ) : shown.map((p) => (
            <div key={p.n} onClick={() => pick(p)} style={{
              display: "flex", justifyContent: "space-between", gap: rem(8), padding: rem(6, 10),
              fontSize: rem(12), color: value === p.n ? "#7c8" : "#ccc", cursor: "pointer",
              fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap",
            }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{p.n}</span>
              <span style={{ color: "#555", flexShrink: 0 }}>{p.m} · {p.p}p</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Fleet optimizer core ────────────────────────────────────────────────────
// 1. Filter aircraft (range, runway, price, manufacturer), rank by $/capacity
// 2. Enumerate 1- and 2-type fleets; score each by simulating per-aircraft
//    flight-count optimization (incl. throttling the first type so a cheap
//    second type can mop up residual demand)
// 3. Allocate seats per plane (F > J > Y, spare capacity becomes Y seats),
//    greedily or at one shared flight count for every plane (Equal mode)

function CompPanel({ a, aLabel, b, bLabel }) {
  const pDiff = b.profit - a.profit, cDiff = b.fleetCost - a.fleetCost;
  const same = Math.abs(pDiff) < 1 && Math.abs(cDiff) < 1;
  const bDom = pDiff >= 0 && cDiff <= 0, aDom = pDiff <= 0 && cDiff >= 0;
  const cross = (!same && !bDom && !aDom) ? Math.abs(cDiff / pDiff) : null;
  return (
    <div style={{ background: "#0e1a0e", border: "0.0625rem solid #1e3a1e", borderRadius: rem(7), padding: rem(12, 14), marginTop: rem(10) }}>
      <div style={{ fontSize: rem(10), color: "#3a6a3a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: rem(10) }}>Crossover analysis</div>
      <div style={{ display: "grid", gridTemplateColumns: `${rem(14)} 1fr 1fr`, gap: rem(2, 10), fontSize: rem(11), marginBottom: rem(10) }}>
        <span style={{ color: "#a55", fontWeight: 500 }}>A</span>
        <span style={{ color: "#999" }}>{aLabel}</span>
        <span style={{ color: "#999" }}>{fmt(a.profit)}/day · {fmt(a.fleetCost)}</span>
        <span style={{ color: "#5a7", fontWeight: 500 }}>B</span>
        <span style={{ color: "#999" }}>{bLabel}</span>
        <span style={{ color: "#999" }}>{fmt(b.profit)}/day · {fmt(b.fleetCost)}</span>
      </div>
      <div style={{ borderTop: "0.0625rem solid #1a2a1a", paddingTop: rem(10), fontSize: rem(12), lineHeight: 1.7 }}>
        {same && <span style={{ color: "#555" }}>Same result — change inputs before comparing.</span>}
        {!same && bDom && <span style={{ color: "#7c8" }}>B is immediately and permanently more profitable.</span>}
        {!same && aDom && <span style={{ color: "#c86" }}>A is immediately and permanently more profitable.</span>}
        {cross != null && (() => {
          const bMore = cDiff > 0, bEarns = pDiff > 0;
          return <>
            <div style={{ color: "#888", marginBottom: rem(8) }}>
              B {bMore ? <span style={{ color: "#c86" }}>costs {fmt(Math.abs(cDiff))} more</span> : <span style={{ color: "#7c8" }}>costs {fmt(Math.abs(cDiff))} less</span>}
              {" and "}
              {bEarns ? <span style={{ color: "#7c8" }}>earns {fmt(Math.abs(pDiff))}/day more</span> : <span style={{ color: "#c86" }}>earns {fmt(Math.abs(pDiff))}/day less</span>}.
            </div>
            <div style={{ background: "#0a180a", border: "0.0625rem solid #1e3a1e", borderRadius: rem(5), padding: rem(8, 12) }}>
              {bMore && bEarns && <>It will take Scenario B <strong style={{ color: "#7c8", fontSize: rem(16) }}>{cross.toFixed(1)}</strong> <span style={{ color: "#7c8" }}>days</span> to be more profitable.</>}
              {!bMore && !bEarns && <>It will take Scenario A <strong style={{ color: "#c86", fontSize: rem(16) }}>{cross.toFixed(1)}</strong> <span style={{ color: "#c86" }}>days</span> to be more profitable.</>}
            </div>
            <div style={{ fontSize: rem(10), color: "#3a5a3a", marginTop: rem(6) }}>{fmt(Math.abs(cDiff))} ÷ {fmt(Math.abs(pDiff))}/day = {cross.toFixed(1)} days</div>
          </>;
        })()}
      </div>
    </div>
  );
}

function optimizeFleet(dist, yDem, jDem, fDem, mode, fuelKPrice, co2Quota, opHrs, maxRunway, maxPlanePrice, maxFleetPrice, rep, excludedMfrs, maxAircraft, maxAirframes, equalize, stopovers, horizon, anchors, anchorAutoConfig, minAircraft) {
  const d = n(dist), r = n(rep) || 100;
  const yD = Math.floor(n(yDem) * r / 100);
  const jD = Math.floor(n(jDem) * r / 100);
  const fD = Math.floor(n(fDem) * r / 100);
  const fP_ = n(fuelKPrice) / 1000, cP_ = n(co2Quota) / 1000, oH = n(opHrs);
  const mRw = n(maxRunway), mPp = n(maxPlanePrice), mFp = n(maxFleetPrice);
  const mAc = n(maxAircraft), mAf = n(maxAirframes), mMin = n(minAircraft);
  const eq = !!equalize, stp = stopovers ? 2 : 1;
  // Easy mode flies aircraft at 1.5x their listed speed; Realism uses base speed. This
  // raises daily flight count and shortens flight time (lowering the time-based A-check
  // cost per flight). spd() returns the effective speed used in all speed-driven math.
  const sm = mode === "easy" ? 1.5 : 1;
  const spd = (pl) => pl.s * sm;
  const exMfr = excludedMfrs || new Set();

  if (d <= 0 || yDem == null || jDem == null || fDem == null || (yD + jD + fD) <= 0) return { fleet: [], summary: null };

  const pr = PRICING[mode];
  const yP = (pr.y[0] * d + pr.y[1]) * MARKUP.y;
  const jP = (pr.j[0] * d + pr.j[1]) * MARKUP.j;
  const fP = (pr.f[0] * d + pr.f[1]) * MARKUP.f;

  const totalCapNeeded = yD + 2 * jD + 3 * fD;

  const fail = (reason) => ({ fleet: [], summary: null, reason });

  // ── Anchors: user-named planes forced into every candidate fleet ──
  // Anchors are owned (sunk cost): they contribute to operating profit but never to
  // purchase cost; the count is user-fixed and never consolidated away; config is the
  // user's fixed Y/J/F (anchorAutoConfig off) or chosen by the optimizer (on). Anchors
  // must physically fit the route (range incl. stopover, runway); the price and
  // manufacturer filters do not apply since the player already owns them.
  const anchorRaw = (anchors || []).filter((a) => a && a.n && n(a.qty) > 0);
  const anchorEntries = [];
  for (const a of anchorRaw) {
    const plane = P.find((p) => p.n === a.n);
    if (!plane) continue;
    if (plane.r * stp < d) return fail(`Anchor ${plane.n} can't fly ${fmtN(d)} km${stp === 1 ? " — enable 2x Range" : ""}`);
    if (mRw > 0 && plane.rw > mRw) return fail(`Anchor ${plane.n} needs more than a ${fmtN(mRw)} ft runway`);
    const fixedCPF = (plane.f * spd(plane) * fP_ + plane.a / plane.h) * d / spd(plane);
    const co2PP = plane.c * d * cP_;
    let fixedCfg = null;
    if (!anchorAutoConfig) {
      const cap = plane.p;
      const fs = a.f == null ? 0 : Math.min(Math.max(0, Math.floor(a.f)), Math.floor(cap / 3));
      const js = a.j == null ? 0 : Math.min(Math.max(0, Math.floor(a.j)), Math.floor((cap - 3 * fs) / 2));
      const yMax = cap - 3 * fs - 2 * js;
      // Blank Economy => fill the remaining capacity with economy (the all-Y default).
      // An explicit 0 means zero economy seats; only a left-blank field triggers the fill.
      const ys = a.y == null ? yMax : Math.min(Math.max(0, Math.floor(a.y)), yMax);
      fixedCfg = { fs, js, ys };
    }
    anchorEntries.push({ plane, fixedCPF, co2PP, qty: Math.max(1, Math.floor(n(a.qty))), fixedCfg, anchor: true });
  }
  const hasAnchors = anchorEntries.length > 0;

  // Minimum-fleet-size floor. Anchors count toward it, so the floor on the *complement*
  // (the planes we buy) is the requested minimum minus what's already owned. If a max is
  // also set, the floor can't exceed it. cMin = 0 means no floor is active.
  const anchorAC = anchorEntries.reduce((s, e) => s + e.qty, 0);
  const mMinEff = mMin > 0 ? (mAc > 0 ? Math.min(mMin, mAc) : mMin) : 0;
  const cMin = mMinEff > 0 ? Math.max(0, mMinEff - anchorAC) : 0;

  // Filter stepwise so we can report which constraint eliminated everything. With
  // anchors present an empty complement candidate set is not fatal (anchors-only is a
  // valid fleet), so these messages only fire when there are no anchors to fall back on.
  const rangeOK = P.filter((p) => p.r * stp >= d);
  const rwOK = rangeOK.filter((p) => mRw <= 0 || p.rw <= mRw);
  const ppOK = rwOK.filter((p) => mPp <= 0 || p["$"] <= mPp);
  const mfrOK = ppOK.filter((p) => !exMfr.has(p.m));
  if (mfrOK.length === 0 && !hasAnchors) {
    if (rangeOK.length === 0) return fail(`No aircraft can fly ${fmtN(d)} km${stp === 1 ? " — try 2x Range (stopover)" : ""}`);
    if (rwOK.length === 0) return fail(`No in-range aircraft fits a ${fmtN(mRw)} ft runway`);
    if (ppOK.length === 0) return fail(`No qualifying aircraft costs under ${fmt(mPp)}`);
    return fail("The manufacturer filter excludes every qualifying aircraft");
  }

  const planeData = mfrOK
    .map((p) => {
      const rot = Math.min(Math.ceil(oH * spd(p) / d), Math.max(1, Math.floor(24 * spd(p) / d))); // sustainable daily flights
      if (rot <= 0) return null;
      // Fixed costs (fuel + A-check): per flight, independent of passengers
      const fixedCPF = (p.f * spd(p) * fP_ + p.a / p.h) * d / spd(p);
      // CO2 cost: per actual passenger per route (not per flight)
      const co2PP = p.c * d * cP_;
      // For ranking: use capacity-based cost as conservative upper bound
      const costPerFlight = fixedCPF + co2PP * p.p;
      const costPerDay = costPerFlight * rot;
      const capPerDay = p.p * rot;
      const costPerCap = costPerDay / capPerDay;
      return { plane: p, rot, fixedCPF, co2PP, costPerFlight, costPerDay, capPerDay, costPerCap };
    })
    .filter(Boolean)
    .sort((a, b) => a.costPerCap - b.costPerCap);

  if (planeData.length === 0 && !hasAnchors) return fail("Set Op Hrs/Day above 0");

  // (evalOneAt/evalOne/evalFleet removed in v0.6.6-rc.4 — the search now scores every
  // candidate with the exact allocator below, so search, ranking, and display share one
  // set of numbers. The approximate evaluator overstated some fleets by ~0.5-1%, enough
  // to let them falsely Pareto-dominate true horizon winners.)

  // ── Allocation helpers (defined before Step 1 so the complement search can run
  // against the residual demand left after anchors) ──
  // tmr = true max rotations from plane speed (never the throttled rot stored on two-type
  // entries). cfgForF sizes one uniform optimized config for a type flying F total flights
  // against a demand pool. bestF finds the profit-max F (concave in F). bestFFixed does the
  // same but with a fixed user config (and a park/F=0 baseline, so a fixed-config anchor
  // never flies at an operating loss in normal mode — it parks). pushType emits a type's
  // planes sharing one config at given per-plane flight counts, merging identical rows;
  // with keepIdle it also emits 0-flight "redundant" rows for owned anchors not needed here.
  const tmr = (plane) => Math.min(Math.ceil(oH * spd(plane) / d), Math.max(1, Math.floor(24 * spd(plane) / d)));
  const cfgForF = (plane, fixedCPF, co2PP, F, aF, aJ, aY) => {
    const fs = Math.min(Math.floor(plane.p / 3), aF > 0 ? Math.ceil(aF / F) : 0);
    const capF = plane.p - 3 * fs;
    const js = Math.min(Math.floor(capF / 2), aJ > 0 ? Math.ceil(aJ / F) : 0);
    const ys = capF - 2 * js;
    const sF = Math.min(fs * F, aF), sJ = Math.min(js * F, aJ), sY = Math.min(ys * F, aY);
    const rev = sF * fP + sJ * jP + sY * yP;
    const cost = fixedCPF * F + co2PP * (sF + sJ + sY);
    return { fs, js, ys, sF, sJ, sY, rev, cost, profit: rev - cost, occupied: fs + js + ys > 0 };
  };
  const bestF = (plane, fixedCPF, co2PP, Fmax, aF, aJ, aY) => {
    let best = null;
    for (let F = 1; F <= Fmax; F++) {
      const c = cfgForF(plane, fixedCPF, co2PP, F, aF, aJ, aY);
      if (!c.occupied) continue;
      if (!best || c.profit > best.profit) best = { F, ...c };
      else if (best && c.profit < best.profit) break;
    }
    return best;
  };
  const cfgFixedAt = (fixedCPF, co2PP, fs, js, ys, F, aF, aJ, aY) => {
    const sF = Math.min(fs * F, aF), sJ = Math.min(js * F, aJ), sY = Math.min(ys * F, aY);
    const rev = sF * fP + sJ * jP + sY * yP;
    const cost = fixedCPF * F + co2PP * (sF + sJ + sY);
    return { fs, js, ys, sF, sJ, sY, rev, cost, profit: rev - cost, occupied: fs + js + ys > 0 };
  };
  const bestFFixed = (fixedCPF, co2PP, cfg, Fmax, aF, aJ, aY) => {
    const { fs, js, ys } = cfg;
    let best = { F: 0, fs, js, ys, sF: 0, sJ: 0, sY: 0, rev: 0, cost: 0, profit: 0, occupied: fs + js + ys > 0 };
    for (let F = 1; F <= Fmax; F++) {
      const c = cfgFixedAt(fixedCPF, co2PP, fs, js, ys, F, aF, aJ, aY);
      if (c.profit > best.profit) best = { F, ...c };
      else if (F > 1 && c.profit < best.profit) break;
    }
    return best;
  };
  const pushType = (target, plane, fixedCPF, co2PP, c, counts, opts) => {
    const anchor = !!(opts && opts.anchor), keepIdle = !!(opts && opts.keepIdle);
    let tF = c.sF, tJ = c.sJ, tY = c.sY;
    for (const cnt of counts) {
      if (cnt <= 0) {
        if (!keepIdle) continue;
        const prev = target[target.length - 1];
        if (prev && prev.redundant && prev.plane.n === plane.n && prev.fSeats === c.fs && prev.jSeats === c.js && prev.ySeats === c.ys) {
          prev.qty++;
        } else {
          target.push({ plane, qty: 1, fSeats: c.fs, jSeats: c.js, ySeats: c.ys, rot: 0, maxRot: tmr(plane), profitPerDay: 0, revenuePerDay: 0, costPerDay: 0, anchor, redundant: true });
        }
        continue;
      }
      const pF = Math.min(c.fs * cnt, tF), pJ = Math.min(c.js * cnt, tJ), pY = Math.min(c.ys * cnt, tY);
      tF -= pF; tJ -= pJ; tY -= pY;
      const rev = pF * fP + pJ * jP + pY * yP;
      const cost = fixedCPF * cnt + co2PP * (pF + pJ + pY);
      const prev = target[target.length - 1];
      if (prev && !prev.redundant && prev.anchor === anchor && prev.plane.n === plane.n && prev.fSeats === c.fs && prev.jSeats === c.js && prev.ySeats === c.ys && prev.rot === cnt) {
        prev.qty++; prev.profitPerDay += rev - cost; prev.revenuePerDay += rev; prev.costPerDay += cost;
      } else {
        target.push({ plane, qty: 1, fSeats: c.fs, jSeats: c.js, ySeats: c.ys, rot: cnt, maxRot: tmr(plane), profitPerDay: rev - cost, revenuePerDay: rev, costPerDay: cost, anchor });
      }
    }
  };

  // Place owned anchors into `target`, consuming from `rem` (mutates both). Normal mode:
  // each anchor flies its profit-max total flights (fixed or optimized config), spread
  // front-loaded across its user-fixed count; surplus planes show as redundant (0 flights).
  const placeAnchorsNormal = (target, rem) => {
    for (const e of anchorEntries) {
      const mr = tmr(e.plane);
      let c, Ftot;
      if (e.fixedCfg) {
        c = bestFFixed(e.fixedCPF, e.co2PP, e.fixedCfg, mr * e.qty, rem.F, rem.J, rem.Y);
        Ftot = c.F;
      } else {
        const b = bestF(e.plane, e.fixedCPF, e.co2PP, mr * e.qty, rem.F, rem.J, rem.Y);
        if (b && b.profit > 0) { c = b; Ftot = b.F; }
        else { c = b || { fs: 0, js: 0, ys: e.plane.p, sF: 0, sJ: 0, sY: 0, profit: 0, occupied: false }; Ftot = 0; }
      }
      const counts = []; let left = Ftot;
      for (let i = 0; i < e.qty; i++) { const cc = Math.min(mr, left); counts.push(cc); left -= cc; }
      pushType(target, e.plane, e.fixedCPF, e.co2PP, c, counts, { anchor: true, keepIdle: true });
      rem.F -= c.sF; rem.J -= c.sJ; rem.Y -= c.sY;
    }
  };

  // Residual demand the complement search runs against (full demand minus what anchors
  // serve). Estimated with a normal-mode anchor pass; the final allocate() runs the same
  // pass in normal mode (exact match) and folds anchors into the shared count under Equalize.
  const _estRem = { F: fD, J: jD, Y: yD };
  if (hasAnchors) placeAnchorsNormal([], _estRem);
  const rfD = Math.max(0, _estRem.F), rjD = Math.max(0, _estRem.J), ryD = Math.max(0, _estRem.Y);

  // ── Step 1: Fleet selection ──
  const hasBudget = maxFleetPrice != null;  // null = unlimited; 0 = "buy nothing" (complement blocked)
  const budget = hasBudget ? mFp : Infinity;
  // When max-aircraft is set it caps the whole fleet (anchors + complement), so the complement
  // gets the remaining slots. cMaxAc = 0 means no complement planes allowed (anchors-only).
  const cMaxAc = mAc > 0 ? Math.max(0, mAc - anchorAC) : 0;
  let bestProfit = -Infinity;
  let rawFleet = [];

  // Take top candidates: when budget-constrained, only consider affordable aircraft.
  // When Single Type (mAf=1) is set with anchors, the complement must be the same type as
  // the anchor(s) so the whole fleet stays one type.
  const anchorNames = hasAnchors ? new Set(anchorEntries.map((e) => e.plane.n)) : null;
  let affordable = hasBudget ? planeData.filter((pd) => pd.plane["$"] <= budget) : planeData;
  if (mAf === 1 && hasAnchors) affordable = affordable.filter((pd) => anchorNames.has(pd.plane.n));
  // Candidate pool = the most cost-efficient planes (lowest operating cost per seat; these win
  // on daily profit and at long horizons) UNION the cheapest qualifying planes (lowest purchase
  // price; these win net at short horizons, where capital cost dominates and a cheaper plane
  // beats a more efficient one even if it leaves some demand unserved). Ranking on costPerCap
  // alone misses the latter entirely, so the horizon search never sees them.
  const POOL_CPC = 15, POOL_PRICE = 12;
  // Cheap picks must be able to serve this route's (residual) demand in a sane number of
  // flights. Otherwise tiny aircraft (e.g. a 17-seat jet on a 300 km route, flying 70+ times a
  // day) get picked purely for low price — exploding evaluation cost while serving almost
  // nothing. The floor is demand-relative: thin routes still admit small planes (viable there),
  // heavy routes trim them (they'd be useless anyway). It applies only to the cheap picks; the
  // cost-efficient picks are large by construction and never trip this.
  const dUnits = 3 * rfD + 2 * rjD + ryD;
  const cheapMinCap = dUnits > 0 ? dUnits / 30 : 0;
  const byPrice = [...affordable].filter((pd) => pd.plane.p >= cheapMinCap).sort((a, b) => a.plane["$"] - b.plane["$"]);
  const seenTop = new Set();
  const top = [];
  for (const pd of [...affordable.slice(0, POOL_CPC), ...byPrice.slice(0, POOL_PRICE)]) {
    if (seenTop.has(pd.plane.n)) continue;
    seenTop.add(pd.plane.n); top.push(pd);
  }
  if (top.length === 0) {
    // With anchors, no complement candidates is fine — anchors-only is a valid fleet.
    // Without anchors, report the budget shortfall.
    if (!hasAnchors) {
      const cheapest = Math.min(...planeData.map((pd) => pd.plane["$"]));
      return fail(`Fleet budget ${fmt(budget)} is below the cheapest qualifying aircraft (${fmt(cheapest)})`);
    }
  }

  // Track runner-up fleets for display
  const topFleets = [];
  // Single Type + auto-config: the tool controls every seat layout, so a one-type fleet
  // (owned anchors + the complement it buys) must share ONE config. Anchors are sized
  // against full demand and placed first, the complement against the residual, so without
  // this they diverge — exactly the split a user sees after ticking "Single Type". Re-derive
  // one config for the type's total daily flights against full demand and apply it to every
  // row (owned and bought), recomputing each row's served seats / economics against the
  // depleting demand pool. Only fires when the whole fleet is genuinely one type; fixed-config
  // anchors (auto off) are left untouched, since there the user has pinned the layout on purpose.
  const unifyAutoConfig = (fleet) => {
    if (new Set(fleet.map((f) => f.plane.n)).size !== 1) return null; // not a single-type fleet
    const T = fleet[0].plane, cpf = anchorEntries[0].fixedCPF, co2 = anchorEntries[0].co2PP;
    const Ftot = fleet.reduce((s, f) => s + f.qty * f.rot, 0);
    if (Ftot <= 0) return null; // nobody flies — nothing to unify
    const c = cfgForF(T, cpf, co2, Ftot, fD, jD, yD); // one optimal config for the group's flights
    let pF = fD, pJ = jD, pY = yD;
    for (const f of fleet) {
      f.fSeats = c.fs; f.jSeats = c.js; f.ySeats = c.ys;
      const F = f.qty * f.rot;
      if (F <= 0) { f.profitPerDay = 0; f.revenuePerDay = 0; f.costPerDay = 0; continue; }
      const rc = cfgFixedAt(cpf, co2, c.fs, c.js, c.ys, F, pF, pJ, pY);
      pF -= rc.sF; pJ -= rc.sJ; pY -= rc.sY;
      f.profitPerDay = rc.profit; f.revenuePerDay = rc.rev; f.costPerDay = rc.cost;
    }
    return { remF: pF, remJ: pJ, remY: pY };
  };

  // Allocate a fleet (winner or runner-up) into concrete configs & flight counts. Owned
  // anchors are always included first (forced; user-fixed count never consolidated away),
  // then the complement entries fill the residual demand.
  const allocate = (entries) => {
    let remF = fD, remJ = jD, remY = yD;
    const fleet = [];
    const all = [...anchorEntries, ...entries];
    const totalAC = all.reduce((s, e) => s + e.qty, 0);

    if (eq && totalAC > 1) {
      // Equalize: every flying plane flies the SAME daily flight count, so the in-game
      // "Depart All" stays clean. Capped at the smallest maxRot across all flying types
      // (anchors included); the shared count is chosen by total profit. Anchors fly the
      // shared count on as many of their owned planes as carry demand (surplus shown as
      // redundant), and are kept even when forced to fly at an operating loss.
      const minMaxRot = all.reduce((m, e) => Math.min(m, tmr(e.plane)), Infinity);
      let bestEqProfit = -Infinity, bestEqFleet = null, bestRem = null, eqDeclines = 0;
      for (let eqF = 1; eqF <= minMaxRot; eqF++) {
        const cand = [];
        let rF = fD, rJ = jD, rY = yD, eqProfit = 0;
        for (const entry of all) {
          const { plane, fixedCPF, co2PP, qty } = entry;
          if (entry.anchor) {
            // Owned planes: fly eqF on as many of the qty planes as still carry demand
            // (served stops growing -> the rest would fly empty, so park them as redundant).
            let nFly = 0, c = null, bestServed = -1;
            for (let k = 1; k <= qty; k++) {
              const cc = entry.fixedCfg
                ? cfgFixedAt(fixedCPF, co2PP, entry.fixedCfg.fs, entry.fixedCfg.js, entry.fixedCfg.ys, k * eqF, rF, rJ, rY)
                : cfgForF(plane, fixedCPF, co2PP, k * eqF, rF, rJ, rY);
              const served = cc.sF + cc.sJ + cc.sY;
              if (cc.occupied && served > bestServed) { bestServed = served; nFly = k; c = cc; }
              else if (c && served <= bestServed) break;
            }
            if (!c) { // serves no demand at all — display config only, every plane redundant
              const fc = entry.fixedCfg || { fs: 0, js: 0, ys: plane.p };
              const c0 = { fs: fc.fs, js: fc.js, ys: fc.ys, sF: 0, sJ: 0, sY: 0, profit: 0 };
              pushType(cand, plane, fixedCPF, co2PP, c0, Array(qty).fill(0), { anchor: true, keepIdle: true });
            } else {
              const counts = Array(nFly).fill(eqF).concat(Array(qty - nFly).fill(0));
              pushType(cand, plane, fixedCPF, co2PP, c, counts, { anchor: true, keepIdle: true });
              eqProfit += c.profit; rF -= c.sF; rJ -= c.sJ; rY -= c.sY;
            }
          } else {
            let pick = null;
            for (let nq = 1; nq <= qty; nq++) {
              const c = cfgForF(plane, fixedCPF, co2PP, nq * eqF, rF, rJ, rY);
              if (!c.occupied) continue;
              if (!pick || c.profit > pick.profit) pick = { nq, ...c };
              else if (pick && c.profit < pick.profit) break;
            }
            if (pick && pick.profit > 0) {
              pushType(cand, plane, fixedCPF, co2PP, pick, Array(pick.nq).fill(eqF));
              eqProfit += pick.profit; rF -= pick.sF; rJ -= pick.sJ; rY -= pick.sY;
            }
          }
        }
        if (eqProfit > bestEqProfit) { bestEqProfit = eqProfit; bestEqFleet = cand; bestRem = [rF, rJ, rY]; eqDeclines = 0; }
        // Profit vs shared flight count is unimodal in practice (same shape bestF exploits
        // with a single-decline break); a 3-decline streak guards plateaus and small ripples
        // while skipping the long empty tail — the dominant cost at short routes where
        // minMaxRot is large. Verified output-identical to the full scan across the grid.
        else if (eqProfit < bestEqProfit && ++eqDeclines >= 3) break;
      }
      if (bestEqFleet) { fleet.push(...bestEqFleet); remF = bestRem[0]; remJ = bestRem[1]; remY = bestRem[2]; }
    } else {
      // Normal: anchors first (forced, front-loaded across their fixed count, surplus
      // redundant), then complement consolidated to the fewest airframes at max rotations.
      const rem = { F: remF, J: remJ, Y: remY };
      placeAnchorsNormal(fleet, rem);
      remF = rem.F; remJ = rem.J; remY = rem.Y;
      for (const entry of entries) {
        if (remF <= 0 && remJ <= 0 && remY <= 0) break;
        const { plane, fixedCPF, co2PP, qty } = entry;
        const mr = tmr(plane);
        const b = bestF(plane, fixedCPF, co2PP, qty * mr, remF, remJ, remY);
        if (!b) continue;
        const nq = Math.max(1, Math.ceil(b.F / mr));
        const counts = []; let left = b.F;
        for (let i = 0; i < nq; i++) { const c = Math.min(mr, left); counts.push(c); left -= c; }
        pushType(fleet, plane, fixedCPF, co2PP, b, counts);
        remF -= b.sF; remJ -= b.sJ; remY -= b.sY;
      }
    }
    // Single Type + auto-config: collapse the one-type fleet onto a single shared layout.
    if (mAf === 1 && hasAnchors && anchorAutoConfig) {
      const u = unifyAutoConfig(fleet);
      if (u) { remF = u.remF; remJ = u.remJ; remY = u.remY; }
    }
    return { fleet, remF, remJ, remY };
  };

  // Anchors are sunk: purchase cost and payback count only the complement (the new buy).
  // Profit shown is the whole fleet (anchors contribute operating profit, possibly a loss).
  const splitPurchase = (fl) => fl.reduce((s, f) => s + (f.anchor ? 0 : f.qty * f.plane["$"]), 0);
  const anchorSpend = (fl) => fl.reduce((s, f) => s + (f.anchor ? f.qty * f.plane["$"] : 0), 0);
  const totalFleetProfit = (fl) => fl.reduce((s, f) => s + f.profitPerDay, 0);
  // Under Equalize, an owned anchor's flight share (and so its profit share) SHRINKS as more
  // complement planes join the equalized split — the fixed, demand-capped total gets divided
  // more ways. splitCompProfit (the old per-row anchor-flag split) mistook that shrinkage for
  // the complement "earning" whatever share it absorbed, so buying more planes could look more
  // profitable even when total fleet profit hadn't moved at all — demand was already saturated
  // by the anchor alone, and the extra purchase(s) added pure cost with zero real benefit.
  // ownedOnlyProfit is what the owned planes alone (their own best allocation, no purchase)
  // already earn; marginalProfit is a candidate's benefit ABOVE that stable baseline — the true
  // answer to "does buying this add anything?", immune to how equalize splits the flight count.
  const ownedOnlyProfit = hasAnchors ? totalFleetProfit(allocate([]).fleet) : 0;
  const marginalProfit = (fl) => totalFleetProfit(fl) - ownedOnlyProfit;

  // Exact scorer: allocate the candidate with the same machinery that builds the displayed
  // result (equalize-, anchor-, single-type- and consolidation-aware), then Pareto-prune on
  // the ALLOCATED marginal profit and purchase. Returns the exact marginal profit for
  // best-tracking, so a purchase that adds nothing over the owned-only baseline scores ≤0 and
  // is never mistaken for a win.
  const noteFleet = (entries) => {
    let nominal = 0;
    for (const e of entries) { nominal += e.plane["$"] * e.qty; if (nominal > budget) return -Infinity; }
    const alloc = allocate(entries);
    const profit = marginalProfit(alloc.fleet);
    if (!(profit > 0)) return profit;
    const purchase = splitPurchase(alloc.fleet);
    // Pareto pruning: keep a fleet only if no other known fleet is at least as
    // profitable AND at least as cheap (kills padded variants with idle planes)
    for (let i = 0; i < topFleets.length; i++) {
      const t = topFleets[i];
      if (t.profit >= profit && t.purchase <= purchase) return profit;
      if (profit >= t.profit && purchase <= t.purchase) { topFleets.splice(i, 1); i--; }
    }
    topFleets.push({
      key: entries.map((e) => e.plane.n + "x" + e.qty).sort().join("|"),
      profit, purchase, entries,
      planes: entries.map((e) => ({ n: e.plane.n, qty: e.qty })),
    });
    // Frontier stays unsorted during the search — re-sorting on all ~70K insertions was the
    // dominant cost of exact scoring. It's sorted once after the loops, and on the rare trim.
    if (topFleets.length > 120) {
      topFleets.sort((a, b) => b.profit - a.profit);
      const cheap = topFleets.slice(90).sort((a, b) => a.purchase - b.purchase).slice(0, 30);
      topFleets.length = 90;
      topFleets.push(...cheap);
    }
    return profit;
  };

  // Unified search: enumerate 1-type and 2-type fleets

  // Single-type fleets
  for (const a of top) {
    let maxQ = Math.min(hasBudget ? Math.floor(budget / a.plane["$"]) : 20, 20);
    if (mAc > 0) maxQ = Math.min(maxQ, cMaxAc);
    let prevProfit = -Infinity;
    for (let q = 1; q <= maxQ; q++) {
      const profit = noteFleet([{ ...a, qty: q }]);
      if (profit > bestProfit) { bestProfit = profit; rawFleet = [{ ...a, qty: q }]; }
      if (profit <= prevProfit) break;
      prevProfit = profit;
    }
  }

  // Two-type fleets (skip if max airframes = 1, or single-type mode)
  if (mAf <= 0 || mAf >= 2) {
    for (let i = 0; i < top.length; i++) {
      for (let j = 0; j < top.length; j++) {
        if (j === i) continue;
        const a = top[i], b = top[j];
        let maxQA = Math.min(hasBudget ? Math.floor(budget / a.plane["$"]) : 10, 10);
        if (mAc > 0) maxQA = Math.min(maxQA, cMaxAc - 1);
        for (let qA = 1; qA <= maxQA; qA++) {
          const remBudget = hasBudget ? budget - qA * a.plane["$"] : Infinity;
          let maxQB = Math.min(hasBudget ? Math.floor(remBudget / b.plane["$"]) : 10, 10);
          if (mAc > 0) maxQB = Math.min(maxQB, cMaxAc - qA);
          for (let qB = 1; qB <= maxQB; qB++) {
            const entries = [{ ...a, qty: qA }, { ...b, qty: qB }];
            const profit = noteFleet(entries);
            if (profit > bestProfit) { bestProfit = profit; rawFleet = entries; }
          }
        }
      }
    }
  }

  // Consumers (ranking, alternatives) expect the frontier profit-descending; sorted once here.
  topFleets.sort((a, b) => b.profit - a.profit);

  if (rawFleet.length === 0 || bestProfit <= 0) {
    if (!hasAnchors) return fail("No profitable fleet — operating costs exceed revenue at these settings");
    rawFleet = []; // anchors-only: a valid fleet even with no profitable complement to add
  }

  // ── Step 2: Allocate seats per aircraft, optimizing flight count ──
  // (Allocation helpers tmr/cfgForF/bestF/bestFFixed/pushType and the anchor pass are
  // defined above Step 1 so the complement search can use the post-anchor residual.)

  // (unifyAutoConfig, allocate, and the split helpers are hoisted above Step 1 in
  // v0.6.6-rc.4 — the search scores candidates by calling allocate directly.)
  // Label a fleet by its real bought combo (ground truth post-allocation), not the
  // pre-allocation candidate — a candidate's second type can end up unneeded once
  // allocation runs, and showing it anyway misrepresents what's actually in the fleet.
  // Anchors are excluded (they're owned, not part of "what to buy", and are already
  // shown per-row as "(owned)" in the expanded detail).
  const fleetLabel = (fl) => {
    const m = new Map();
    for (const f of fl) { if (f.anchor) continue; m.set(f.plane.n, (m.get(f.plane.n) || 0) + f.qty); }
    return Array.from(m, ([nm, qty]) => `${qty}× ${nm}`).join(" + ") || "(owned only)";
  };
  // Signature of an allocated fleet (plane, qty, config, rotations). Two candidates with
  // different search combos can allocate to the identical fleet — this lets us dedup them.
  const fleetSig = (fl) => fl.map((f) => `${f.plane.n}#${f.qty}#${f.ySeats},${f.jSeats},${f.fSeats}#${f.rot}#${f.anchor ? 1 : 0}#${f.redundant ? 1 : 0}`).sort().join("|");

  // ── Minimum-fleet-size floor (counts anchors; cMin is the floor on the complement) ──
  // A type's flights can be spread across more planes with no change to its config, served
  // demand, or profit — so a fleet can always grow to cMin planes by giving each plane fewer
  // flights. Only when a fleet's profitable flights run out before cMin do extra planes go
  // idle (redundant). compFlights = flights available to spread; floorShort = planes that
  // would be forced idle. Ranking prefers fleets with the fewest forced-idle planes (usually
  // a smaller airframe, which flies more times), then profit — exactly the agreed behavior.
  const compFlights = (fl) => fl.reduce((s, f) => s + (f.anchor || f.redundant ? 0 : f.qty * f.rot), 0);
  const floorShort = (fl) => (cMin > 0 ? Math.max(0, cMin - compFlights(fl)) : 0);
  const spreadToFloor = (fl) => {
    if (!(cMin > 0)) return fl;
    const compPlanes = fl.reduce((s, f) => s + (f.anchor ? 0 : f.qty), 0);
    if (compPlanes >= cMin) return fl;
    const anchors = fl.filter((f) => f.anchor);
    const flying = fl.filter((f) => !f.anchor && !f.redundant && f.rot > 0);
    const idle = fl.filter((f) => !f.anchor && (f.redundant || f.rot <= 0));
    const totalFlights = flying.reduce((s, f) => s + f.qty * f.rot, 0);
    const targetFlying = Math.min(cMin, totalFlights);
    // How many planes each flying row uses: start at its current count, then split flights
    // onto more planes (each must keep >=1 flight) until we hit the target, favoring the row
    // with the most spare flights so the spread stays even.
    const rows = flying.map((f) => ({ f, planes: f.qty, maxPlanes: f.qty * f.rot }));
    let have = rows.reduce((s, r) => s + r.planes, 0);
    while (have < targetFlying) {
      let bi = -1, room = 0;
      for (let i = 0; i < rows.length; i++) { const rm = rows[i].maxPlanes - rows[i].planes; if (rm > room) { room = rm; bi = i; } }
      if (bi < 0) break;
      rows[bi].planes++; have++;
    }
    const out = [...anchors];
    for (const r of rows) {
      const F = r.f.qty * r.f.rot, P = r.planes;
      const fc = []; let left = F;
      for (let k = 0; k < P; k++) { const c = Math.ceil(left / (P - k)); fc.push(c); left -= c; }
      const per = {};
      for (const c of fc) per[c] = (per[c] || 0) + 1;
      for (const c of Object.keys(per).map(Number).sort((a, b) => b - a)) {
        const q = per[c], share = (c * q) / F;
        out.push({ plane: r.f.plane, qty: q, fSeats: r.f.fSeats, jSeats: r.f.jSeats, ySeats: r.f.ySeats,
          rot: c, maxRot: r.f.maxRot,
          profitPerDay: r.f.profitPerDay * share, revenuePerDay: r.f.revenuePerDay * share, costPerDay: r.f.costPerDay * share,
          anchor: false });
      }
    }
    for (const f of idle) out.push(f);
    // Flights ran out before cMin: the remaining planes can't fly profitably, so park them.
    let nowPlanes = out.reduce((s, f) => s + (f.anchor ? 0 : f.qty), 0);
    if (nowPlanes < cMin) {
      const base = flying[0] || idle[0];
      if (base) {
        const add = cMin - nowPlanes;
        const exist = out.find((f) => !f.anchor && f.redundant && f.plane.n === base.plane.n);
        if (exist) exist.qty += add;
        else out.push({ plane: base.plane, qty: add, fSeats: base.fSeats, jSeats: base.jSeats, ySeats: base.ySeats,
          rot: 0, maxRot: base.maxRot, profitPerDay: 0, revenuePerDay: 0, costPerDay: 0, anchor: false, redundant: true });
      }
    }
    return out;
  };

  // Build a ranked candidate from a set of complement entries: allocate, grow to the floor
  // (if any), and measure on the resulting fleet so purchase/payback count every plane bought
  // (including any parked at the floor). `short` = planes forced idle by the floor.
  const mkCand = (entries) => {
    const a0 = allocate(entries);
    const fleet = cMin > 0 ? spreadToFloor(a0.fleet) : a0.fleet;
    return {
      planes: fleetLabel(fleet),
      purchase: splitPurchase(fleet),
      profit: fleet.reduce((s, f) => s + f.profitPerDay, 0),
      payProfit: marginalProfit(fleet),
      fleet, remF: a0.remF, remJ: a0.remJ, remY: a0.remY,
      short: floorShort(fleet),
    };
  };
  // When a floor is active, also weigh every single airframe on its own — the most profitable
  // way to keep all N planes flying is often a smaller plane than the unconstrained winner,
  // and that option may not survive the Pareto frontier.
  const floorSingles = cMin > 0 ? top.map((a) => [{ ...a, qty: cMin }]) : [];

  // ── Horizon mode: rank the whole Pareto frontier by net profit at T days ──
  // net(T) = profit/day × T − fleet purchase cost. The net-maximizer for any T
  // always lies on the cost/profit Pareto frontier, so allocating every
  // surviving frontier fleet and taking the argmax is exact (within the
  // fleets this search enumerates). Fleets still underwater at T are excluded.
  const T = horizon > 0 ? horizon : null;
  if (T) {
    const cands = [...topFleets.map((t) => t.entries), ...floorSingles].map((entries) => {
      const c = mkCand(entries);
      c.net = c.payProfit * T - c.purchase;
      return c;
    });
    // Anchors-only (buy nothing) is always an option when anchors exist: nothing to recoup.
    if (hasAnchors) {
      const c = mkCand([]);
      c.net = 0;
      cands.push(c);
    }
    // Keep the buy-nothing baseline plus any complement that recoups its own cost by T.
    const keep = cands.filter((c) => c.purchase === 0 || (c.payProfit > 0 && c.net > 0));
    if (keep.length === 0) return fail(`No fleet pays back within ${fmtN(T)} days — every option is still in the hole`);
    // Floor first: fewest planes forced idle (so all N fly where possible), then net profit.
    keep.sort((x, y) => (x.short - y.short) || (y.net - x.net));
    // Dedup by allocated-fleet signature: distinct search combos can allocate to the same
    // actual fleet (e.g. a 2-type candidate whose 2nd type gets trimmed), which would
    // otherwise show the winner again as a runner-up, or the same fleet twice.
    const seenH = new Set();
    const uniq = [];
    for (const c of keep) { const sg = fleetSig(c.fleet); if (seenH.has(sg)) continue; seenH.add(sg); uniq.push(c); }
    const w = uniq[0];
    const hAlternatives = uniq.slice(1, 4).map((c) => ({
      planes: c.planes, purchase: c.purchase, profit: c.profit, payProfit: c.payProfit, fleet: c.fleet, net: c.net,
    }));
    return {
      fleet: w.fleet,
      summary: {
        totalProfit: w.profit,
        totalRevenue: w.fleet.reduce((s2, f2) => s2 + f2.revenuePerDay, 0),
        totalCost: w.fleet.reduce((s2, f2) => s2 + f2.costPerDay, 0),
        totalAircraft: w.fleet.reduce((s2, f2) => s2 + f2.qty, 0),
        totalPurchase: w.purchase,
        complementProfit: w.payProfit, anchorPurchase: anchorSpend(w.fleet), hasAnchors,
        servedY: yD - Math.max(0, w.remY), servedJ: jD - Math.max(0, w.remJ), servedF: fD - Math.max(0, w.remF),
        unservedY: Math.max(0, w.remY), unservedJ: Math.max(0, w.remJ), unservedF: Math.max(0, w.remF),
        yPrice: yP, jPrice: jP, fPrice: fP, totalCapNeeded,
        alternatives: hAlternatives,
        horizon: T, net: w.net, _pool: top.length,
      },
    };
  }

  // ── No-horizon mode: rank the frontier by actual daily profit ──────────────
  // Pick the winner by its *allocated* daily profit, not the search's profit
  // estimate. The estimate can rank a fleet first that a real allocation then
  // beats, which is how a runner-up could out-earn the winner (or strictly
  // dominate it). Allocating every frontier fleet and taking the argmax — the
  // same approach the horizon branch uses for net — makes that impossible.
  const ncands = [...topFleets.map((t) => t.entries), ...floorSingles].map((entries) => mkCand(entries));
  // Anchors-only (buy nothing) is always an option when anchors exist.
  if (hasAnchors) ncands.push(mkCand([]));
  // Keep the buy-nothing baseline plus any complement that operates at a profit;
  // among those the highest total daily profit wins (anchor profit varies with how
  // much demand the complement leaves it, so rank on the whole-fleet total).
  const nkeep = ncands.filter((c) => c.purchase === 0 || c.payProfit > 0);
  if (nkeep.length === 0) return fail("No profitable fleet — operating costs exceed revenue at these settings");
  // Floor first: fewest planes forced idle (so all N fly where possible), then daily profit.
  nkeep.sort((x, y) => (x.short - y.short) || (y.profit - x.profit));
  // Dedup by allocated-fleet signature (a 2-type candidate whose 2nd type gets
  // trimmed can allocate to the identical fleet as a 1-type candidate).
  const nseen = new Set();
  const nuniq = [];
  for (const c of nkeep) { const sg = fleetSig(c.fleet); if (nseen.has(sg)) continue; nseen.add(sg); nuniq.push(c); }
  const nwin = nuniq[0];
  const alternatives = nuniq.slice(1, 4).map((c) => ({
    planes: c.planes, purchase: c.purchase, profit: c.profit, payProfit: c.payProfit, fleet: c.fleet,
  }));

  return {
    fleet: nwin.fleet,
    summary: {
      totalProfit: nwin.profit,
      totalRevenue: nwin.fleet.reduce((s, f) => s + f.revenuePerDay, 0),
      totalCost: nwin.fleet.reduce((s, f) => s + f.costPerDay, 0),
      totalAircraft: nwin.fleet.reduce((s, f) => s + f.qty, 0),
      totalPurchase: nwin.purchase,
      complementProfit: nwin.payProfit, anchorPurchase: anchorSpend(nwin.fleet), hasAnchors,
      servedY: yD - Math.max(0, nwin.remY), servedJ: jD - Math.max(0, nwin.remJ), servedF: fD - Math.max(0, nwin.remF),
      unservedY: Math.max(0, nwin.remY), unservedJ: Math.max(0, nwin.remJ), unservedF: Math.max(0, nwin.remF),
      yPrice: yP, jPrice: jP, fPrice: fP, totalCapNeeded,
      alternatives, _pool: top.length,
    },
  };
}

// ── Main component ──────────────────────────────────────────────────────────
function createOptimizerWorker() {
  if (typeof Worker === "undefined" || typeof URL === "undefined") return null;
  try {
    const src = [
      "const P=" + JSON.stringify(P) + ";",
      "const PRICING=" + JSON.stringify(PRICING) + ";",
      "const MARKUP=" + JSON.stringify(MARKUP) + ";",
      "const n=" + n.toString() + ";",
      "const fmt=" + fmt.toString() + ";",
      "const fmtN=" + fmtN.toString() + ";",
      optimizeFleet.toString(),
      "function _run(p){p=p.slice();p[12]=new Set(p[12]);return optimizeFleet.apply(null,p);}",
      "self.onmessage=function(e){var d=e.data;" +
        "if(d.bench){var out=[];for(var i=0;i<d.suite.length;i++){var sc=d.suite[i];_run(sc.params);" + // warmup
          "var ts=[],rr=null;for(var k=0;k<d.iters;k++){var t0=performance.now();rr=_run(sc.params);ts.push(performance.now()-t0);}" +
          "ts.sort(function(a,b){return a-b;});var med=ts[Math.floor(ts.length/2)];" +
          "var fl=rr&&rr.fleet?rr.fleet.map(function(f){return f.qty+'x '+f.plane.n;}).join(' + '):'';" +
          "out.push({label:sc.label,ms:med,pool:rr&&rr.summary&&rr.summary._pool||0,fleet:fl||(rr&&rr.error)||'—',aircraft:rr&&rr.summary?rr.summary.totalAircraft:0});}" +
          "self.postMessage({bench:true,results:out});" +
        "}else{var t0=performance.now();var result=_run(d.params);var computeMs=performance.now()-t0;" +
          "self.postMessage({gen:d.gen,result:result,computeMs:computeMs});}};"
    ].join("\n");
    return new Worker(URL.createObjectURL(new Blob([src],{type:"application/javascript"})));
  } catch(e) { return null; }
}

// ── Input persistence ────────────────────────────────────────────────────────
// Inputs are saved to the browser's on-device localStorage so a tab reload (or a
// mobile tab discard) restores the session. Key is namespaced because every tool on
// zebraavatar.github.io shares one localStorage origin. All access is try/catch-guarded:
// private-browsing modes and blocked-storage settings can throw on read OR write.
const INPUT_STORE_KEY = "am4fleet:inputs";
const loadSavedInputs = () => {
  try {
    const s = JSON.parse(localStorage.getItem(INPUT_STORE_KEY));
    return s && typeof s === "object" ? s : {};
  } catch (_) { return {}; }
};
const saveInputs = (snap) => {
  try { localStorage.setItem(INPUT_STORE_KEY, JSON.stringify(snap)); } catch (_) {}
};

export default function FleetOptimizer() {
  const [saved] = useState(loadSavedInputs); // parsed once per mount
  const [dist, setDist] = useState(saved.dist ?? null);
  const [mode, setMode] = useState(saved.mode ?? "easy");
  const [fuelKPrice, setFuelKPrice] = useState(saved.fuelKPrice ?? 700);
  const [co2Quota, setCo2Quota] = useState(saved.co2Quota ?? 120);
  const [opHrs, setOpHrs] = useState(saved.opHrs ?? 24);
  const [yDem, setYDem] = useState(saved.yDem ?? null);
  const [jDem, setJDem] = useState(saved.jDem ?? null);
  const [fDem, setFDem] = useState(saved.fDem ?? null);
  const [maxRunway, setMaxRunway] = useState(saved.maxRunway ?? null);
  const [maxPlanePrice, setMaxPlanePrice] = useState(saved.maxPlanePrice ?? null);
  const [maxFleetPrice, setMaxFleetPrice] = useState(saved.maxFleetPrice ?? null);
  const [rep, setRep] = useState(saved.rep ?? null);
  const [excludedMfrs, setExcludedMfrs] = useState(() => new Set(Array.isArray(saved.excludedMfrs) ? saved.excludedMfrs : []));
  const [maxAircraft, setMaxAircraft] = useState(saved.maxAircraft ?? null);
  const [maxAirframes, setMaxAirframes] = useState(saved.maxAirframes ?? null);
  const [minAircraft, setMinAircraft] = useState(saved.minAircraft ?? null);
  const [equalize, setEqualize] = useState(saved.equalize ?? false);
  const [stopovers, setStopover] = useState(saved.stopovers ?? false);
  const [horizon, setHorizon] = useState(saved.horizon ?? null);
  const [anchors, setAnchors] = useState(Array.isArray(saved.anchors) ? saved.anchors : []);          // [{ id, n, qty, f, j, y }]
  const [anchorAutoConfig, setAnchorAutoConfig] = useState(saved.anchorAutoConfig ?? false);
  const [anchorOpen, setAnchorOpen] = useState(Array.isArray(saved.anchors) && saved.anchors.length > 0); // restored anchors must be visible
  const [advOpen, setAdvOpen] = useState(false);
  const [computing, setComputing] = useState(false);
  const workerRef = useRef(null);
  const genRef = useRef(0);

  const [result, setResult] = useState({ fleet: [], summary: null });
  const [pending, setPending] = useState(false);
  const [altOpen, setAltOpen] = useState(null);
  const [lockedA, setLockedA] = useState(null);     // { id, profit, fleetCost, fleet, label } — snapshot; persists across input changes
  const [activeComp, setActiveComp] = useState(null); // { id, label } — which B is being compared; resets on input change
  const [computeMs, setComputeMs] = useState(null);   // last worker compute time (RC dev readout)
  const [devOpen, setDevOpen] = useState(false);
  const [benchRunning, setBenchRunning] = useState(false);
  const [benchResults, setBenchResults] = useState(null);
  const [benchDevice, setBenchDevice] = useState(null);
  const timerRef = useRef(null);
  const yRef = useRef(null);
  const jRef = useRef(null);
  const fRef = useRef(null);
  const anchorRefs = useRef({}); // per-row { qty, y, j, f } refs for keyboard tab-advance

  const resetAll = () => {
    setDist(null); setMode("easy"); setFuelKPrice(700); setCo2Quota(120); setOpHrs(24);
    setYDem(null); setJDem(null); setFDem(null);
    setMaxRunway(null); setMaxPlanePrice(null); setMaxFleetPrice(null);
    setRep(null); setExcludedMfrs(new Set());
    setMaxAircraft(null); setMaxAirframes(null); setMinAircraft(null);
    setEqualize(false); setStopover(false);
    setHorizon(null);
    setAnchors([]); setAnchorAutoConfig(false);
  };

  // Persist every input change (resetAll included — it writes the cleared state).
  useEffect(() => {
    saveInputs({ v: 1, dist, mode, fuelKPrice, co2Quota, opHrs, yDem, jDem, fDem,
      maxRunway, maxPlanePrice, maxFleetPrice, rep, excludedMfrs: [...excludedMfrs],
      maxAircraft, maxAirframes, minAircraft, equalize, stopovers, horizon, anchors, anchorAutoConfig });
  }, [dist, mode, fuelKPrice, co2Quota, opHrs, yDem, jDem, fDem, maxRunway, maxPlanePrice,
      maxFleetPrice, rep, excludedMfrs, maxAircraft, maxAirframes, minAircraft, equalize,
      stopovers, horizon, anchors, anchorAutoConfig]);

  // ── Anchor list helpers ──
  const addAnchor = () => setAnchors((as) => [...as, { id: Date.now() + Math.random(), n: null, qty: null, f: null, j: null, y: null }]);
  const removeAnchor = (id) => setAnchors((as) => as.filter((a) => a.id !== id));
  const updateAnchor = (id, patch) => setAnchors((as) => as.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const pickAnchorPlane = (id, name) => updateAnchor(id, { n: name }); // leave config blank; empty Y => all-economy
  const validAnchors = anchors.filter((a) => a.n && (a.qty == null || n(a.qty) > 0));

  useEffect(() => {
    // Wire a worker's handlers. onerror is a safety net: if a compute ever throws inside the
    // worker, don't leave the UI stuck on "computing…" with a now-dead worker — surface a
    // message, clear the in-flight flags, and respawn so subsequent runs still work.
    const wire = (w) => {
      if (!w) return w;
      w.onmessage = (e) => {
        if (e.data.bench) { setBenchResults(e.data.results); setBenchRunning(false); return; }
        if (e.data.gen === genRef.current) {
          setResult(e.data.result); setComputeMs(e.data.computeMs); setPending(false); setComputing(false);
          setAltOpen(null); setActiveComp(null);
        }
      };
      w.onerror = (ev) => {
        if (ev && ev.preventDefault) ev.preventDefault();
        setComputing(false); setPending(false); setBenchRunning(false);
        setResult({ fleet: [], summary: null, reason: "Something went wrong computing this fleet — adjust an input and try again." });
        try { w.terminate(); } catch (_) {}
        workerRef.current = wire(createOptimizerWorker());
      };
      return w;
    };
    workerRef.current = wire(createOptimizerWorker());
    return () => { if (workerRef.current) workerRef.current.terminate(); };
  }, []);

  useEffect(() => {
    setPending(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const anchorsData = validAnchors.map((a) => ({ n: a.n, qty: n(a.qty) > 0 ? n(a.qty) : 1, f: a.f == null ? null : n(a.f), j: a.j == null ? null : n(a.j), y: a.y == null ? null : n(a.y) }));
      const params = [dist, yDem, jDem, fDem, mode, fuelKPrice, co2Quota, opHrs, maxRunway, maxPlanePrice, maxFleetPrice, rep, [...excludedMfrs], maxAircraft, maxAirframes, equalize, stopovers, horizon, anchorsData, anchorAutoConfig, minAircraft];
      if (workerRef.current) {
        genRef.current++; setComputing(true);
        workerRef.current.postMessage({ gen: genRef.current, params });
      } else {
        params[12] = new Set(params[12]);
        const _t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
        setResult(optimizeFleet(...params));
        setComputeMs((typeof performance !== "undefined" ? performance.now() : Date.now()) - _t0);
        setPending(false); setAltOpen(null); setActiveComp(null);
      }
    }, 250);
    return () => clearTimeout(timerRef.current);
  }, [dist, yDem, jDem, fDem, mode, fuelKPrice, co2Quota, opHrs, maxRunway, maxPlanePrice, maxFleetPrice, rep, excludedMfrs, maxAircraft, maxAirframes, equalize, stopovers, horizon, anchors, anchorAutoConfig, minAircraft]);

  const s = result.summary;
  const r = n(rep) || 100;
  const yD = Math.floor(n(yDem) * r / 100), jD = Math.floor(n(jDem) * r / 100), fD = Math.floor(n(fDem) * r / 100);

  const advCount = [fuelKPrice !== 700, co2Quota !== 120, maxRunway != null, maxPlanePrice != null,
    maxFleetPrice != null, minAircraft != null, maxAircraft != null, maxAirframes != null, horizon != null].filter(Boolean).length;

  const VERSION = "v0.6.6-rc.5";
  const isRC = /-rc/.test(VERSION); // dev tooling (compute readout + benchmark) shows only in RC builds

  // ── Dev benchmark (RC only): time a fixed scenario suite in the worker, off the UI thread,
  // so we see real on-device numbers without typing conditions in by hand. Each scenario runs a
  // few times; the worker reports the median plus the winning fleet as a sanity check. ──
  const runBenchmark = () => {
    if (benchRunning) return;
    const A = [{ n: "B787-8", qty: 2, f: null, j: null, y: null }]; // in-range anchor for the long route
    const P_ = (over) => [10539, 568, 617, 161, "easy", 700, 120, 24, null, null, null, 100, [], null, null, false, false, null, [], false, null]
      .map((v, i) => (over && i in over ? over[i] : v));
    const suite = [
      { label: "long · no horizon", params: P_({}) },
      { label: "long · 30d", params: P_({ 17: 30 }) },
      { label: "mid 3000 · 30d heavy", params: P_({ 0: 3000, 1: 900, 2: 400, 3: 150, 17: 30 }) },
      { label: "short 300 · 30d heavy", params: P_({ 0: 300, 1: 900, 2: 400, 3: 150, 17: 30 }) },
      { label: "short 300 · min 10", params: P_({ 0: 300, 1: 900, 2: 400, 3: 150, 17: 30, 20: 10 }) },
      { label: "long · 30d · 2 anchors", params: P_({ 17: 30, 18: A }) },
      { label: "mid 3000 · 30d · equalize", params: P_({ 0: 3000, 1: 900, 2: 400, 3: 150, 15: true, 17: 30 }) },
    ];
    const dev = typeof navigator !== "undefined"
      ? `${navigator.hardwareConcurrency || "?"} cores${navigator.deviceMemory ? ` · ${navigator.deviceMemory}GB` : ""}`
      : "unknown";
    setBenchDevice(dev); setBenchResults(null); setBenchRunning(true);
    if (workerRef.current) {
      workerRef.current.postMessage({ bench: true, suite, iters: 5 });
    } else {
      const out = suite.map((sc) => {
        const p = sc.params.slice(); p[12] = new Set(p[12]);
        let rr = null; const ts = [];
        for (let k = 0; k < 5; k++) { const t0 = performance.now(); rr = optimizeFleet(...p); ts.push(performance.now() - t0); }
        ts.sort((a, b) => a - b);
        const fl = rr && rr.fleet ? rr.fleet.map((f) => `${f.qty}× ${f.plane.n}`).join(" + ") : "";
        return { label: sc.label, ms: ts[2], pool: (rr && rr.summary && rr.summary._pool) || 0, fleet: fl || (rr && rr.error) || "—", aircraft: rr && rr.summary ? rr.summary.totalAircraft : 0 };
      });
      setBenchResults(out); setBenchRunning(false);
    }
  };

  // ── Scenario comparison ──
  // Candidates = current winner + Pareto runner-ups. `id` is a stable object
  // reference from `result`, so identity survives re-renders but not recomputes
  // (after an input change no current candidate is identified with locked A).
  const winnerCand = s && result.fleet.length > 0
    ? { id: result.fleet, profit: s.totalProfit, fleetCost: s.totalPurchase, payProfit: s.complementProfit, fleet: result.fleet, rank: 0 }
    : null;
  const altCands = s && s.alternatives
    ? s.alternatives.map((alt, i) => ({ id: alt, profit: alt.profit, fleetCost: alt.purchase, payProfit: alt.payProfit, fleet: alt.fleet, rank: i + 1 }))
    : [];

  const makeLabel = (rank) => {
    const parts = [];
    if (dist) parts.push(`${n(dist)}km`);
    if (excludedMfrs.size) parts.push(`no ${[...excludedMfrs].join("/")} `);
    if (s && s.horizon) parts.push(`@${fmtN(s.horizon)}d`);
    parts.push(rank === 0 ? "winner" : `alt ${rank}`);
    return parts.join(" · ");
  };

  const clearA = () => { setLockedA(null); setActiveComp(null); };

  const handleCompBtn = (cand) => {
    if (!lockedA) {
      setLockedA({ id: cand.id, profit: cand.profit, fleetCost: cand.fleetCost, payProfit: cand.payProfit, fleet: cand.fleet, label: makeLabel(cand.rank) });
      setActiveComp(null);
    } else if (lockedA.id === cand.id) {
      clearA(); // Unlock
    } else if (activeComp && activeComp.id === cand.id) {
      setActiveComp(null);
    } else {
      setActiveComp({ id: cand.id, label: makeLabel(cand.rank) });
    }
  };

  const compBtn = (cand) => {
    const isA = lockedA && lockedA.id === cand.id;
    const isActive = activeComp && activeComp.id === cand.id;
    const label = !lockedA ? "Lock as A" : isA ? "Unlock" : isActive ? "Comparing ✓" : "Compare vs A";
    const color = isA ? "#a55" : isActive ? "#7c8" : "#5a7";
    return (
      <button onClick={(e) => { e.stopPropagation(); handleCompBtn(cand); }} style={{
        background: "none", border: `0.0625rem solid ${color}`, borderRadius: rem(4), color,
        padding: rem(3, 8), fontSize: rem(10), fontFamily: "'DM Mono', monospace",
        cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
      }}>{label}</button>
    );
  };

  return (
    <div>
      <style>{`
        @keyframes compDot { 0%,20%{opacity:.15} 40%,100%{opacity:1} }
        @keyframes compFadeIn { from{opacity:0} to{opacity:1} }
      `}</style>
    <div style={{
      minHeight: "100vh", background: "#111", color: "#d4d4d4",
      fontFamily: "'DM Mono', 'Fira Code', 'Consolas', monospace",
      padding: rem(16, 12), maxWidth: rem(720), margin: "0 auto",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet" />

      <div style={{ borderBottom: "0.0625rem solid #2a2a2a", paddingBottom: rem(10), marginBottom: rem(16), display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: rem(16), color: "#5a7", fontWeight: 500, letterSpacing: "0.08em" }}>
            AM4 FLEET HELPER
          </h1>
          <div style={{ fontSize: rem(11), color: "#555", marginTop: rem(2) }}>
            {VERSION}{isRC && computeMs != null ? <span style={{ color: "#4a6" }}> · {Math.round(computeMs)} ms</span> : null}
          </div>
        </div>
        <button onClick={resetAll} style={{
          background: "none", border: "0.0625rem solid #333", borderRadius: rem(4),
          color: "#666", padding: rem(4, 10), fontSize: rem(11), cursor: "pointer",
          fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em",
        }}>Reset</button>
      </div>

      {/* ── INPUTS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: rem(10), marginBottom: rem(10) }}>
        <div>
          {/* Row 1: toggles · manufacturers · rep */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: rem(12), alignItems: "flex-start", marginBottom: rem(10) }}>
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: rem(3), cursor: "pointer" }}>
              <span style={{ fontSize: rem(11), color: stopovers ? "#5a7" : "#8a8a8a", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>2x Range</span>
              <div style={{ height: rem(29), display: "flex", alignItems: "center" }}>
                <Check checked={stopovers} onChange={(e) => setStopover(e.target.checked)} />
              </div>
            </label>
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: rem(3), cursor: "pointer" }}>
              <span style={{ fontSize: rem(11), color: equalize ? "#5a7" : "#8a8a8a", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Equalize</span>
              <div style={{ height: rem(29), display: "flex", alignItems: "center" }}>
                <Check checked={equalize} onChange={(e) => setEqualize(e.target.checked)} />
              </div>
            </label>
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: rem(3), cursor: "pointer" }}>
              <span style={{ fontSize: rem(11), color: maxAirframes === 1 ? "#5a7" : "#8a8a8a", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Single Type</span>
              <div style={{ height: rem(29), display: "flex", alignItems: "center" }}>
                <Check checked={maxAirframes === 1} onChange={(e) => setMaxAirframes(e.target.checked ? 1 : null)} />
              </div>
            </label>
            <div style={{ flex: 1, minWidth: rem(110) }}>
              <MfrFilter excluded={excludedMfrs} setExcluded={setExcludedMfrs} />
            </div>
            <div style={{ width: rem(52) }}>
              <NumInput label="Rep %" value={rep} onChange={setRep} placeholder="100" small max={100} />
            </div>
          </div>

          {/* Row 2: distance · demand · op hours — sized to stay on one row on narrow screens */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: rem(10) }}>
            <div style={{ flex: `1.3 0 ${rem(80)}`, minWidth: 0, maxWidth: rem(240) }}>
              <NumInput label="Dist (km)" value={dist} onChange={setDist} placeholder="km" advanceRef={yRef} />
            </div>
            <div style={{ flex: `1 0 ${rem(48)}`, minWidth: 0, maxWidth: rem(120) }}>
              <NumInput label="Y" value={yDem} onChange={setYDem} placeholder="0"
                innerRef={yRef} advanceRef={jRef}
                onOverflow={(vals) => { setJDem(vals[0] != null ? vals[0] : null); if (vals.length > 1) setFDem(vals[1]); }} />
            </div>
            <div style={{ flex: `1 0 ${rem(48)}`, minWidth: 0, maxWidth: rem(120) }}>
              <NumInput label="J" value={jDem} onChange={setJDem} placeholder="0"
                innerRef={jRef} advanceRef={fRef}
                onOverflow={(vals) => { setFDem(vals[0] != null ? vals[0] : null); }} />
            </div>
            <div style={{ flex: `0.7 0 ${rem(40)}`, minWidth: 0, maxWidth: rem(80) }}>
              <NumInput label="F" value={fDem} onChange={setFDem} placeholder="0"
                innerRef={fRef} onOverflow={() => {}} />
            </div>
            <div style={{ flex: `0.7 0 ${rem(44)}`, minWidth: 0, maxWidth: rem(80) }}>
              <NumInput label="Hrs/d" value={opHrs} onChange={setOpHrs} placeholder="24" />
            </div>
          </div>
        </div>

        {/* Mode: vertical rail spanning both rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {["easy", "realism"].map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: rem(0, 10), fontSize: rem(12),
              fontFamily: "'DM Mono', monospace", cursor: "pointer",
              background: mode === m ? "#2a3a2a" : "#1a1a1a",
              color: mode === m ? "#5a7" : "#666",
              border: mode === m ? "0.0625rem solid #5a7" : "0.0625rem solid #333",
              borderRadius: m === "easy" ? rem(4, 4, 0, 0) : rem(0, 0, 4, 4),
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ── ADVANCED ── */}
      <div style={{ marginBottom: rem(20) }}>
        <div onClick={() => setAdvOpen(!advOpen)} style={{
          fontSize: rem(11), color: "#666", textTransform: "uppercase", letterSpacing: "0.05em",
          cursor: "pointer", userSelect: "none", padding: rem(4, 0),
        }}>
          <span style={{ color: "#555" }}>{advOpen ? "▾ " : "▸ "}</span>Advanced
          {advCount > 0 && <span style={{ color: "#c86" }}> · {advCount} set</span>}
        </div>
        {advOpen && (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${rem(130)}), 1fr))`, gap: rem(10), marginTop: rem(6) }}>
            <NumInput label="Fuel ($/1000 lb)" value={fuelKPrice} onChange={setFuelKPrice} />
            <NumInput label="CO₂ ($/quota)" value={co2Quota} onChange={setCo2Quota} />
            <NumInput label="Max Runway (ft)" value={maxRunway} onChange={setMaxRunway} placeholder="unlimited" />
            <NumInput label="Max Plane $" value={maxPlanePrice} onChange={setMaxPlanePrice} placeholder="unlimited" />
            <NumInput label="Max Fleet $" value={maxFleetPrice} onChange={setMaxFleetPrice} placeholder="unlimited" />
            <NumInput label="Min # Aircraft" value={minAircraft} onChange={setMinAircraft} placeholder="none" />
            <NumInput label="Max # Aircraft" value={maxAircraft} onChange={setMaxAircraft} placeholder="unlimited" />
            <NumInput label="Max Aircraft Types" value={maxAirframes} onChange={setMaxAirframes} placeholder="unlimited" />
            <NumInput label="Best fleet after (days)" value={horizon} onChange={setHorizon} placeholder="unlimited" />
          </div>
        )}
      </div>

      {/* ── ANCHOR AIRCRAFT ── */}
      <div style={{ marginBottom: rem(20) }}>
        <div onClick={() => setAnchorOpen(!anchorOpen)} style={{
          fontSize: rem(11), color: "#666", textTransform: "uppercase", letterSpacing: "0.05em",
          cursor: "pointer", userSelect: "none", padding: rem(4, 0),
        }}>
          <span style={{ color: "#555" }}>{anchorOpen ? "▾ " : "▸ "}</span>Anchor aircraft
          {validAnchors.length > 0 && <span style={{ color: "#c86" }}> · {validAnchors.length} owned</span>}
        </div>
        {anchorOpen && (
          <div style={{ marginTop: rem(6) }}>
            <div style={{ fontSize: rem(11), color: "#777", lineHeight: 1.6, marginBottom: rem(10) }}>
              Force planes you already own into the fleet; the rest is optimized around them. Owned planes are a sunk cost — they add to profit (and can run an operating loss), but never to spend. They're exempt from the aircraft limits and are never sold off.
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: rem(8), marginBottom: rem(12), cursor: "pointer" }}>
              <Check checked={anchorAutoConfig} onChange={(e) => setAnchorAutoConfig(e.target.checked)} size={14} />
              <span style={{ fontSize: rem(12), color: anchorAutoConfig ? "#5a7" : "#999", fontFamily: "'DM Mono', monospace" }}>
                Let the tool choose configs <span style={{ color: "#666" }}>(pay the in-game reconfigure cost)</span>
              </span>
            </label>
            {anchors.map((a) => {
              const refs = anchorRefs.current[a.id] || (anchorRefs.current[a.id] = { qty: { current: null }, y: { current: null }, j: { current: null }, f: { current: null } });
              const aCap = a.n ? (P.find((p) => p.n === a.n) || {}).p : null;
              return (
              <div key={a.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: rem(6), marginBottom: rem(8) }}>
                <PlanePicker value={a.n} onChange={(name) => pickAnchorPlane(a.id, name)} />
                <div style={{ width: rem(46) }}>
                  <NumInput label="Qty" value={a.qty} onChange={(v) => updateAnchor(a.id, { qty: v })} small placeholder="1" innerRef={refs.qty} advanceRef={anchorAutoConfig ? undefined : refs.y} />
                </div>
                {anchorAutoConfig ? (
                  <div style={{ flex: `0 0 ${rem(162)}`, height: rem(34), display: "flex", alignItems: "center", fontSize: rem(11), color: "#5a7", fontFamily: "'DM Mono', monospace", letterSpacing: "0.04em" }}>
                    config chosen by tool
                  </div>
                ) : (
                  <>
                    <div style={{ width: rem(46) }}><NumInput label="Y" value={a.y} onChange={(v) => updateAnchor(a.id, { y: v })} small placeholder={aCap ? String(aCap) : "all"} innerRef={refs.y} advanceRef={refs.j} /></div>
                    <div style={{ width: rem(46) }}><NumInput label="J" value={a.j} onChange={(v) => updateAnchor(a.id, { j: v })} small placeholder="0" innerRef={refs.j} advanceRef={refs.f} /></div>
                    <div style={{ width: rem(46) }}><NumInput label="F" value={a.f} onChange={(v) => updateAnchor(a.id, { f: v })} small placeholder="0" innerRef={refs.f} /></div>
                  </>
                )}
                <button onClick={() => removeAnchor(a.id)} title="Remove" style={{
                  background: "none", border: "0.0625rem solid #a55", borderRadius: rem(4), color: "#a55",
                  padding: rem(0, 10), fontSize: rem(16), fontFamily: "'DM Mono', monospace", cursor: "pointer",
                  height: rem(34), lineHeight: 1,
                }}>×</button>
              </div>
              );
            })}
            <button onClick={addAnchor} style={{
              background: "#1a2a1a", border: "0.0625rem solid #2a4a2a", borderRadius: rem(4), color: "#5a7",
              padding: rem(6, 12), fontSize: rem(12), fontFamily: "'DM Mono', monospace", cursor: "pointer",
              marginTop: rem(2),
            }}>+ Add anchor</button>
          </div>
        )}
      </div>

      {/* ── SCENARIO A (locked) ── */}
      {lockedA && (
        <div style={{ marginBottom: rem(16) }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: rem(6) }}>
            <span style={{ fontSize: rem(10), color: "#a55", textTransform: "uppercase", letterSpacing: "0.06em" }}>Scenario A — locked</span>
            <button onClick={clearA} style={{
              background: "none", border: "0.0625rem solid #a55", borderRadius: rem(4), color: "#a55",
              padding: rem(3, 10), fontSize: rem(11), fontFamily: "'DM Mono', monospace", cursor: "pointer",
            }}>Clear A</button>
          </div>
          <div style={{ background: "#1a1a1a", border: "0.0625rem solid #a5534444", borderRadius: rem(7), padding: rem(11, 13) }}>
            <div style={{ fontSize: rem(10), color: "#a55", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: rem(3) }}>{lockedA.label}</div>
            <div style={{ fontSize: rem(19), color: "#7c8", fontWeight: 500, lineHeight: 1 }}>
              {fmt(lockedA.profit)}<span style={{ fontSize: rem(10), color: "#555", marginLeft: rem(3) }}>/day</span>
            </div>
            <div style={{ fontSize: rem(11), color: "#555", marginTop: rem(3) }}>
              {fmt(lockedA.fleetCost)} fleet{lockedA.payProfit > 0 && lockedA.fleetCost > 0 ? ` · payback ${(lockedA.fleetCost / lockedA.payProfit).toFixed(1)}d` : ""}
            </div>
            <div style={{ marginTop: rem(8) }}>
              {lockedA.fleet.map((f, k) => (
                <div key={k} style={{ fontSize: rem(11), color: "#777", lineHeight: 1.8 }}>
                  ×{f.qty} {f.plane.n}{f.anchor ? <span style={{ color: "#c86" }}> (owned)</span> : ""} — <span style={{ color: "#7a7" }}>{f.ySeats}Y</span>
                  {f.jSeats > 0 && <span style={{ color: "#77a" }}> {f.jSeats}J</span>}
                  {f.fSeats > 0 && <span style={{ color: "#a77" }}> {f.fSeats}F</span>}
                  <span style={{ color: "#555" }}> · {f.redundant ? `redundant 0/${f.maxRot}/d` : `${f.rot}/${f.maxRot}/d`} · {f.profitPerDay < 0 ? "−" + fmt(-f.profitPerDay) : fmt(f.profitPerDay)}/day</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {computing && (
        <div style={{ textAlign: "center", padding: rem(20, 0), animation: "compFadeIn .15s ease .15s both" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", color: "#5a7", fontSize: rem(13), letterSpacing: "0.05em" }}>
            computing<span style={{ animation: "compDot 1.4s infinite 0s" }}>.</span><span style={{ animation: "compDot 1.4s infinite .2s" }}>.</span><span style={{ animation: "compDot 1.4s infinite .4s" }}>.</span>
          </span>
        </div>
      )}

      {/* ── SUMMARY ── */}
      {s && (
        <div style={{ opacity: pending ? 0.45 : 1, transition: "opacity 0.15s" }}>
          {lockedA && (
            <div style={{ fontSize: rem(10), color: "#5a7", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: rem(8) }}>
              Scenario B — pick one to compare
            </div>
          )}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: rem(8), marginBottom: rem(14),
          }}>
            <div style={{ background: "#1a2a1a", border: "0.0625rem solid #2a4a2a", borderRadius: rem(6), padding: rem(10, 12) }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: rem(8) }}>
                <div style={{ fontSize: rem(10), color: "#5a7", textTransform: "uppercase", letterSpacing: "0.08em" }}>Daily Profit</div>
                {winnerCand && compBtn(winnerCand)}
              </div>
              <div style={{ fontSize: rem(22), color: "#7c8", fontWeight: 500, marginTop: rem(2) }}>{fmt(s.totalProfit)}</div>
              {s.horizon && (
                <div style={{ fontSize: rem(10), color: "#5a7", marginTop: rem(2), fontWeight: 700 }}>
                  Net {fmt(s.net)} @ {fmtN(s.horizon)}d
                </div>
              )}
            </div>
            <div style={{ background: "#1a1a1a", border: "0.0625rem solid #2a2a2a", borderRadius: rem(6), padding: rem(10, 12) }}>
              <div style={{ fontSize: rem(10), color: "#888", textTransform: "uppercase", letterSpacing: "0.08em" }}>Fleet Cost{s.hasAnchors ? " (to buy)" : ""}</div>
              <div style={{ fontSize: rem(22), color: "#d4d4d4", fontWeight: 500, marginTop: rem(2) }}>{fmt(s.totalPurchase)}</div>
              {s.complementProfit > 0 && s.totalPurchase > 0 && (
                <div style={{ fontSize: rem(10), color: "#5a7", marginTop: rem(2) }}>
                  payback {(s.totalPurchase / s.complementProfit).toFixed(1)} days
                </div>
              )}
              {s.hasAnchors && s.anchorPurchase > 0 && (
                <div style={{ fontSize: rem(10), color: "#666", marginTop: rem(2) }}>
                  + {fmt(s.anchorPurchase)} owned (sunk)
                </div>
              )}
            </div>
          </div>

          {lockedA && activeComp && winnerCand && activeComp.id === winnerCand.id && (
            <div style={{ marginTop: rem(-4), marginBottom: rem(14) }}>
              <CompPanel a={lockedA} aLabel={lockedA.label} b={winnerCand} bLabel={activeComp.label} />
            </div>
          )}

          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: rem(8), marginBottom: rem(14),
          }}>
            <div style={{ background: "#1a1a1a", border: "0.0625rem solid #2a2a2a", borderRadius: rem(6), padding: rem(8, 10) }}>
              <div style={{ fontSize: rem(10), color: "#888", textTransform: "uppercase" }}>Revenue</div>
              <div style={{ fontSize: rem(14), color: "#d4d4d4", marginTop: rem(2) }}>{fmt(s.totalRevenue)}</div>
            </div>
            <div style={{ background: "#1a1a1a", border: "0.0625rem solid #2a2a2a", borderRadius: rem(6), padding: rem(8, 10) }}>
              <div style={{ fontSize: rem(10), color: "#888", textTransform: "uppercase" }}>Costs</div>
              <div style={{ fontSize: rem(14), color: "#c66", marginTop: rem(2) }}>{fmt(s.totalCost)}</div>
            </div>
            <div style={{ background: "#1a1a1a", border: "0.0625rem solid #2a2a2a", borderRadius: rem(6), padding: rem(8, 10) }}>
              <div style={{ fontSize: rem(10), color: "#888", textTransform: "uppercase" }}>Aircraft</div>
              <div style={{ fontSize: rem(14), color: "#d4d4d4", marginTop: rem(2) }}>{s.totalAircraft}</div>
            </div>
          </div>

          <div style={{ background: "#1a1a1a", border: "0.0625rem solid #2a2a2a", borderRadius: rem(6), padding: rem(10, 12), marginBottom: rem(14) }}>
            <div style={{ fontSize: rem(10), color: "#888", textTransform: "uppercase", marginBottom: rem(6) }}>Demand Coverage</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: rem(8) }}>
              {[["Y", s.servedY, yD, s.unservedY], ["J", s.servedJ, jD, s.unservedJ], ["F", s.servedF, fD, s.unservedF]].map(([cls, served, total, unserved]) => (
                <div key={cls}>
                  <div style={{ fontSize: rem(12), color: "#aaa" }}>
                    {cls}: <span style={{ color: unserved > 0 ? "#c86" : "#5a7" }}>{fmtN(served)}</span><span style={{ color: "#555" }}>/{fmtN(total)}</span>
                  </div>
                  <div style={{ marginTop: rem(3), height: rem(3), background: "#222", borderRadius: rem(2) }}>
                    <div style={{
                      height: "100%", borderRadius: rem(2),
                      width: `${total > 0 ? Math.min(100, (served / total) * 100) : 0}%`,
                      background: unserved > 0 ? "#c86" : "#5a7",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: rem(11), color: "#555", marginBottom: rem(14) }}>
            Tickets: Y={fmtPrice(s.yPrice)} · J={fmtPrice(s.jPrice)} · F={fmtPrice(s.fPrice)}<br />Capacity needed: {fmtN(s.totalCapNeeded)} units/day ({fmtN(yD)}×1 + {fmtN(jD)}×2 + {fmtN(fD)}×3)
          </div>

          {result.fleet.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: rem(12) }}>
                <thead>
                  <tr style={{ borderBottom: "0.0625rem solid #333" }}>
                    {["Aircraft", "Qty", "Config", "Flights", "Profit/Day", "Cost/Day"].map((h) => (
                      <th key={h} style={{
                        textAlign: "left", padding: rem(6, 8), color: "#666", fontSize: rem(10),
                        textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 400,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.fleet.map((f, i) => (
                    <tr key={i} style={{ borderBottom: "0.0625rem solid #1e1e1e", opacity: f.redundant ? 0.6 : 1 }}>
                      <td style={{ padding: rem(8, 8) }}>
                        <div style={{ color: "#d4d4d4", fontWeight: 500 }}>
                          {f.plane.n}
                          {f.anchor && <span style={{ color: "#c86", fontSize: rem(9), marginLeft: rem(5), textTransform: "uppercase", letterSpacing: "0.05em" }}>owned</span>}
                        </div>
                        <div style={{ color: "#555", fontSize: rem(10) }}>{f.plane.m}{f.anchor ? " · sunk cost" : ` · ${fmt(f.plane["$"])}${f.qty > 1 ? " ea" : ""}`}</div>
                      </td>
                      <td style={{ padding: rem(8), color: "#aaa" }}>×{f.qty}</td>
                      <td style={{ padding: rem(8) }}>
                        <span style={{ color: "#7a7" }}>{f.ySeats}Y</span>
                        {f.jSeats > 0 && <span style={{ color: "#77a" }}> {f.jSeats}J</span>}
                        {f.fSeats > 0 && <span style={{ color: "#a77" }}> {f.fSeats}F</span>}
                        <div style={{ color: "#444", fontSize: rem(10) }}>{f.ySeats + 2 * f.jSeats + 3 * f.fSeats}/{f.plane.p} cap</div>
                      </td>
                      <td style={{ padding: rem(8), color: "#888" }}>
                        {f.redundant
                          ? <span style={{ color: "#c86" }}>redundant · 0/{f.maxRot}/d</span>
                          : <>{f.rot}<span style={{ color: "#555" }}>/{f.maxRot}</span>/d</>}
                        {dist > 0 && <div style={{ color: "#444", fontSize: rem(10) }}>{fmtDuration(dist / (f.plane.s * (mode === "easy" ? 1.5 : 1)))}</div>}
                      </td>
                      <td style={{ padding: rem(8), color: f.profitPerDay < 0 ? "#c66" : "#7c8" }}>{f.profitPerDay < 0 ? "−" + fmt(-f.profitPerDay) : fmt(f.profitPerDay)}</td>
                      <td style={{ padding: rem(8), color: "#c66", fontSize: rem(11) }}>{fmt(f.costPerDay)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {s.alternatives && s.alternatives.length > 0 && (
            <div style={{ marginTop: rem(14) }}>
              <div style={{ fontSize: rem(10), color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: rem(4) }}>
                {s.horizon ? `Runner-up fleets ranked by net profit @ ${fmtN(s.horizon)} days` : "Runner-up fleets"}
              </div>
              {s.alternatives.map((alt, i) => (
                <div key={i} style={{ borderBottom: "0.0625rem solid #1a1a1a" }}>
                  <div
                    onClick={() => setAltOpen(altOpen === i ? null : i)}
                    style={{ fontSize: rem(11), color: "#888", padding: rem(6, 0), cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: rem(8) }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ color: "#555" }}>{altOpen === i ? "▾ " : "▸ "}</span>
                      {alt.planes}
                      <span style={{ color: "#7c8" }}> {fmt(alt.profit)}/day</span>
                      <span style={{ color: "#555" }}> · {fmt(alt.purchase)} fleet</span>
                      {s.horizon && alt.net != null && <span style={{ color: "#5a7", fontWeight: 700 }}> · Net {fmt(alt.net)} @ {fmtN(s.horizon)}d</span>}
                    </span>
                    {compBtn(altCands[i])}
                  </div>
                  {altOpen === i && alt.fleet.map((f, k) => (
                    <div key={k} style={{ fontSize: rem(11), color: "#777", padding: rem(0, 0, 6, 18) }}>
                      ×{f.qty} {f.plane.n}{f.anchor ? <span style={{ color: "#c86" }}> (owned)</span> : ""} — <span style={{ color: "#7a7" }}>{f.ySeats}Y</span>
                      {f.jSeats > 0 && <span style={{ color: "#77a" }}> {f.jSeats}J</span>}
                      {f.fSeats > 0 && <span style={{ color: "#a77" }}> {f.fSeats}F</span>}
                      <span style={{ color: "#555" }}> · {f.redundant ? `redundant 0/${f.maxRot}/d` : `${f.rot}/${f.maxRot}/d`} · {f.profitPerDay < 0 ? "−" + fmt(-f.profitPerDay) : fmt(f.profitPerDay)}/day</span>
                    </div>
                  ))}
                  {lockedA && activeComp && activeComp.id === alt && (
                    <div style={{ paddingBottom: rem(8) }}>
                      <CompPanel a={lockedA} aLabel={lockedA.label} b={altCands[i]} bLabel={activeComp.label} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {result.fleet.length === 0 && (
            <div style={{ color: "#666", textAlign: "center", padding: rem(30) }}>
              No profitable fleet found for these parameters.
            </div>
          )}
        </div>
      )}

      {!s && (
        <div style={{ color: result.reason ? "#c86" : "#555", textAlign: "center", padding: rem(30), fontSize: rem(13) }}>
          {result.reason || "Enter a distance and demand to see the optimal fleet."}
        </div>
      )}

      {isRC && (
        <div style={{ borderTop: "0.0625rem solid #2a2a2a", marginTop: rem(24), paddingTop: rem(12) }}>
          <div onClick={() => setDevOpen(!devOpen)} style={{
            fontSize: rem(11), color: "#666", textTransform: "uppercase", letterSpacing: "0.05em",
            cursor: "pointer", userSelect: "none", padding: rem(4, 0),
          }}>
            <span style={{ color: "#555" }}>{devOpen ? "▾ " : "▸ "}</span>Dev
          </div>
          {devOpen && (
            <div style={{ marginTop: rem(8) }}>
              <div style={{ fontSize: rem(11), color: "#777", lineHeight: 1.6, marginBottom: rem(10) }}>
                Benchmark times a fixed scenario suite in the worker and reports the median on this device — real on-device numbers, no typing required.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: rem(10), marginBottom: rem(10), flexWrap: "wrap" }}>
                <button onClick={runBenchmark} disabled={benchRunning} style={{
                  background: benchRunning ? "#1a1a1a" : "none", border: "0.0625rem solid #333", borderRadius: rem(4),
                  color: benchRunning ? "#666" : "#5a7", padding: rem(6, 12), fontSize: rem(11),
                  cursor: benchRunning ? "default" : "pointer", fontFamily: "'DM Mono', monospace",
                  textTransform: "uppercase", letterSpacing: "0.05em",
                }}>{benchRunning ? "Running…" : "Run benchmark"}</button>
                {benchDevice && <span style={{ fontSize: rem(11), color: "#666" }}>{benchDevice}</span>}
              </div>
              {benchResults && (
                <div style={{ fontSize: rem(11), color: "#aaa" }}>
                  {benchResults.map((b, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: `1fr ${rem(64)}`, gap: rem(8), padding: rem(5, 0), borderBottom: "0.0625rem solid #1e1e1e" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: "#ccc" }}>{b.label}</div>
                        <div style={{ color: "#666", fontSize: rem(10), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.fleet}{b.pool ? ` · pool ${b.pool}` : ""}</div>
                      </div>
                      <div style={{ textAlign: "right", alignSelf: "center", color: b.ms > 2500 ? "#c86" : b.ms > 800 ? "#ca6" : "#5a7" }}>{Math.round(b.ms)} ms</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  );
}
