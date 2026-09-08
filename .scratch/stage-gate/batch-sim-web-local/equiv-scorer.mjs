// Step 10's four pre-registered conditions, computed offline from the browser
// dump. Usage: node equiv.mjs <dump.json>  where dump.json is {loop, bulk}
// exactly as `window.__bulkEquiv` holds it.
//
// The harness does not judge itself; this script does the judging, and prints
// every input it used so the numbers can be checked by hand.

import { readFileSync } from 'node:fs';

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
	let num = 0, dx = 0, dy = 0;
	for (let i = 0; i < n; i++) {
		const a = xs[i] - mx, b = ys[i] - my;
		num += a * b; dx += a * a; dy += b * b;
	}
	return dx === 0 || dy === 0 ? NaN : num / Math.sqrt(dx * dy);
};

// Spearman = Pearson on midranks. The tie-free 1 - 6*sum(d^2)/(n(n^2-1))
// shortcut is invalid with ties, so it is deliberately not used.
const spearman = (xs, ys) => pearson(midranks(xs), midranks(ys));

const { loop, bulk } = JSON.parse(readFileSync(process.argv[2], 'utf8'));

const byId = rows => new Map(rows.map(r => [r.itemId, r]));
const L = byId(loop.items);
const B = byId(bulk.items);
const shared = [...L.keys()].filter(id => B.has(id));

console.log('=== provenance ===');
console.log(`loop: hasBulkCapability=${loop.hasBulkCapability} rows=${loop.items.length} elapsed=${loop.elapsedSeconds?.toFixed(1)}s baselineDps=${loop.baseline?.dps}`);
console.log(`bulk: hasBulkCapability=${bulk.hasBulkCapability} rows=${bulk.items.length} elapsed=${bulk.elapsedSeconds?.toFixed(1)}s baselineDps=${bulk.baseline?.dps}`);

// (a) identical screened-candidate count both ways
const a = loop.items.length === bulk.items.length;
console.log('\n=== (a) screened-candidate count ===');
console.log(`loop=${loop.items.length} bulk=${bulk.items.length} shared=${shared.length} -> ${a ? 'PASS' : 'FAIL'}`);

// (b) Spearman rank correlation of screening deltas >= 0.95
const rho = spearman(shared.map(id => L.get(id).deltaDps), shared.map(id => B.get(id).deltaDps));
console.log('\n=== (b) Spearman of deltaDps over shared items ===');
console.log(`n=${shared.length} rho=${rho.toFixed(6)} threshold=0.95 -> ${rho >= 0.95 ? 'PASS' : 'FAIL'}`);

// (c) paired-replication top-N selection overlap >= 90%
const topN = rows => rows.filter(r => r.rank !== null).sort((x, y) => x.rank - y.rank).map(r => r.itemId);
const lTop = topN(loop.items), bTop = topN(bulk.items);
const k = Math.min(lTop.length, bTop.length);
const bSet = new Set(bTop.slice(0, k));
const inter = lTop.slice(0, k).filter(id => bSet.has(id)).length;
const overlap = k === 0 ? NaN : inter / k;
console.log('\n=== (c) top-N selection overlap ===');
console.log(`loopRanked=${lTop.length} bulkRanked=${bTop.length} k=${k} intersection=${inter} overlap=${(overlap * 100).toFixed(2)}% threshold=90% -> ${overlap >= 0.9 ? 'PASS' : 'FAIL'}`);

// (d) final ordering of shared top-N members identical within each row's error bars
console.log('\n=== (d) ordering of shared ranked members, within error bars ===');
const sharedRanked = lTop.filter(id => bSet.has(id));
let mismatches = 0;
for (const id of sharedRanked) {
	const l = L.get(id), b = B.get(id);
	// Same-rank is trivially fine; otherwise the delta gap must sit inside the
	// combined 1-sigma band of the two rows being compared.
	if (l.rank === b.rank) continue;
	const gap = Math.abs(l.deltaDps - b.deltaDps);
	const band = (l.se ?? 0) + (b.se ?? 0);
	if (gap > band) {
		mismatches++;
		console.log(`  MISMATCH item=${id} loopRank=${l.rank} bulkRank=${b.rank} |dDps|=${gap.toFixed(3)} band=${band.toFixed(3)}`);
	}
}
console.log(`sharedRanked=${sharedRanked.length} outsideErrorBars=${mismatches} -> ${mismatches === 0 ? 'PASS' : 'FAIL'}`);

console.log('\n=== verdict ===');
const pass = a && rho >= 0.95 && overlap >= 0.9 && mismatches === 0;
console.log(pass ? 'ALL FOUR CONDITIONS PASS' : 'AT LEAST ONE CONDITION MISSED -- stop and escalate');
