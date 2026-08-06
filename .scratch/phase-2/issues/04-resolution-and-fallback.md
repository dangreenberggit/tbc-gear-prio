Status: closed
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

The ranking loop used to hardcode `seMethod: "independent"`, leaving the union
member `'paired-replicate'` declared and never produced. Both now live in
`packages/core/src/rank.ts`, with the arithmetic in `packages/core/src/se.ts`.

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

Two things an earlier draft of this ticket got wrong, both since built
(2026-08-05):

- **`Ranking` had no `fight` field**, so nothing carried the route out to a
  caller. Surfacing which route answered was new work here, not plumbing that
  already existed. Now `Ranking.fight: ResolvedFight` (PLAN.md §4).
- **No `report-events` fixture existed.** Captured live to
  `test/fixtures/slamaltman-report-events.raw.json`; the capture command and
  its cost are in `docs/verification-log.md`, 2026-08-05.

**What "no ranked kills" turned out to mean.** Not a wipe-only report — all 25
of slamaltman's recent reports contain kills. It is about a ranked *parse*:
`encounterRankings` returns zero for him on encounters he has ten kills on,
controlled against a leaderboard character who returns 19. So slamaltman is
himself the character the gate box asks for. Re-check with
`python scripts/probe_ranked_route.py --name slamaltman --server-slug dreamscythe --region US`.

## Below-cutoff expand

The remaining Phase 2 §14 line item not owned elsewhere. `belowCutoff` and
`rank: null` are computed, and ticket 03 added `belowCutoffInView` plus a
`(below cutoff)` marker on every CLI row.

Ticket 03's review (S2) left the affordance itself open, deliberately: "an
expand" is a UI control and there is no UI until Phase 3. The §10 constraint
that binds either way is **hidden, never deleted** — the rows stay in the
payload and stay reachable.

**Settled as proposed:** above-cutoff rows print by default, the rest sit behind
`--show-below-cutoff`. `applyView` gained `shortlist` and `belowCutoffCount` as
a second projection of `rows` rather than a filter over them, so `rows` stays
the whole payload and an expand is a choice of which array to render.

## Gate box owned

> ☑ fallback route exercised on a character with no ranked kills

Closed 2026-08-05 against the captured fixture; evidence in
`docs/verification-log.md`. Ticked in PLAN.md §14.

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
