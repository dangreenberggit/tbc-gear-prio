Status: closed
Type: refactor
Origin: docs/reviews/feat-452-survival-arms.md S5, S6
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 452, 803

# The page's talent points are counted in three places

## What a maintainer sees

The Survival and Arms EP weights are picked from the page's talent points
(ticket 803). Three places count those points, and a change to how the
tab picks the set must be made in each of them:

- **Fork, twice per run.** `ui/features/upgrades/model/run.ts:114` reads
  `host.player.getTalentTreePoints()` to give the engine its EP weights,
  and `ui/features/upgrades/model/run_session.ts:67`
  (`assumptionsContextOf`) reads it again for the assumptions line (fork
  `5d1ecb595`). The two reads must agree; nothing checks that they do.
- **Harness.** `readCharacter` in `scripts/tab-harness/run-tab-cdp.mjs`
  (lines 415-443) counts the points itself from the saved talents string,
  a copy of the fork's `getTalentTreePoints`
  (`vendor/tbc-new-fork/ui/sim/proto/utils.ts:29`). The live-run reports
  read the set from this count (`talentPointsByTree`), so a change to the
  fork's count must be copied here too.

## Why it stays for now

Review round 1 found both (`docs/reviews/feat-452-survival-arms.md`,
S5 and S6). The code-quality pass, fork `5db390483` "Pass the EP-weights
set, not spec and talents", made the set be passed on instead of the spec
and talents, but left both reads
(`.scratch/agent-reports/2026-11-06-general-task-review-r1-fixes.md`,
§ Per finding, S5 and S6; gitignored, only in the
`feat/452-survival-arms` worktree):

- One read per run needs one of two changes. Either the run returns the
  set it used, as it returns `RunOutcome.runner` (`run_state.ts:49`),
  which changes the dev replay run's console line (`replay_run.ts`
  returns no set); or the session gives the set to the run through
  `RunFn` / `RunDeps`, which changes that contract for every caller.
  Neither fitted a pass that changed no behaviour.
- The harness cannot call the fork's function. The page puts no player
  handle on `window`: its only tab hooks there are
  `window.__upgradesFixture` and `window.__upgradesRanking`
  (`ui/features/upgrades/hooks/useFixtureAutoload.ts:29-30`), which return
  a ranking recording, not talents. The harness may not import from
  `vendor/` (gitignored). Dropping `talentPointsByTree` from the harness
  output would change what the harness records, and the live-run report
  `docs/live-runs/2026-11-06-survival-arms-p45.md` cites it.

## Done when

- The fork reads the talents once per run: one of the two changes above,
  with a fork test, and a re-pin
  (`docs/agents/paired-worktrees.md` § Re-pin after a fork change).
- The harness either reads the count (or the EP set) from the page, or
  this ticket records why the copy in `readCharacter` stays.

## Closing note (2026-11-12)

Fixed on branch `fix/811-ep-set-in-log`, fork commit `0b03c78e1` 'Log
the EP-weights set the run used, not a second read'. Paths under the
fork's `ui/features/upgrades/model/`, all fork-added
(`git cat-file -e upstream/master:<path>` fails for each):

- `run.ts` reads the talents once, ranks with the set they pick and
  returns it on the outcome (`RunOutcome.epWeightsSet`, `run_state.ts`),
  as it returns `runner`. Settling drops it, so a recorded fixture never
  carries it.
- `run_session.ts` no longer reads the talents: the assumptions line
  names the set the run returned (`EP weights set: hunter-sv`).
- Route: the run returns the set, not the session passing it in through
  `RunDeps`. A dev replay (`replay_run.ts`) ranks nothing and returns no
  set, so its line names none. Passed in, the line would name a set the
  replay never used. A loaded fixture records no set either, so its line
  names none; the page's talents now need not be the ones it was ranked
  with.
- `assumptions.ts`: the pool lines (pool source, BiS tags, source
  attribution) now need only the page, not a set, so a replay's and a
  fixture's lines keep them (`run_session.test.ts`, "logs the pool lines
  of the page the run drew from", unchanged and green).

Harness: `readCharacter` in `scripts/tab-harness/run-tab-cdp.mjs` no
longer counts points per tree (`talentPointsByTree` is gone from
`character`); the set comes from the tab's own `assumptionsLine`. Old
harness JSON files keep the field, so
`docs/live-runs/2026-11-06-survival-arms-p45.md` stays true as a record.

Verified by: tbc-new-fork@0b03c78e1, and in the fork
`npx vitest run ui/features/upgrades/model/run.test.ts ui/features/upgrades/model/run_session.test.ts ui/features/upgrades/model/run_state.test.ts ui/features/upgrades/model/assumptions.test.ts`
