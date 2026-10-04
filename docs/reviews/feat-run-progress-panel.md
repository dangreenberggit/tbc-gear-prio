# Pre-merge review — feat/run-progress-panel

Reviewed range: `21099198f502df4ba8d4b8138a71cd3e2265ae22..a4b83ea58c985ba41e59729f2f2f6c02ec171bfc`
Reviewed range: `a4b83ea58c985ba41e59729f2f2f6c02ec171bfc..0889bf2bd8b963419f8e23d6967bdc8da69716ba`
Reviewed range: `0889bf2bd8b963419f8e23d6967bdc8da69716ba..d205d2127ab04ebf9983b120d9f7b64d5315e8c6`

Fork ranges reviewed alongside (product code lives in the fork worktree
`vendor/tbc-new-fork`, branch `feat/run-progress-542`): round 1
`9b11bf2143aaeb563c1a49fe90bef999e247f88e..4d447adcd2940437a0541be38345cf8e4ad8f60a`;
round 2 `4d447adcd2940437a0541be38345cf8e4ad8f60a..7d4d69d6a329473240085ddebaf532c7818b715b`.
Round 3 has no fork change. Round 3 found one minor gap (m1), fixed in the commit that adds this file.

Dispatch: `codex` is not on `PATH` (`which codex`), so each axis ran as a
fresh `general-task` subagent on Opus at effort `high`, told to write
nothing. Round 1 ran all four axes (adversarial, domain, standards, spec)
in parallel. Rounds 2 and 3 reviewed only fix commits, each with one fresh
reviewer covering all axes. Full axis reports:
`.scratch/stage-gate/run-progress-popover/pmr-{adversarial,domain,standards,spec}.md`
(gitignored stage folder). The work itself ran through `stage-gate`;
plan, reviews, ledgers and gate log are in the same folder.

The layout gate skipped in the stage's `pnpm verify` because the fork
worktree had no built `dist/`. It was armed for this review
(`make dist/tbc/.dirstamp` in the fork worktree) and passed at 4d447adcd
(76 assertions, 0 failed, 9 baselined a11y warnings; `a0d1e786`) and again
at 7d4d69d6a (`79a90dca`).

## Adversarial

No blockers. Should-fix: the engine-order drift guard ran only a
7-candidate pool, so the large-pool boundary branch and the top-N cap were
never checked against the real engine (A1); the fork lock named a branch
that did not contain the pinned commit (A2); comments promised a drift
guard that skips in CI (A3). Minor: a test that passed for the wrong
reason and a stale class doc (A4), a tautological constant test (A5), a
phase test that accepted two endings (A6), a skewed estimate on the
dev-only `bulk-http` runner (A7), "1 rows landed" (A8). Timer lifecycle,
NaN/negative guards, status-row and announcement behaviour, and the
row-filter mirror checked out. Round 2 confirmed A1-A6 and A8 fixed, with
mutation evidence for A1 (removing the engine's top-N cap or replication
slice fails the new 12-candidate tests; the old tests passed).

## Domain

No blockers. Phase names match the engine's real order (candidates →
silent set phase → `ranking` → replication) and fix an old mislabel; the
test setup follows the previous-phase-gear rule. Close-note and
decision.md wording: the set phase does shrink with fewer candidates (D1);
the ring/trinket per-window explanation needed a hypothesis label (D2);
"CPU per sim" was per candidate, and figures lacked a command (D3); the
re-sim count wording (D4); the "40-candidate" run simmed 53 (D5); the
WASM claim lacked its source (D6). Round 2 confirmed all fixed and found
two new wording slips (M1, M2), fixed in round 3.

## Standards + Spec

**Standards.** No code breaks a documented rule. Three old commit subjects
are 51-52 characters (T1). A comment named the wrong guard test (T2); one
close-note cause lacked a hypothesis label (T3); an upstream line-number
citation (T4); one test checks engine stage order (T5); smells: repeated
stage-label switch (T6), duplicated Stop handler and lookups (T7), data
clump `seedCount`/`topN` (T8), unused overrides and measurement-only
`data-*` attributes (T9). Round 2 found the fork formatter `oxfmt` flags
the two new files and one import in `upgrades_tab.tsx` (M3); the base
already failed `oxfmt` on that file and no repo gate runs it.

**Spec.** Matches ticket 542 and the owner's widening ("a similarly
inspired component that fits the area we have to work with (probably more
a thing for desktop)"); nothing required is missing. Notes: live check on
:5174 not :5173 (S1); no Bulk-style iteration or step count (S2); elapsed
starts after sim init, same clock as "Took" (S3); measurement `data-*`
attributes (S4); two Stop buttons (S5); bar can end short of 100% when
fewer rows qualify (S6).

## Summary

No blocking finding in any round. Every should-fix was fixed on the
branch and confirmed by a fresh reviewer. The run-2 estimate gate passed
out of sample (e50 −0.0662 against a pre-written ±0.25:
`node .scratch/handoffs/542-run-progress/replay.mjs .scratch/handoffs/542-run-progress/trace-run2.json --shown`).
Before or with the dev merge, the fork branch `feat/run-progress-542`
must be fast-forwarded into `feat/upgrades-tab` and pushed, at the
owner's explicit ask (lock `_comment`; `pushed: false`).

