# Pre-merge review — fix/842-regen

Diffed against: `dev...fix/842-regen` from `612140f8`. No fork commits:
the pair's fork is detached at the lock's `a98a7a6fc` and only read. The
branch was made in pair `p842` from `fix/842-drop-mock-caps` (the T3
worktree branch, which holds the first commit).

What was asked: ticket 842
(`.scratch/carry-forward/issues/842-mock-fixtures-give-casters-a-melee-hit-cap.md`)
and its 2026-11-11 comment, which leave one way to close it: drop the
`caps` block from `packages/core/test/tab-fixtures/make-mock-fixtures.ts`,
including the types comment that still covered `caps` as a field the tab
reads, then regenerate the 11 `data/tab-fixtures/mock-*.json` files and
check them with `pnpm tab-fixtures:check`. The owner limited the work to
the fork's Upgrades tab, so `packages/core/src/caps.ts` and its CLI/web
readout stay. Background: ticket 521 deleted the fork's `Ranking.caps`
(`docs/reviews/fix-521-delete-hit-readout.md`, A1 / P1).

Two fresh Opus `general-task` reviewers, neither of which wrote the
branch: Adversarial + Domain, and Standards + Spec. The diff is a type
member, a literal, a comment and the regenerated data, so Domain shared a
reviewer with Adversarial. Full reports (gitignored):
`.scratch/agent-reports/2026-11-11-general-task-842-review-adversarial-domain.md`
and `.scratch/agent-reports/2026-11-11-general-task-842-review-standards-spec.md`
in the `fix-842-drop-mock-caps` T3 worktree.

## Summary

The branch drops `ranking.caps` and nothing else. No reader of `caps` in
the mock fixtures exists in this repo or in the fork at `a98a7a6fc`. The
regen is exact and repeatable. Review found no Adversarial, Domain or
Standards problems. Spec's one finding (ticket not closed) and a note both
reviewers made (the comment's cite missed two copied fields) are fixed.

## Adversarial

- **Readers of `caps`:** none. The fork loader
  (`ui/features/upgrades/utils/fixture.ts` at `a98a7a6fc`, line 71) checks
  only `ranking.items`; the fork's `Ranking` (`rank.ts`) has no `caps`;
  `git grep -n -E "\.caps\b|caps\??:" a98a7a6fc -- ui` in the fork finds
  only comments. In this repo, `scripts/check_tab_fixtures.py:83` checks
  only `ranking.items`, and the harness and fixture scripts have no `caps`
  hit. The other `caps` readers (`packages/core/src/cli.ts:374`,
  `rank-report.ts:302`, `apps/web`) read core's own `Ranking.caps`, never
  `data/tab-fixtures/`.
- **Regen:** for each of the 11 files, `dev`'s copy with `ranking.caps`
  popped equals the branch copy (Python compare, all `True`);
  `git diff --numstat` shows `0 19` for each file. Two generator runs
  wrote the same bytes (`cmp` of all 11, no difference).
- Findings: none.

## Domain

The removed block gave the five caster fixtures a melee cap with
Precision 3/3 and expertise, which casters do not have. Removing it adds
no invented data; race stays as `assumptions.race`. After 521 the tab
shows no cap, so nothing on screen changes. Findings: none.

## Standards + Spec

- Scope: 12 files; nothing under `packages/core/src/`, the lock or docs
  moved. `Race` is still used (`make-mock-fixtures.ts:177`, `:655`).
  `data/tab-fixtures/README.md` never mentions `caps`.
- **P1 (Spec, low): ticket 842 still open.** `Status: open` and its
  `.scratch/carry-forward/map.md:457` line. Fixed in the closing commit.
- Standards: no findings.

## Fixes

- **P1.** Ticket 842 is closed with a `Verified by:` line and the map
  line marks it closed. Checked by `pnpm merge-ready` (below).
- **N1 (both reviewers' note): the types comment's cite.** After the
  first commit the comment cited `rank.ts:316-352,615-685`, which covers
  `RankedItem` and `Ranking` but not `SetContext` (`rank.ts:384`) or
  `durationMs`, which `ui/features/upgrades/model/run.ts` adds to the
  ranking. `9160a582` names the types instead of line ranges, so the cite
  cannot drift. Comment only; `pnpm tab-fixtures:check` still prints
  `mock fixtures: 11 files match the generator`.

No fix changed behaviour, so there is no new test for a step 3 agent to
run before and after.

## Checks

| Check          | Command                                         | Result                                                                                                   |
| -------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Fixture check  | `pnpm -C <pair> tab-fixtures:check`             | v22.23.2, `mock fixtures: 11 files match the generator`, 6 recordings ok, rc=0                           |
| Check can fail | same, with `dev`'s `mock-balance.json` put back | `mock-balance.json differs from the generator`, rc=1                                                     |
| No `caps` left | `git grep -c '"caps"' -- data/tab-fixtures`     | no output, rc=1                                                                                          |
| Verify         | `pnpm -C <pair> verify` at `295dee93`           | v22.23.2, rc=0; `gates: 1649 ran, 0 skipped`; layout gate skipped (the pair's fork has no built `dist/`) |

## Notes

- The six real recordings in `packages/core/test/fixtures/tab-recordings/`
  still have a `caps` block. The fork loader ignores it, and
  `fork-meta-repair.test.ts:150` cites `ret-p3-p2.json`'s `capRating` in a
  comment. Outside ticket 842, which covers the made-up fixtures.
- At `1474faf7` alone, `tab-fixtures:check` fails: the generator changed
  and the fixtures had not been regenerated yet. Only matters for bisect.

## Disposition

| ID  | Axis  | Disposition | Ticket / note                                                          |
| --- | ----- | ----------- | ---------------------------------------------------------------------- |
| P1  | Spec  | fixed       | Ticket 842 closed with a `Verified by:` line; map line updated         |
| N1  | Notes | fixed       | `9160a582` names the fork types in the comment in place of line ranges |
