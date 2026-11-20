# Pre-merge review — chore/344-pr-prep

Diffed against: our repo `8e924cc3..HEAD` (`8e924cc3` is the merge of
`fix/884-854-desktop-gate-counts` into `dev`; the branch adds `42c96b28` and
`66939503`, two re-pins, and this file), and the fork
`1410a775e..99c27adc8` on fork branch `chore/344-pr-prep` (`1410a775e` is the
pin on `dev`). The last re-pin, to `99c27adc8`, and the P7 ticket edits are
committed with this file.

What the branch is for: ticket 344, the PR-readiness pass over the Upgrades
tab's fork code (finish-line plan `.scratch/plans/upgrades-tab-finish-line.md`,
Chunk 5). It changes comments, formatting and names, not behaviour.

The owner's guidance for this review, verbatim from the plan's 2026-11-18
paragraph:

> "Our code can look different from theirs if it's cleaner or more neatly
> organized. For example, if they have a big react component but we have
> extracted subcomponents and the main component just has named FCs, that's
> fine. If we have something more like a pure function, also ok. We don't
> need to copy everything but we don't want it to look like we dropped an AI
> slop nuke on the codebase"

On comments, the same day:

> "the should be shorter and indicate why the code is there. It should also
> use clear English, similar to our plain English rule (even if it must
> contain certain technical terms as long as they're actual accurate
> technical terms and not Claude made up jargon to sound smart and look
> stupid )"

Then:

> "One reason comments are often told to explain the why is that the what
> should be easily cleaned from the code and clear naming. Let's have a check
> for that"

