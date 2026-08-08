# ADR-0020 — The cutoff is absolute; a filter never moves the bar

**Status:** accepted
**Date:** 2026-08-06
**Amends:** PLAN.md §12 (the "filter first, then apply the cutoff within the
filtered view" bullet)
**Tickets:** `.scratch/carry-forward/issues/36-relative-cutoff-within-a-filtered-view.md`
**Origin:** `docs/reviews/phase-2-apply-view.md` adversarial finding A3

## Context

PLAN.md §12 settles how the two row-hiding mechanisms compose:

> They compose as **filter first, then apply the cutoff within the filtered
> view** — because a 2 DPS gain may be the best thing available in one specific
> raid, and hiding it there would answer the user's actual question with
> "nothing".

`applyView` implemented that by re-running `meetsCutoff` over the filtered rows
into a second field, `ViewRow.belowCutoffInView`. Review A3 found the
recomputation cannot change a value. This ADR settles the question that finding
left open: **should the threshold be a function of the filtered set?**

### The recomputation is provably redundant

Three facts. Re-run against the tree as it stood before this change
(`git show a2dff47:packages/core/src/view.ts`), or against `src/` today for
everything except the deleted loop:

```bash
grep -rn "absDps\|CUTOFF\|meetsCutoff" packages/core/src/
```

1. `CUTOFF = { absDps: 3.4, pct: 0.15 } as const` is the only `Cutoff` value
   constructed anywhere in `packages/core/src/`. `cutoff.ts` holds the sole
   definition; `rank-report.ts` and `cli.ts` only read it for display.
2. `Cutoff` is declared `typeof CUTOFF` — literal-typed, not
   `{ absDps: number; pct: number }`. `Ranking.cutoff` therefore cannot hold any
   other pair, and `rank.ts` assigns `CUTOFF` to it.
3. `meetsCutoff(deltaDps, deltaPct, cutoff)` reads its three arguments and
   nothing else — no closure, no module state, no row set.

`rank.ts` computes `!meetsCutoff(deltaDps, deltaPct, CUTOFF)` into
`belowCutoff`, once in the ranking loop and again after paired replication.
`applyView` computed the same expression over its filtered rows, which are
copies (`{ ...item }`) of the ranking's. Filtering selects rows; it assigns no
row's `deltaDps` or `deltaPct`. Same function, same three arguments, so the two
fields are equal for every row of every view.

This is now a checked property rather than only an argument. The test in
`packages/core/test/view.test.ts` walks a ranking through seven `ViewOptions`
combinations and asserts every row's `belowCutoffInView` equals its source
`belowCutoff`:

```bash
npx vitest run packages/core/test/view.test.ts -t "agrees with the ranking"
```

Inverting the assignment in `applyView` fails it, so it is not vacuous —
observed as 8 failing tests in this file when `belowCutoffInView` was flipped to
`!item.belowCutoff`.

### The relative reading collides with a locked constraint

The candidate alternative is to derive the bar from the filtered set — e.g. from
its best `deltaDps` — so the top row of any filter is always above the line.

PLAN.md §2 lists **"No view changes a number"** among the constraints it calls
"architectural constraints, not marketing", and spells out the remedy for
anything that violates it: _"If a control would change a delta, it belongs on
`RankInput` and in `contentHash` instead, and the run has to be re-simmed."_
§4.1 and §12 both state `ViewOptions` are pure re-renders that are not in
`contentHash`, and ADR-0019 made that structural — `hashPayload` builds its
object field by field so a view field cannot leak in, pinned by a test.

A filtered-relative threshold makes `raid` a control that changes what the tool
says about an item while its `deltaDps` is unchanged: upgrade under one filter,
noise under another. It does not merely bend §2's wording, it lands in exactly
the case §2 routes to `RankInput` — and putting a view control into
`contentHash` would re-sim on every toggle, discarding §4.1's "toggling is
instant".

### It would also promote noise

The cutoff is not a display preference. It is `max(3.0, 2 × mean reported SE
1.678)` from the Phase 1 five-seed spread experiment (PLAN.md §10,
`docs/five-seed-spread.json`), i.e. the width below which a delta is not
distinguishable from zero at the iteration counts this tool runs. A 2 DPS delta
at SE ≈ 2 is noise; being the largest number in a filtered subset is a fact
about the subset, not evidence that the measurement resolved. Relative-to-set
would print "best in Karazhan" over a number the sim cannot tell from zero.

### §12's stated worry is already answered

§12 wanted a small gain not to vanish under a raid filter. It does not vanish:
`applyView` filters, never deletes, and PLAN.md §10's constraint is **hidden,
never deleted** — `ViewResult.rows` stays whole and `shortlist` is a second
projection, so the row appears under its raid filter flagged rather than absent.
Covered by `view.test.ts`, "keeps a small gain visible when it is the best in
the filtered raid".

## Decision

**The cutoff is absolute. `ViewOptions` never moves the threshold.**

"Filter first, then apply the cutoff within the filtered view" governs the
**ordering** of the two hiding mechanisms — filter selects the row set, the
cutoff then flags rows within it and never deletes any — not a per-filter
threshold. PLAN.md §12 is amended to say so.

Consequently `applyView` stops recomputing what it can only reproduce:
`belowCutoffInView` is assigned from `belowCutoff` at the copy site, and the
second pass over `rows` is gone. `view.ts` no longer imports `meetsCutoff`, so
`rank.ts` is its only caller.

### `belowCutoffInView` survives as a field

Two reasons to keep it. It marks the boundary: the shortlist is a property of
the **view**, and `ViewResult.shortlist`, `belowCutoffCount` and `cli.ts`'s
grouped output read the view's own answer rather than reaching back into the
`Ranking`. And a `ViewRow` is what the CLI and the Phase 3 web shell render, so
the row carrying its own display verdict is what keeps the two callers from
re-deriving it. What changes is only that the field is documented as what it is
— carried, not recomputed.

## Consequences

- **One writer for the cutoff verdict.** `rank.ts` decides; `view.ts` carries.
  This narrows carry-forward ticket 39 ("`belowCutoff` and `belowCutoffInView`
  derive the same fact by two paths"): there is now one derivation path, and the
  test added here asserts the field agrees with its source. 39's remaining value
  is the paired-replication case, where `rank.ts` rewrites `belowCutoff` from
  the replicated mean — with the view carrying rather than recomputing, that
  rewritten value reaches the display by construction.
- **Changing the cutoff stays a re-sim, not a re-render.** `CUTOFF` is not on
  `RankInput` and not in `contentHash`; changing it changes `belowCutoff`,
  `rank` numbering (rows below the cutoff take `rank: null`) and which rows
  paired replication spends its 5× budget on (it replicates the top N
  above-cutoff rows). Bump `engineVersion` (ADR-0019) if it ever moves, or
  cached rankings serve the old verdicts.
- **A user-facing cutoff control is out of scope by this ADR.** If one is ever
  wanted, it is a `RankInput` field in `contentHash`, not a `ViewOptions` field.

## Alternatives considered

**Derive the threshold from the filtered set's best delta.** Rejected above: it
makes a view change a number (§2), would force `ViewOptions` into `contentHash`
and re-sim on every toggle (§4.1), and would label statistically
indistinguishable rows as upgrades (§10).

**A relative threshold that only ever _lowers_ the bar** — absolute, unless the
filter has nothing above it. Rejected: this is the same violation with a smaller
blast radius, not a different one. The same item still reads as an upgrade in
one filter and noise in another. It also fails the case it exists to serve
honestly — a filter where everything is noise should say so, which is what a
flagged-but-visible list already does.

**Delete `belowCutoffInView` and have consumers read `belowCutoff`.** Rejected
as wider than the finding warrants: it touches `cli.ts`, `ViewResult` and the
view and CLI test files, to remove a field that is now correct and cheap. The
altitude boundary it marks (§4.1: the view owns display decisions) is worth
keeping.

**Leave the recomputation in place as future-proofing.** Rejected: it is dead
code whose comment claimed behaviour the code did not implement — which is what
review A3 actually caught. If a relative cutoff is ever adopted it would
supersede this ADR, and a live decision is cheaper to change than a comment that
misdescribes the code in the meantime.
