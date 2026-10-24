# Pre-merge review — feat/704-plain-drop-lines

Reviewed range: `c83e571227bf94c468cf5874a0110d6f58a28fa7..748cc2de1353f492632c87ae36e68aa7f63ea377`

Fork range: `b908771ddceaec1e05a9534b4704e01732fcb0c5..6324167c58ae70f010ee31c9aab0c14c8319ea40` (one commit, `vendor/tbc-new-fork` on `feat/704-plain-drop-lines`).

## Dispatch

- Full axes. The branch is not a small change: `git diff --shortstat dev...HEAD`
  gives `15 files changed, 531 insertions(+), 516 deletions(-)`, and
  `git diff --name-only dev...HEAD` lists paths under `data/` and
  `packages/core/src/`.
- `codex` is not on `PATH`. The three axes ran in parallel as fresh
  `general-task` agents on Opus (review lane), each told to write nothing.
- Domain axis ran: the new strings make claims about meta gems, socket bonuses,
  the hit cap and set bonuses.
- `packages/core/test/candidate-gems.test.ts` shows 828 changed lines only
  because its CRLF line ends became LF, which `.gitattributes` asks for;
  `git diff --ignore-cr-at-eol` shows 4 changed lines.
- Upstream wowsims files: `git -C vendor/tbc-new-fork diff --name-only
--diff-filter=M e804c29e8 6324167c5` lists only `ui/app/SimTabsSection.tsx`,
  the same as at `b908771dd`. No existing upstream file changed on this branch.
- Owner rules applied: no live sim run and no fixture re-record (2026-10-24);
  player-facing strings are one plain sentence in player words (2026-10-20).
- The layout gate has not run on this branch: the pair's fork has no `dist/`
  (`pnpm verify` printed it as skipped; execution report, K2 step 12).

## New player-facing strings

The tab shows the label in the left column and the first line of the text in
the right column. A text with more after its first line break ends with
"… (full text in the browser console)" (fork `utils/format.ts:151-154`,
`model/assumptions.ts:57-60`).

| Label                          | Text the player sees                                                                                                                                                                                     | Emitted at (fork; core)                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Meta gem                       | Your meta gem was not active, so the ranking swapped 1 gem (or N gems) in its own copy of your gear to turn it on; your gear itself was not changed.… (full text in the browser console)                 | `disclosure.ts:160-166`; `disclosure.ts:224-230`                                   |
| Meta gem and hit rating        | If gems were swapped to turn your meta gem on, hit rating was treated as always useful, because the hit cap is only known for a fight where every target is level 73.                                    | `rank.ts:1072-1076`; fork only                                                     |
| Meta gem and hit rating        | If gems were swapped to turn your meta gem on, hit rating was treated as always useful, because your hit rating could not be read.… (full text in the browser console)                                   | `rank.ts:1089-1093`; fork only                                                     |
| Meta gem and hit rating        | The set-bonus sims used the same gems at every piece count, because the hit rating of one of them could not be read.… (full text in the browser console)                                                 | `rank.ts:1194-1198`; fork only                                                     |
| Meta gem                       | No meta gem is known for your spec, so meta sockets on candidate items were left empty and those items are priced without a meta gem and without their socket bonus.… (full text in the browser console) | `candidate-gems.ts:266` + `rank.ts:4095`; `candidate-gems.ts:196` + `rank.ts:2296` |
| _item name_                    | A sim of this item failed, so that try was left out of the ranking.… (full text in the browser console)                                                                                                  | `rank.ts:1765`; `rank.ts:1420`                                                     |
| _item name_                    | No gem swap could turn your meta gem on with this item equipped, so that try was left out of the ranking.… (full text in the browser console)                                                            | `rank.ts:1766`; `rank.ts:1421`                                                     |
| _set name_ _N_-piece set bonus | The _set name_ _N_-piece set bonus was not measured, because its sim failed.… (full text in the browser console)                                                                                         | `rank.ts:1770-1771` with reason `:2371`; `rank.ts:1425-1426` with `:1768`          |
| _set name_ _N_-piece set bonus | The _set name_ _N_-piece set bonus was not measured, because no gem swap could turn your meta gem on.… (full text in the browser console)                                                                | reason `rank.ts:2254`; `rank.ts:1739`                                              |
| _set name_ _N_-piece set bonus | The _set name_ _N_-piece set bonus was not measured, because the sims that measure it failed.                                                                                                            | reason `rank.ts:2306`; fork only                                                   |

## Adversarial

