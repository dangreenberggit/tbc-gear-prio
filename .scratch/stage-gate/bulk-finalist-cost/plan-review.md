# Plan review — bulk-finalist-cost (round 1)

Reviewer seat, 2026-09-15. **Verdict: revise.** Three blocking findings, three
material, two minor.

## Findings

| ID | Severity | Where | What breaks | Evidence |
| --- | --- | --- | --- | --- |
| F1 | blocking | Q3 / Step 9 / Verify recipe 4-6; C22 | **The byte-equality acceptance criterion is near-vacuous.** The cap-20 readback contains **8 populated rows and 12 empty ones** (rows 9-20 are `{'rank':'','item':'','slot':'','dps':None,'belowCutoff':True}`). So "rows equal" asserts nothing about rows 9+, and the only substantive content is the 8 paired-replicated rows the plan itself argues are recomputed on unchanged code. The check passes whether or not the fix took effect. | `python -c` dump of `smoke-3333-cap20.json` rows 8,9,12,19 -> all empty, `dps: None`; `aboveCutoff` = 8. `scripts/check_desktop_tab.py:86-87` (`K_DPS=12.0` rows 9..N, `T3_DPS=0.3` top-8), `:248`, `:274-275`. T2's row-9..N band is empty, so `T3_max=0.0` and `aboveCutoffSymDiff=0` are the only live assertions. |
| F2 | blocking | C22 and Approach "rows 9+ come from screening" | **The premise that the stage's output is discarded is false.** `rerunBulkSimStageAdditionalIterations` (`stage.go:329-352`) **merges** the extra iterations into the baseline and every finalist via `carried: bulkSimCarryOverFromResults(...)`, and returns the merged results, which `bulk_sim.go:195` uses as the response. Because our builder sets `topResults = candidates.length`, every returned candidate is a finalist, so **every returned row's DPS reflects up to 4x the iterations post-stage**. Removing the stage must move every screening DPS value. | `sed -n 329,352p stage.go`; `sed -n 186,197p bulk_sim.go`; cap-20 second chunk logged `Finalists: 13 / Iterations so far: 15027` -> `Iterations: 60108`. |
| F3 | blocking | Q2 "Recommendation: none"; C8, C9 | **Both supports for "the tab does not depend on the stage" are refuted.** C8: `replicateTopItems` is conditional — it early-returns entirely when `!usesPairedReplication(seeds)`, and filters to `!belowCutoff && simmed !== false` before `.slice(0,8)`, so with fewer than 8 above-cutoff items the remaining displayed rows keep screening-derived `deltaDps`/`se` verbatim. C9: `compareRows` compares `sortKey` floats first and reaches the `bisTags.length`/`itemId` tie-break **only on exact equality** (`if (ak !== bk) return bk - ak;`). Near-ties — what the stage exists to stabilise — are ordered by float magnitude. `assignTieGroups` is cosmetic (stamps `tieGroupId` after the sort; never reorders). | `rank.ts` ~1454-1459; `engine/se.ts:6`; `view.ts` ~216-230, ~244. |
| F4 | material | Approach ¶1 and C2 | C2 is true as stated but the plan **overreaches from it**, and omits the early-return asymmetry. The three early-return paths (`stage.go:251`, `:259`, `:264`) all return `results` — the **full, untruncated list**. Only the stage-ran path returns `finalists` (`:291`). The plan's claim that "the only client-controllable way to skip the stage is fewer than two finalists, which returns one row" is wrong: `len(finalists) < 2` hits the early return and preserves `results`; the single row comes from `bulk_sim.go:195`'s truncation, not the stage. Does not overturn option A, but the Q1 dismissal of client-only mechanisms rests on a misread and should be redone. | `sed -n 249,265p`, `sed -n 291p` on `stage.go`. |
| F5 | material | Step 9 / Verify recipe 3; C13 | `elapsedS <= 120` is unsound. The bound comes only from arithmetic on the **full-pool** 72.9%/27.1% split, applied to a cap-20 run whose stage profile differs — the cap-20 chunk had **13 finalists** and `Duration: 36.11s` of a 264 s run (13.7%, not 72.9%). A band that wide makes the timing check advisory. The finalist-line count (`= 0`) is the sound check; demote seconds to a reported number. | `grep -c "Stage: finalist - Started"` = 54; last block `Finalists: 13`, `Duration: 36.11s`. C13 self-labelled hypothesis. |
| F6 | material | Step 11(2) and Step 12 | Not circular but **unsatisfiable on first pass**: Step 11's acceptance requires a clean `status` and `pnpm verify` exit 0, while 11(2) cannot complete until Step 12 has committed the fork. Worse, `sim-implemented-effects:check` runs inside `verify` and compares the embedded `forkCommit`, so running 11(1)'s regen before the fork commit embeds the pre-fix SHA and must be re-run after Step 12. Split into 11a / 12 / 11b. | Plan Step 11 acceptance vs "do Step 12 first, then return here"; C21. |
| F7 | minor | Step 5 acceptance | The fallback is not checkable as written: "if this file is outside fork-lint's scope, run `npx tsc`" leaves the executor to pick a branch with no command that answers it. Give the scope-determining command. | Plan Step 5. |
| F8 | minor | Approach ¶3, C14 | C14's "about 6x" compares 19,664 adaptive iterations against the loop's 3,000 per **sim**, but the loop runs 1 sim per candidate while screening runs 26 sims per 25 candidates plus a baseline. Conflates per-sim and per-candidate. Self-labelled hypothesis and filed as follow-up, so advisory. | Plan Approach ¶3; C14. |

Nothing in the plan pushes the fork, merges, or files upstream. Constraint 5
(no full-pool re-run) and constraint 3 (converging at 25 is a non-goal) are both
respected.

## Register verdicts

Refuted: **C8**, **C9**, **C22**. Stands with caveat: C2 (see F4), C12 (equality
is over 8 populated + 12 empty rows), C13 (as arithmetic; refuted as a cap-20
prediction). Stands: C3, C5, C7, C10, C18, C20. Untestable / not re-run:
C1, C4, C6, C11, C14, C15, C16, C17, C19, C21, C23.

## Reconciling note for the orchestrator

F2 and F3 together do not kill option A, but they change what the plan is
claiming. The honest statement of the fix is: **the finalist stage refines the
means the client does consume, at a cost the refinement does not justify, and
removing it is an accepted precision reduction on screening values for rows 9+.**
That is very likely still correct — rows 9+ are all below cutoff and, per the
plan's own C10, cross-chunk ordering was never stabilised anyway. But the plan
currently argues the stronger and false claim that the output is discarded, and
it pre-registers byte-equality as the proof.

The planner must either re-register the acceptance criterion against a fixture
that actually has populated rows 9+ (a cap large enough to clear the 8-item
cutoff band, still far short of the 3419 s full pool, so constraint 5 holds), or
state the precision reduction explicitly and drop the byte-equality prediction
for rows 9+ while keeping it for rows 1-8 plus `aboveCutoffSymDiff = 0`.
