Status: open
Type: disclosure gap (structural, not currently user-facing)
Origin: pre-merge review of `feat/candidate-pool`, perf axis R13, 2026-08-15
Blocks: none
Blocked by: none

# A `PartialRanking` is indistinguishable from a complete one in its own data

`candidate-pool.md` §5.1.4 requires that a stopped run's disclosure "say
replication was skipped rather than leave the SE column looking normal".

That requirement **is met in the fork UI**: `upgrades_tab.tsx` has a dedicated
`'stopped'` state, its banner reads "Stopped early… replication and
set-completion packages were not run", and a partial bypasses `applyView`
entirely (the `complete: true` literal makes that a type error) so it renders
a plain list rather than a pretend-complete view. Rows with `simmed: false`
are filtered rather than shown as a 0 delta that would misread as "no
upgrade". That is careful work and it is why this is not a blocker.

The gap is structural. In `packages/core`, `rank.ts` builds `rankingBase`
once and spreads it into both the complete and partial branches, so a
`PartialRanking`'s `substitutions` and `assumptions` are **byte-identical to
a complete run's**. Nothing in the returned object records that replication
was skipped. Rows keep `seMethod: 'independent'` with no note saying why.

Consequences:

- Any *other* consumer — the HTML report (`rank-report.ts`), a future CLI
  `--stop`, a second UI — receives a partial whose disclosure surface is
  indistinguishable from a complete run. The CLI is safe today only because
  it asserts on `!ranking.complete` rather than narrowing silently.
- Test 7.8 asserts the **absence** of `paired-replicate` and `setBonusNote`,
  but nothing asserts the **presence** of a disclosure, so the invariant is
  unguarded in core.

## What to do

Carry the fact in the data, not in one renderer: e.g. a `Substitution` row or
a standing assumption emitted on the partial branch, saying replication and
set-completion packages did not run because the run was stopped. Then assert
its presence in 7.8, and let the fork banner read it instead of hardcoding
the sentence.

## Acceptance criteria

- [ ] A stopped run's `Ranking` object itself discloses the skipped
      replication.
- [ ] 7.8 asserts that disclosure is present, not only that paired SE is
      absent.
- [ ] The fork banner derives from the data rather than duplicating it.