No code parses, prefix-matches or splits these strings outside tests, and the
tests were updated (`git grep` for `.field`, old labels and old phrases in both
repos). `pnpm engine-port-drift:check`: "36 ported files match engine.md".
`pnpm sim-implemented-effects:check`: "matches committed file" (only
`forkCommit` moved). Core tests for the changed files: 308/308. `pnpm
fork-tests:check`: 735/735. No fixture under `data/` holds an old string. Every
row removed from `docs/upgrades-tab-scope.md` names a closed or wontfix
ticket; rows 695, 698 and 703 are open. Lock `pushed: false` is accurate.

- **A1 (low): two identical lines for one item.** Fork `rank.ts:1762`, core
  `rank.ts:1417`. A ring, trinket or one-hander is tried in each of its slots
  (`rank.ts:1316-1371`, `simSlotsForPoolSlot`), and each failed try adds a
  line. The label is now the item name and the slot sits after the line break,
  which the tab hides, so two failed tries show two identical lines. The old
  label held the slot (`candidate <id> (finger1)`). Same root cause as D1, S1
  and P2.
- **A2 (low, test theatre, command-line HTML report).**
  `packages/core/test/rank-report.test.ts:3066-3077`. The crash fixture lost its
  opening sentence and now starts with `sim error:`; its comment still says it
  is "exactly what the artifact holds". With the real new text, `firstLineOf`
  (`rank-report.ts:155`) shows "A sim of this item failed…", so the crash's
  first line no longer reaches the HTML report, and the test passes only
  because its fixture no longer has the real form.
- **A3 (low): the new tab test checks hand-typed copies.** Fork
  `SubstitutionsList.test.tsx:46-113` renders hand-typed copies of the strings,
  not engine output, so it stays green if the engine text changes. It also
  omits "No gem swap could turn your meta gem on with this item equipped…" and
  the fork-only reason "the sims that measure it failed.". The core tests do
  assert the engine text for the meta-swap, spec-meta, item and set-bonus
  lines; `fork-meta-repair.test.ts` covers the hit-rating notes.

## Domain

No new string states a false fact about the game: the level-73 hit cap, how a
meta gem turns on, the socket bonus lost to an empty socket, and set piece
counts all check out. The "Meta gem" swap line is true: repair returns only once
the meta gem is active (`meta-repair.ts:160-162`), and the tab never writes
repaired gems back to the player's gear (only `setGear` call is the dev fixture
loader `utils/fixture.ts:102`).

- **D1 (medium): "so that try was left out of the ranking" does not say what
  was tried.** Fork `rank.ts:1762-1767`, core `rank.ts:1417-1422`. Each skip is
  one item in one slot (fork `rank.ts:1323-1373`); the slot is only in the
  console. The item can still be ranked from its other slot. Fix: name the slot
  in player words in the first sentence.
- **D2 (low): the hit-rating note's reason fits candidate gear only.** Fork
  `rank.ts:1074`, `:1091`. The swaps the "Meta gem" line lists come from the
  worn-gear repair, which never gets a hit budget (fork `rank.ts:803-808`, read
  again for this review); only candidate repairs do (`:3923-3937`, read again).
  On a level-73 fight those swaps also value hit fully and no note appears.
  "The hit cap is only known" also reads like a game claim. The behaviour is
  older than this branch.
- **D3 (low): the set-bonus gems note does not say which gems or what it cost.**
  Fork `rank.ts:1196`. The "same gems" are the meta-gem swaps; the old text's
  consequence (set-bonus hit was not counted against the hit cap) is gone; only
  the failing set and sets measured after it share the gems (`rank.ts:1100-1110`).
- **D4 (low; no current spec reaches it): the spec meta line.** Fork
  `candidate-gems.ts:266`, core `:196`. "No meta gem is known for your spec"
  reads like a game fact; "left empty" contradicts `candidate-gems.ts:270-276`,
  which moves a worn meta gem onto a candidate helm. Every detected spec has a
  preferred meta (fork `candidate-gems.ts:216`, core `spec-registry.ts:148`).
- **D5 (low): "its sim failed" / "the sims that measure it failed"** also cover
  a sim request that could not be built (`set-less-copies.ts:126-131,146-147`;
  `rank.ts:2357-2360`).
- **D6 (low, record): `docs/verification-log.md:1050-1051`** quotes the old
  label `gems.meta-repair` and "Meta inactive" as gate evidence.

## Standards + Spec

Run through the `code-review` skill. `pnpm -C <pair> verify` rc=0; ported-file
hashes match `docs/fork-provenance/engine.md`; the lock `_comment` records the
change with a command a reader can re-run; commit subjects follow the seven
rules. **Standards: no hard violation.** **Spec: every line ticket 704 lists is
replaced; the doc and ticket edits (9e8b555b, de735d25, 748cc2de) are in the
brief's scope.** Not re-recording fixtures follows the owner's 2026-10-24
ruling; no committed fixture held the old lines.

