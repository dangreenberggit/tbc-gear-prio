// Replays a ticket 542 base-mode trace (capture.mjs) through the two
// remaining-time estimators in the plan (Approach, "Remaining-time estimate"),
// applies the load-control discard rules D0-D3 first, and prints the
// estimator decision for H/decision.md.
//
// usage: node replay.mjs <trace.json> [--windows] [--alternatives]
//        node replay.mjs <panel-trace.json> --shown
//
// Round 4 (plan "Amendments (round 4): estimator") adds the slowdown
// estimator after the original output; --windows prints per-D3-window load
// figures and --alternatives the rejected round-4 estimators.
//
// --shown (plan Step 5) judges a panel-mode trace on the values the panel
// showed: e50 from the in-page t50/est50, the R4-d-4 replication count, the
// round-4 information checks (i)-(iii), and the trace-derived facts, merged
// into facts.json (a --captures trace) or facts-run2.json (run 2).
//
// Exit codes: 0 decision printed; 4 load discard (no decision values printed;
// an untimed --shown trace prints the discard and goes on); 5 --shown gate
// fail (|e50_shown| > 0.25 on a timing run); 6 a plan stop rule fired
// (boundary mismatch, no replication, or a replication count mismatch);
// 2 bad input.
//
// Times are ms since the Run click. Events are the first status record per
// `done` value; `/Ranking results/` is the `ranking` marker.

import fs from "node:fs";
import path from "node:path";

const SEEDS = 5; // TAB_REPLICATE_SEED_COUNT: the engine's DEFAULT_SEED_COUNT
const TOP_N = 8; // PAIRED_REPLICATE_TOP_N (engine/se.ts)
const BOUND = 0.25;
const MIN_CANDIDATES_DONE = 10;
const STABILITY_SHARE = 0.1;
const MAX_SHOW_FRACTION = 0.45;

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const sec = (ms) => (ms / 1000).toFixed(2) + "s";
const fmt = (x, d = 4) => (x == null ? "n/a" : Number(x).toFixed(d));

/** 1 + c for the unique c >= 0 with total = 1 + c + (s-1)(1 + min(topN, c)). */
export function replicationBoundary(total, seedCount = SEEDS, topN = TOP_N) {
  if (seedCount <= 1) return total;
  const hits = [];
  for (let c = 0; c <= total; c++)
    if (1 + c + (seedCount - 1) * (1 + Math.min(topN, c)) === total)
      hits.push(c);
  return hits.length === 1 ? 1 + hits[0] : null;
}

function parseTrace(trace) {
  const endT = trace.endT;
  const recs = trace.records.filter((r) => r.t <= endT && r.text != null);
  const markerIdx = recs.findIndex((r) => /Ranking results/.test(r.text));
  const seen = new Set();
  const sims = [];
  recs.forEach((r, i) => {
    const m = /(\d+)\/(\d+)/.exec(r.text);
    if (!m) return;
    const d = Number(m[1]);
    if (seen.has(d)) return;
    seen.add(d);
    sims.push({
      t: r.t,
      d,
      T: Number(m[2]),
      afterRank: markerIdx >= 0 && i > markerIdx,
    });
  });
  return {
    endT,
    sims,
    tRank: markerIdx >= 0 ? recs[markerIdx].t : null,
  };
}

/** The event sequence an estimator sees: simming events and the marker. */
function events(p) {
  const ev = [];
  for (const s of p.sims.filter((s) => !s.afterRank))
    ev.push({ kind: "simming", ...s });
  if (p.tRank !== null) ev.push({ kind: "ranking", t: p.tRank });
  for (const s of p.sims.filter((s) => s.afterRank))
    ev.push({ kind: "simming", ...s });
  return ev;
}

/** Estimate in effect after each event (null where the formula is undefined). */
function linear(p, T) {
  const t1 = p.sims[0].t;
  let lastD = null;
  return events(p).map((e) => {
    const d = e.kind === "ranking" ? lastD : e.d;
    if (e.kind === "simming") lastD = e.d;
    if (d == null || d < 2) return { ...e, est: null };
    return { ...e, est: Math.max(0, ((e.t - t1) / (d - 1)) * (T - d)) };
  });
}

function phased(p, T, B, N, kappa, psi) {
  const t1 = p.sims[0].t;
  const k = kappa * N;
  const R = T - B;
  let rB = null;
  let b = null;
  let tRank = null;
  let lastD = null;
  let lastT = null;
  return events(p).map((e) => {
    let est = null;
    if (e.kind === "ranking") {
      b = lastD;
      tRank = e.t;
      if (rB === null && b > 1) rB = (lastT - t1) / (b - 1);
      if (rB !== null) est = rB * k * (T - b);
    } else if (tRank === null) {
      lastD = e.d;
      lastT = e.t;
      if (e.d >= 2 && e.d < B) {
        const r = (e.t - t1) / (e.d - 1);
        est = r * (B - e.d + psi + k * R);
      } else if (e.d === B) {
        rB = (e.t - t1) / (B - 1);
        est = rB * (psi + k * R);
      }
    } else {
      const m = e.d - b;
      est =
        m === 1 ? rB * k * (T - e.d) : ((e.t - tRank) / m) * (T - e.d);
    }
    return { ...e, est: est === null ? null : Math.max(0, est) };
  });
}

