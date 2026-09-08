// Track B campaign scorer — judges tickets 345, 346 and 348 from committed
// dumps. The harness measures and never judges; this script judges and prints
// every input it used, so each number in the ledger can be re-derived by hand.
//
// Usage:
//   node campaign-scorer.mjs <A.json> <B.json> [--null <C.json>] [--cutoff <dps>]
//   node campaign-scorer.mjs <prior-equiv-dump.json>        (regression mode)
//
// Pre-registered thresholds live in execution-ledger-b.md and are mirrored as
// constants here. They are not command-line settable on purpose: a scorer whose
// thresholds move per invocation cannot pre-register anything.

import { readFileSync } from 'node:fs';

const OVERLAP_MIN = 0.9; // (c)
const MARGIN_SIGMAS = 2; // (c') and the N10 depth gate
const DEPTH_MIN = 20; // k_min (N10)
const PINNED_ITERATIONS = 8000; // M2
const MAX_CHUNK_N = 25; // MAX_CANDIDATES_PER_BULK_REQUEST
const SLOPE_SIGMAS = 3; // 348

// ---------------------------------------------------------------- statistics

const midranks = values => {
	const idx = values.map((v, i) => ({ v, i }));
	idx.sort((a, b) => a.v - b.v);
	const ranks = new Array(values.length);
	let i = 0;
	while (i < idx.length) {
		let j = i;
		while (j + 1 < idx.length && idx[j + 1].v === idx[i].v) j++;
		const avg = (i + j) / 2 + 1;
		for (let k = i; k <= j; k++) ranks[idx[k].i] = avg;
		i = j + 1;
	}
	return ranks;
};

const pearson = (xs, ys) => {
	const n = xs.length;
	if (n === 0 || ys.length !== n) return NaN;
	const mx = xs.reduce((a, b) => a + b, 0) / n;
	const my = ys.reduce((a, b) => a + b, 0) / n;
	let num = 0,
		dx = 0,
		dy = 0;
	for (let i = 0; i < n; i++) {
		const a = xs[i] - mx,
			b = ys[i] - my;
		num += a * b;
		dx += a * a;
		dy += b * b;
	}
	return dx === 0 || dy === 0 ? NaN : num / Math.sqrt(dx * dy);
};

// Spearman = Pearson on midranks. The tie-free shortcut is invalid with ties.
const spearman = (xs, ys) => pearson(midranks(xs), midranks(ys));

/**
 * OLS of y on x through the origin-free model y = a + b·x, returning the slope,
 * its standard error and the t statistic against the null slope = 1 (ticket
 * 348 asks whether bulk is a MULTIPLE of loop, so 1 is the null, not 0).
 */
const olsSlope = (xs, ys) => {
	const n = xs.length;
	if (n < 3) return { slope: NaN, se: NaN, t: NaN, n };
	const mx = xs.reduce((a, b) => a + b, 0) / n;
	const my = ys.reduce((a, b) => a + b, 0) / n;
	let sxx = 0,
		sxy = 0;
	for (let i = 0; i < n; i++) {
		sxx += (xs[i] - mx) ** 2;
		sxy += (xs[i] - mx) * (ys[i] - my);
	}
	if (sxx === 0) return { slope: NaN, se: NaN, t: NaN, n };
	const slope = sxy / sxx;
	const intercept = my - slope * mx;
	let sse = 0;
	for (let i = 0; i < n; i++) sse += (ys[i] - (intercept + slope * xs[i])) ** 2;
	const se = Math.sqrt(sse / (n - 2) / sxx);
	return { slope, se, t: (slope - 1) / se, n, intercept };
};

// ------------------------------------------------------------------ cutoffs

/**
 * The engine's own rule: an OR of an absolute-DPS arm and a percentage arm
 * (`engine/cutoff.ts`, C10). Re-derived here from dumped values rather than
 * read off `belowCutoff`, so a campaign cutoff can be substituted.
 */
const meetsCutoff = (row, cutoff) => {
	if (cutoff.campaignAbs !== undefined) return row.deltaDps >= cutoff.campaignAbs;
	const byAbs = cutoff.absDps !== undefined && row.deltaDps >= cutoff.absDps;
	const byPct = cutoff.pct !== undefined && row.deltaPct !== undefined && row.deltaPct >= cutoff.pct;
	return byAbs || byPct;
};

/**
 * Ranked set for one arm. When rows carry `deltaPct` the engine's OR is
 * re-derived; when they do not (the prior dump, C22) the stored `rank` /
 * `belowCutoff` are the only truth available and are used instead.
 */
