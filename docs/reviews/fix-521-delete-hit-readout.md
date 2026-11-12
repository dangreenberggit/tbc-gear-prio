# Pre-merge review — fix/521-delete-hit-readout

Diffed against: main `5413e971...6acd1e6a` (one commit on `dev`) and fork
`74b9c3bc1...d16a74959` (one commit on the base lock's fork commit). The
fork diff is the product change: 6 files, 22 insertions, 588 deletions,
all in `ui/features/upgrades/`. The main diff is the re-pin, the
provenance rows, ticket 521's close and the scope-doc row.

What the owner asked for: ticket 521 said the tab's hit-cap readout
(`Ranking.caps`, from `capStateFrom`) leaves out Improved Faerie Fire and
enchant hit. No tab screen reads it. The orchestrator offered "Delete it
(my recommendation): drop the side calculation and close 521"; the owner
asked whether DPS and rankings would be off where hit interacts, was told
DPS gains come from sims and the gem-repair budget uses the sim's own hit
read, and answered "Sure delete". The change must not alter what a player
sees, the ranking, DPS or sim requests, and the gem-repair hit budget must
keep its behaviour. `packages/core` and `apps/web` are out of scope.

Three axes, each a fresh Opus `general-task` with no part in writing the
branch: Adversarial (effort xhigh), Domain, Standards + Spec. A fourth
fresh agent checked the fixes (step 3). Their full reports are in the
session's `.scratch/agent-reports/2026-11-11-general-task-521-review-*.md`
(gitignored).

## Summary

The deletion is clean. No removed symbol had a reader, the ranking and
the composed sim requests are unchanged, the gem-repair budget's code and
tests are untouched, and no `ENGINE_VERSION` bump is needed because the
ranking cache lives in memory for one mounted tab. Review found no
defect in behaviour. It found two wrong or stale comments in the fork's
`cap-profile.ts` (D1, D2 / S2), fixed in fork `a98a7a6fc` and re-pinned
in `3fac51c4`, and one open ticket (842) left stale by the deletion
(A1 / P1), fixed by a comment on that ticket. Nothing blocks the merge.

Tickets: filed 0, closed 1 (521, by the implementer's commit `6acd1e6a`).
Ticket 842 stays open with a new comment.

## Adversarial

Answers to the brief's questions, each checked:

- **Did a removed symbol have a reader?** No. At base `74b9c3bc1`,
  `git -C vendor/tbc-new-fork grep -nw -e talentHit -e TalentHitDescriptor 74b9c3bc1 -- .`
  finds them only in `cap-profile.ts` and in `caps.ts` lines 161-219,
  inside `capStateFrom` / `talentHitFromString`, both deleted.
  `hitCapBudgetFrom` (`cap-profile.ts:431-470` at head) reads only
  `hitStat`, `hitCapPercent`, `ratingPerPercent` and `repair`. The
  reviewer also grepped for string-key reads (`.caps`, `'caps'`) and found
  only the definitions, `rank.ts`'s own wiring, the test fixture and the
  snapshot. In the main repo, `fork-meta-repair.test.ts` takes only
  `gearHitRating` from the fork, the parity test compares fields that do
  not include `caps` or the flags, and `check_tab_fixtures.py:83` checks
  only `ranking.items`.
- **Can a cached ranking without an `ENGINE_VERSION` bump break the
  tab?** No. `ENGINE_VERSION = 8` (`content-hash.ts:60`) goes into the
  sim cache key (`rank.ts:1032`). The store is `new MemoryStore()` per
  mounted tab (`model/run.ts`, `createRunContext`), so no ranking outlives
  a page load. localStorage holds settings and the worker count only.
  Fixture JSON with the old keys still loads: the loader checks only
  `ranking.items` (`utils/fixture.ts:62-77`). The ranking logic did not
  change, which is the bump rule in `content-hash.ts:49-55`.
- **Gem-repair budget unchanged?** Yes. `gearHitRating`'s body is the
  same at both commits; no hunk touches `hitCapBudgetFrom`,
  `targetsAtCapLevel`, the hit-cap notes or any profile value. The tests
  that pin them pass (535-B1..B6, L0..L2, O1, the note tests, 831-T1).
- **Was `statDeltaBetween` used for anything but the flags?** No. At base
  its one caller (`rank.ts:1501`) fed only `hitDriven` /
  `hitRegression`; best-swap selection is `deltaDps > best.deltaDps`. The
  rewritten two-hander comment matches `clearOffHandForTwoHander`.
- **Test theatre?** None. No fork test was deleted (810 before and
  after); the fork never had tests for the deleted functions.

**A1 (low): ticket 842 was left stale.**
`.scratch/carry-forward/issues/842-mock-fixtures-give-casters-a-melee-hit-cap.md`
(open) cites "`hitCapBanner` in the fork's `disclosure.ts:68`", which
this branch deletes, and its "Done when" offers dropping the `caps` block
"if the tab still reads no `caps` field". The fork's `Ranking` now has no
`caps` field at all. The mock generator
(`packages/core/test/tab-fixtures/make-mock-fixtures.ts:124,671`) still
writes the block into all 11 `data/tab-fixtures/mock-*.json`; the loader
ignores it, so a player sees nothing. Same finding as P1.

## Domain

**D1 (low, comment): the `trackExpertise` doc was wrong about hunters.**
Fork `cap-profile.ts:63-65` at `d16a74959`, rewritten by this branch,
said hunters are `false` because "nothing they do can be dodged or
parried". Hunter melee can be: `sim/hunter/hunter.go:142`
(`AutoSwingMelee: true`), `sim/core/attack.go:475` (`OutcomeMeleeWhite`),
which rolls dodge and parry at `sim/core/spell_outcome.go:219-220`;
ranged shots roll miss only (`spell_outcome.go:460-467`). Behaviour is
unaffected.

**D2 (low, comment): the file header still named deleted code.** Fork
`cap-profile.ts:19-20` cited "`HIT_CAP_PERCENT = 9` this repo already
shipped" (deleted by this branch; `git grep` at `d16a74959` finds it only
in that comment), and lines 5-11 and 47 called this table the input to
"the cap code" / "the cap computation". Same finding as S2.

Checked and true: the kept per-spell talent positions (priest segment 0
index 15 `focusedPower`, warlock segment 0 index 0 `suppression`) match
the tree json; the gem-repair budget reads the sim's hit from
`computeStats` (`rank.ts:849`, `:1124-1133`) and adjusts each swap by
`gearHitRating`'s change (`rank.ts:4283`), so what the owner was told
holds; no player-facing hit-cap text changed (the hit-cap notes at
`rank.ts:4603-4641` are untouched; the only locale hit-cap text is
wowsims' own "To Hit Cap:"). The rewritten `rank.ts`, `caps.ts` and
`disclosure.ts` comments and the `engine.md` rows are true.

## Standards + Spec

**P1 (Spec, low): ticket 842 left stale.** Same as A1. The reviewer also
noted the generator's `MockRanking` comment
(`make-mock-fixtures.ts:45-49`) still calls `caps` a field the tab
reads.

**S1 (Standards, low): the `caps.ts` header tells the deletion's
story.** Fork `caps.ts:1-10` lists what ticket 521 removed and why.

**S2 (Standards, low): the `cap-profile.ts` header describes the
deleted readout.** Same as D2.

Checked and fine: everything the owner agreed to delete is gone and
nothing more; every remaining `CapProfile` field has a reader; ticket
521's `Verified by:` command prints exactly the two header lines it says
(`check_merge_ready.closed_without_verification` returns `False`); the
scope-doc row removal follows `docs/upgrades-tab-scope.md`'s Maintenance
rule; the lock's `commit` matched the fork head, its `_comment` was only
appended to, `pushed: false` is right (`git branch -r --contains
d16a74959` printed nothing), the effects artifact changed only
`forkCommit`, and every `engine.md` sha256 matched
`git show d16a74959:<path> | sha256sum`; commit messages follow the
rules. Leaving core's readout, the recorded rankings and `ENGINE_VERSION`
alone is right.

## Fixes

- **D1, D2 / S2:** fork commit `a98a7a6fc` "Correct cap-profile comments
  after the readout went" rewrites the header to name the table's readers
  (`gemFillWeights`, `hitCapBudgetFrom`), drops the `HIT_CAP_PERCENT`
  reference, and says hunters' ranged shots, not everything a hunter
  does, cannot be dodged or parried. Comment only, so no test: the check
  is the diff (`git -C vendor/tbc-new-fork show a98a7a6fc`, every changed
  line inside a `/** */` block). Re-pinned in main `3fac51c4`
  (`docs/agents/known-traps.md` § Before editing a ported engine file:
  E-W3 green before the hash moved, `engine.md` row, lock bump,
  `pnpm sim-implemented-effects:generate`, `pnpm verify`).
- **A1 / P1:** `3fac51c4` appends a comment to ticket 842: the fork has
  no `caps` field or `hitCapBanner` now, so the only way left to close it
  is dropping the block from the generator and regenerating the
  fixtures. That edit is under `packages/core` and `data/`, outside this
  branch's scope, so 842 stays open.

## Check the fixes (step 3)

A fresh `general-task` agent checked `a98a7a6fc` and `3fac51c4`. No new
tests existed to run before and after. It found no defect:

- The readers the new header names are the only ones:
  `candidate-gems.ts:359` (`gemFillWeights`) and `rank.ts:822` onward
  (the meta-repair budget code).
- The hunter and caster claims match `sim/hunter/hunter.go:142`,
  `sim/core/attack.go:475,500`, `sim/core/spell_outcome.go:61-87,
190-205, 219-220, 460-530`.
- Only comment lines changed.
- `engine.md:136` holds `1b07ddce0f70…0199`, the sha256 of `cap-profile.ts`
  at `a98a7a6fc`; the lock's `commit` is the fork HEAD; the `_comment` was
  only appended to; the artifact changed only `forkCommit`.
- Fork `tsc --noEmit` rc=0; `CI=1 npx vitest run ui/features/upgrades`
  rc=0, 71 files, 810 tests passed (node v22.23.2).

## Checks

| Check                             | Command                                                                         | Result                                                                                                                                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| E-W3 before the hash moved        | `pnpm -C <pair> exec vitest run packages/core/test/wowsims-fork-parity.test.ts` | v22.23.2, `Tests 1 passed (1)`, rc=0                                                                                                                                                                                                             |
| Fork typecheck after the fix      | `node node_modules/typescript/bin/tsc --noEmit` (fork)                          | v22.23.2, rc=0                                                                                                                                                                                                                                   |
| Fork lint after the fix           | `npx oxlint --max-warnings 0 ./ui/features/upgrades` (fork)                     | rc=0                                                                                                                                                                                                                                             |
| Fork upgrades tests after the fix | `CI=1 npx vitest run ui/features/upgrades` (fork)                               | v22.23.2, `Tests 810 passed (810)`, rc=0                                                                                                                                                                                                         |
| Effects artifact                  | `pnpm -C <pair> sim-implemented-effects:generate`                               | `226 implemented, 450 stub-only (fork commit a98a7a6fc4c0…)`, rc=0                                                                                                                                                                               |
| Verify                            | `pnpm -C <pair> verify` at `3fac51c4`                                           | v22.23.2, rc=0; `gates: 1649 ran, 0 skipped`; `engine port drift check ok: 36 ported files match engine.md`; `fork tests check ok at fork commit a98a7a6fc4c0` (74 files, 829 tests); layout gate skipped (the pair's fork has no built `dist/`) |
| Merge check                       | `pnpm -C <pair> merge-ready`                                                    | MERGE_READY_RESULT                                                                                                                                                                                                                               |

The fork's own formatter (`npx oxfmt --check`) flags `cap-profile.ts`
at base `74b9c3bc1`, at `d16a74959` and after the fix, on lines this
branch did not touch (lines 443-480, the `hitCapBudgetFrom` body). Not
introduced here; `pnpm verify` does not run it.

## Notes

- The implementer's ranking comparison (`{forkRanking, forkRequests}`
  dumped before and after) was a scratch test, deleted before commit, and
  no reviewer re-ran it. The reproducible part is E-W3, which asserts the
  fork's composed requests equal core's for its fixture; the code reading
  supports the rest (the deleted calls were pure and fed only the deleted
  fields).
- Fork commits `d16a74959` and `a98a7a6fc` are on no remote
  (`pushed: false`). The merge must push the fork branch.
- With 521 closed, no ticket tracks the same omission in core's readout
  (`packages/core/src/caps.ts`), which the core CLI and rank report still
  print. The owner's scope ruling excludes core.
- The hand-trimmed `set_bonus_tip_on.snapshot.json` edit was not needed
  (the test casts it `as unknown as`) but is harmless.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                  |
| --- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | Comment on `.scratch/carry-forward/issues/842-mock-fixtures-give-casters-a-melee-hit-cap.md` in `3fac51c4`; dropping the generator's `caps` block stays with 842 (outside this branch's scope) |
| P1  | Spec        | fixed       | Same as A1                                                                                                                                                                                     |
| D1  | Domain      | fixed       | Fork `a98a7a6fc`, re-pinned in `3fac51c4`; checked by the step 3 agent against the sim sources                                                                                                 |
| D2  | Domain      | fixed       | Fork `a98a7a6fc`, re-pinned in `3fac51c4`                                                                                                                                                      |
| S2  | Standards   | fixed       | Same as D2                                                                                                                                                                                     |
| S1  | Standards   | wontfix     | The header says why a file named `caps.ts` holds one function and that core keeps the rest, which a reader of this file needs; ticket 521's `Verified by:` command also prints these lines     |