const S = (x) => (x * (x + 1)) / 2;

/**
 * Cumulative candidate time for n candidates done: t(first event with
 * done >= n + 1) - t1, over the events before `ranking`.
 */
function candidateClock(p) {
  const t1 = p.sims[0].t;
  const before = p.sims.filter((s) => !s.afterRank);
  return (n) => before.find((s) => s.d >= n + 1).t - t1;
}

/**
 * Halves rule (plan R4-2): with the i-th candidate costing a(1 + beta i), fit
 * beta so the two halves of the first n candidates take the times observed.
 */
function betaHalves(n, tau) {
  const h = Math.floor(n / 2);
  if (h < 1) return 0;
  const tauH = tau(h);
  const rho = (tau(n) - tauH) / tauH;
  const beta = (rho * h - (n - h)) / (S(n) - S(h) - rho * S(h));
  return beta > 0 ? beta : 0;
}

/**
 * The round-3 phased estimator with the candidate-event rule replaced:
 * `remaining({n, tau, c})` gives the remaining candidate time C, and the
 * estimate is C + rbar (psi + k R) with rbar = (tau + C) / c (plan R4-2).
 * Boundary, ranking and replication rules are phased's.
 *
 * `Rhat` is the replication count (plan R4-d): T - B by default, which is
 * the round-4 estimator unchanged; panel traces pass the count from the
 * qualifying rows, and the replication rules then run to B + Rhat, falling
 * back to T if a later event passes it (R4-d's self-check).
 */
function phasedWith(p, T, B, N, kappa, psi, remaining, Rhat = T - B) {
  const t1 = p.sims[0].t;
  const k = kappa * N;
  let R = Rhat;
  let Tt = B + Rhat;
  const c = B - 1;
  let rB = null;
  let b = null;
  let tRank = null;
  let lastD = null;
  let lastT = null;
  return events(p).map((e) => {
    let est = null;
    if (e.kind === "ranking") {
      b = lastD;
      tRank = e.t;
      if (rB === null && b > 1) rB = (lastT - t1) / (b - 1);
      if (rB !== null) est = rB * k * (Tt - b);
    } else if (tRank === null) {
      lastD = e.d;
      lastT = e.t;
      if (e.d >= 2 && e.d < B) {
        const tau = e.t - t1;
        const C = remaining({ n: e.d - 1, tau, c });
        est = C + ((tau + C) / c) * (psi + k * R);
      } else if (e.d === B) {
        rB = (e.t - t1) / (B - 1);
        est = rB * (psi + k * R);
      }
    } else {
      if (e.d > Tt) {
        Tt = T;
        R = T - B;
      }
      const m = e.d - b;
      est =
        m === 1 ? rB * k * (Tt - e.d) : ((e.t - tRank) / m) * (Tt - e.d);
    }
    return { ...e, est: est === null ? null : Math.max(0, est) };
  });
}

/** Remaining candidate time when the i-th candidate costs a(1 + beta i). */
const slowdownRemaining =
  (beta) =>
  ({ n, tau, c }) => {
    const a = tau / (n + beta * S(n));
    return a * (c - n + beta * (S(c) - S(n)));
  };

/** Remaining candidate time when the i-th candidate costs max(a, m i). */
const clientFloorRemaining =
  (m) =>
  ({ n, tau, c }) => {
    const a = tau / n;
    let C = 0;
    for (let i = n + 1; i <= c; i++) C += Math.max(a, m * i);
    return C;
  };

/** Remaining candidate time at the rate of the last w candidates. */
const recentWindowRemaining =
  (clock) =>
  ({ n, tau, c }) => {
    const w = Math.max(30, Math.floor(n / 3));
    if (n <= w) return (tau / n) * (c - n);
    return ((clock(n) - clock(n - w)) / w) * (c - n);
  };

/** Slowdown with beta refitted by the halves rule over the n done so far. */
const onlineSlowdownRemaining =
  (clock) =>
  ({ n, tau, c }) =>
    slowdownRemaining(n >= 20 ? betaHalves(n, clock) : 0)({ n, tau, c });

