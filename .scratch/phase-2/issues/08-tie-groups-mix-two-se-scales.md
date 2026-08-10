Status: closed
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

## Resolution (2026-08-08)

Settled by [ADR-0021](../../../docs/adr/0021-a-mixed-semethod-tie-is-judged-on-the-coarser-se.md).
Measured first, on ret P2, 240 rows, 3,000 iterations, seeds 11/22/33/44/55
(local run 2026-08-08; `.scratch/` is gitignored so nothing is committed —
re-run the command in ADR-0021 to reproduce):

| method | rows | mean SE | window |
| --- | --- | --- | --- |
| `independent` | 232 | 2.149 | 4.30 |
| `paired-replicate` | 8 | 0.0155 | 0.031 |

~139x, confirming the estimated ~127x. Three corrections to this ticket:

- **The reproduction command above is wrong.** `--raid Karazhan` filters the
  rows written to the JSON (`cli.ts`, `reportRanking`), so it emits zero
  `paired-replicate` rows — every row reads `independent`. Omit `--raid`.
- The paired SEs are not uniform: rank 1 is 0.0994, the other seven 0.0005–0.0068.
- `independent` at 3,000 iters measures 2.149, not the 2.166 obtained by scaling.

The row8→row9 boundary is a live disagreement, not a theoretical one: the two
rows sit **0.440 DPS** apart, inside the independent window (4.362) and far
outside the paired one (0.0011).

Decisions, per the Done-when list:

- `tieWindow(a, b)` in `view.ts` states the rule: `min` within one `seMethod`,
  `max` across two. A pair cannot be resolved more finely than its
  worse-measured member. Covered by two tests in `view.test.ts`, the first
  confirmed to fail against the old `Math.min`.
- The `view.ts` three-bug comment is updated; point 2 now scopes itself to one
  method.
- The 3.4 cutoff **stays independent-scaled, recorded as intentional** in
  `cutoff.ts` and ADR-0021: it runs before replication and selects which rows
  get replicated, so a paired-derived bar would be circular.
- "runs a little over 2 DPS" re-checked and replaced with the measured 2.149.

## Not in scope

Changing the paired-replicate method itself, or `DEFAULT_SEEDS`. Both are
settled by §10 and 9c62693.
