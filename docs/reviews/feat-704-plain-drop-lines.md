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
| P4  | Standards + Spec | fixed       | Fixed on this branch in `tbc-new-fork@91bc01b8c` (re-pinned by `0f39a178`); ticket 706 is closed (Round 2 below)                                        |
| D5  | Domain           | wontfix     | Same imprecision as the old text ("the sim failed"); to a player a sim that could not be set up is a failed sim, and the console line carries the error |
| D6  | Domain           | wontfix     | `docs/verification-log.md` is a dated record of what an earlier gate run showed; rewriting it would misstate that run                                   |
| P3  | Standards + Spec | wontfix     | Deliberate plan choice (`plan.md:64`, `:167` C19): the notes are written before any swap, and "If" keeps them true either way                           |

## Round 2 (2026-10-24)

Focused check of the round-1 fixes. Main-repo range `6ee9ae9f..0f39a178`;
fork range `6324167c5..91bc01b8c`. One reviewer (`general-task`, Opus). It
read the code and diffs and ran no tests and no `pnpm verify`; a separate
agent runs verify in the pair. Line numbers are at `0f39a178` and `91bc01b8c`.

### Round-1 findings

| ID               | Verdict                                                     | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S6 (A1/D1/S1/P2) | fixed, no new defect                                        | The slot is data: `CandidateSkip.slot: SimSlotName` (fork `rank.ts:4096-4102`) is set from the loop's own `slotName` at both push sites (fork `rank.ts:1326-1347`) and copied to `Substitution.slot` (fork `disclosure.ts:41`, core `disclosure.ts:39`) by `candidateSkipSubstitution` (fork `rank.ts:4109`, core `rank.ts:2331`). The tab names it with `simSlotLabel` (fork `utils/format.ts:152-155`, `SubstitutionsList.tsx:23`); nothing parses a string. "This item was not ranked in this slot" stays true when the other slot ranked the item. Two failed ring tries show "(Ring 1)" and "(Ring 2)" (`SubstitutionsList.test.tsx:59-100`). The React key `field | detail`stays unique, because the console part of`detail` holds the slot. |
| D3               | fixed in content; string fails the plain-sentence rule (N1) | The note now says that the gems are the meta-gem swaps, and that set-bonus hit was not counted against the hit cap (fork `rank.ts:4171-4180`). This is true: the note is written only when the build swapped gems (`!base.repaired` returns before the read, `rank.ts:1120-1126`), and the missed hit is the set-bonus hit (`rank.ts:1086-1097`). The sentence has 47 words in three chained clauses; see N1.                                                                                                                                                                                                                                                           |
| D4 / P1          | fixed                                                       | Fork `candidate-gems.ts:266`, core `candidate-gems.ts:196`. "left empty", "candidate" and "priced" are gone. The text is true: `migrateGemsToItem` moves the worn gems, the meta gem among them, onto the new item (fork `migrate-gems.ts:21-56`). Still unreachable for every typed spec. Optional wording in N2.                                                                                                                                                                                                                                                                                                                                                      |
| A2               | fixed                                                       | The comment now says the fixture is the crash text alone and not a whole engine line (core `rank-report.test.ts:3068-3071`). The new test "names the slot of a failed item try" (`:3100`) asserts that the engine's first line reaches the HTML report.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| A3 / S3          | fixed                                                       | `SubstitutionsList.test.tsx:59-122` builds all 13 lines with the exported engine functions, including the two lines that were missing, and `RANKING_FIXTURE` is built with `candidateSkipSubstitution` (`testing/ranking_fixture.ts:31-37`). The comment matches what the test does.                                                                                                                                                                                                                                                                                                                                                                                    |
| S2               | fixed                                                       | Three labels (fork `rank.ts:4147-4180`); tests filter by `field` (`fork-meta-repair.test.ts:1247-1253`, core `rank.test.ts:705`). The tests still compare the label text, so a label rewording breaks them; a sentence rewording does not.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 706 (P4)         | fixed                                                       | Title `upgrades.json:166`; labels fork `rank.ts:4072`, `:4086`, core `rank.ts:2294`, `:2308`; ticket closed with a closing note.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### Player-facing strings changed in the fix range

| String                                                                                                                                                                                                                     | Verdict                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Title "Items left out and other notes (N)"                                                                                                                                                                                 | passes                        |
| Label "_item_ (_slot_)", for example "Violet Signet of the Master Assassin (Ring 2)"                                                                                                                                       | passes                        |
| "This item was not ranked in this slot, because its sim failed."                                                                                                                                                           | passes                        |
| "This item was not ranked in this slot, because no gem swap could turn your meta gem on with it equipped."                                                                                                                 | passes                        |
| Labels "Meta gem swaps and the hit cap", "Meta gem swaps and your hit rating", "Set bonuses and the hit cap"                                                                                                               | pass                          |
| Label "Meta gem for your spec"                                                                                                                                                                                             | passes                        |
| Labels "One-handed weapons", "Off-hand items"                                                                                                                                                                              | pass                          |
| "The gems swapped to turn your meta gem on were kept the same at every set piece count, so hit rating from set bonuses was not counted against the hit cap, because your hit rating at one piece count could not be read." | fails (N1)                    |
| "The ranking does not know which meta gem your spec uses, so new items with a meta socket got the meta gem you wear, or an empty socket and no socket bonus if you wear none."                                             | passes; optional wording (N2) |

