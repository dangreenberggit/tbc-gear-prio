# Pre-merge review — fix/811-ep-set-in-log

Diffed against: main `59e48629...9acd3c08` (`dev` = `origin/dev` =
`59e48629`) and fork `bf9c26a00...0b03c78e1` (fork branch
`fix/811-ep-set-in-log`). The commits after those are this review's
fixes: fork `4ebb4ce15`, main `fe0ff4d9` (re-pin and records), the layout
lock commit and this file. Upstream footprint: each of the eight fork
files the branch changes fails `git cat-file -e upstream/master:<path>`
(rc 128; the control `ui/sim/proto/utils.ts` gives rc 0), and
`git -C vendor/tbc-new-fork diff --numstat --diff-filter=M 24606be6bae2601e5ca3985431c8c1da2ab422c0 HEAD`
prints only `6	0	ui/app/SimTabsSection.tsx`, the one owner-approved
edit. No ported engine file (`ui/features/upgrades/model/engine/`)
changed.

What was asked: the owner, 2026-11-12, "Launch a session to handle 672,
811, 623, 635. It should oversee them and make sure they get done but not
get in the weeds itself (that's for its subagents)" (plan
`.scratch/plans/tickets-672-811-623-635-2026-11-12.md` in the main
checkout). Ticket 811
(`.scratch/carry-forward/issues/811-talent-points-counted-in-three-places.md`)
is done when the fork reads the talents once per run (one of its two
routes, a fork test, a re-pin), and the harness reads the count or the EP
set from the page or the ticket says why its copy stays.

Reviewer: one Opus `general-task` that did not write the branch ran all
three axes and the live check. The diff is 88 fork lines and 50 main
lines, and its one game fact (which talents pick the Survival or Arms EP
set) is code the branch does not change, so Domain shared the reviewer.
Full report (gitignored):
`.scratch/agent-reports/2026-11-12-general-task-811-review.md` in the main
checkout.

## Summary

The branch does what 811 asks. The run picks the EP-weights set once,
ranks with it and returns it; the session logs that set as
`EP weights set: <set>` and no longer reads the talents; the harness
dropped its copy of the point count. Seen live: a Survival build on the
hunter page logs `EP weights set: hunter-sv`, and the page's default
Beast Mastery talents log `EP weights set: hunter`.

The executor's reversal of round 2's R3 (fork `3d8c215f8`) holds: the new
session test fails when the session stops passing the set, which is what
R3 asked a test to catch (§ The R3 reversal). No correctness defect. Three
small findings, all fixed: the tab scope doc still listed 811 as open
(P1), the 811 close did not say why the gear source's talent read can stay
(P2), and a new `run.ts` comment called the run's set pick its "one read
of the talents" (S1).

## Adversarial

Paths through the change, each read in the fork at `0b03c78e1`:

- A live run: `rankForPlayer` (`run.ts:107-109`) picks the set once, gives
  its weights to the engine and returns it (`run.ts:136`). The session
  logs `result.epWeightsSet` (`run_session.ts:110`). `runSettled` drops
  it (`run_state.ts:126`), so the stored result and a recorded fixture do
  not carry it; `settleRun` is the only path into the store
  (`git grep -n 'settleRun\|runSettled\|RunOutcome' -- ui`).
- Stop: the partial ranking is returned with the set
  (`run.test.ts:189` expects `epWeightsSet: 'ret'`).
- Replay (`replay_run.ts`, chosen only under the dev replay flag,
  `utils/select_run_fn.ts:12`): returns no set, so the line names none.
- Fixture load: names no set (`run_session.ts:138`); a fixture records no
  talents (`utils/fixture.ts` `TabFixture`).
- A superseded or failed run logs nothing, as before.

Mutation runs (fork, `npx vitest run` over the four changed test files,
node v22.23.2; each file put back after, `git status --short` empty):

