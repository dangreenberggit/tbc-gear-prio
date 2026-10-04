// Replays a ticket 542 base-mode trace (capture.mjs) through the two
// remaining-time estimators in the plan (Approach, "Remaining-time estimate"),
// applies the load-control discard rules D0-D3 first, and prints the
// estimator decision for H/decision.md.
//
// usage: node replay.mjs <trace.json> [--windows] [--alternatives]
//
// Round 4 (plan "Amendments (round 4): estimator") adds the slowdown
// estimator after the original output; --windows prints per-D3-window load
// figures and --alternatives the rejected round-4 estimators.
//
// Exit codes: 0 decision printed; 4 load discard (no decision values printed);
// 6 a plan stop rule fired (boundary mismatch, or no replication); 2 bad input.
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
 */
function phasedWith(p, T, B, N, kappa, psi, remaining) {
  const t1 = p.sims[0].t;
  const k = kappa * N;
  const R = T - B;
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
      if (rB !== null) est = rB * k * (T - b);
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
      const m = e.d - b;
      est =
        m === 1 ? rB * k * (T - e.d) : ((e.t - tRank) / m) * (T - e.d);
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

function main(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const positional = argv.filter((a) => !a.startsWith("--"));
  const known = new Set(["--windows", "--alternatives"]);
  if (positional.length !== 1 || [...flags].some((f) => !known.has(f))) {
    console.error(
      "usage: node replay.mjs <trace.json> [--windows] [--alternatives]"
    );
    return 2;
  }
  const tracePath = path.resolve(positional[0]);
  const trace = JSON.parse(fs.readFileSync(tracePath, "utf8"));
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