const rankedSet = (rows, cutoff) => {
	const usable = rows.filter(r => typeof r.deltaDps === 'number');
	const hasPct = usable.some(r => typeof r.deltaPct === 'number');
	if (!hasPct && cutoff.campaignAbs === undefined) {
		return {
			ids: usable
				.filter(r => r.rank !== null && r.rank !== undefined)
				.sort((a, b) => a.rank - b.rank)
				.map(r => r.itemId),
			derivation: 'stored rank/belowCutoff (dump carries no deltaPct — C22 fallback)',
		};
	}
	return {
		ids: usable
			.filter(r => meetsCutoff(r, cutoff))
			.sort((a, b) => b.deltaDps - a.deltaDps)
			.map(r => r.itemId),
		derivation: cutoff.campaignAbs !== undefined ? `campaign absolute cutoff ${cutoff.campaignAbs} DPS` : `engine cutoff absDps=${cutoff.absDps} OR pct=${cutoff.pct}`,
	};
};

// ------------------------------------------------------------------- dumps

const load = path => JSON.parse(readFileSync(path, 'utf8'));
const byId = rows => new Map(rows.map(r => [r.itemId, r]));
const fmt = (v, d = 3) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d) : String(v));
const pct = v => (Number.isFinite(v) ? `${(v * 100).toFixed(2)}%` : 'n/a');

/** Regression mode: the prior {loop, bulk} dump, scored on its own terms. */
function scorePriorDump(dump) {
	const { loop, bulk } = dump;
	const L = byId(loop.items),
		B = byId(bulk.items);
	const shared = [...L.keys()].filter(id => B.has(id));
	console.log('=== regression mode: prior equiv-dump.json ({loop, bulk}) ===');
	console.log(`loop rows=${loop.items.length} bulk rows=${bulk.items.length} shared=${shared.length}`);

	const rho = spearman(
		shared.map(id => L.get(id).deltaDps),
		shared.map(id => B.get(id).deltaDps),
	);
	console.log(`\nSpearman rho = ${rho.toFixed(6)}`);

	const cutoff = {};
	const lSet = rankedSet(loop.items, cutoff),
		bSet = rankedSet(bulk.items, cutoff);
	console.log(`ranked-set derivation: ${lSet.derivation}`);
	const k = Math.min(lSet.ids.length, bSet.ids.length);
	const bTop = new Set(bSet.ids.slice(0, k));
	const inter = lSet.ids.slice(0, k).filter(id => bTop.has(id)).length;
	console.log(`overlap over k=${k}: ${inter}/${k} = ${pct(inter / k)}`);

	const ols = olsSlope(
		shared.map(id => L.get(id).deltaDps),
		shared.map(id => B.get(id).deltaDps),
	);
	console.log(`OLS slope (bulk on loop) = ${fmt(ols.slope)} ± ${fmt(ols.se)}  t(vs 1) = ${fmt(ols.t, 2)}  n=${ols.n}`);
}

/** Cost/precondition block for one arm. Returns whether 346 may be judged. */
function costBlock(label, arm) {
	console.log(`\n--- ${label} (${arm.armId ?? '?'}) ---`);
	const c = arm.cost ?? {};
	const chunks = c.chunks ?? [];
	console.log(`wall end-to-end   : ${fmt(c.wallSeconds, 1)} s`);
	console.log(`wall screening    : ${fmt(c.screeningSeconds, 1)} s`);
	console.log(`first row         : ${fmt(c.firstRowSeconds, 1)} s`);
	console.log(`sims by phase     : ${JSON.stringify(c.simsByPhase ?? {})}`);
	console.log(`chunks            : ${chunks.length}`);
	if (chunks.length) {
		console.log(`chunk detail      : ${JSON.stringify(chunks.map(k => [k.n, k.stages, k.stageIterations, k.probes]))}`);
	}
	console.log(`iterations total  : ${c.totalIterations ?? 'n/a'}   screening-only: ${c.screeningIterations ?? 'n/a'}`);
	const ses = (arm.items ?? []).map(r => r.se).filter(v => typeof v === 'number');
	if (ses.length) {
		console.log(`per-row se        : max ${fmt(Math.max(...ses))}  mean ${fmt(ses.reduce((a, b) => a + b, 0) / ses.length)}`);
	}
	if (arm.baseline) {
		const cv = arm.baseline.stdev / arm.baseline.dps;
		console.log(`baseline cv       : ${fmt(cv, 4)}  (critical cv for 8,000 at n=25 is 0.0378)`);
	}

	const problems = [];
	for (const k of chunks) {
		if (k.n > MAX_CHUNK_N) problems.push(`chunk n=${k.n} > ${MAX_CHUNK_N}`);
		if (k.stages !== 1) problems.push(`chunk stages=${k.stages} != 1`);
		if (k.stageIterations !== PINNED_ITERATIONS) problems.push(`chunk achieved ${k.stageIterations} != ${PINNED_ITERATIONS}`);
	}
	for (const r of arm.items ?? []) {
		if (typeof r.iterationsDone === 'number' && r.iterationsDone !== PINNED_ITERATIONS) {
			problems.push(`row ${r.itemId} iterationsDone=${r.iterationsDone} != ${PINNED_ITERATIONS}`);
			break;
		}
	}
	if (problems.length) {
		console.log(`PRECONDITION FAILURES: ${problems.join('; ')}`);
		const achieved = chunks.map(k => k.stageIterations).filter(Number.isFinite);
		if (achieved.length) console.log(`I_max = ${Math.max(...achieved)}  -> M1: re-run B and C at I_max (no cap; N9)`);
	}
	return problems;
}

