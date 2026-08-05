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

Today `rank.ts:400` hardcodes `seMethod: "independent"`. The union member
`'paired-replicate'` already exists on the type (`rank.ts:136`) and is never
produced.

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

`GearSource` already declares `route: "ranked" | "report-events"`
(`packages/core/src/seams/gear-source.ts:13`), and `Ranking.fight.route` in §4
carries it through. What is missing is the fallback being **exercised**: a
character with no ranked kills must still resolve through the report-events
route rather than throwing `no-qualifying-fight`.

## Below-cutoff expand

The remaining Phase 2 §14 line item not owned elsewhere. `belowCutoff` and
`rank: null` are already computed; what this adds is the CLI surfacing them
behind an expand — **hidden, never deleted** (§10).

## Gate box owned

> ☐ fallback route exercised on a character with no ranked kills

This needs a **recorded fixture** for a character with no ranked kills. If no
such fixture exists, capturing one is part of this ticket — and per AGENTS.md
§ Durable claims, do not assert the fixture is present for a fresh worktree
without giving the regen command and how to verify.

The paired-replicate work has no gate box of its own; it is a §14 line item and
its evidence is the SE method appearing on the top 8 with a non-zero
`sd(deltas)` across distinct seeds.

## Testing

Ranking statistics are named in AGENTS.md § Testing as a pure function to
unit-test directly. The fallback route is a seam behaviour and is tested at the
`rankUpgrades` interface through the recorded `GearSource`.

## Done when

- Top ~8 carry `seMethod: 'paired-replicate'` with SE from five distinct seeds;
  a same-seed-five-times input does not silently produce SE 0.
- Fallback route exercised end to end on a no-ranked-kills fixture.
- Below-cutoff rows reachable behind an expand in CLI output.
- `pnpm verify` green; review at
  `docs/reviews/phase-2-resolution-and-fallback.md`.
