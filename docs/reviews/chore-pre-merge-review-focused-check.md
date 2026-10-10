# Pre-merge review — chore/pre-merge-review-focused-check

Reviewed range: `601c1cd35ffb65359240f532943a000748784412..91157d1c61a94f44b794c2a8e14757f8b4fbc06d`

Dispatch: one Standards + Spec axis only, on a fresh `general-task` agent (`model: "opus"`, review lane), as the orchestrator's brief asked. `codex` is not on `PATH` (`command -v codex` rc=1). No Adversarial or Domain axis ran: the diff is two identical skill files with no code and no game data.

The fixes for S1 to S5 are in `2bcedd200e63a10c1481cbadc40fe2261541cb68`, after this round's range. The same reviewer was asked to re-check that commit; that re-check is not a separate round. It reported S1, S2, S3 and S5 resolved, S4 resolved as far as intended (term defined; step 3's template still records no fork range, which fails safe), and no new finding, from `git diff 91157d1c..2bcedd20`.

## Standards + Spec

**Spec: clean.** The commit is draft v2 (`.scratch/review-light-mode/draft-v2.md`) plus the orchestrator's three amendments, plus one closing sentence the applier added ("When check 1 failed, continue at step 3 instead"). The reviewer diffed the draft's "After" blocks against the committed lines. `cmp` of the two skill copies is identical, and `pnpm mirrors:check` passes.

**Banned words: clean.** A grep of the added lines for the global style list found no match (rc=1).

**Gate: clean.** `check()` in `scripts/check_merge_ready.py` reads only `## Disposition` sections (trailing text allowed), so a later-round file with a `## Focused check (round N)` section and a `## Disposition (round N)` table passes.

**S1 (medium; .claude/skills/pre-merge-review/SKILL.md:112-113)** Condition 2 rejected the fork re-pin commits that condition 1 allows. A re-pin changes data files that no finding cites; `git show --stat 0e3c5967` changes `data/sim-implemented-effects.json`, `data/wowsims-fork-layout.lock.json` and `data/wowsims-fork.lock.json`. So the re-pin bullet could never take effect.

**S2 (low; SKILL.md:129-143)** The check-1-failed path was split: "Keep the `## Focused check (round N)` section" came before the section was introduced, the `## Disposition (round N)` table instruction was unconditional, and "continue at step 3" came last. Read in order, a failed round writes two Disposition tables and drops findings from checks 2 to 4.

**S3 (low; SKILL.md:93-94)** `git log -p <through-sha>..HEAD` can be read as this round's `<through-sha>` (recorded at step 1 as HEAD), which gives an empty log that passes conditions 1 and 2 with nothing checked.

**S4 (low; SKILL.md:95-96, 114-115)** Condition 3 named "the wowsims-file check", a term the skill does not define, and step 3's template does not record a fork range or that check. Review files record both only by convention (`docs/reviews/feat-tab-settings-persist.md:13`). Missing records fail safe: the three axes run.

**S5 (low; SKILL.md:97, 99-100, 142)** The pass path goes to step 4 and skips step 3's ticket-first rule for `defer` rows. Separately, "skip ... condition 3" conflicts with "When all three hold".

## Summary

The edit matches the approved draft and amendments. One medium contradiction (re-pin commits could never pass condition 2) and four low wording and order problems were found. All five are fixed on this branch in `2bcedd20`.

## Disposition

| ID  | Axis      | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                        |
| --- | --------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Standards | fixed       | Condition 2 now exempts fork re-pin commits (`2bcedd20`)                                                                                                                                                                                                                                                             |
| S2  | Standards | fixed       | Focused-check section written on both paths; Disposition table only when check 1 passes; failed path continues at step 3 with the axes' findings and any from checks 2 to 4 (`2bcedd20`). The nit that "record in it that check 1 failed" repeats the four results is kept: it is the orchestrator's exact amendment |
| S3  | Standards | fixed       | Conditions now test `git log -p <from-sha>..<through-sha>`, this round's `Reviewed range:` line (`2bcedd20`)                                                                                                                                                                                                         |
| S4  | Standards | fixed       | Condition 3 now points at the commands in `docs/fork-upstream-touchpoints.md` (`2bcedd20`). Step 3's template is unchanged: a missing record fails safe and the three axes run                                                                                                                                       |
| S5  | Standards | fixed       | Pass path now files a ticket for each `defer` row as step 3 says; "skip ... condition 3" is now "treat condition 3 as holding" (`2bcedd20`)                                                                                                                                                                          |