/** Client-floor m by bisection: the second half's time with a_h = tau_h / h. */
function clientFloorM(c, tau) {
  const h = Math.floor(c / 2);
  const aH = tau(h) / h;
  const target = tau(c) - tau(h);
  let lo = 0;
  let hi = 10;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    let s = 0;
    for (let j = h + 1; j <= c; j++) s += Math.max(aH, mid * j);
    if (s < target) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Show-threshold rule (plan Approach item 3): d* is the smallest candidate
 * event with d - 1 >= 10 after which every F = t + est stays within 10% of
 * the run's wall time.
 */
function stability(series, B, T, endT) {
  const cand = series.filter(
    (e) =>
      e.kind === "simming" &&
      !e.afterRank &&
      e.d < B &&
      e.d - 1 >= MIN_CANDIDATES_DONE &&
      e.est != null
  );
  const limit = STABILITY_SHARE * endT;
  let dStar = null;
  for (let i = 0; i < cand.length; i++) {
    const F = cand.slice(i).map((e) => e.t + e.est);
    if (Math.max(...F) - Math.min(...F) <= limit) {
      dStar = cand[i].d;
      break;
    }
  }
  const raw = dStar === null ? null : dStar / T;
  const showFrom =
    raw === null
      ? null
      : Math.min(
          MAX_SHOW_FRACTION,
          Math.max(0.05, Math.ceil(20 * raw - 1e-9) / 20)
        );
  return { limit, dStar, raw, showFrom };
}

/** Relative error of the estimate in effect after the first event with d/T >= frac. */
function errorAt(series, T, endT, frac) {
  const e = series.find((x) => x.kind === "simming" && x.d / T >= frac);
  if (!e || e.est == null) return null;
  const actual = endT - e.t;
  return { d: e.d, t: e.t, est: e.est, actual, e: (e.est - actual) / actual };
}

function loadRules(trace, tracePath, p, B, N) {
  const lf = path.join(
    path.dirname(tracePath),
    trace.meta?.loadFile ?? path.basename(tracePath, ".json") + ".load.jsonl"
  );
  if (!fs.existsSync(lf)) return [`D0: no load file ${path.basename(lf)}`];
  const samples = fs
    .readFileSync(lf, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .map((s) => ({ ...s, rel: s.t - trace.t0Epoch }))
    .filter((s) => s.rel >= 0 && s.rel <= p.endT);
  const hits = [];
  if (!samples.some((s) => s.own >= 1))
    hits.push(
      `D0: none of ${samples.length} samples in the run saw this run's own :3333 socket`
    );
  const foreign = samples.filter((s) => (s.foreign ?? []).length > 0);
  if (foreign.length)
    hits.push(
      `D1: ${foreign.length} of ${samples.length} samples had a foreign :3333 client (${[
        ...new Set(
          foreign.flatMap((s) => s.foreign.map((f) => `${f.name}#${f.pid}`))
        ),
      ].join(", ")})`
    );
  const rep = p.sims.filter((s) => s.afterRank);
  const repGaps = rep.slice(1).map((s, i) => s.t - rep[i].t).slice(1);
  if (repGaps.length >= 2) {
    const mx = Math.max(...repGaps);
    const md = median(repGaps);
    if (mx > 2 * md)
      hits.push(
        `D2: largest replication interval ${sec(mx)} > 2 x median ${sec(md)}`
      );
  }
  const cand = p.sims.filter((s) => !s.afterRank && s.d < B).slice(2 * N);
  const wins = [];
  for (let i = 0; i + 30 <= cand.length; i += 30)
    wins.push(cand[i + 29].t - cand[i].t);
  const perCandidate = wins.map((w) => Math.round(w / 29));
  if (wins.length >= 2) {
    const mx = Math.max(...wins);
    const md = median(wins);
    if (mx > 2 * md)
      hits.push(
        `D3: longest 30-candidate window ${sec(mx)} > 2 x median ${sec(md)}`
      );
  }
  return {
    hits,
    samples: samples.length,
    windows: wins.length,
    repGaps: repGaps.length,
    perCandidate,
  };
}

/**
 * Per D3 window (the same windows as loadRules): wall ms per candidate,
 * sim-server CPU-s per candidate (backendCpuS interpolated linearly between
 * the load samples around the window's first and last event), cores busy,
 * the machine-load samples inside the window, and long-task time when the
 * trace has it.
 */
function windowLines(trace, tracePath, p, B, N) {
  const lf = path.join(
    path.dirname(tracePath),
    trace.meta?.loadFile ?? path.basename(tracePath, ".json") + ".load.jsonl"
  );
  const load = fs.existsSync(lf)
    ? fs
        .readFileSync(lf, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l))
        .map((s) => ({ ...s, rel: s.t - trace.t0Epoch }))
    : [];
  const cpuAt = (t) => {
    for (let i = 1; i < load.length; i++)
      if (load[i].rel >= t) {
        const a = load[i - 1];
        const b = load[i];
        return (
          a.backendCpuS +
          ((b.backendCpuS - a.backendCpuS) * (t - a.rel)) / (b.rel - a.rel)
        );
      }
    return null;
  };
  const longTasks = Array.isArray(trace.longTasks) ? trace.longTasks : null;
  const cand = p.sims.filter((s) => !s.afterRank && s.d < B).slice(2 * N);
  const lines = [];
  for (let i = 0; i + 30 <= cand.length; i += 30) {
    const a = cand[i];
    const b = cand[i + 29];
    const wall = b.t - a.t;
    const ca = cpuAt(a.t);
    const cb = cpuAt(b.t);
    const cpu = ca === null || cb === null ? null : cb - ca;
    const mach = load
      .filter((s) => s.rel >= a.t && s.rel <= b.t)
      .map((s) => s.machineLoadPct);
    let line =
      `window d ${a.d}-${b.d}: ${Math.round(wall / 29)} ms/candidate` +
      `  sim-server ${cpu === null ? "n/a" : fmt(cpu / 29, 2)} CPU-s/candidate` +
      `  cores busy ${cpu === null ? "n/a" : fmt(cpu / (wall / 1000), 1)}` +
      `  machine load ${mach.length ? mach.join(",") : "none"}`;
    if (longTasks) {
      const lt = longTasks
        .filter((x) => x.start >= a.t && x.start <= b.t)
        .reduce((sum, x) => sum + x.dur, 0);
      line += `  long tasks ${fmt(lt / 29, 1)} ms/candidate, ${fmt(lt / wall, 4)} of wall`;
    }
    lines.push(line);
  }
  if (!longTasks) lines.push("long tasks: none in this trace");
  return lines;
}

// ---------------------------------------------------------------------------
// --shown (plan Step 5, round-4 "Step 5 additions" and R4-d-4): a panel-mode
// trace from capture.mjs, judged on the values the panel showed.

// The shipped constants (run_progress.ts at fork 4d447adcd).
const SHIPPED = { kappa: 0.3221, psi: 50.993, slowdown: 0.003064 };
const BETA_RANGE = [0.0015, 0.0046];
const LONG_TASK_SHARE = 0.25;
const LONG_TASK_RISE = 3;

/** Seconds from the panel's elapsed text (run_progress.ts `formatElapsed`). */
function elapsedSeconds(text) {
  if (text == null) return null;
  let m = /^(\d+(?:\.\d+)?)s$/.exec(text.trim());
  if (m) return Number(m[1]);
  m = /^(\d+)m (\d+)s$/.exec(text.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/**
 * The panel samples as the base-mode event list: the first sample per
 * `done` is a simming event, and `ranking` is the first sample whose phase is
 * replication or ranking after a candidates or set-bonuses sample.
 */
function parsePanel(trace) {
  const samples = trace.panel;
  let rankIdx = -1;
  let candidatesSeen = false;
  samples.forEach((s, i) => {
    if (s.phase === "candidates" || s.phase === "set-bonuses") candidatesSeen = true;
    else if (
      rankIdx < 0 &&
      candidatesSeen &&
      (s.phase === "replication" || s.phase === "ranking")
    )
      rankIdx = i;
  });
  const seen = new Set();
  const sims = [];
  samples.forEach((s, i) => {
    if (s.done == null || seen.has(s.done)) return;
    seen.add(s.done);
    sims.push({
      t: s.t,
      d: s.done,
      T: s.total,
      afterRank: rankIdx >= 0 && i >= rankIdx,
      shown: s.remainingMs,
    });
  });
  return {
    endT: trace.endT,
    sims,
    tRank: rankIdx >= 0 ? samples[rankIdx].t : null,
    rankIdx,
    samples,
  };
}

function readLoad(trace, tracePath) {
  const lf = path.join(
    path.dirname(tracePath),
    trace.meta?.loadFile ?? path.basename(tracePath, ".json") + ".load.jsonl"
  );
  if (!fs.existsSync(lf)) return [];
  return fs
    .readFileSync(lf, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .map((s) => ({ ...s, rel: s.t - trace.t0Epoch }))
    .filter((s) => s.rel >= 0 && s.rel <= trace.endT);
}

const dedupe = (xs) => xs.filter((x, i) => i === 0 || x !== xs[i - 1]);

function shown(trace, tracePath) {
  if (trace.meta?.mode !== "panel" || !Array.isArray(trace.panel)) {
    console.error("replay: --shown needs a panel-mode trace");
    return 2;
  }
  const p = parsePanel(trace);
  if (!p.sims.length || p.endT == null) {
    console.error("replay: trace has no panel samples with a count, or no endT");
    return 2;
  }
  const timing = trace.meta.timing !== false;
  const N = trace.meta.N;
  const T = p.sims[0].T;
  const before = p.sims.filter((s) => !s.afterRank);
  const Bobs = before[before.length - 1].d;
  const Bpanel = p.samples.find((s) => s.boundary != null)?.boundary ?? null;
  const B = Bpanel ?? Bobs;

  const load = loadRules(trace, tracePath, p, B, N);
  const hits = Array.isArray(load) ? load : load.hits;
  const loadSamples = readLoad(trace, tracePath);
  const appProbeMax = loadSamples.reduce((m, s) => Math.max(m, s.appProbe ?? 0), 0);
  if (hits.length) {
    if (timing) {
      console.log(`load: DISCARD (${hits.join("; ")})`);
      return 4;
    }
    console.log(`load: DISCARD (${hits.join("; ")}) -- untimed trace, information only`);
  } else console.log("load: clean");
  console.log(
    `load detail: ${loadSamples.length} samples in the run, own max ${loadSamples.reduce((m, s) => Math.max(m, s.own), 0)}, appProbe max ${appProbeMax}`
  );
  if (!timing)
    console.log(
      `note: untimed trace (--candidates ${trace.meta.candidates}${trace.meta.captures ? ", --captures" : ""}); no gate applies`
    );

  const Bcalc = replicationBoundary(T);
  console.log(`T ${T}  boundary (panel) ${Bpanel}  B_obs ${Bobs}  B_calc ${Bcalc}`);

  // The gate: the value on screen at the first sample with done/T >= 0.5,
  // stored in the page by the observer (plan round-2 N8).
  const actual50 = trace.t50 == null ? null : p.endT - trace.t50;
  const e50 =
    trace.est50 == null || actual50 == null ? null : (trace.est50 - actual50) / actual50;
  console.log(
    `e50_shown ${fmt(e50)}  at t ${trace.t50 == null ? "n/a" : sec(trace.t50)}, shown ${trace.est50 == null ? "n/a" : sec(trace.est50)}, actual ${actual50 == null ? "n/a" : sec(actual50)}` +
      (timing ? `  (gate |e50| <= ${BOUND})` : "  (information; untimed)")
  );
  const shownAt = (f) => {
    const s = p.samples.find((x) => !x.hidden && x.done != null && x.done / x.total >= f);
    if (!s || s.remainingMs == null) return null;
    const actual = p.endT - s.t;
    return { d: s.done, est: s.remainingMs, actual, e: (s.remainingMs - actual) / actual };
  };
  for (const f of [0.25, 0.75]) {
    const r = shownAt(f);
    console.log(
      `e${f * 100}_shown ${r ? fmt(r.e) : "n/a"} (information)` +
        (r ? `  at d ${r.d}, shown ${sec(r.est)}, actual ${sec(r.actual)}` : "")
    );
  }
  const shownSeries = p.sims.map((s) => ({ kind: "simming", ...s, est: s.shown }));
  const shownStab = stability(shownSeries, B, T, p.endT);
  console.log(
    `stability of shown values: limit ${sec(shownStab.limit)}  d* ${shownStab.dStar}  raw ${fmt(shownStab.raw)} (information)`
  );

  // R4-d-4: the replication count the tab predicted against what ran.
  const rankSample = p.rankIdx > 0 ? p.samples[p.rankIdx - 1] : null;
  const Q = rankSample?.qualifyingRows ?? null;
  const Rhat = Q == null ? null : Q > 0 ? (SEEDS - 1) * (1 + Math.min(TOP_N, Q)) : 0;
  const dLast = Math.max(...p.sims.map((s) => s.d));
  const replicationSims = dLast - B;
  const replicationCountMatches = Rhat !== null && replicationSims === Rhat;
  console.log(
    `qualifyingRows ${Q} at the last sample before ranking  R_hat ${Rhat}  d_last ${dLast}  replication sims ${replicationSims}  replicationCountMatches ${replicationCountMatches}`
  );

  // Offline estimators on this run's (t, done) series with the shipped
  // constants and the qualifying-row count (information).
  const clock = candidateClock(p);
  const c = B - 1;
  const canFit = before.length > 1 && before[before.length - 1].d === B && c >= 2;
  const errLine = (name, s) =>
    `${name}: e25 ${fmt(errorAt(s, T, p.endT, 0.25)?.e)}  e50 ${fmt(errorAt(s, T, p.endT, 0.5)?.e)}  e75 ${fmt(errorAt(s, T, p.endT, 0.75)?.e)}  d* ${stability(s, B, T, p.endT).dStar}`;
  console.log(errLine("offline linear", linear(p, T)));
  const withRule = (rule) =>
    phasedWith(p, T, B, N, SHIPPED.kappa, SHIPPED.psi, rule, Rhat ?? T - B);
  if (canFit)
    console.log(errLine("offline shipped slowdown", withRule(slowdownRemaining(SHIPPED.slowdown))));
  const beta = canFit ? betaHalves(c, clock) : null;
  console.log(
    `slowdown beta refit ${beta == null ? "n/a" : beta.toPrecision(6)} (halves rule on this run; information)`
  );
  for (const l of windowLines(trace, tracePath, p, B, N)) console.log(l);
  if (canFit) {
    const m = clientFloorM(c, clock);
    console.log(`client floor m ${m.toPrecision(6)} ms (fitted on this run)`);
    const alternatives = [
      ["slowdown beta x0.5", slowdownRemaining(SHIPPED.slowdown * 0.5)],
      ["slowdown beta x1.5", slowdownRemaining(SHIPPED.slowdown * 1.5)],
      ["slowdown beta refit", slowdownRemaining(beta)],
      ["client floor m x0.75", clientFloorRemaining(m * 0.75)],
      ["client floor m x1", clientFloorRemaining(m)],
      ["client floor m x1.25", clientFloorRemaining(m * 1.25)],
      ["recent window", recentWindowRemaining(clock)],
      ["online slowdown", onlineSlowdownRemaining(clock)],
    ];
    for (const [name, rule] of alternatives)
      console.log(errLine(`alternative ${name}`, withRule(rule)));
  }

  // Round-4 checks (i)-(iii): information only, never a stop.
  const checks = [];
  checks.push(
    beta != null && beta >= BETA_RANGE[0] && beta <= BETA_RANGE[1]
      ? `check (i) ok: beta refit ${beta.toPrecision(6)} in [${BETA_RANGE.join(", ")}]`
      : `FLAG: check (i): beta refit ${beta == null ? "n/a" : beta.toPrecision(6)} outside [${BETA_RANGE.join(", ")}]`
  );
  checks.push(
    shownStab.raw != null && shownStab.raw <= MAX_SHOW_FRACTION
      ? `check (ii) ok: raw stability fraction of shown values ${fmt(shownStab.raw)} <= ${MAX_SHOW_FRACTION}`
      : `FLAG: check (ii): raw stability fraction of shown values ${fmt(shownStab.raw)} > ${MAX_SHOW_FRACTION}`
  );
  const longTasks = Array.isArray(trace.longTasks) ? trace.longTasks : null;
  if (!longTasks) checks.push("FLAG: no long-task data");
  else {
    const cand = p.sims.filter((s) => !s.afterRank && s.d < B).slice(2 * N);
    const shares = [];
    for (let i = 0; i + 30 <= cand.length; i += 30) {
      const a = cand[i];
      const b = cand[i + 29];
      const lt = longTasks
        .filter((x) => x.start >= a.t && x.start <= b.t)
        .reduce((sum, x) => sum + x.dur, 0);
      shares.push(lt / (b.t - a.t));
    }
    if (shares.length < 2)
      checks.push(
        `FLAG: check (iii): ${shares.length} full D3 window(s), two needed (cause not confirmed)`
      );
    else {
      const first = shares[0];
      const last = shares[shares.length - 1];
      checks.push(
        last >= LONG_TASK_SHARE && last >= LONG_TASK_RISE * first
          ? `check (iii) ok: long-task share of the last window ${fmt(last)} >= ${LONG_TASK_SHARE} and >= ${LONG_TASK_RISE} x the first ${fmt(first)}`
          : `FLAG: check (iii): long-task share of the last window ${fmt(last)}, first ${fmt(first)} (cause not confirmed)`
      );
    }
  }
  for (const l of checks) console.log(l);

  // Trace-derived facts (plan round-2 N8 lists for 5a and 5b).
  const vis = p.samples.filter((s) => !s.hidden);
  const phaseSequence = dedupe(vis.map((s) => s.phase));
  const firstCount = p.samples.findIndex((s) => s.done != null);
  const prep = vis.find((s) => s.phase === "preparing") ?? null;
  const half = trace.i50 == null ? null : p.samples[trace.i50];
  const setB = vis.find((s) => s.phase === "set-bonuses") ?? null;
  const rowsOf = (s) => {
    const m = /(\d+)/.exec(s.rows ?? "");
    return m ? Number(m[1]) : null;
  };
  const afterCand = p.samples.findIndex(
    (s) => s.phase != null && s.phase !== "preparing" && s.phase !== "candidates"
  );
  const rowsAfter = afterCand < 0 ? [] : p.samples.slice(afterCand).map(rowsOf);
  const lastSample = p.samples[p.samples.length - 1];
  const tookM = /Took (\d+)s/.exec(trace.endText ?? "");
  const took = tookM ? Number(tookM[1]) : null;
  const lastElapsed = elapsedSeconds(lastSample.elapsedText);
  // From the first count on: before the tab knows its runner the tracker
  // reports its default of 1.
  const concurrencies = [
    ...new Set(
      p.samples
        .filter((s) => s.done != null)
        .map((s) => s.concurrency)
        .filter((x) => x != null)
    ),
  ];
  const run1Path = path.join(path.dirname(tracePath), "trace-run1.json");
  const run1N = fs.existsSync(run1Path)
    ? JSON.parse(fs.readFileSync(run1Path, "utf8")).meta.N
    : null;
  const announces = trace.announces ?? [];
  const fullSequence = ["preparing", "candidates", "set-bonuses", "replication"];
  const withoutTrailingRanking =
    phaseSequence[phaseSequence.length - 1] === "ranking"
      ? phaseSequence.slice(0, -1)
      : phaseSequence;
  const facts = {
    replayedBy: `replay.mjs ${path.basename(tracePath)} --shown`,
    e50Shown: e50,
    phaseSequence,
    phaseSequenceStartsPreparingCandidates:
      phaseSequence[0] === "preparing" && phaseSequence[1] === "candidates",
    phaseSequenceHasReplication: phaseSequence.includes("replication"),
    phaseSequenceIsFull:
      JSON.stringify(withoutTrailingRanking) === JSON.stringify(fullSequence),
    // announces[0] is the announce element before the click; the rest are
    // the changes the run made.
    announceFirstText: announces[1]?.text ?? null,
    announceChanges: Math.max(0, announces.length - 1),
    barDeterminateFromFirstSim:
      firstCount >= 0 &&
      p.samples
        .slice(firstCount)
        .filter((s) => !s.hidden)
        .every((s) => s.hasValueNow),
    preparingBarAnim: prep?.barAnim ?? null,
    preparingBarImg: prep?.barImg ?? null,
    determinateBarAnim: half?.barAnim ?? null,
    statusRowHiddenWhileRunning: vis.length > 0 && vis.every((s) => s.statusHidden === true),
    zeroRemainingEarly: p.samples.filter(
      (s) => !s.hidden && s.remainingMs === 0 && s.t < p.endT - 5000
    ).length,
    lastElapsedText: lastSample.elapsedText,
    tookS: took,
    elapsedMinusTookS:
      lastElapsed == null || took == null ? null : Math.abs(lastElapsed - took),
    boundary: Bpanel,
    setBonusesAtDone: setB?.done ?? null,
    setBonusesAtBoundary: setB != null && setB.done === Bpanel,
    rowsChangedAfterCandidates: rowsAfter.some((r) => r !== rowsAfter[0]),
    concurrency: concurrencies.length === 1 ? concurrencies[0] : concurrencies,
    run1N,
    concurrencyMatchesRun1: concurrencies.length === 1 && concurrencies[0] === run1N,
    qualifyingRowsAtRanking: Q,
    replicationCountHat: Rhat,
    replicationSims,
    replicationCountMatches,
    loadmonOwnSeen: loadSamples.some((s) => s.own >= 1),
    appProbeMax,
    longTaskCount: longTasks ? longTasks.length : null,
    checks,
  };
  const factsPath = path.join(
    path.dirname(tracePath),
    trace.meta.captures ? "facts.json" : "facts-run2.json"
  );
  const existing = fs.existsSync(factsPath)
    ? JSON.parse(fs.readFileSync(factsPath, "utf8"))
    : {};
  fs.writeFileSync(factsPath, JSON.stringify({ ...existing, ...facts }, null, 2) + "\n");
  console.log(`facts: wrote ${path.basename(factsPath)}`);

  if (!replicationCountMatches) {
    console.log(
      `STOP: replicationCountMatches false (replication sims ${replicationSims}, predicted ${Rhat}; plan R4-d-4)`
    );
    return 6;
  }
  if (timing) {
    const pass = e50 != null && Math.abs(e50) <= BOUND;
    console.log(
      `gate: ${pass ? "PASS" : "FAIL"} (|e50_shown| ${fmt(e50 == null ? null : Math.abs(e50))} vs ${BOUND})`
    );
    if (!pass) return 5;
  }
  return 0;
}

function main(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const positional = argv.filter((a) => !a.startsWith("--"));
  const known = new Set(["--windows", "--alternatives", "--shown"]);
  if (positional.length !== 1 || [...flags].some((f) => !known.has(f))) {
    console.error(
      "usage: node replay.mjs <trace.json> [--windows] [--alternatives] | <panel-trace.json> --shown"
    );
    return 2;
  }
  const tracePath = path.resolve(positional[0]);
  const trace = JSON.parse(fs.readFileSync(tracePath, "utf8"));
  if (flags.has("--shown")) return shown(trace, tracePath);
  const p = parseTrace(trace);
  if (!p.sims.length || p.endT == null) {
    console.error("replay: trace has no simming records or no endT");
    return 2;
  }
  const N = trace.meta.N;
  const T = p.sims[0].T;
  const before = p.sims.filter((s) => !s.afterRank);
  const Bobs = before[before.length - 1].d;

  const load = loadRules(trace, tracePath, p, Bobs, N);
  const hits = Array.isArray(load) ? load : load.hits;
  if (hits.length) {
    console.log(`load: DISCARD (${hits.join("; ")})`);
    return 4;
  }
  console.log("load: clean");
  console.log(
    `load detail: ${load.samples} samples in the run, ${load.windows} D3 windows, ${load.repGaps} D2 intervals`
  );
  console.log(
    `ms per candidate in each D3 window (information): ${load.perCandidate.join(" ")}`
  );
  if (trace.meta.timing === false)
    console.log(
      `note: untimed test trace (--candidates ${trace.meta.candidates}); not a timing run`
    );

  const Bcalc = replicationBoundary(T);
  const t1 = p.sims[0].t;
  const tB = before.find((s) => s.d === Bobs).t;
  const rep = p.sims.filter((s) => s.afterRank);
  const last = p.sims[p.sims.length - 1];
  const dLast = last.d;
  console.log(`T ${T}  B_obs ${Bobs}  B_calc ${Bcalc}  (seeds ${SEEDS}, topN ${TOP_N})`);
  console.log(`first simming d ${p.sims[0].d}`);
  if (Bcalc !== Bobs) {
    console.log(`STOP: B_calc ${Bcalc} != B_obs ${Bobs}; the mirrored seed count is wrong for this run (Q3)`);
    return 6;
  }
  if (p.tRank === null) {
    console.log("STOP: no ranking marker in the trace");
    return 6;
  }
  if (dLast === Bobs || !rep.length) {
    console.log(`STOP: d_last ${dLast} == B_obs ${Bobs}; no replication happened, kappa cannot be fitted`);
    return 6;
  }
  const tLastRep = rep[rep.length - 1].t;
  const G = p.tRank - tB;
  const rc = (tB - t1) / (Bobs - 1);
  const rrep = (tLastRep - p.tRank) / (dLast - Bobs);
  const kappa = rrep / (N * rc);
  const psi = G / rc;
  console.log(
    `t1 ${sec(t1)}  t_B ${sec(tB)}  t_rank ${sec(p.tRank)}  d_last ${dLast}  t_lastRep ${sec(tLastRep)}  endT ${sec(p.endT)}`
  );
  console.log(
    `G ${sec(G)}  r_c ${fmt(rc, 1)} ms  r_rep ${fmt(rrep, 1)} ms  N ${N}  kappa ${fmt(kappa)}  psi ${fmt(psi)}`
  );

  const lin = linear(p, T);
  const ph = phased(p, T, Bobs, N, kappa, psi);
  const show = (name, s, tag) => {
    for (const f of [0.25, 0.5, 0.75]) {
      const r = errorAt(s, T, p.endT, f);
      console.log(
        `${name} e${Math.round(f * 100)} ${r ? fmt(r.e) : "n/a"}${f === 0.5 ? ` (${tag})` : " (information)"}` +
          (r ? `  at d ${r.d}, est ${sec(r.est)}, actual ${sec(r.actual)}` : "")
      );
    }
  };
  show("linear", lin, "out-of-sample");
  show("phased", ph, "in-sample");

  const eLin = errorAt(lin, T, p.endT, 0.5);
  const estimator = eLin && Math.abs(eLin.e) <= BOUND ? "linear" : "phased";
  console.log(`estimator: ${estimator}`);
  if (estimator === "phased")
    console.log(`constants: kappa ${fmt(kappa)}  psi ${fmt(psi)}  (fitted on this run; in-sample)`);

  const shipped = estimator === "linear" ? lin : ph;
  const stab = stability(shipped, Bobs, T, p.endT);
  const stabilityLine = (s, tag) =>
    `stability: limit ${sec(s.limit)} (10% of wall time)  d* ${s.dStar}  raw ${fmt(s.raw)}  showFromFraction ${fmt(s.showFrom, 2)}  (${tag})`;
  const capFlag = (s) =>
    s.raw !== null && s.raw > MAX_SHOW_FRACTION
      ? [`FLAG: raw show fraction ${fmt(s.raw)} > ${MAX_SHOW_FRACTION}; capped`]
      : [];
  console.log(
    stabilityLine(stab, estimator === "phased" ? "in-sample" : "out-of-sample")
  );
  console.log(`minCandidatesDone ${MIN_CANDIDATES_DONE}`);
  for (const l of capFlag(stab)) console.log(l);
  if (dLast < T) console.log(`FLAG: d_last ${dLast} < T ${T}`);

  // Round 4 (plan R4-2): phased with a per-candidate slowdown term.
  const clock = candidateClock(p);
  const c = Bobs - 1;
  const beta = betaHalves(c, clock);
  const errorLines = (name, s, e50Tag) =>
    [0.25, 0.5, 0.75].map((f) => {
      const r = errorAt(s, T, p.endT, f);
      const tag = f === 0.5 ? ` (${e50Tag})` : " (information)";
      return (
        `${name} e${Math.round(f * 100)} ${r ? fmt(r.e) : "n/a"}${tag}` +
        (r ? `  at d ${r.d}, est ${sec(r.est)}, actual ${sec(r.actual)}` : "")
      );
    });
  // Base-mode traces carry no row flags, so the replication count stays T - B
  // here (plan R4-d-3); the tab counts qualifying rows instead.
  console.log("replication count: T - B (base-mode trace has no row flags)");
  console.log(
    `slowdown beta ${beta.toPrecision(6)} (halves rule; fitted on this run; in-sample)`
  );
  const slow = phasedWith(p, T, Bobs, N, kappa, psi, slowdownRemaining(beta));
  for (const l of errorLines("slowdown", slow, "in-sample")) console.log(l);
  console.log("round 4: shipped estimator slowdown");
  const slowStab = stability(slow, Bobs, T, p.endT);
  console.log(stabilityLine(slowStab, "in-sample"));
  for (const l of capFlag(slowStab)) console.log(l);

  if (flags.has("--windows"))
    for (const l of windowLines(trace, tracePath, p, Bobs, N)) console.log(l);

  if (flags.has("--alternatives")) {
    const m = clientFloorM(c, clock);
    console.log(
      `client floor m ${m.toPrecision(6)} ms (bisection on [0, 10] ms, 60 steps; fitted on this run; in-sample)`
    );
    const alternatives = [
      ["slowdown beta x0.5", slowdownRemaining(beta * 0.5)],
      ["slowdown beta x1.5", slowdownRemaining(beta * 1.5)],
      ["client floor m x0.75", clientFloorRemaining(m * 0.75)],
      ["client floor m x1", clientFloorRemaining(m)],
      ["client floor m x1.25", clientFloorRemaining(m * 1.25)],
      ["recent window", recentWindowRemaining(clock)],
      ["online slowdown", onlineSlowdownRemaining(clock)],
    ];
    for (const [name, rule] of alternatives) {
      const s = phasedWith(p, T, Bobs, N, kappa, psi, rule);
      const st = stability(s, Bobs, T, p.endT);
      const e = (f) => {
        const r = errorAt(s, T, p.endT, f);
        return r ? fmt(r.e) : "n/a";
      };
      console.log(
        `alternative ${name}: e25 ${e(0.25)}  e50 ${e(0.5)}  e75 ${e(0.75)}  d* ${st.dStar}  raw ${fmt(st.raw)}`
      );
    }
  }
  return 0;
}

process.exitCode = main(process.argv.slice(2));
