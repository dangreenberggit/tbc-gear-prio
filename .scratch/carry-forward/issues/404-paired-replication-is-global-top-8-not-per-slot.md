# 404 — Paired replication is a global top 8, so some slots get no precise top-1

Status: open
Type: task
Origin: owner observation while deciding ticket 403 (2026-09-15)
Blocks: —
Blocked by: none

## What

`replicateTopItems` re-sims the **global** top 8 above-cutoff rows at 5 seeds
(`PAIRED_REPLICATE_TOP_N = 8`, `engine/se.ts:6`; filter and slice at
`engine/rank.ts:1455-1457`). It is not per slot. So a slot whose best candidates
all rank below 8 overall gets **no paired replication at all**, and its top-1
recommendation rests on an unreplicated screening value.

The precision difference is large and measured. From a committed report
(`.scratch/rank-reports/shredzepelin-p3.json`, field `ranking.items[].se`):

| Row class | Standard error |
| --- | --- |
| Paired-replicated (global top 8) | **0.018 – 0.088 DPS** |
| Unreplicated | **1.76 – 2.31 DPS** |

About 30x. Verified by reading the field, not inherited.

## Why it matters — the owner's framing

Recommendations are **mostly per slot**. The decision a player actually makes is
"which item do I chase for this slot", so the load-bearing output is the **top-1
within each slot**, not the global ordering. Two consequences:

- Global rank 9+ is not a proxy for "does not matter". A slot's #1 and #2 can
  both sit below global rank 8 and still be the only comparison that slot's
  recommendation turns on.
- Conversely, most slots are not close. From `readback-3333-old.json` (601 rows,
  15 slots), the best-vs-second gap per slot: Feet 70.2, Waist 69.4, Finger 2
  63.4, Wrist 43.3, Legs 29.8, Back 27.8 — nowhere near needing 0.06 DPS. But
  Chest 2.8, Shoulder 2.7, Neck 1.3, Hands 0.1 are inside or near the noise of
  an unreplicated value (~2 DPS SE).

So the gap is real but narrow: it only bites when a slot's top two are close
**and** neither is in the global top 8.

## The shape of a fix the owner suggested

**Make the check conditional.** Rather than widening `PAIRED_REPLICATE_TOP_N`
uniformly (which spends sims on rows nobody decides between), replicate a slot's
top 2 only when their screening delta is within some multiple of the screening
SE — i.e. only when the ordering is actually in doubt. Cheap, targeted, and it
directly serves the per-slot decision.

Unmeasured: how many slots would trigger it on a typical pool, and therefore what
it costs. That is the measurement this ticket owes before any implementation.

## Constraints to respect

- **Coherence with existing work.** The repo already has time-vs-accuracy
  measurements (`docs/five-seed-spread.json`, the 3.4 DPS / 0.15% cutoff in
  `engine/cutoff.ts`). A precision change should be argued against those, not
  re-derived from scratch.
- **Do not widen replication on the WASM path by default.** The WASM full run
  was 1668 s for ~647 sims (`readback-wasm-tip.json`), about 2.6 s per sim
  (arithmetic), against roughly 0.2 s per sim native (fitted from the cap-20 /
  cap-40 / cap-150 loop runs, ticket 403 handoff). The same extra sims cost an
  order of magnitude more in the browser.
- `se.ts` is ported — `packages/core/src/se.ts` and the fork copy must stay in
  sync (engine-port drift gate).

## Done when

Either the conditional per-slot check is implemented and its cost measured, or
this ticket records the measurement showing how often a slot's top-1 is actually
in doubt and concludes the gap is not worth closing.
