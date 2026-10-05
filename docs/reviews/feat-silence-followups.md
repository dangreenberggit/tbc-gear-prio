# Pre-merge review — feat/silence-followups

Reviewed range: `ee6621f5338bd2f19a97789bbe94e98023a657a7..32580dbc9972a8d8cc95fef45d1cd0ac885ae486`

Fork `vendor/tbc-new-fork` (`feat/upgrades-tab`): `4cdc02b8a..cb561067719abb9cd1f267ccb99425fc2a7fc007` (commits `3b75509aa`, `cb5610677`). `data/wowsims-fork.lock.json` pins `cb561067` with `pushed: false`.

The main range has nine commits (`git log --oneline ee6621f5..32580dbc`). They close tickets 551, 555, 556 and 557 and file ticket 558. Stage artifacts: `.scratch/stage-gate/555-557-silence-followups/` (gitignored).

Dispatch: `codex` is not on `PATH` (`which codex`). Four fresh `general-task` subagents on Opus (review lane), run in parallel: adversarial, domain, and the `code-review` skill's Standards and Spec axes. Each was told it writes nothing. Each axis found only the nine untracked `.scratch/handoffs/*` files in the tree, which were there before the review; both repos were otherwise clean.

Recorded decisions taken as settled and checked only for accurate wording: gate B row F1 (re-basing kept, remaining extension accepted); `presimMs` 220 s and `runMs` 44.83 s from the 545 rule; ticket 555 accepted by the owner ("accept it. no need to tell the user if it pauses smoothly and gracefully thats fine.").

## Adversarial

No correctness bug in the re-based silence deadline. One test does not test what its name says.

- **A1 (test theatre).** `scripts/check_sync_wowsims.py:763-795`, `check_phase_file_404_is_drift_not_a_crash`, passes when the 404 is silently swallowed. Its assertions are rc 1 and a body containing the DRIFT token and "CURRENT_PHASE". Both cases already print a DRIFT line ("pin is behind" or "new release available"), so rc is 1 whatever happens to the phase file. The success line `master CURRENT_PHASE = N` (`sync_wowsims.py:651`) also contains "CURRENT_PHASE". A mutant `sync_wowsims.read_phase_at = lambda sha: 2` makes it return `[]` (pass) for both the sha-pin and the tag-pin case. Re-checked by the aggregator: `python <scratchpad>/mutant551.py` prints `real: []` and `mutant (silent fallback to 2): []`. Fix: assert the "could not read" text, and assert that no `CURRENT_PHASE = <digit>` success line is printed.
- **A2 (stale number).** The ticket 556 close says the accepted extension is "`presimMs - runMs` = 190 s" (`556-*.md:95`). Since `cb561067`, `runMs` is 44.83 s, so the figure is 175.17 s. The lock `_comment` entry dated to `3b75509aa` says 190 s, which was correct for that pin. The code comment (`worker_silence.ts`, `setRegime` doc) gives the formula and no number.

Checked, no defect:

- Re-based deadline: changing regime keeps `basisAt`, so it extends the deadline only once. A fresh full limit without a message needs the late-fire path, and the pool cannot reach it (every request ends on a message or a restart).
- The two new vitest tests import the real fork modules and would fail on the old re-arm-from-now code. `npx vitest run packages/core/test/fork-worker-silence.test.ts`: rc 0, 26 passed.
- Limits arithmetic against `545 measurement.md:13-15`: 10 × 21.43 = 214.3 → 220 s; 10 × 4.483 = 44.83 s (no rounding step); freeze bands 40-50 s and 199-225 s.
- `parse_current_phase` still rejects `==`, `===` and `>=` forms. `python scripts/check_sync_wowsims.py`: rc 0, 28 checks.
- `read_phase_at`: when both paths fail, the error names both and is reported as drift.

Unexamined: live browser behaviour (needs a running build); URLError handling in `--check` (existed before this branch).

## Domain

No contradiction of `docs/stage0-findings.md` or `docs/verification-log.md`. The new phase path and the parse are correct against upstream.