| Mutation                                                        | Result                                                                                                                                                                     |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1: the session stops passing the set (`{ settings, host }`)    | 1 failed of 78: "names the set the run returned, without reading the page’s talents"                                                                                       |
| M2: the session reads the page's talents again                  | 2 failed of 78: both ticket-811 session tests                                                                                                                              |
| M3: the run returns no set                                      | 2 failed of 78: "resolves with the EP-weights set it ranked with" and the Stop test                                                                                        |
| M4: the run returns `specId` in place of the set it ranked with | 1 failed of 78: "resolves with the EP-weights set it ranked with"                                                                                                          |
| M5: the pool lines keyed on the set again (R3's keying)         | 2 failed of 78: "names the page’s pool and no EP weights when no set is known" and "logs the pool lines of the page the run drew from, for a run and for a loaded fixture" |

The session test asserts `getTalentTreePoints` is never called, a call
count; it sits beside a behaviour assertion (a Fury page whose run
returned `warrior-arms` logs `warrior-arms`), and the call count is the
ticket's own requirement, so it stays.

One talent read remains in a run: `PlayerGearSource.readGear`
(`adapters/player_gear_source.ts:95`, called at `engine/rank.ts:799`)
fills `LoggedGear.talentPointsByTree`. No tab engine code reads that
field (`git grep -n talentPointsByTree -- ui/features/upgrades/model/engine`
finds only the seam type and an offline fixture builder), so it picks no
set and cannot disagree with the run's pick. It led to S1 and P2.

Findings: none beyond S1 and P2 below.

## The R3 reversal

R3 (`docs/reviews/feat-452-survival-arms.md`, round 2): "The EP-weights
line now appears only when the optional `epWeightsSet` is passed, and no
session test checks that the session passes it." Fork `3d8c215f8` made
the set switch the pool lines too, so a session that dropped the set lost
its pool lines and the session's pool-lines test failed. This branch keys
the pool, BiS-tag and source-attribution lines on the page again
(`assumptions.ts:27-40`) and the two EP-weights items on the set
(`:32-36`).

Judgment: the new tests cover R3's concern, more directly than
`3d8c215f8` did. M1 shows a session test fails when the session stops
passing the set, and the test asserts the set's own name in the line,
where `3d8c215f8` inferred it from the pool lines. M3 and M4 cover the
other half the new route adds, the run returning the set it ranked with.
M5 shows why the keying had to move: with the pool lines on the set, a
loaded fixture's and a replay's lines would lose them, and an existing
test says they keep them. Not covered by a type: `RunOutcome.epWeightsSet`
is optional, so a new `RunFn` could leave it out and its line would
silently name no set. The only live `RunFn` is `rankForPlayer`
(`select_run_fn.ts:12`), which M3 covers, so this stays a note.

## Live check

`run-tab-cdp.mjs` against the pair's own vite (`:5173`) and backend
(`:3333`), started and stopped inside one sandboxed shell call (each call
has its own network namespace), fork at `0b03c78e1` with a clean tree,
`dist/` built from it, headless Chromium through the p45 shim. Script and
logs: `.scratch/agent-reports/2026-11-12-811-live/` in the main checkout
(`live.harness.log`).

| Run                                                                                                                                           | Talents (`character.talentsString`)                | `assumptionsLine` item                                               | Result                              |
| --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------- |
| `--page /tbc/hunter/dps/ --phase 4 --preset-tab 'Phase 3' --preset-spec Survival --build 'DW - 6% hit' --preset 'DW - 6% hit' --candidates 5` | `502-0550201205-333200022003223005103` (7/20/34)   | `EP weights set: hunter-sv · EP weights: written for P1, ranking P4` | rc 0, done, 5 rows, baseline 2725.9 |
| `--page /tbc/hunter/dps/ --phase 3 --candidates 5` (page default talents)                                                                     | `522002005150122431051-0505201205` (Beast Mastery) | `EP weights set: hunter · EP weights: written for P1, ranking P3`    | rc 0, done, 5 rows, baseline 3746.6 |

The Survival baseline equals the 2026-11-06 Survival P4 run's 2725.9
(`docs/live-runs/2026-11-06-survival-arms-p45.md`, § Runs). Neither
run's `character` has `talentPointsByTree`. The live check ran at
`0b03c78e1`; `4ebb4ce15` changes one comment.

## Domain

`epWeightsSetFor` and its talent rule (`model/data/data.ts:37-58`) are
unchanged (`git diff bf9c26a00..HEAD -- ui/features/upgrades/model/data`
prints nothing). The harness change removes a copy of the fork's
`getTalentTreePoints` (the "second, possibly-drifting source of the same
truth" the domain brief hunts), and the set now comes from the tab's own
line. No WCL field is touched. Findings: none.

## Standards + Spec

Spec: both Done-when items hold. The fork took the ticket's first route
(the run returns the set, as it returns `runner`), with tests in four
fork files and a re-pin. The harness reads the set from the tab's
`assumptionsLine` (live, above). What the branch adds beyond the ticket,
each needed by it: the pool lines keyed on the page (M5); a fixture's line
naming no set, since a fixture records no talents; and the new
`EP weights set:` item, without which the line named the set only through
its phase, and not at all when the phase matched.

- **P1 (Spec, low): the scope doc still lists the closed 811.**
  `docs/upgrades-tab-scope.md:162` kept the talent-points 811 as an open
  Tab-adjacent row, the other 811's row said "The other open 811 (talent
  points) is in Tab-adjacent", and judgment call 13 said both 811 files
  were open. § Maintenance: "This doc is regenerated in the same commit
  that changes any ticket's `Status:` line." Its two loops print nothing
  before and after the fix, because the routing 811 is still open and
  keeps a `| 811 ` row, so they cannot catch this one.
- **P2 (Spec, low): the close does not say why a talent read remains.**
  Done when reads "The fork reads the talents once per run"; the gear
  source's read (§ Adversarial) is still in every run, and the closing
  note did not mention it.
- **S1 (Standards, low): a new comment is wrong.** `run.ts:107` at
  `0b03c78e1`: "The run's one read of the talents (ticket 811)". The run
  also reads them through the gear source (`player_gear_source.ts:95`).

Lint, format and type checks pass inside `pnpm verify` (below), and the
fork's own `npx vitest run ui/features/upgrades` printed
`Tests  887 passed (887)`.

## Fixes

- **P1.** `fe0ff4d9` drops the talent-points 811 row, rewords the other
  811's row and judgment call 13, and adds judgment call 15 for the
  close. Before: `git show 9acd3c08:docs/upgrades-tab-scope.md | grep -c '^| 811 '`
  prints 2; after, `grep -c '^| 811 ' docs/upgrades-tab-scope.md` prints
  1. `npx prettier --check docs/upgrades-tab-scope.md` passes.
- **P2.** `fe0ff4d9` adds to the 811 closing note that the gear source
  still fills `LoggedGear.talentPointsByTree`, which no engine code reads,
  with the `git grep` that shows it.
- **S1.** Fork `4ebb4ce15`: "The run picks its EP-weights set once
  (ticket 811): that set drives the engine and is the one the run
  returns." Re-pinned in `fe0ff4d9` (lock `commit`, one `_comment`
  sentence, `pnpm sim-implemented-effects:generate` moved only
  `forkCommit`: "226 implemented, 450 stub-only").

