# Pre-merge review — feat/store-actions-followups

Reviewed range: `c77193885323e3d5c8658305d2b2370cc46bd99f..eb4339f96540595a5dcb13c65e1f3724fc77bcf0`

Main commits: `e5cd56a4` (`packages/core/test/fork-run-staleness.test.ts` now drives the real `createUpgradesStore`), `f2f02f3a` (fork pin to `218234677`, regenerated `data/sim-implemented-effects.json`, layout baseline, touchpoints doc), `eb4339f9` (ticket 591 closed, its 10 rows in `docs/reviews/feat-tab-store-actions.md` set to `fixed`).

Fork code reviewed with it: `vendor/tbc-new-fork` branch `feat/upgrades-tab-react`, `bfde239615059557012710d47280cd7bfc0bdd2f..2182346770fc4b12b26c4039d2241628b233a750`, one commit `218234677`. 15 files, all under `ui/features/upgrades/` and `ui/app/tabs/`.

Spec: ticket 591 (`.scratch/carry-forward/issues/591-store-actions-review-leftovers.md`). The owner approved the branch with "merge then follow up is fine".

Dispatch (round 1, 2026-10-10): `codex` is not on PATH (`which codex`), so four fresh `general-task` subagents on Opus (effort `high`, the review lane) ran in parallel: Adversarial, Domain, and the `code-review` skill's Standards and Spec sub-agents. Each was told it writes nothing and not to grep the fork's `node_modules` recursively. Both trees were clean at dispatch (`git status --porcelain`, main and fork).

Runs by the review lead:

