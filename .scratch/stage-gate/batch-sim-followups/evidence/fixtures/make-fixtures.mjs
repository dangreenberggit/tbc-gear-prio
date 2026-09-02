// Generates the four scorer-validation fixtures. Deterministic: no RNG, LF
// endings, stable key order. Re-run after any scorer change that alters the
// dump shape, then re-check the Step 1 acceptance table in the ledger.

import { writeFileSync } from 'node:fs';

const here = new URL('.', import.meta.url);
const ITER = 8000;
// Feral's cutoff (`engine/cutoff.ts` CUTOFF_FERAL) — pilot 0 is feral. `pct` is
// on the engine's 0-100 scale: `rank.ts:1137` computes deltaPct as
// (deltaDps / baselineDps) * 100 and `meetsCutoff` compares it to `pct`
// directly, so 0.15 means 0.15%, not 15%.
const BASELINE_DPS = 2131.71;
const CUTOFF = { absDps: 3.6, pct: 0.15 };

// 30 items with a wide, well-separated delta range so ranked sets are stable
// and the depth gate is comfortably met.
const base = Array.from({ length: 30 }, (_, i) => {
	const deltaDps = 60 - i * 2.2; // 60 down to -3.8: straddles the 3.6 cutoff
	return {
		itemId: 1000 + i,
		name: `item-${i}`,
		deltaDps: Number(deltaDps.toFixed(4)),
		deltaPct: Number(((deltaDps / BASELINE_DPS) * 100).toFixed(6)),
		se: 0.4,
		iterationsDone: ITER,
		rank: null,
	};
});

const withRanks = items => {
	const ranked = items
		.filter(r => r.deltaDps >= CUTOFF.absDps || r.deltaPct >= CUTOFF.pct)
		.sort((a, b) => b.deltaDps - a.deltaDps);
	const rankOf = new Map(ranked.map((r, i) => [r.itemId, i + 1]));
	return items.map(r => ({ ...r, rank: rankOf.get(r.itemId) ?? null, belowCutoff: !rankOf.has(r.itemId) }));
};

const chunksFor = (n, achieved = ITER) => {
	const out = [];
	let left = n;
	while (left > 0) {
		const take = Math.min(25, left);
		out.push({ n: take, stages: 1, stageIterations: achieved, probes: 1 });
		left -= take;
	}
	return out;
};

const arm = (armId, items, opts = {}) => {
	const n = items.length;
	const chunks = opts.isBulk ? chunksFor(n, opts.achieved ?? ITER) : [];
	return {
		armId,
		iterations: ITER,
		seeds: opts.seeds ?? [11, 22, 33, 44, 55],
		transport: { isWasm: false, hasBulkCapability: !!opts.isBulk },
		engineCutoff: CUTOFF,
		baseline: { dps: 2131.71, stdev: 75.91 },
		cost: {
			wallSeconds: opts.wall ?? 1000,
			screeningSeconds: opts.screening ?? 600,
			firstRowSeconds: opts.firstRow ?? 30,
			simsByPhase: { baseline: 1, screening: opts.isBulk ? chunks.length : n, replication: 36, setBonus: 4 },
			totalIterations: opts.totalIterations ?? 1_000_000,
			screeningIterations: opts.screeningIterations ?? 600_000,
			chunks,
		},
		items: withRanks(items),
	};
};

// clean: A and B agree exactly -> all PASS, slope 1.000
const clean = {
	A: arm('A', base, { isBulk: true, screening: 600 }),
	B: arm('B', base, { screening: 600 }),
	C: arm('C', base, { screening: 600, seeds: [777, 22, 33, 44, 55] }),
};

// inverted: A's deltas are B's reversed -> overlap and ordering FAIL, rho -1
const invertedItems = base.map((r, i) => ({ ...r, deltaDps: base[base.length - 1 - i].deltaDps, deltaPct: base[base.length - 1 - i].deltaPct }));
const inverted = {
	A: arm('A', invertedItems, { isBulk: true, screening: 600 }),
	B: arm('B', base, { screening: 600 }),
	C: arm('C', base, { screening: 600, seeds: [777, 22, 33, 44, 55] }),
};

// slope102: A = 1.02 x B exactly -> slope 1.020
const slopeItems = base.map(r => ({ ...r, deltaDps: Number((r.deltaDps * 1.02).toFixed(6)), deltaPct: Number((r.deltaPct * 1.02).toFixed(8)) }));
const slope102 = {
	A: arm('A', slopeItems, { isBulk: true, screening: 600 }),
	B: arm('B', base, { screening: 600 }),
	C: arm('C', base, { screening: 600, seeds: [777, 22, 33, 44, 55] }),
};

// overshoot: a bulk chunk achieved more than the pinned 8,000 -> 346 NO VERDICT
const overshoot = {
	A: arm('A', base, { isBulk: true, screening: 600, achieved: 9500 }),
	B: arm('B', base, { screening: 600 }),
	C: arm('C', base, { screening: 600, seeds: [777, 22, 33, 44, 55] }),
};

for (const [name, set] of Object.entries({ clean, inverted, slope102, overshoot })) {
	for (const [armName, value] of Object.entries(set)) {
		writeFileSync(new URL(`${name}-${armName}.json`, here), JSON.stringify(value, null, '\t').replace(/\r\n/g, '\n') + '\n');
	}
}
console.log('wrote 12 fixture files (clean/inverted/slope102/overshoot x A/B/C)');