Reports (all gitignored, in the main checkout's `.scratch/agent-reports/`):
the review `2026-11-18-general-task-344-pr-prep-review.md`; the fixes
`2026-11-18-general-task-344-pr-prep-fixes.md` with five helper reports
`2026-11-18-general-task-344-thin-*.md`; the naming check
`2026-11-18-general-task-344-naming-check.md`; the renames
`2026-11-18-general-task-344-renames.md`; the check of the fixes
`2026-11-18-general-task-344-check-fixes.md`; and the last fixes and this file
`2026-11-18-general-task-344-final-fixes-review-file.md`.

## Rounds

1. **Comment pass (before the review).** Fork `9a54b4e31` trimmed the
   comments and `5d688dd2a` ran oxfmt over the 42 tab TypeScript files that
   failed it.
2. **Review (R1–R11).** A fresh Opus `general-task` with no part in the pass
   reviewed `1410a775e..5d688dd2a`, covering the adversarial, domain and
   standards + spec axes in one pass. It found no code change and eleven
   problems in comments, tickets and docs.
3. **Fixes.** An Opus `general-task` with five helpers on disjoint file sets
   fixed R2–R6 and R8–R11, cut the comments further for R1 and, after the
   owner's note on comments above, put coined terms in plain words: fork
   `c922f7efc`, `9908e365b`, `654cbc1c1`, `20cfc07b5`, `6b0acba94`,
   `ec3f885f3`, `bc266f387`, `e8de08ded`; re-pin `42c96b28`.
4. **Naming check and renames.** After the owner's third quote above, an
   Opus `general-task` listed the comments that carry the what because a name
   does not, each with a proposed rename (Group A), and the comments that only
   repeat a clear name (Group B). The owner approved the recommendation ("sure
   the rec sounds fine", as relayed in the renames report). The renamer applied
   every strong item and skipped the ten weak ones (A4, A5, A12, A18, A19, A21,
   A22, A32, A43, A44): fork `1b18e5fae` (shared names in place of hand copies
   and magic numbers: A1, A2, A10, A20, A23, A26–A30), `c04da370b` (renames:
   A3, A6–A9, A11, A13–A17, A24, A25, A31, A33–A42, A45) and `b23f50100`
   (Group B comments); re-pin `66939503`. No saved, persisted or recorded name
   changed, and no file it touched exists in `upstream/master`.
5. **Check of the fixes.** A fresh Opus `general-task` checked rounds 3 and 4
   against the code and re-ran every gate. It found no behaviour change and
   seven small problems, P1–P7.
6. **P1–P7.** An Opus `general-task` fixed P1–P6 in fork `99c27adc8`
   (comments only) and P7 in the tickets, re-pinned, and wrote this file.
7. **Two renames (follow-up).** See § Follow-up 2026-11-18: two renames.

## Check output

| Check                                               | Commit                            | Result                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AST, comment pass                                   | fork `1410a775e..5d688dd2a`       | `files=139 ast-equal=139 differ=0` (review)                                                                                                                                                                                                                                               |
| AST, comment pass and fixes                         | fork `1410a775e..e8de08ded`       | `files=151 ast-equal=151 differ=0`, rc 0 (fixer; re-run by the checker and by round 6)                                                                                                                                                                                                    |
| AST, Group B commit                                 | fork `c04da370b..b23f50100`       | `files=12 ast-equal=12 differ=0`, rc 0 (checker)                                                                                                                                                                                                                                          |
| AST, P1–P6                                          | fork `b23f50100..99c27adc8`       | `files=4 ast-equal=4 differ=0`, rc 0 (round 6)                                                                                                                                                                                                                                            |
| AST sanity                                          | fork `e8de08ded..c04da370b`       | `files=43 ast-equal=1 differ=42`: the script does catch real changes                                                                                                                                                                                                                      |
| Renames, old-to-new map applied                     | fork `1b18e5fae..c04da370b`       | `files=39 ast-equal=28 differ=11`; every one of the 11 differs only on names left out of the map because unrelated code shares them, each checked by hand (checker § 2)                                                                                                                   |
| E-W3 + run progress                                 | fork `99c27adc8` (worktree)       | `Test Files 2 passed (2)`, `Tests 59 passed (59)`, rc 0, before the `rank.ts` and `view.ts` hashes moved; the same before each earlier hash round                                                                                                                                         |
| `TBC_VERIFY_FRESH=1 pnpm verify`                    | pair `66939503`, fork `b23f50100` | v22.23.2, rc 0, `gates: 1742 ran, 0 skipped`, `engine port drift check ok: 36 ported files match engine.md`, `fork tests check ok ... Tests 907 passed (907)` (checker)                                                                                                                   |
| `TBC_VERIFY_FRESH=1 pnpm verify`                    | pair, fork `99c27adc8`            | v22.23.2, rc 0, `gates: 1742 ran, 0 skipped`, `engine port drift check ok: 36 ported files match engine.md`, `fork lint check ok at fork commit 99c27adc8b27`, `fork tests check ok ... Tests 907 passed (907)` (round 6). No pass stamp: this file changed while it ran                  |
| Layout gate (`scripts/tab-harness/test-layout.mjs`) | pair `66939503`, fork `b23f50100` | rc 0, `"outcome":"measured","pass":true`, 11 fixtures, widths 375/653/768/1280, 496 PASS, 0 FAIL, `a11yFailed":0` (checker). Run directly, so it did not record a digest; `pnpm merge-to-dev` runs it again                                                                               |
| Desktop gate (`pnpm desktop-gate:check`)            | pair `66939503`, fork `b23f50100` | run 2: rc 0, `desktop-gate: PASS (ret PASS, mage PASS, rogue PASS, enh PASS).`, `149 files compared, 0 mismatches`, (h) matches the four cap-40 goldens (checker). Run 1 failed in the sandbox before any check ran (`listen EPERM` on the `npx tsx` pipe, ticket 864), not on the branch |
| oxfmt                                               | fork `b23f50100`                  | rc 1 on the 22 `model/data/*.json` copies only, no TypeScript file (ticket 544); oxfmt on the four files `99c27adc8` changes: rc 0                                                                                                                                                        |
| oxlint                                              | fork `b23f50100`, `99c27adc8`     | rc 0                                                                                                                                                                                                                                                                                      |

The layout and desktop gates were not re-run after `99c27adc8`. That commit
changes comments in four files and nothing else (AST row above), so they
would run the same code.

## Findings

Review (R), at fork `5d688dd2a`:

- **R1 (medium):** 344's "density in wowsims' register" was ticked, but the
  engine kept essay-length blocks (83 lines on one field in `cap-profile.ts`).
- **R2 (medium):** three `rank.ts` comments said "only the tab's check hook
  sets it"; the hook was deleted in fork `02cca7b70`.
- **R3:** `pool.ts` lost the reason its unused `badge`/`world` variants stay.
- **R4:** the worker-count comment said `Sim` picks 4 workers; it picks up to 4.
- **R5:** 17 comment lines broke early where citations were cut.
- **R6:** 344 did not say where the PR description draft is.
- **R7:** ticket 344, ticket 885 and `engine.md` pointed to this file before it
  existed.
- **R8:** `engine.md` § Line endings still said `plausibility.ts` is CRLF.
- **R9:** 544's breakdown of the 42 oxfmt files was wrong.
- **R10:** 544 and 885 pointed at each other for the JSON format question.
- **R11:** "29 test names carry ticket numbers"; two were data numbers.

Check of the fixes (P), at fork `b23f50100`:

- **P1:** `rank.ts` `ownGain`'s comment started "Its swap gain" with no
  subject, and its first line broke early (from the rename commit).
- **P2:** `view.ts` said `commitBreaks` "belong to the best combination of
  pieces"; they come from the highest-count measured bonus
  (`topMeasuredPackage`, sorted by `threshold`, not by value).
- **P3:** `rank.ts` `Ranking.setScreen` said nothing in the engine or the view
  reads it; the set-bonus popover does (`model/set_bonus_tip.ts:236`).
- **P4:** `rank.ts` said "(set-value.ts derives it)" of `netInflation`; round 3
  cut that derivation.
- **P5:** `settings_state.ts` put "Undefined means ..." on `SettingsScope`, a
  type that cannot be undefined.
- **P6:** two comments restated the code: `hooks/useResultsTable.ts`
  `resultsColumns` and `rank.ts` `LayoutRequest`. Also flagged: "noise check"
  in `rank.ts`, a round-3 replacement word the code has no name for.
- **P7:** stale line numbers in tickets 885 and 344 after the renames
  (`se.ts:43`, `:68`; `rank.ts:152`, `:160`, `:522`).

## Disposition

| ID  | Axis      | Disposition | Ticket / note                                                                                                                                                                                                                                                                                |
| --- | --------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Spec      | fixed       | Comments cut by fork `9908e365b`, `654cbc1c1`, `20cfc07b5`, then `6b0acba94`..`e8de08ded`: tab density 0.356 to 0.265 by the fixer's measure (0.259 after `b23f50100`), longest block 83 lines to 19. Still about 2.5 to 3 times wowsims'; 344 Acceptance 2 and § Comment density now say so |
| R2  | Standards | fixed       | `c922f7efc`. `grep -rn "check hook" ui/features/upgrades` is empty; `rank.ts:153-167`, `:524-529` say tests set these options. The options themselves are in 885                                                                                                                             |
| R3  | Standards | fixed       | `c922f7efc`, wording `e8de08ded`: `pool.ts:1-6`, `:33-39` and `slots.ts:1-5` say the unions are copied by hand, a drift check compares them, and why `badge`/`world` stay                                                                                                                    |
| R4  | Standards | fixed       | `c922f7efc`: "The cap on the default worker count `Sim`'s constructor picks"; `ui/sim/sim.ts:176` is `Math.min(4, ...)`                                                                                                                                                                      |
| R5  | Standards | fixed       | Ragged-wrap heuristic 13 to 1 at `e8de08ded` (`tools/headless.mts:8`, a deliberate table); P1 was a new one, fixed in `99c27adc8`                                                                                                                                                            |
| R6  | Spec      | fixed       | 344 Acceptance 5 names the draft's path; `test -f` passes (checker § 3)                                                                                                                                                                                                                      |
| R7  | Spec      | fixed       | This file                                                                                                                                                                                                                                                                                    |
| R8  | Standards | fixed       | `engine.md` § Line endings; `git ls-files --eol .../plausibility.ts` gives `i/lf w/lf`                                                                                                                                                                                                       |
| R9  | Spec      | fixed       | 544 names 38 engine files plus four; `git diff --name-only 9a54b4e31 5d688dd2a` gives exactly those                                                                                                                                                                                          |
| R10 | Spec      | fixed       | The question lives in 885 § What should ship, with both ways out; 544 points there                                                                                                                                                                                                           |
| R11 | Spec      | fixed       | 28 by an AST count of `describe`/`it`/`test` titles (the reviewer's 27 missed the tab-body test); 344 and 885 say 28                                                                                                                                                                         |
| P1  | Standards | fixed       | `99c27adc8`: "A path piece's swap gain, ..." with the lines rewrapped; AST equal                                                                                                                                                                                                             |
| P2  | Standards | fixed       | `99c27adc8`: "they belong to the pieces of the largest measured bonus" (`rank.ts:2768-2773` sorts by `threshold`)                                                                                                                                                                            |
| P3  | Standards | fixed       | `99c27adc8`: "Only the set-bonus popover reads it, to say why a set was not measured"; `grep -rn setScreen` outside `model/engine/` and tests finds `run.ts:129`, which sets the mode, and `set_bonus_tip.ts:236`, which reads the field                                                     |
| P4  | Standards | fixed       | `99c27adc8`: the parenthesis is gone; the comment names `netInflation`, whose own doc says what it corrects                                                                                                                                                                                  |
| P5  | Standards | fixed       | `99c27adc8`: "Passed as undefined for a spec with no ranking data, which has no defaults."                                                                                                                                                                                                   |
| P6  | Standards | fixed       | `99c27adc8`: both restating comments deleted. "noise check" is now "the same-gear check" in all four `rank.ts` comments, the name the code uses (`clearsSameGearGate`), and one names `measureSameGearBonus`                                                                                 |
| P7  | Standards | fixed       | 885 and 344 now cite `se.ts:49`, `:74` and `rank.ts:159`, `:167`, `:529`, each re-read at `99c27adc8`                                                                                                                                                                                        |
| Q3a | Standards | fixed       | `1283e6eb7`: `statsAt` is `sumOfSinglesDpsAt` (§ Follow-up 2026-11-18: two renames)                                                                                                                                                                                                          |
| Q3b | Standards | fixed       | `1283e6eb7`: the tab's `DEFAULT_ITERATIONS` is `TAB_DEFAULT_ITERATIONS` (§ Follow-up 2026-11-18: two renames)                                                                                                                                                                                |

## Notes

- **Parked for the owner in ticket 885** (`blocked`, `Blocks: pre-pr`): string
  literals and test names that still cite this repo (four strings, 28 test
  names), JSON `_comment`s that cite it, a test that reads a file only this
  repo has, `lastCandidateDoneFor` solving the engine's sim total with its
  only check in this repo, `tools/` and the fixture dev path, the 22 JSON
  copies oxfmt rejects (two ways out; 544 does the work once ruled), options
  only tests reach (three partner rules, `partnerAudit`, set-screen `record`
  mode), engine fixtures nothing in the fork imports (one names a real
  character), and the tab's uncapped iterations field. Each needs a code,
  text or test change, or an edit to an upstream file.
- **The PR description was not posted.** The draft is
  `/home/daniel/Code/lulz/tbc-gear-prio/.scratch/pr/upgrades-tab-pr-description.md`
  (main checkout, gitignored). The review spot-checked its facts against the
  fork (R6). It says "no new dependencies" twice, in adjacent bullets.
- **Two ticket lines beyond P7 were stale and are corrected with it.** 885
  said `TAB_REPLICATE_SEED_COUNT` and `observeRow` copy engine values; since
  `1b18e5fae` both read them from `se.ts`. 885's opening and 344's closing
  note said the pass changed comments and formatting only; they now name the
  naming commits and `99c27adc8`.
- **344 Acceptance 2 is ticked with a caveat:** density is still above
  wowsims' by every measure used here. Whether that meets "in wowsims'
  register" is the owner's call.
- **The review's notes on code** (research-only options, unused fixtures, a
  CLI path, constants copied from upstream, mirrors of core types, old engine
  versions still readable, the `window.location` shim, test attributes) are
  behaviour, so outside 344. Notes 1 and 2 are in 885; the rest are in the
  review report § Notes, with no ruling.
- **Names the check left alone:** `statsAt` (`set-screen.ts`, `rank.ts`)
  returns a DPS estimate, not stats; two `DEFAULT_ITERATIONS` (engine 5000,
  tab field 3000) share a name. Neither was in the approved set. The owner
  then asked for both to be fixed; see § Follow-up 2026-11-18: two renames.
- Not re-measured by the checker: the density figures, and reasons the
  helper reports kept but did not verify (listed in
  `2026-11-18-general-task-344-pr-prep-fixes.md` § Comments whose reason was
  kept but not verified).
- The reviewer detached the fork worktree's HEAD once by mistake while
  measuring density and restored it at once; no gate ran while it was
  detached (review report § Process note).

## Follow-up 2026-11-18: two renames

The owner, about both names in § Notes: "that sounds like it needs fixing
and is just wrong". Both claims were true, and fork `1283e6eb7` renames
them. The report is
`2026-11-18-general-task-344-q3-renames.md`.

- **Q3a.** `statsAt` returns `sumOfSinglesEstimate(...)`, a DPS figure
  (`rank.ts:1815-1844`, `partner-choice.ts:96-100`), so it is now
  `sumOfSinglesDpsAt`. Its local `stats` in `set-screen.ts` is now
  `estimate`. The recorded field `bestStats` keeps its name
  (`testing/set_bonus_tip_on.snapshot.json`), and its doc now says it holds
  DPS. The field's doc is now two lines, because the name says what the
  value is.
- **Q3b.** `run_state.ts`'s `DEFAULT_ITERATIONS` (3000) is the tab field's
  default, and `rank.ts`'s (5000) is the engine's, used when a caller passes
  no count. The tab always passes one (`run.ts:102`). The tab's constant is
  now `TAB_DEFAULT_ITERATIONS`, after the `TAB_REPLICATE_SEED_COUNT` /
  `DEFAULT_SEED_COUNT` split. The engine's keeps the name that core's
  `rank.ts:537` and two `packages/core/test` comments use. Its comment said
  "the ranking's published numbers come from a full per-candidate sim at
  this count"; that was wrong for the tab, so it now says the tab passes
  its own count.
- **Renames** were made with the TypeScript 5.9.3 language service: 4
  `statsAt` sites, 4 `stats`, 6 `DEFAULT_ITERATIONS`. After the renames,
  `git grep -w statsAt` finds nothing in the fork. `DEFAULT_ITERATIONS`
  appears only in `rank.ts`, 3 times. Core has no `statsAt`. No string,
  `Pick`/`Omit` key, spread or fixture held either name. No edited file
  exists in `upstream/master`.

| Check                            | Commit                      | Result                                                                                                                                                                                  |
| -------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AST, no map                      | fork `99c27adc8..1283e6eb7` | `files=5 ast-equal=0 differ=5`, each differing only on the renamed names                                                                                                                |
| AST, old-to-new map              | fork `99c27adc8..1283e6eb7` | `{statsAt, stats}`: `rank.ts` and `set-screen.ts` equal; `{DEFAULT_ITERATIONS}`: `run_state.ts`, `run_state.test.ts`, `useUpgradesStore.ts` equal. Each file is equal under its own map |
| E-W3 + run progress              | fork `1283e6eb7`            | v22.23.2, rc 0, `Test Files 2 passed (2)`, `Tests 59 passed (59)`; also green before the hashes moved                                                                                   |
| `TBC_VERIFY_FRESH=1 pnpm verify` | pair, fork `1283e6eb7`      | v22.23.2, rc 0, `gates: 1742 ran, 0 skipped`, `engine port drift check ok: 36 ported files match engine.md`, `fork tests check ok ... Tests 907 passed`                                 |
| oxfmt, oxlint on the five files  | fork `1283e6eb7`            | rc 0, rc 0                                                                                                                                                                              |

## Pre-merge review 2026-11-19: the naming review

After the 344 pass merged into `dev` (`c0b41049`), this branch ran the
naming review the owner asked for on 2026-11-18. It renames names, rewrites
comments in the tab's code and re-pins the fork. Where the owner's words are
(all in the main checkout, gitignored):

- the owner's words and the five rules:
  `.scratch/plans/2026-11-18-naming-review-reviewer-brief.md`;
- the decisions:
  `.scratch/agent-reports/2026-11-18-general-task-naming-review-decisions.md`;
- the rulings since then ("tip" becomes "popover"; stop, step and gate;
  "recolour is too British"): `.scratch/plans/2026-11-18-naming-review-pause.md`
  § Owner rulings since the decisions.

**Range.** Ours `c0b41049..b5d48f5f` (7 commits), plus this review's
uncommitted re-pin. Fork `99c27adc8..e08efd6ec` on fork branch
`chore/344-pr-prep` (49 commits). The last four are this review's fixes:
`9f8dd091a`, `c88709a9e`, `50fc3ed3b` and `e08efd6ec`.

**Reviewers.** Two fresh Opus `general-task` agents at effort xhigh. Neither
took part in the batches. Their reports are in the main checkout's
`.scratch/agent-reports/`:

- names and comments, against the five rules, the decisions and the rulings:
  `2026-11-19-general-task-pre-merge-names-axis.md`;
- behaviour, stored files and the upstream check:
  `2026-11-19-general-task-pre-merge-behaviour-axis.md`.

The stored-file proof, the upstream check and the pin check also ran in the
review session itself, so none of the brief's claims was taken on trust.

### Check output (2026-11-19)

A rename or comment fix counts as checked when the token proof finds no
structural change and no binding mismatch, and the tests pass.

| Check                                               | Range or commit                                                                        | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stored files, key by key                            | ours `c0b41049..b5d48f5f`: 6 recordings, 11 mock fixtures, the fork's popover snapshot | 18 files, `bad=0`. Line counts and CRLF unchanged. Keys renamed one to one: `belowGate`→`belowNoise` 174, `stepRanking`→`bonusGearMeasured` 707, `stepGearDps`→`bonusGearDps` 104, `stepGearSe`→`bonusGearSe` 104, `crossingGates`→`crossingChecks` 6, `setStepSims`→`bonusGearSims` 6, `skippedSteps`→`skippedIncrements` 6, `tip`→`popover` 16. One value change: `"form": "step"` to `"increment"`, 21 times. No old key is left and no new key existed before, so every `contentHash` is unchanged                                                   |
| Upstream check                                      | fork `99c27adc8..e08efd6ec`                                                            | `git cat-file -e upstream/master:<path>` on every changed path: 156 checked, 0 in `upstream/master` (`24606be6b`). A known upstream path passes the same check                                                                                                                                                                                                                                                                                                                                                                                           |
| Token proof, batches                                | fork `99c27adc8..33e84fabc`                                                            | 137 code pairs: 12 identical, 69 equal after renames, 46 differ only in strings, 10 with structural hunks (shorthand keys, the deleted `GemColour` alias, one `;`), each judged harmless (behaviour report)                                                                                                                                                                                                                                                                                                                                              |
| Token proof, ours                                   | `c0b41049..b5d48f5f`                                                                   | 11 code pairs, 0 binding mismatches, 3 structural hunks (each a type-literal `;`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| i18n, batches                                       | fork `99c27adc8..33e84fabc`                                                            | 38 keys renamed, same English text. Selectors and hooks match. Test, expect and skip counts unchanged (fork 596/1232/2, ours 231/1047/74)                                                                                                                                                                                                                                                                                                                                                                                                                |
| Token proof, this review's fixes                    | fork `33e84fabc..e08efd6ec`                                                            | 13 code pairs, 0 structural hunks, 0 binding mismatches. The only string changes are two i18n keys and one heading id                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| i18n fail-first                                     | fork `50fc3ed3b`                                                                       | Code side alone: `set_bonus_labels.test.ts` and `GearSetChips.test.tsx` fail 2 of 31 (`Received "upgrades_tab.settings.gear_set_in_pool"`). With the locale and schema: 31 of 31 pass, and `test-locales.mjs` passes                                                                                                                                                                                                                                                                                                                                     |
| Pin at `33e84fabc`                                  | pair `b5d48f5f`                                                                        | Drift check ok (36 files). Regenerating `sim-implemented-effects.json` gives no diff. All 22 changed engine hashes are in `engine.md`                                                                                                                                                                                                                                                                                                                                                                                                                    |
| E-W3 + fork-loading tests                           | fork `50fc3ed3b`, before the hashes moved                                              | 6 files, 251 passed, rc 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Fork tests and checks                               | fork `50fc3ed3b`                                                                       | vitest 75 files, 910 passed. tsc rc 0, oxfmt rc 0, oxlint rc 0, line endings `i/lf w/lf`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Fork tests and checks                               | fork `e08efd6ec`                                                                       | vitest on `utils`, `model` and the popover: 38 files, 669 passed. tsc rc 0. oxfmt and oxlint on the two files: rc 0                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Drift after the re-pin                              | pair, fork `e08efd6ec`                                                                 | `engine port drift check ok: 36 ported files match engine.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `TBC_VERIFY_FRESH=1 pnpm verify`                    | pair, fork `50fc3ed3b`                                                                 | v22.23.2, rc 0, `gates: 1742 ran, 0 skipped`, `fork lint check ok at fork commit 50fc3ed3b770`, `fork tests check ok ... Tests 907 passed (907)`. Layout skipped: no `dist/` in the pair                                                                                                                                                                                                                                                                                                                                                                 |
| Step 3: fixes re-checked by a fresh agent           | pair, fork `e08efd6ec`                                                                 | Opus `general-task`, report `2026-11-19-general-task-naming-review-check-fixes.md`. i18n fail-first again: with the locale and schema at `33e84fabc`, rc 1, `Tests 2 failed \| 29 passed (31)`, naming the two new keys; restored, rc 0, `31 passed (31)`, and `test-locales.mjs` rc 0. Token proof `33e84fabc..e08efd6ec`: 0 structural hunks, 0 binding mismatches. 15 changed paths, none in `upstream/master`. Drift ok, all 36 `engine.md` hashes equal the files' sha256, and regenerating `sim-implemented-effects.json` leaves it byte-identical |
| `TBC_VERIFY_FRESH=1 pnpm verify`                    | pair, fork `e08efd6ec`                                                                 | v22, rc 0, `gates: 1742 ran, 0 skipped`, `fork lint check ok at fork commit e08efd6ece44`, `fork tests check ok ... Tests 907 passed (907)`. Layout skipped: no `dist/` (step-3 agent)                                                                                                                                                                                                                                                                                                                                                                   |
| Layout gate (`scripts/tab-harness/test-layout.mjs`) | pair, fork `e08efd6ec`                                                                 | rc 0, `"outcome":"measured","pass":true,"failed":0,"a11yFailed":0`, 496 PASS, 0 FAIL, widths 375/653/768/1280, 11 fixtures. `dist/` built with `make wasm` (with `GOFLAGS=-buildvcs=false`) and the assets rule, not `make host`, which serves forever; run with the pwshim headless browser; run directly, so no digest was recorded. A plain run could not start Chromium in the sandbox (step-3 agent)                                                                                                                                                |
| Desktop gate (`pnpm desktop-gate:check`)            | pair, fork `e08efd6ec`                                                                 | Retry: rc 0, `desktop-gate: PASS (ret PASS, mage PASS, rogue PASS, enh PASS)`, `142 files compared, 0 mismatches`. The first run failed in the sandbox before any check (`listen EPERM` in `make wowsimtbc`); the bundle was built by hand first, as the 11-09 report did (step-3 agent)                                                                                                                                                                                                                                                                 |
| `TBC_VERIFY_FRESH=1 pnpm verify`, last              | pair, fork `e08efd6ec`, after the `engine.md` rename note and the lock comment fix     | v22.23.2, rc 0, `gates: 1742 ran, 0 skipped`, `engine port drift check ok: 36 ported files match engine.md`, `fork tests check ok ... Tests 907 passed (907)`, `verify: pass stamp written`. `layout: would run`, since `dist/` now exists                                                                                                                                                                                                                                                                                                               |

### Findings (2026-11-19)

Names axis (N), at fork `33e84fabc`:

- **N-1 (moderate):** `bonusGearMeasured` (`rank.ts:286`) is set on every row
  of a ranking made with `measureSetBonuses`, even when a bonus went
  unmeasured. So `setCreditUnmeasured(ctx) && ctx.bonusGearMeasured`
  (`set_bonus_popover.ts:123`) reads as "unmeasured and measured". It marks
  how the ranking was made, not a result.
- **N-2 (moderate):** an increment's `dps` can be negative, and no comment
  said so.
- **N-3:** `SetPotentialIncrement.isCredited` is true only on the last
  increment, though every increment counts toward the credit. No comment said
  so.
- **N-4 (minor, broad):** made-up words ("package", "single", "ladder",
  "rung") remain in our fork-loading tests and in
  `scripts/tab-harness/test-stop.mjs`.
- **N-5:** "total" named a bonus gear's gain after the glossary dropped the
  word: the heading id `set_potential_totals`, the key
  `popover_set_potential_totals`, comments in `view.ts` and
  `set_bonus_popover.ts`, and our test local `creditedTotal`.
- **N-6:** `hitCap` holds the hit budget (`meta-repair.ts`; `wornHitCap` in
  `rank.ts`).
- **N-7:** `have` and `owned` where the tab says "worn":
  `SetPotentialTerm.have` (`view.ts:52`) and the local `owned` in
  `dead-slots.ts:65`.
- **N-8:** "lost" where the glossary says "broken":
  `thresholdLostByDroppingOnePiece`, the locals `lost` and `lostSets`, and
  "newly loses" in the increment doc.
- **N-9:** "set" alone for a gear set: "default sets" in two comments, and
  the key `settings.sets_in_pool`.
- **N-10:** `nextPieceMeasured` reads as a boolean but holds a sim result.
- **N-11:** `placements` (`pool.ts:249, 267`) and `est` (`partner-choice.ts`)
  sit next to sites the decided renames changed to `simSlots` and `estimate`.

Behaviour axis (B), at fork `33e84fabc`:

- **B-1:** `set-screen.ts:226` said "rung K is not a screened rung" and now
  says "count K is not a screened count". The brief did not list this shown
  text. It appears only on an internal error, in the run-failed toast.
- **B-2:** `packages/core/test/fixtures/tab-recordings/README.md:33-37` lists
  six of the seven renamed keys. `stepGearSe` → `bonusGearSe` is missing.

## Disposition (2026-11-19 naming review)

| ID   | Axis      | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---- | --------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| N-1  | Names     | pending     | `.scratch/carry-forward/issues/888-naming-fixes-that-need-our-tests-or-stored-files.md` — the owner has not agreed to defer. Fork `9f8dd091a` added a doc that says what the field marks (`rank.ts:286`). The rename needs our tests, the 6 recordings, the 11 mock fixtures and the recordings README, which this review could not edit                                                                                       |
| N-2  | Names     | fixed       | `9f8dd091a`: the `SetPotentialIncrement` doc says `dps` is its bonus gear's DPS minus the previous increment's, and can be negative                                                                                                                                                                                                                                                                                            |
| N-3  | Names     | fixed       | `9f8dd091a`: `isCredited` has a doc: "True only on the last increment, the one that reaches the credited bonus. Every increment counts toward the credit."                                                                                                                                                                                                                                                                     |
| N-4  | Names     | wontfix     | Not a problem for this branch: the naming review covers the tab's code, which ships in the fork. The decisions scoped our tests to following the fork's renames (names report N-4, citing decisions line 378). The names report lists every site for a later test pass                                                                                                                                                         |
| N-5  | Names     | fixed       | `50fc3ed3b`: heading id `set_potential_outcomes` and key `popover_set_potential_outcomes`, shown text unchanged. `9f8dd091a` and `e08efd6ec`: the comments say "outcome" and "one line per bonus". Our test local `creditedTotal` stays, for N-4's reason                                                                                                                                                                      |
| N-6  | Names     | pending     | `.scratch/carry-forward/issues/888-naming-fixes-that-need-our-tests-or-stored-files.md` — the owner has not agreed to defer. Our `fork-meta-repair.test.ts` and `meta-repair-oracle.ts` pass `hitCap`, so the rename needs them                                                                                                                                                                                                |
| N-7a | Names     | fixed       | `c88709a9e`: the local `owned` in `dead-slots.ts` is `worn`                                                                                                                                                                                                                                                                                                                                                                    |
| N-7b | Names     | pending     | `.scratch/carry-forward/issues/888-naming-fixes-that-need-our-tests-or-stored-files.md` — the owner has not agreed to defer. Our `fork-set-net.test.ts` reads `have`                                                                                                                                                                                                                                                           |
| N-8  | Names     | fixed       | `c88709a9e`: `thresholdBrokenByDroppingOnePiece`, locals `broken` and `brokenSets`. `e08efd6ec`: `brokenNames`' parameter is `broken`. `9f8dd091a`: "newly breaks". The verb "loses" elsewhere is plain English about a swap and stays. Core's `packages/core/src/dead-slots.ts` keeps `thresholdLostByDroppingOnePiece`, like every name the naming review changed only in the fork; `engine.md` now lists it with the others |
| N-9  | Names     | fixed       | `50fc3ed3b`: "default gear sets" in both comments, and the key `settings.gear_set_in_pool` (singular, because each chip counts one gear set's pieces). Shown text unchanged                                                                                                                                                                                                                                                    |
| N-10 | Names     | fixed       | `c88709a9e`: `nextPieceResult`                                                                                                                                                                                                                                                                                                                                                                                                 |
| N-11 | Names     | fixed       | `c88709a9e`: `simSlots` and `estimate`                                                                                                                                                                                                                                                                                                                                                                                         |
| B-1  | Behaviour | wontfix     | Not a problem: decision N14 replaced "rung" with "count", and the message appears only when the set screen is asked for a count it did not screen, an internal error. The merge account lists it beside the three "recolor" messages                                                                                                                                                                                           |
| B-2  | Behaviour | pending     | `.scratch/carry-forward/issues/888-naming-fixes-that-need-our-tests-or-stored-files.md` — the owner has not agreed to defer. The README is under `packages/`, outside this review's write paths                                                                                                                                                                                                                                |

### Notes (2026-11-19)

- **The pending rows stop the merge check on purpose.** The pre-merge-review
  skill allows `defer` only when the owner agreed. The four pending rows
  (N-1, N-6, N-7b, B-2) make `pnpm merge-ready` fail until they are fixed on
  this branch (ticket 888 lists every site) or the owner agrees to defer
  them. In the second case each `pending` becomes `defer`; the notes already
  have the `path — note` form.
- **British spellings beyond "colour":** "flavour" (with the saved setting
  key `exportFlavour`), "itemised", "memoised" and "favourites". The ruling
  named "colour". Whether it reaches these is the owner's call. A saved key
  would need a migration, so `exportFlavour` should stay either way.
- Old recordings under `.scratch/` keep the old keys, and
  `FIXTURE_SCHEMA_VERSION` was not bumped. Only dev tools read those files
  (behaviour report § Notes).
- `useTokenIds` (`ExportPanel.tsx:46`) looks like a hook but is the toggle's
  boolean, named after its label "Use tier token ids", and used on the same
  line. Left as is.
- The fork branch `chore/344-pr-prep` is at `e08efd6ec` on disk only. The
  lock says `pushed: false`.