function main() {
	const args = process.argv.slice(2);
	const files = args.filter(a => !a.startsWith('--'));
	const nullIdx = args.indexOf('--null');
	const nullFile = nullIdx >= 0 ? args[nullIdx + 1] : undefined;
	const cutIdx = args.indexOf('--cutoff');
	const campaignAbs = cutIdx >= 0 ? Number(args[cutIdx + 1]) : undefined;

	if (files.length === 1) {
		const dump = load(files[0]);
		if (dump.loop && dump.bulk) return scorePriorDump(dump);
		console.error('single-file mode expects the prior {loop, bulk} dump');
		process.exit(2);
	}
	if (files.length < 2) {
		console.error('usage: campaign-scorer.mjs <A.json> <B.json> [--null C.json] [--cutoff dps]');
		process.exit(2);
	}

	const A = load(files[0]);
	const B = load(files[1]);
	const C = nullFile ? load(nullFile.replace(/^--null=/, '')) : undefined;

	console.log('=== provenance ===');
	for (const [label, arm] of [
		['A bulk', A],
		['B loop', B],
		...(C ? [['C null', C]] : []),
	]) {
		const t = arm.transport ?? {};
		console.log(`${label}: isWasm=${t.isWasm} hasBulkCapability=${t.hasBulkCapability} seeds[0]=${(arm.seeds ?? [])[0]} rows=${(arm.items ?? []).length} iterations=${arm.iterations}`);
	}
	if (!C) console.log('NOTE: no null arm supplied — 345 control and 348 null slope cannot be evaluated.');

	// ---------------------------------------------------------- 346 gate
	console.log('\n=== 346 preconditions ===');
	const problems = [...costBlock('A bulk', A), ...costBlock('B loop', B), ...(C ? costBlock('C null', C) : [])];

	const cutoff = campaignAbs !== undefined ? { campaignAbs } : (A.engineCutoff ?? B.engineCutoff ?? {});
	if (campaignAbs !== undefined) {
		console.log(`\nDISCLOSURE: a campaign cutoff (${campaignAbs} DPS, absolute only) COLLAPSES the engine's OR.`);
		const eng = A.engineCutoff ?? B.engineCutoff ?? {};
		if (eng.pct !== undefined) {
			const admits = (B.items ?? []).filter(r => typeof r.deltaPct === 'number' && r.deltaPct >= eng.pct && r.deltaDps < campaignAbs);
			console.log(`  rows the engine's pct arm (>= ${eng.pct}) would admit but this cutoff excludes: ${admits.length}`);
			for (const r of admits) console.log(`    ${r.itemId} ${r.name ?? ''} deltaDps=${fmt(r.deltaDps)} deltaPct=${fmt(r.deltaPct, 4)}`);
		}
	}

	// ------------------------------------------------------- 345 depth + (c)
	const LA = byId(A.items ?? []),
		LB = byId(B.items ?? []);
	const shared = [...LB.keys()].filter(id => LA.has(id));

	console.log('\n=== 345 ===');
	const depth = (B.items ?? []).filter(r => typeof r.se === 'number' && r.deltaDps >= MARGIN_SIGMAS * r.se).length;
	const depthVerdict = depth >= DEPTH_MIN ? 'MET' : "NOT MET — (c) inexpressible, judge on (c') + control";
	console.log(`depth gate (N10): count(deltaDps >= 2*se) on arm B = ${depth}  (k_min = ${DEPTH_MIN}) -> ${depthVerdict}`);

	const setA = rankedSet(A.items ?? [], cutoff),
		setB = rankedSet(B.items ?? [], cutoff);
	console.log(`ranked-set derivation: ${setB.derivation}`);
	const k = Math.min(setA.ids.length, setB.ids.length);
	const topA = new Set(setA.ids.slice(0, k));
	const interAB = setB.ids.slice(0, k).filter(id => topA.has(id)).length;
	const overlapAB = k === 0 ? NaN : interAB / k;
	console.log(`(c) kA=${setA.ids.length} kB=${setB.ids.length} k=${k} overlap=${interAB}/${k}=${pct(overlapAB)} threshold=${pct(OVERLAP_MIN)} -> ${overlapAB >= OVERLAP_MIN ? 'PASS' : 'FAIL'}`);

	// boundary flips: membership disagreements about the ranked set
	const flips = (X, Y) => {
		const sx = new Set(rankedSet(X.items ?? [], cutoff).ids);
		const sy = new Set(rankedSet(Y.items ?? [], cutoff).ids);
		const ids = new Set([...sx, ...sy]);
		let n = 0;
		for (const id of ids) if (sx.has(id) !== sy.has(id)) n++;
		return n;
	};
	const flipsAB = flips(A, B);
	console.log(`boundary flips A vs B = ${flipsAB}`);
	let flipsCB = NaN,
		overlapCB = NaN;
	if (C) {
		flipsCB = flips(C, B);
		const setC = rankedSet(C.items ?? [], cutoff);
		const kc = Math.min(setC.ids.length, setB.ids.length);
		const topC = new Set(setC.ids.slice(0, kc));
		overlapCB = kc === 0 ? NaN : setB.ids.slice(0, kc).filter(id => topC.has(id)).length / kc;
		console.log(`CONTROL  overlap C vs B = ${pct(overlapCB)} over k=${kc};  boundary flips C vs B = ${flipsCB}`);
	}

	// (c') margin test against the absolute arm
	const absArm = cutoff.campaignAbs ?? cutoff.absDps;
	let cPrimeViolations = [];
	if (absArm === undefined) {
		console.log("(c') no absolute cutoff arm available in the dump — cannot evaluate");
	} else {
		for (const id of shared) {
			const a = LA.get(id),
				b = LB.get(id);
			const confidentA = typeof a.se === 'number' && Math.abs(a.deltaDps - absArm) >= MARGIN_SIGMAS * a.se;
			const confidentB = typeof b.se === 'number' && Math.abs(b.deltaDps - absArm) >= MARGIN_SIGMAS * b.se;
			if (!confidentA && !confidentB) continue;
			if (a.deltaDps >= absArm !== (b.deltaDps >= absArm)) {
				cPrimeViolations.push({ id, name: b.name, a: a.deltaDps, b: b.deltaDps, seA: a.se, seB: b.se });
			}
		}
		console.log(`(c') confident-side agreement across ${shared.length} shared items: ${cPrimeViolations.length} violation(s) -> ${cPrimeViolations.length === 0 ? 'PASS (100%)' : 'FAIL'}`);
		for (const v of cPrimeViolations) {
			console.log(`    VIOLATION ${v.id} ${v.name ?? ''} A=${fmt(v.a)}±${fmt(v.seA)} B=${fmt(v.b)}±${fmt(v.seB)} cutoffAbs=${absArm}`);
		}
	}

	// ------------------------------------------------------------- 346 verdict
	console.log('\n=== 346 ===');
	const sA = A.cost?.screeningSeconds,
		sB = B.cost?.screeningSeconds,
		sC = C?.cost?.screeningSeconds;
	const R_wall_s = sA / sB;
	const R_wall = A.cost?.wallSeconds / B.cost?.wallSeconds;
	const R_iter_s = A.cost?.screeningIterations / B.cost?.screeningIterations;
	const R_iter = A.cost?.totalIterations / B.cost?.totalIterations;
	const V = Number.isFinite(sC) ? Math.abs(sB - sC) / sB : NaN;
	console.log(`R_wall_s (screening) = ${fmt(R_wall_s)}      R_wall (end to end) = ${fmt(R_wall)}`);
	console.log(`R_iter_s (screening) = ${fmt(R_iter_s)}      R_iter (end to end) = ${fmt(R_iter)}`);
	console.log(`V = ${fmt(V)}${C ? ` (${C.transport?.isWasm ? 'WASM' : 'HTTP'} loop variance — labelled per the precedence rule)` : ' (no null arm)'}`);
	console.log('CAVEAT (C31): V bounds the LOOP phase only. There is no tournament repeat in this');
	console.log('  arm set, so any 346 verdict carries "one tournament run; tournament run-to-run');
	console.log('  variance unmeasured". Per D1, "tournament" here means the single-stage High pass');
	console.log('  over 25-candidate chunks — no arm of this campaign runs a multi-stage tournament.');

	if (problems.length) {
		console.log('\n346: NO VERDICT — preconditions failed (see PRECONDITION FAILURES above).');
	} else if (!Number.isFinite(R_wall_s)) {
		console.log('\n346: NO VERDICT — screening timings missing.');
	} else if (Number.isFinite(V) && V > 0.1) {
		console.log(`\n346 verdict: indistinguishable at one run per arm (V = ${fmt(V)})`);
	} else {
		const lo = Number.isFinite(V) ? Math.min(0.9, 1 - V) : 0.9;
		const hi = Number.isFinite(V) ? Math.max(1.1, 1 + V) : 1.1;
		const verdict = R_wall_s < lo ? 'BULK FASTER' : R_wall_s > hi ? 'BULK SLOWER' : 'WASH within the measured loop variance, tournament variance unmeasured';
		console.log(`\n346 verdict: ${verdict}  (thresholds: faster < ${fmt(lo)}, slower > ${fmt(hi)})`);
		console.log(`standing wash finding on iterations: R_iter_s=${fmt(R_iter_s)} -> ${R_iter_s >= 0.9 && R_iter_s <= 1.1 ? 'holds' : 'does not hold'}`);
		const firstRow = A.cost?.firstRowSeconds;
		if (R_wall_s < 1 && firstRow > 120) {
			console.log(`\nOWNER SURFACING (mandatory wording): "Bulk is cheaper in total on WASM (R = ${fmt(R_wall_s)}) and still fails the 120 s first-row gate (first row at ${fmt(firstRow, 1)} s)"`);
		} else if (R_wall_s < 1) {
			console.log(`\nOWNER SURFACING: bulk is cheaper (R = ${fmt(R_wall_s)}) and first row is ${fmt(firstRow, 1)} s (<= 120 s) — ask the owner whether to flip the default.`);
		} else {
			console.log('\nNo owner question: bulk is not cheaper.');
		}
		console.log('The scorer never flips the default (C24).');
	}

	// ------------------------------------------------------------------ 348
	console.log('\n=== 348 ===');
	const xs = shared.map(id => LB.get(id).deltaDps);
	const ys = shared.map(id => LA.get(id).deltaDps);
	const ab = olsSlope(xs, ys);
	console.log(`OLS A on B: slope=${fmt(ab.slope, 5)} ± ${fmt(ab.se, 5)}  t(vs 1)=${fmt(ab.t, 2)}  n=${ab.n}`);
	console.log(`Spearman rho(A,B) = ${fmt(spearman(xs, ys), 6)}`);
	let cb = { slope: NaN, se: NaN };
	if (C) {
		const LC = byId(C.items ?? []);
		const sh2 = [...LB.keys()].filter(id => LC.has(id));
		cb = olsSlope(
			sh2.map(id => LB.get(id).deltaDps),
			sh2.map(id => LC.get(id).deltaDps),
		);
		console.log(`NULL  OLS C on B: slope=${fmt(cb.slope, 5)} ± ${fmt(cb.se, 5)}  t(vs 1)=${fmt(cb.t, 2)}  n=${cb.n}`);
	}
	const cond1 = Math.abs(ab.slope - 1) > SLOPE_SIGMAS * ab.se;
	const cond2 = Number.isFinite(cb.slope) ? Math.abs(ab.slope - 1) > Math.abs(cb.slope - 1) + SLOPE_SIGMAS * cb.se : false;
	console.log(`|slope_AB - 1| > 3*SE_AB           : ${fmt(Math.abs(ab.slope - 1), 5)} > ${fmt(SLOPE_SIGMAS * ab.se, 5)} -> ${cond1}`);
	if (Number.isFinite(cb.slope)) {
		console.log(`|slope_AB - 1| > |slope_CB - 1| + 3*SE_CB : ${fmt(Math.abs(ab.slope - 1), 5)} > ${fmt(Math.abs(cb.slope - 1) + SLOPE_SIGMAS * cb.se, 5)} -> ${cond2}`);
	}
	console.log(`348: ${cond1 && cond2 ? 'REPRODUCES' : C ? 'NOT REPRODUCED — close into 346 as an accuracy-mismatch artifact' : 'INCONCLUSIVE (no null arm)'}`);
}

main();