### Upstream files

`git -C vendor/tbc-new-fork merge-base 91bc01b8c upstream/master` prints
`e804c29e8d615fcc6dcc632a1b0c782605e27d46`. `upstream/master` is
`3d6042163`, 2 commits past it, and the fork has not merged those commits.
`git diff --numstat --diff-filter=M e804c29e8 91bc01b8c` prints only
`6 0 ui/app/SimTabsSection.tsx`. None of the 9 files the fix commit touches
exists at `e804c29e8` or at `upstream/master` (`git cat-file -e`).

### Stale labels in six tab fixtures

Each of six fixtures has one "off-hand candidates" and one "one-hand
candidates" label. They are the only `substitutions` the fixtures hold, all
recorded at `b908771dd`. The fixtures with no labels are `enh-p3-p2` and
`warlock-p3-t5`. The stale labels make no check fail, and no check measures
the wrong thing because of them:

- `pnpm tab-fixtures:check` exits 1 only for an unreadable fixture, a schema
  error or an unknown `forkSha` (`scripts/check_tab_fixtures.py:151-183`,
  `:198-206`). The schema does not read the label text (`:85-114`).
- No test reads `substitutions` from a recorded fixture.
  `fork-meta-repair.test.ts:340-344` loads fixtures for their gear. Its
  note filters (`:1341`, `:1633`) run on fresh engine runs.
- The layout gate renders `feral-p3-p2bis` (`check_layout_gate.py:257`), and
  no check in it selects the left-out list (`grep -rn substitution
scripts/tab-harness scripts/check_layout_gate.py`: no match). Each new
  label is shorter than the old one, so any whole-page fit check measures
  the wider text.
- `merge_to_dev.py`, `check_merge_to_dev.py` and `check_merge_ready.py`
  never mention tab fixtures (`grep -c`: 0 each).

Leaving the labels is not a defect. Each fixture records what its
`forkSha` produced, and a hand edit would make it show text that its commit
did not write. The labels are covered by `SubstitutionsList.test.tsx:59` and
core `offhand-disclosure.test.ts`. A re-record would run the slow sim again
for ranking code that did not change. The owner's words that day were: "I
want to test code that is changed I don't want to run long slow code to test
code that isn't changed." The only effect: a person who loads one of these six
fixtures sees the two old labels under the new title until the next
re-record.

### Lock

`data/wowsims-fork.lock.json`: `commit` is
`91bc01b8c92204085a979f929268b4dfb07d624e`, `branchedFrom` is `e804c29e8…`,
and `pushed` is `false`. `git branch -r --contains 91bc01b8c` lists no
remote branch. The `_comment` entry "2026-10-24, 91bc01b8c" is accurate
about every change it names. It names the right engine files. Its
upstream-file command matches the output above. Its sentence that the three
PROVENANCE sha256 values moved is true: the sha256 of each of `rank.ts`,
`disclosure.ts` and `candidate-gems.ts` at `91bc01b8c` appears once in
`docs/fork-provenance/engine.md`. The N1 fix changes only the wording of
one note, so this entry stays true; the fix's fork commit adds its own
entry.

### New findings

- **N1 (fix before merge): the set-bonus hit note is three chained clauses
  in 47 words.** Fork `rank.ts:4171-4180`. Proposed text, 28 words, still
  true, and still matched by `fork-meta-repair.test.ts:1635`
  (`/not counted against the hit cap/`):
  "Hit rating from set bonuses was not counted against the hit cap when gems
  were swapped to turn your meta gem on, because it could not be read."
  Update the expected string in `SubstitutionsList.test.tsx` (the fourth
  definition).
- **N2 (minor, optional; no spec reaches it): the spec meta line has 33
  words.** Fork `candidate-gems.ts:266`, core `:196`. Possible shorter
  text: "The ranking does not know your spec's meta gem, so new helms got the
  meta gem you wear, or an empty meta socket and no socket bonus if you wear
  none." That meta sockets are found only on helms is a game fact this review
  did not check against the item database (hypothesis, untested). Without
  that check, keep "new items with a meta socket".
- **N3 (record, no action):** the command-line HTML report shows the raw
  sim slot, `Name (finger2)` (core `rank-report.ts:578`). This matches its
  existing "Into finger2" (`:179`). The report is for engineers, and the tab
  is not affected.

### Round 2 disposition

| ID  | Axis    | Disposition      | Ticket / note                                                           |
| --- | ------- | ---------------- | ----------------------------------------------------------------------- |
| N1  | Round 2 | fix before merge | Same fixer, same file; replacement text above                           |
| N2  | Round 2 | wontfix          | Optional wording only. The current text is true and no spec reaches it. |
| N3  | Round 2 | wontfix          | Engineer report, same form as the "Into" column                         |

Round-1 open findings S6, D3, D4/P1, A2, A3/S3 and S2 are fixed. Ticket 706
is fixed and closed. One new finding (N1) blocks the merge until it is fixed.
