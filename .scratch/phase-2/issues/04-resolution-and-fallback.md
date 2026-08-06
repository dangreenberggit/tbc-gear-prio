Status: open
Type: task
Origin: PLAN.md §14 Phase 2, §10, §5.2
Blocks: none
Blocked by: 03

# Resolution and fallback — paired-replicate SE for the top 8, report-events route

Branch: `phase-2/resolution-and-fallback` off `phase-2/trust`, after 03.

Fourth: this rewrites the SE half of the ranking loop, which is easier once the
view layer sitting on top of it is fixed and tested.

## Paired-replicate SE

§10 is unusually specific about what this buys and what it does not:

> **Phase 2** — for the top ~8 items only, replicate across 5 seeds and use
> `SE = sd(deltas) / sqrt(5)`, marked `seMethod: 'paired-replicate'`. Correct by
> construction, no distributional assumptions, and it costs 5× sims on 8 items
> rather than on 180. This buys **resolution, not correctness** — it is a
> refinement, not a fix, and it should not be pulled forward at the expense of
> the gate items above it.

Today the ranking loop hardcodes `seMethod: "independent"` at the one site that
builds a `RankedItem`; the union member `'paired-replicate'` exists on the type
and is never produced. Find both with:

```bash
grep -n "seMethod" packages/core/src/rank.ts
```

(Line numbers are deliberately absent — ticket 03 moved them once already.)

Why it matters, from §10: reported independent SE is on the ~1.5 DPS scale
(measured mean 1.678), while the derived cutoff is `{ absDps: 3.4, pct: 0.15 }`.
A large part of the shortlist collapses into one undifferentiated tie group —
*"the tool would look broken while being statistically conservative."* Paired
replication is what separates the top of the list.

Watch the interaction with §10's measurement: **a shared seed repeats
bit-identical** (our shared-seed arm measured 0.00 spread, not R5's 0.06). So
`sd(deltas)` across five seeds must use **five different seeds**, and each
seed's baseline and candidate must share that seed. Replicating a single seed
five times yields sd = 0 and an SE of zero — a plausible-looking number that is
entirely an artifact.

Also: `RankInput.seeds` is already `number[]` with "`>1` enables paired
replication (§10)" in §4. Honour that field rather than inventing a second
switch.

## Report-events fallback route

`FightSummary.route` is declared `"ranked" | "report-events"` in
`packages/core/src/seams/gear-source.ts`, and `findFights` returns it.

**Two things an earlier draft of this ticket got wrong, both verified 2026-08-05
— check these before planning against them:**

- **`Ranking` has no `fight` field**, so nothing carries the route out to a
  caller today. `RankInput.fight` exists and is a bare `FightRef`
  (`reportCode` + `fightId`, no route). Surfacing which route answered the run
  is therefore new work in this ticket, not plumbing that already exists.
- **No `report-events` fixture exists.** `grep -rl "report-events" test/` returns
  nothing, and `test/fixtures/` holds only slamaltman. Capturing one is the
  first step here, not an afterthought — the gate box cannot close without it.

The behaviour to build: a character with no ranked kills resolves through the
report-events route and returns a `Ranking`, where today `findFights` returning
no `route: "ranked"` summary reaches `throw new RankError("no-qualifying-fight")`.

## Below-cutoff expand

The remaining Phase 2 §14 line item not owned elsewhere. `belowCutoff` and
`rank: null` are computed, and ticket 03 added `belowCutoffInView` plus a
`(below cutoff)` marker on every CLI row.

**Ticket 03's review (S2) left the affordance itself open, deliberately:** "an
expand" is a UI control and there is no UI until Phase 3, so the rows are
currently flagged inline rather than collapsed. Settle the CLI's answer here.
The §10 constraint that binds either way is **hidden, never deleted** — the rows
stay in the payload and stay reachable.

Cheapest shape that satisfies it: print above-cutoff rows by default and put the
rest behind a flag (`--show-below-cutoff`), so the default output is the
shortlist and nothing is lost. Pick that or state what you picked instead.

## Gate box owned

> ☐ fallback route exercised on a character with no ranked kills

Closing this box starts with capturing the fixture named above.

The paired-replicate work has no gate box of its own; it is a §14 line item and
its evidence is the SE method appearing on the top 8 with a non-zero
`sd(deltas)` across distinct seeds.

## Testing

Ranking statistics are named in AGENTS.md § Testing as a pure function to
unit-test directly. The fallback route is a seam behaviour and is tested at the
`rankUpgrades` interface through the recorded `GearSource`.

## Done when

Each line names the observable that proves it, so "done" is checkable rather
than judged:

- **Paired-replicate reaches the top 8.** A ranking run with
  `seeds: [11, 22, 33, 44, 55]` shows `seMethod: 'paired-replicate'` on exactly
  the top 8 rows and `'independent'` below them, and each of those 8 reports
  `se > 0` derived from `sd(deltas) / sqrt(5)`.
- **Five identical seeds fail loudly.** `seeds: [42, 42, 42, 42, 42]` raises
  `RankError` of kind `internal` naming the degenerate input, keeping the
  artifact SE described above off any report. `internal` because the other kinds
  fault the character, the log or the sim, and this is a caller passing bad input.
- **The fallback answers a real fixture.** A committed `report-events` fixture
  exists, `rankUpgrades` returns a `Ranking` for it, and the route that answered
  is readable from the result. Record the capture command and how to re-verify
  it, per AGENTS.md § Durable claims.
- **The shortlist is the default CLI output.** Below-cutoff rows are absent from
  the default run and present under the flag, with the row count identical
  across both.
- `pnpm verify` green; `writing-for-agents` review applied to this ticket and to
  any doc this branch edits (AGENTS.md § Writing for agents); `pre-merge-review`
  written to `docs/reviews/phase-2-resolution-and-fallback.md`.