- **D1 (wrong fact in ticket 558).** `558-*.md:29` says `ui/core/proto_utils/utils.ts` has "no file of the same name", and `:58-62` says where its two helpers now live is unknown. Both exist at upstream `42c75dc9`: `ui/sim/proto/utils.ts:133` (`defaultRaidBuffMajorDamageCooldowns`) and `:169` (`defaultExposeWeaknessSettings`). Re-checked by the aggregator: `git -C vendor/tbc-new-fork grep -n "defaultRaidBuffMajorDamageCooldowns\s*=\|defaultExposeWeaknessSettings\s*=" 42c75dc9 -- ui`. The ticket's other counts are correct (98 tracked, 97 missing at the tip, 94 at `ui/specs/` + same path, `master` = `v0.0.147` = `42c75dc9`).
- **D2 (test gap).** In `check_phase_is_read_from_the_new_path_when_the_old_one_404s` (`check_sync_wowsims.py`, about line 807) the fixture is `export const CURRENT_PHASE: Phase = Phase.Phase3;`, with the annotation. The real file has none (`42c75dc9:ui/sim/constants/other.ts:12`), so no check covers the real form at the new path. `read_phase_at` tries the new path first, so this check never exercises a 404 on the old path, despite its name.

Checked, no finding: upstream has one `CURRENT_PHASE` declaration; `--update`, `--restore` and `extract_sim_defaults.mjs:47` read the pinned copy, so nothing derives the phase a second way; every silence measurement used Phase 2 gear on a Phase 3 page (previous-phase rule); the rogue "combat" preset and the `presim.go:35/66` and `health.go:272` citations match `cb561067`. The untracked `557-desktop.md` Verdict still says "50 s after rounding"; decision-log row 67 (`runMs-rounding`) corrects it (see ST8).

Unexamined: WCL, slot, enchant, gem, race and spec facts (not touched by the diff).

## Standards + Spec

### Standards

- **ST1 (hard).** Commit `ccde6986` subject "Read the phase from ui/sim/ after the upstream move" is 51 characters; cbea.ms rule 2 is 50. The other eight main subjects and both fork subjects are 34-45 characters; both fork bodies are six lines or fewer, wrapped at 66-70.
- **ST2 (accuracy).** The lock `_comment` says fork `3b75509aa` "fixes ticket 556 items 2-8 (comments and one test name)", and the ticket 556 close says items 2-8 are "fixed in the same fork commit", listing the test rename as item 6 (`556-*.md:110-117`). The test is in the main repo and was renamed in main `95be23a9`; `git -C vendor/tbc-new-fork show --stat 3b75509aa` lists only `worker_pool_sim_runner.ts` and `worker_silence.ts`.
- **ST3 (judgement).** Ticket 558 `Origin:` is "ticket 551 fix on feat/silence-followups", while `docs/agents/issue-tracker.md` defines it as the review that created the ticket. Tickets 551 and 555 already use non-review origins.
- **ST4 (judgement, Duplicated Code).** `scripts/sync_wowsims.py` `parse_current_phase` repeats `CURRENT_PHASE\s*(?::\s*Phase\s*)?=\s*` in two regexes, and `ef464ad1` had to edit both.
- **ST5 (judgement, Duplicated Code).** `scripts/check_sync_wowsims.py` repeats the sha-pin lock setup block eight times (`grep -c 'lock\["watchedRefs"\] = {'`), two of them new on this branch.
- **ST6 (judgement, Shotgun Surgery).** The test name "pins the tab's limits: 140 s start-up, 44.83 s run, 220 s presim" was renamed in both `95be23a9` and `68d306d8`. The assertion already pins the values.
- **ST7 (judgement, Mysterious Name).** Fork `worker_silence.ts` `basisAt` depends on its doc comment; `limitStartAt` would explain itself.
- **ST8 (comment policy and durable claims).** The `WORKER_SILENCE_LIMITS` comment in fork `worker_pool_sim_runner.ts` is about 50 lines of measurements. It cites `.scratch/stage-gate/545-worker-silence-check/measurement.md`, `553-554-silence-followups/probe.md`, `555-557-silence-followups/557-page-sims.md` and `557-desktop.md`. None of these files is tracked: `.gitignore:59` ignores `.scratch/stage-gate/*`, and `git ls-files` returns nothing for these three directories. So a fresh clone cannot open any source the comment cites. The same paths are cited from tickets 545, 553, 554, 555, 556 and 557, from the lock `_comment` and from `docs/reviews/feat-round-11-followups.md`. `.gitignore:55-62` already has the fix for this case: an exception for stage-gate evidence that a tracked document quotes. The aggregator added the tracked-file check (`git check-ignore -v`, `git ls-files`). Separately (row ST8b), the comment is long, and the `arm()` comment's "measured on vitest 3.2.7" states what was observed but names no command to re-run it.