- **S1 / P2: "that try" refers to nothing** (fork `rank.ts:1765-1766`, core
  `rank.ts:1420-1421`). Same sentence as D1. The vague wording came from gate
  directive N1 ("S6 detail must be true when another slot ranked the item",
  `decision-log.md:24`), so "this item was left out" would be false; the fix
  must name the slot.
- **S2 (code quality): three notes share the label "Meta gem and hit rating"**
  (fork `rank.ts:1072,1089,1194`), so tests tell them apart with
  `detail.startsWith(...)` (`fork-meta-repair.test.ts:1252-1255`,
  `rank.test.ts:705-707`). Rewording a note breaks behaviour tests.
- **S3 (code quality): the fork test comment overclaims.**
  `SubstitutionsList.test.tsx:46` says "the engine's exact strings" over
  hand-typed copies. Same test as A3.
- **P1 (low): "candidate" and "priced" in the spec meta line.** Same line as
  D4; unreachable today.
- **P3: the hit-rating notes start "If gems were swapped…" even when none
  were.** Chosen on purpose: `plan.md:64` and `plan.md:167` (C19) say the notes
  are written before any swap happens, and "If" keeps them true either way.
- **P4 (older than this branch): the list still says "candidates".** Title
  "Dropped candidates and substitutions ({{count}})"
  (`assets/locales/en/upgrades.json:166`) and labels "one-hand candidates",
  "off-hand candidates" (fork `rank.ts:4106`, `:4120`).

## Code quality

| ID      | Finding                                                                                                                                      | Ask                                                                                                                        |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| A2      | `rank-report.test.ts:3066-3077` fixture no longer has the real text, and its comment says it is exactly what the artifact holds              | Give the fixture the real new text and assert what the HTML report shows, or reword the comment to what the fixture now is |
| A3 / S3 | Fork `SubstitutionsList.test.tsx:46-113` uses hand-typed strings under a comment that says "the engine's exact strings", and omits two lines | Build the strings from the engine functions, or reword the comment and add the two missing lines                           |
| S2      | Three notes share one label; tests tell them apart by `startsWith` on the text                                                               | Fix if small; otherwise defer to ticket 705, which reworks these notes                                                     |

These rows go to one code-quality pass before round 2 (skill step 3); each then
gets a Disposition row.

## Summary

One finding blocks the merge and is open: the item line "…so that try was left
out of the ranking." (A1 / D1 / S1 / P2). It does not say which slot was tried,
and a ring, trinket or one-hander that fails in both slots shows two identical
lines. The fix must name the slot in player words and stay true when the item
ranked in its other slot. Status: fix before merge; the session dispatches it.

Two more new strings are small fixes in the same files, recommended for the same
fixer, and block under step 3 ("any other finding" introduced by this branch)
unless the owner allows a defer:

- D3: the set-bonus gems note should say the gems are the meta-gem swaps and
  that set-bonus hit was not counted against the hit cap.
- D4 / P1: the spec meta line says "left empty" although a worn meta gem is
  moved onto a candidate helm, and uses "candidate" and "priced"; no current
  spec reaches it.

The three `## Code quality` rows go to one code-quality pass before round 2.

Filed: 705 (D2, worn-gear meta fix ignores the hit cap with no note on a
level-73 fight; older than this branch), 706 (P4, "candidates" in the list
title and two labels; older than this branch). Disposed now: D5, D6, P3 as
wontfix (table below).

No existing upstream wowsims file changed. The layout gate has not run (no fork
`dist/` in the pair). Round 2 (focused check) runs after the fixes; the
Disposition rows for the open findings and the filed/closed ticket counts are
written then.

## Disposition

| ID  | Axis             | Disposition | Ticket / note                                                                                                                                           |
| --- | ---------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D2  | Domain           | defer       | `.scratch/carry-forward/issues/705-baseline-meta-repair-ignores-hit-cap-without-a-note.md` — older behaviour; this branch only reworded the note        |
| P4  | Standards + Spec | defer       | `.scratch/carry-forward/issues/706-candidates-labels-in-dropped-list.md` — title and labels are older than this branch                                  |
| D5  | Domain           | wontfix     | Same imprecision as the old text ("the sim failed"); to a player a sim that could not be set up is a failed sim, and the console line carries the error |
| D6  | Domain           | wontfix     | `docs/verification-log.md` is a dated record of what an earlier gate run showed; rewriting it would misstate that run                                   |
| P3  | Standards + Spec | wontfix     | Deliberate plan choice (`plan.md:64`, `:167` C19): the notes are written before any swap, and "If" keeps them true either way                           |