- Fork tests: `npx vitest run upgrades ui/app/tabs` from the fork at `218234677`: 58 files, 461 tests pass, rc=0 (`.scratch/store-actions-followups/review-fork-vitest.log`).
- Fork typecheck: `node vendor/tbc-new-fork/node_modules/typescript/bin/tsc --noEmit -p vendor/tbc-new-fork/tsconfig.json` (the fork's `type-check` script) at `218234677`: no errors, rc=0 (`.scratch/store-actions-followups/review-fork-typecheck.log`).
- `corepack pnpm verify` in main on Node 22.17.1: rc=0, "gates: 1517 ran, 0 skipped" (`.scratch/store-actions-followups/review-pnpm-verify.log`).
- Wowsims-file rule, fork at `218234677` against upstream base `5262ff386`: `git -C vendor/tbc-new-fork diff --numstat --diff-filter=M 5262ff386bd171e6349d0f9cf00f4d762a6c9951 HEAD` prints only `6	0	ui/app/SimTabsSection.tsx`; the same with `--diff-filter=D` prints nothing; `--diff-filter=RCT` prints nothing; `git cat-file -e 5262ff386:<path>` fails for all 259 added files. No file this branch touches exists at `5262ff386`; its one new file is `ui/features/upgrades/utils/is_record.ts`. **Rule: clean.**

## Adversarial

No blocking or should-fix finding. The main question was whether any caller of `withPrune`, `withCandidateCap`, `withIterations` or `afterScopeChange` relied on getting a new object back. None does:

- The only callers are `upgrades_store.ts:134-137`, reached from `useUpgradesSettings.ts:100-102` and `follow_phase.ts:30`.
- The save subscriber compares the saved parts by reference (`saved_settings.ts:109`), so skipping the save on an unchanged value is the intended effect.
- The number pickers react only to a change in the field's value (`useUpgradesStore.ts:64`, `Object.is` at `batch.ts:60`).
- `changeInScope` still runs `appliedSettings` before the change (`upgrades_store.ts:113-114`), so a same-value call on a scope whose defaults are not stored yet still stores them. The review lead read these lines.
- The cap is compared after `normaliseCap`; `NumberPicker.tsx:29-31` gives only whole numbers or 0, so NaN cannot arrive.

The other claims match the code: A2 (no `applyDefaults` left in `ui/features/upgrades` or `ui/app/tabs`; other hits are upstream's own), A3 (surviving tests `run_state.test.ts:59-67`; the moved test is `upgrades_store.test.ts:59-67`), A4 (removing the run-id check at `run_state.ts:83` makes `fork-run-staleness.test.ts:163-164` fail, by reading; mutation not run), A5 (control at `UpgradesTabBody.unopened.test.tsx:124-126`), S2, S3 (`is_record.ts` imports nothing; `lazy_load.test.ts:126-133` pins the eager set), S4.

- **A1 (low, needs a test).** No test checks that a same-value setter call still stores the scope's defaults the first time. `upgrades_store.test.ts:120` uses `setPrune(false, SCOPE)` only as setup, and `saved_settings.test.ts:104` passes no scope. The reviewer's reading (mutation not run): rewriting `changeInScope` to return the old state when `change` returns its input would pass every current test.
- **A2 (low, needs a test).** `afterScopeChange` treats the state as unchanged only when `selectedSetKeys.length === 0` (`settings_state.ts:88`), and no test covers that condition: the tests at `settings_state.test.ts:92-112` either set `defaultsFor` or select no sets. A saved entry can hold sets with no valid `defaultsFor` (`saved_settings.ts:33-45` checks each field on its own).
- **A3 (note).** On `?upgrades-dev` pages the link's iterations are laid over the saved entry when the store opens (`saved_settings.ts:107`). Before this branch, committing the field at the link's value saved it; now nothing is saved, so a reload without the link shows the older saved value.

The axis did not typecheck `runSettled`'s narrowing; the lead's fork typecheck covers it (below). Unverified: whether the live A1 save check (`live-a1-save-check.log`) matches `218234677` — the axis reports it ran on `bfde23961` plus uncommitted changes.

## Domain

**Domain: clean.** No default moved (iterations from the seed, cap undefined, prune false; `initialSettings` and `normaliseCap` are outside the diff). The stale-run check `inputsSignature` (`run_inputs.ts:36`) is built from setting values, not object identity, so skipping an unchanged write cannot make a stale result look fresh. The pinned data files change only the fork SHA (`sim-implemented-effects.json`), `testedTabHash` (`wowsims-fork-layout.lock.json`), and the commit plus an appended `_comment` paragraph (`wowsims-fork.lock.json`). The axis re-ran the commands in `docs/fork-upstream-touchpoints.md` at `218234677` and every count matches (117 commits, 259 added, 1 modified upstream file). Not checked: the `testedTabHash` value was not recomputed.

## Standards + Spec

### Standards

No hard violation. Commit messages follow the seven rules (subjects 16-42 characters; bodies of `e5cd56a4` and `218234677` are 3 lines). Tests drive the store and pure functions, not stage internals.

- **S1 (low, needs a comment edit).** `settings_state.ts:53` "The three setters below return the state they were given when the value already holds, so the store writes nothing." restates the code; the reason is already in the `UpgradesActions` and `afterScopeChange` docstrings. AGENTS.md § Comment policy.
- **S2 (low, needs a comment edit).** `is_record.ts` docstring: the first sentence lists the callers, which will go stale. The second sentence (why it imports nothing) is a good why.
- **S3 (low, doc).** In `docs/reviews/feat-tab-store-actions.md`, all ten new `fixed` rows cited "fork `218234677`, main `e5cd56a4`", but `e5cd56a4` changes only `fork-run-staleness.test.ts` (`git show --stat e5cd56a4`). A1, A2, A3, A5, S1, S2, S3 and SP2 were fixed in the fork only; A4 in main only; S4 in both (ticket 591 lines 61-66, 110-112).
- **S4 (note).** The fork commit body ("so the store neither notifies nor saves") and the ticket 591 closing note's red counts state results without a command. AGENTS.md § Durable claims.
- **S5 (note, needs a comment).** `useUpgradesStore.test.ts:77` and `saved_settings.test.ts:17` call `setPrune(true, scope)` only to store the scope's defaults; nothing in either test says so.
- **S6 (note).** `state.x === v ? state : { ...state, x: v }` repeats in the three setters. Too small to extract.

### Spec

Every item in ticket 591 is in the diff, and each of the 10 rows set to `fixed` matches a real change. Re-pin records (lock `commit` and `_comment`, `sim-implemented-effects.json`, `testedTabHash`, touchpoints doc) all name `218234677`.

- **SP1 (note).** The ticket's A1 item reads "Either narrow the comment and the test name to the actions that do return the same state, or add equality guards and a test for one of them." It does not letter its options; the closing note calls the guards "option (a)", and the guards are the second option listed.
- **SP2 (note).** The closing note says 461 tests pass. The fork diff adds 6 `it(` lines and removes 4 (net +2 over 458 at `bfde23961`, `.scratch/tab-store-actions/review-fork-tests.log`), which gives 460.
- **SP3 (note).** S4 asked to wrap line 12 of `fork-run-staleness.test.ts`; the `FINISHED` comment was wrapped too. The closing note says so.

Summary: Standards 6 findings, worst S3 (wrong commit cited in a review table). Spec 3 findings, all notes, worst SP1.

## Summary

Nothing blocks the merge. The branch does what ticket 591 asked, no caller relied on the old always-new-object behaviour, nothing a sim run sees changed, the wowsims-file rule holds, and both test runs pass. Five low findings need small fork changes — two tests (A1, A2) and three comment edits (S1, S2, S5). The review lead may not edit code, so they are filed as ticket 592 for the owner's "merge then follow up". S3 is fixed in this review's commit: the ten rows in `docs/reviews/feat-tab-store-actions.md` now cite the commit that holds each fix.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                         |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | fixed on feat/store-actions-followups: fork `d1de72abc`, pin `0e3c5967`, ticket 592 closed — test: same-value setter call still stores the scope's defaults                           |
| A2  | Adversarial | fixed       | fixed on feat/store-actions-followups: fork `d1de72abc`, pin `0e3c5967`, ticket 592 closed — test: `afterScopeChange` with sets selected and no `defaultsFor`                         |
| A3  | Adversarial | wontfix     | a link value is not a user change, and upstream's load order (`persistence.ts`: defaults, saved, link) lays it over the saved entry each load; `?upgrades-dev` pages only             |
| S1  | Standards   | fixed       | fixed on feat/store-actions-followups: fork `d1de72abc`, pin `0e3c5967`, ticket 592 closed — comment: restating line at `settings_state.ts:53` deleted                                |
| S2  | Standards   | fixed       | fixed on feat/store-actions-followups: fork `d1de72abc`, pin `0e3c5967`, ticket 592 closed — comment: caller list dropped from the `is_record.ts` docstring                           |
| S3  | Standards   | fixed       | fixed in this review's commit: rows in `docs/reviews/feat-tab-store-actions.md` now cite fork `218234677` (A1-A3, A5, S1-S3, SP2), main `e5cd56a4` (A4), or both (S4)                 |
| S4  | Standards   | wontfix     | commit bodies are immutable; ticket 591 gives the re-run command (`npx vitest run upgrades ui/app/tabs` at `218234677`) and the lock `_comment` gives its commands                    |
| S5  | Standards   | fixed       | fixed on feat/store-actions-followups: fork `d1de72abc`, pin `0e3c5967`, ticket 592 closed — comment: two tests say why they call `setPrune(true, scope)`                             |
| S6  | Standards   | wontfix     | three one-line ternaries; extracting them adds a helper for no gain                                                                                                                   |
| SP1 | Spec        | wontfix     | the ticket accepts either option ("Either narrow … or add equality guards and a test"), so the guards meet the spec whichever letter is meant                                         |
| SP2 | Spec        | wontfix     | not a defect: `lazy_load.test.ts:100` is `it.each(EAGER_FILES)`, and adding `utils/is_record.ts` to `EAGER_FILES` adds one test; 458 + 2 + 1 = 461, matching `review-fork-vitest.log` |
| SP3 | Spec        | wontfix     | one extra comment wrapped next to the asked-for line; harmless and recorded in ticket 591                                                                                             |