Checked, no finding: the lock `_comment` arithmetic and `pushed: false` (`ls-remote` returns `4cdc02b8a`); `data/sim-implemented-effects.json` changes only `forkCommit`, as the regenerator would produce for a TypeScript-only fork diff (reasoned, not run); ticket 558 numbering and `NEXT` 558→559; no banned words in new text.

### Spec

No requirement is missing and no implementation looks wrong. The axis recomputed the limits from `545 measurement.md:13-15` and they match the fork and `fork-worker-silence.test.ts:777`.

- **P1 (stale decision text).** Same as A2: the 556 close and decision-log row F1 say 190 s, and the 556 close also says "not t0+30 s" and "the 30 s run floor". Since `cb561067` the figure is 175.17 s.
- **P2 (decision cited to the wrong row).** The ticket 557 close (`557-*.md:87`) and the lock `_comment` cite decision-log row `Q-557-desktop-run-limit` for 44.83 s. That row (`decision-log.md:64`) says "10 x 4.483 -> 50 s"; the 44.83 s value comes from row `runMs-rounding` (`decision-log.md:67`). The 557 close calls the 50 s "the measurement agent's", but the session's own row said 50 s too.
- **P3 (555 partly evidenced; disclosed).** The ticket asks about Chrome 133+ and whether the run resumes when the tab is shown. The check ran on Brave 154; resume after showing the tab was never observed; no console read showed that no worker restarted. The 555 close lists every one of these under "Not tested" and states that the owner's acceptance depends on the pause being smooth.
- **P4 (ticket 558 on a file this branch edits).** Remapping `TRACKED` is work on `scripts/sync_wowsims.py`, which this branch changed. It is separate because the remap only means something together with an engine-pin move, which is the owner's decision (558, "Why it is not done on the branch that found it"; `docs/agents/known-traps.md`, "Before moving the wowsims engine pin"). The run's working rule needs the owner's agreement for a new ticket on the same files; `decision-log.md` records none.
- Scope creep: none unrecorded. The 551 script fix and both limit raises each have a decision-log row.

## Summary

The branch does what tickets 551, 556 and 557 asked, and the silence-deadline logic has no correctness bug. The limits (220 s warm-up, 44.83 s main loop) follow the 545 rule. Not mergeable as is, for these reasons:

- One test, A1, does not detect the failure it is named for. A mutant that swallows the 404 passes it.
- Ticket 558 states one wrong upstream fact (D1).
- Three closing notes have stale or misattributed text (A2/P1, P2, ST2).
- The cited measurement files are not tracked (ST8).
- Several small test and script tidy-ups are open (D2, ST4, ST5, ST6).

Each of these is a small fix on this branch's files, or in `.gitignore`. Only ticket 558 is separate work, and it needs the owner's agreement under the same-file rule.

`fix on branch` is not one of the words `scripts/check_merge_ready.py:108` accepts (`fixed`, `defer`, `wontfix`). `pnpm merge-to-dev --check-only` therefore fails on these rows until each fix lands and its row is changed to `fixed` with the commit. That keeps the merge blocked until the fixes are in.

## Disposition

