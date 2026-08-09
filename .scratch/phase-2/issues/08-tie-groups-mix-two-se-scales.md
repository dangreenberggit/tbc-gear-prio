Status: open
Type: bug
Origin: chat, 2026-08-08 (fallout from 9c62693)
Blocks: phase-2
Blocked by: none

# Tie groups compare two SE scales, and the cutoff is calibrated to one of them

## Problem

`assignTieGroups` (`packages/core/src/view.ts:153-179`) decides a tie with:

```ts
leader.deltaDps - row.deltaDps <= Math.min(row.se, leader.se) * 2
```

`Math.min` is deliberate, and the reason is recorded at `view.ts:135-138`: it
stops one wide-SE row bridging a gap its partner's own interval never spans.
That rationale reasons about **two SEs of the same kind**.

Since 9c62693 that assumption no longer holds. `replicateTopItems` now runs by
default, so the top 8 above-cutoff rows carry `seMethod: "paired-replicate"`
while every row below them keeps `"independent"`. The two are not the same
quantity on the same scale:

| method | SE | tie window (`2*se`) |
| --- | --- | --- |
| `independent` @ 3000 iters | ~2.166 DPS | ~4.33 DPS |
| `paired-replicate` (upper bound, see below) | ~0.017 DPS | ~0.034 DPS |

Roughly **127x**. At the boundary between row 8 and row 9, `Math.min` picks the
paired row's SE, so the pair is called tied only within ~0.03 DPS rather than
~4.33 — a threshold from one scale applied to a comparison spanning both.

Note the direction is *not* obviously wrong. The paired SE is the honest one
(§10:716, "correct by construction"), and tighter tie groups at the top of the
list is the resolution §10 Phase 2 was designed to buy. What is unjustified is
that the choice is happening implicitly, via a `min` that was reasoned about
under a same-scale assumption that has since been broken.

## Second, related problem: the cutoff constant

`CUTOFF` is `{ absDps: 3.4, pct: 0.15 }`, derived in PLAN.md §10:715 as
`max(3.0, 2 x mean reported SE)` where the mean reported SE was **1.678** — the
`independent` figure. That derivation now describes only rows 9+. Whether the
top 8, which are measured ~127x more precisely, should still be gated by a bar
calibrated to the coarse scale is an open question, not a settled one.

`meetsCutoff` is applied twice to replicated rows: once at `rank.ts` before
replication and again at `rank.ts:744` against the replicated mean, so the
cutoff and the SE method are already interacting.

## Measurement caveat

The ~0.017 DPS paired figure is **not measured**. It is an upper bound I derived
from `sampleSdOfAvgs` (0.0381, the spread of five *absolute* run means) in
`docs/five-seed-spread.json`, divided by sqrt(5). True delta spread is plausibly
smaller still, since the shared-seed pairing cancels common variance. The
`independent` figure is scaled from that file's 1.678 DPS at 5,000 iterations to
our 3,000-iteration default by 1/sqrt(N).

Both come from **ret** gear at the recorded fixture, not feral, and nothing here
has been confirmed by re-running the ranker and reading emitted `se` values.
Before acting, measure the real paired-replicate SE on an actual run:

```bash
pnpm rank --region US --realm dreamscythe --character slamaltman \
  --offline --max-phase 2 --raid Karazhan --report <path>.html
```

then read `se` and `seMethod` per row from the emitted `.json`.

## Done when

- `assignTieGroups` states explicitly what it does when the two rows carry
  different `seMethod`s, rather than inheriting whatever `Math.min` happens to
  pick. Either justify mixing in the comment, or compare only within a method,
  or normalise — but decide it.
- The `view.ts:135-138` comment is updated: as written it explains `min` under a
  same-scale assumption that no longer holds.
- The 3.4 DPS cutoff's relationship to the two SE scales is resolved, or
  explicitly recorded as intentionally independent-scaled.
- `view.ts:141-145`'s note that reported SE "runs a little over 2 DPS" is
  re-checked; it describes the pre-9c62693 top of the list.

## Not in scope

Changing the paired-replicate method itself, or `DEFAULT_SEEDS`. Both are
settled by §10 and 9c62693.