No fix changed behaviour, so there is no new test for a step 3 agent to
run before and after. The executor's tests were run against broken code
by the mutation runs in § Adversarial.

## Checks

| Check                    | Command                                                                                                     | Result                                                                                                                                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verify at the branch tip | `pnpm -C <pair> verify` at `9acd3c08`                                                                       | v22.23.2, rc=0; `gates: 1662 ran, 0 skipped`; layout skipped (no `dist/` in the pair then)                                                                                                                                 |
| Fork tab tests           | fork `npx vitest run ui/features/upgrades` at `0b03c78e1`                                                   | v22.23.2, rc=0; `Test Files  71 passed (71)`, `Tests  887 passed (887)`                                                                                                                                                    |
| Mutations                | five edits, § Adversarial                                                                                   | each failed the tests named there                                                                                                                                                                                          |
| Live run                 | `run-tab-cdp.mjs`, two runs, § Live check                                                                   | rc=0 both; `EP weights set: hunter-sv` and `EP weights set: hunter`                                                                                                                                                        |
| Fork comment fix         | `npx oxfmt --check`, `npx oxlint --max-warnings 0`, `npx vitest run .../run.test.ts` at `4ebb4ce15`         | rc=0, rc=0, `Tests  21 passed (21)`                                                                                                                                                                                        |
| Regenerate               | `pnpm sim-implemented-effects:generate` after the lock bump                                                 | rc=0; `226 implemented, 450 stub-only (fork commit 4ebb4ce15...)`                                                                                                                                                          |
| Layout gate              | `PLAYWRIGHT_BROWSERS_PATH=<p45 shim> pnpm -C <pair> layout-gate:check` at main `fe0ff4d9`, fork `4ebb4ce15` | rc=0; `"outcome":"measured","pass":true`, 11 fixtures at 375/653/768/1280, 0 failed, 0 a11y failed; baseline advanced to `c0626b137972...`                                                                                 |
| Verify at head           | `pnpm -C <pair> verify` on the tree this file is committed with (all but this row)                          | v22.23.2, rc=0; `gates: 1662 ran, 0 skipped`; `layout: skipped -- tab layout source unchanged since the last green run (digest c0626b137972...)`                                                                           |
| Merge check              | `pnpm -C <pair> merge-ready`                                                                                | v22.23.2, rc=0; 3 of 3 Disposition rows parsed; `merge-ready: ok (this checkout's copy and dev's copy)`; warns that open ticket 577 names `run-tab-cdp.mjs` (shared CDP helpers; this branch touches only `readCharacter`) |

## Notes

- `assumptions.test.ts:9`'s name says "as for a loaded fixture", but a
  fixture's line also carries the pool lines when the page's database has
  loaded. The name predates this branch (before it, a fixture's line also
  named an EP set).
- `run-tab-cdp.mjs:74-78` says `assumptionsLine` names the phase the EP
  weights were written for; that item appears only when it differs from
  the phase being ranked (`epWeightsDisclosureFor`). The set item is
  always there.
- `docs/live-runs/2026-11-06-survival-arms-p45.md:159` re-runs read
  `j['character']['talentPointsByTree']`; that still works on the
  recorded files, which keep the field, but not on new harness output.
- Merge order: `data/wowsims-fork.lock.json`, the layout lock and the
  scope doc's judgment call 15 are also changed by `fix/672-sunmote-helms`;
  the branch that lands second merges `dev`, re-pins, re-measures and
  renumbers (plan decision log).
- The branch has no upstream tracking set: a 0-byte read-only
  `.git/config.lock` in the main checkout blocks `git push -u` writing
  `.git/config`. Plain pushes work.

## Disposition

| ID  | Axis      | Disposition | Ticket / note                                                                                        |
| --- | --------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| P1  | Spec      | fixed       | `fe0ff4d9`: the closed 811's scope-doc row removed; the other 811's row and judgment calls 13 and 15 |
| P2  | Spec      | fixed       | `fe0ff4d9`: the 811 closing note names the gear source's read and why it picks no set                |
| S1  | Standards | fixed       | fork `4ebb4ce15` rewords the `run.ts` comment; re-pinned in `fe0ff4d9`                               |