| ID     | Axis              | Disposition   | Ticket / note                                                                                                                                                                                                                                                                                                                                                                                   |
| ------ | ----------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1     | Adversarial       | fix on branch | `check_sync_wowsims.py` `check_phase_file_404_is_drift_not_a_crash`: assert the "could not read" text and that no `CURRENT_PHASE = <digit>` success line is printed; confirm the mutant `read_phase_at = lambda sha: 2` now fails it.                                                                                                                                                           |
| A2, P1 | Adversarial, Spec | fix on branch | Ticket 556 close: add an addendum that since fork `cb561067` (`runMs` 44.83 s) the accepted extension is up to 175.17 s, and that "30 s run floor" / "t0+30 s" describe `3b75509aa`. Leave the dated lock `_comment` entry and decision-log row F1 as history.                                                                                                                                  |
| ST2    | Standards         | fix on branch | Lock `_comment` (entry for `3b75509aa`) and ticket 556 close item 6: the test rename is main `95be23a9`, not the fork commit.                                                                                                                                                                                                                                                                   |
| P2     | Spec              | fix on branch | Ticket 557 close and lock `_comment`: cite decision-log rows `Q-557-desktop-run-limit` (raise) and `runMs-rounding` (44.83 s, no rounding); drop "the measurement agent's" attribution of 50 s or name both.                                                                                                                                                                                    |
| D1     | Domain            | fix on branch | Ticket 558 `:29` and `:58-62`: both helpers are at upstream `42c75dc9:ui/sim/proto/utils.ts:133` and `:169`; move `proto_utils/utils.ts` out of "no file of the same name".                                                                                                                                                                                                                     |
| D2     | Domain            | fix on branch | `check_sync_wowsims.py`: use the real unannotated form `export const CURRENT_PHASE = Phase.Phase3;` at the new path, and make the old-path-404 check exercise the old path, or rename it to say what it covers.                                                                                                                                                                                 |
| ST4    | Standards         | fix on branch | `sync_wowsims.py` `parse_current_phase`: one shared pattern for the `CURRENT_PHASE` prefix.                                                                                                                                                                                                                                                                                                     |
| ST5    | Standards         | fix on branch | `check_sync_wowsims.py`: one helper for the sha-pin lock setup used by the eight copies.                                                                                                                                                                                                                                                                                                        |
| ST6    | Standards         | fix on branch | `fork-worker-silence.test.ts`: drop the limit values from the test name; the assertion pins them.                                                                                                                                                                                                                                                                                               |
| ST8    | Standards         | fix on branch | Add `.gitignore` exceptions in the `.gitignore:55-62` pattern for `545-worker-silence-check/measurement.md`, `553-554-silence-followups/probe.md`, `555-557-silence-followups/557-page-sims.md` and `557-desktop.md` (about 36 KB together), and commit them. Before committing `557-desktop.md`, correct its Verdict's "50 s after rounding" to 44.83 s per decision-log row `runMs-rounding`. |
| P4     | Spec              | defer         | `.scratch/carry-forward/issues/558-tracked-upstream-paths-gone-at-master-tip.md`: separate work, because the remap needs an engine-pin move, which is the owner's decision. Needs the owner's agreement under the same-file rule.                                                                                                                                                               |
| ST1    | Standards         | wontfix       | One character over on `ccde6986`. Rewording needs a rebase that rewrites four later commits, including a fork pin. The subject is clear, and no tool or reader depends on the limit.                                                                                                                                                                                                            |
| ST3    | Standards         | wontfix       | Tickets 551 and 555 already use non-review `Origin:` values; the field names where the ticket came from.                                                                                                                                                                                                                                                                                        |
| ST7    | Standards         | wontfix       | The field's one-line doc comment states its meaning. A rename alone costs a full fork re-pin (fork commit, lock bump, regenerate, verify) and changes no behaviour.                                                                                                                                                                                                                             |
| ST8b   | Standards         | wontfix       | The fork comment's measurement lines explain why each limit has its value, which the comment policy allows. Each untested claim is labelled. The vitest note states the observation and both versions. Changing it costs a fork re-pin.                                                                                                                                                         |
| P3     | Spec              | wontfix       | Owner decision on ticket 555 (recorded verbatim in the close). The close lists every untested part under "Not tested". Not reopened.                                                                                                                                                                                                                                                            |