## Disposition

| ID  | Axis                  | Disposition | Ticket / note                                                                                                                                                                                             |
| --- | --------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial           | fixed       | 12-candidate real-engine pool; `f133e23a`                                                                                                                                                                 |
| A2  | Adversarial           | fixed       | lock `branch` = `feat/run-progress-542` + ff/push note; `48c881d1`                                                                                                                                        |
| A3  | Adversarial           | fixed       | comments say the guard runs only with the fork checked out; fork `8dfb8a292`                                                                                                                              |
| A4  | Adversarial           | fixed       | qualifying row in set phase; class doc; `f133e23a`, fork `8dfb8a292`                                                                                                                                      |
| A5  | Adversarial           | fixed       | tautology removed; `f133e23a`                                                                                                                                                                             |
| A6  | Adversarial           | fixed       | exact phase list on both pools; `f133e23a`                                                                                                                                                                |
| A7  | Adversarial           | wontfix     | `bulk-http` runner is dev-only and off by default                                                                                                                                                         |
| A8  | Adversarial           | fixed       | `rows_landed_one`/`_other`; fork `7d4d69d6a`                                                                                                                                                              |
| D1  | Domain                | fixed       | close note; `0889bf2b`                                                                                                                                                                                    |
| D2  | Domain                | fixed       | hypothesis label in decision.md; `0889bf2b`                                                                                                                                                               |
| D3  | Domain                | fixed       | per-candidate unit and re-run command; `0889bf2b`                                                                                                                                                         |
| D4  | Domain                | fixed       | re-sim count wording; `0889bf2b`                                                                                                                                                                          |
| D5  | Domain                | fixed       | 53 candidates simmed; `0889bf2b`                                                                                                                                                                          |
| D6  | Domain                | fixed       | cites plan.md C41; `0889bf2b`                                                                                                                                                                             |
| T1  | Standards             | wontfix     | rewording needs a history rewrite of commits the lock and close note cite by SHA; all later subjects comply                                                                                               |
| T2  | Standards             | fixed       | comment names N1 and the engine-order block; fork `8dfb8a292`, `f133e23a`                                                                                                                                 |
| T3  | Standards             | fixed       | hypothesis label; `0889bf2b`                                                                                                                                                                              |
| T4  | Standards             | fixed       | symbol reference instead of line numbers; fork `8dfb8a292`                                                                                                                                                |
| T5  | Standards             | wontfix     | the stage-order assertion is the drift guard the tracker's phase model depends on                                                                                                                         |
| T6  | Standards             | wontfix     | judgement call; the panel's label switch and the tab's `progressLabel` serve different views                                                                                                              |
| T7  | Standards             | fixed       | one `stopRun()`; fork `c5a2d9017`. Other duplications left as judgement calls                                                                                                                             |
| T8  | Standards             | wontfix     | judgement call; two numbers, no domain type earns its keep                                                                                                                                                |
| T9  | Standards             | wontfix     | `data-*` kept with a why-comment (fork `4bc719eaf`): capture tooling and ticket 543's refit read them; unused overrides are test seams                                                                    |
| S1  | Spec                  | wontfix     | :5173 was not listening; the run used the fork worktree's own :5174, recorded in the close note                                                                                                           |
| S2  | Spec                  | wontfix     | not required by "Done when"; done/total sims is the engine's own count                                                                                                                                    |
| S3  | Spec                  | wontfix     | same clock as "Took", so the two agree                                                                                                                                                                    |
| S4  | Spec                  | wontfix     | see T9                                                                                                                                                                                                    |
| S5  | Spec                  | wontfix     | both Stops call one handler; removing the toolbar Stop changes the toolbar, outside this ticket                                                                                                           |
| S6  | Spec                  | wontfix     | the old bar behaved the same; estimate uses the exact count                                                                                                                                               |
| M1  | Adversarial (round 2) | fixed       | Primalstrike Bracers and Belt; `d205d212`                                                                                                                                                                 |
| M2  | Domain (round 2)      | fixed       | run-1 and run-2 onset stated separately; `d205d212`                                                                                                                                                       |
| M3  | Standards (round 2)   | wontfix     | `oxfmt` is ungated (no script, hook or CI step runs it) and `upgrades_tab.tsx` already failed it at base 9b11bf214 (82 lines); reformatting would force another re-pin and layout run for no gated change |
| m1  | Standards (round 3)   | fixed       | run-1 re-run command added to the close note in the commit that adds this file; the command is the one the round-3 reviewer ran (rc=0) to confirm the run-1 values                                        |
| N1  | Standards (round 2)   | wontfix     | one unwrapped line in the tracked measurement record `.scratch/handoffs/542-run-progress/decision.md:123`; cosmetic, no reader is affected                                                                |
