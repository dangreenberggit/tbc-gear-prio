# Pre-merge review — feat/620-item-level

Reviewed range: `b073d1febd68fccc83f1c15e0b4f575ab3faada3..b5251c3923f3ba28210df57e6b0c4e83a0cb4440`

Fork range (vendor/tbc-new-fork, branch `feat/620-item-level`):
`7c261c5410cb4bdaf55b0e5a62fc4cc4c2c43aa5..594d07f66cb75d7c19f1835b69679d54225d0194`
(one commit; the lock names `594d07f66` with `"pushed": false`).

Reviewed range: `b5251c3923f3ba28210df57e6b0c4e83a0cb4440..76559172eea1c35a94081cf1e505435df795d768`

Round 2 fork range: `594d07f66cb75d7c19f1835b69679d54225d0194..b603564eed544d5e9f62fbc3950309dd65921110`
(one commit; the lock names `b603564ee` with `"pushed": false`).

The branch is stacked on `fix/narrow-width-607-603` (tip `b073d1fe`), which
has its own review, `docs/reviews/fix-narrow-width-607-603.md`. This review
reads only the range above.

## Dispatch note

- Tooling check: `python scripts/check_merge_ready.py --product-files`
  (rc 0) printed product files, measured against `dev` so it includes the
  stacked branch. In this range the product files are
  `data/sim-implemented-effects.json`, `data/wowsims-fork-layout.lock.json`,
  `data/wowsims-fork.lock.json`, `docs/upgrades-tab-scope.md` and
  `scripts/tab-harness/test-layout.mjs`. The sixth changed file is ticket
  `.scratch/carry-forward/issues/620-*.md`; the Spec axis read it as its
  spec, and no `instruction-review` ran because no agent instruction
  changed. The fork diff (six files: `ItemNameCell.tsx`, `ResultRow.tsx`,
  `ResultRow.test.tsx`, `model/pool_source.ts`, `assets/locales/en/upgrades.json`,
  `schemas/upgrades.schema.json`) was reviewed with them.
- Lane: full axes. `git diff --shortstat b073d1fe..b5251c39` gave
  `6 files changed, 82 insertions(+), 10 deletions(-)`, but the range
  changes paths under `data/` (and the fork under `vendor/`), which the
  small-change lane excludes.
- Reviewers: `codex` is not on `PATH`. Each axis ran as a fresh
  `general-task` agent on Opus with its brief and the two ranges, told to
  write nothing. Standards and Spec ran as the `code-review` skill's two
  agents. The domain axis ran: the diff states wowsims data facts (ring
  item levels, the gear picker's item-level read, ring-step counts).
- The spec for the Spec axis: ticket 620 and the owner's words of
  2026-11-03: "each step as its own item, which is true, being displayed
  that way, is fine. showing i level seems like a fine idea", and "we are
  working on the upgrades tab, not other shit in tbc gear prio ... but
  rather the upgrades tab and the fork." The word "ILvl" was chosen by the
  session coordinator to match the gear picker's column heading; the axis
  checked that nothing credits it to the owner.

## Adversarial

No defect in the range shows a player a wrong number or lets a gate pass
while checking nothing.

- **A1 (low): ticket 620 ticked an acceptance box it did not meet.**
  Acceptance 1 ("shown as steps of one item, each naming its standing, in
  the report and in the tab") was `[x]`, while the ticket's own closing
  note says the tab "still does not say which standing a row needs" and
  the report half was ruled out of scope. Source: `git diff
b073d1fe..b5251c39 -- .scratch/carry-forward/issues/620-*.md`.
- **A2 (low): the tab and the gear picker read the level with different
  operators.** The picker: `item.scalingOptions?.[0].ilvl || item.ilvl`
  (fork `ui/features/gear/model/item_data.ts:17`). The tab:
  `scalingOptions[0]?.ilvl ?? item.ilvl` (`model/pool_source.ts:73`). They
  disagree when key 0's level is 0 and a top-level level is set (the tab
  shows no line, the picker shows the top-level number). No item triggers
  it: all 8253 items in `assets/database/db.json` and all 6748 in
  `leftover_db.json` have one scaling option, key 0, with a level above 0
  and no top-level `ilvl` (python scans by the adversarial, domain and
  standards axes). The test named "…as the gear picker reads it" never
  runs the picker's read (CQ1).
- Checked and sound: `ResultRow` via `ItemNameCell` is the only renderer
  of result rows; the main table and the fold-out (`BelowCutoffGroup`)
  both use it (`git grep ItemNameCell\|ResultRow` at `594d07f6`). An
  item missing from the database or at level 0 shows no line (`!!ilvl`).
  Check 22 counts a row with no line or no name line as missing, so it
  fails rather than passing empty; its ticket-425 empty-count guard is
  `addToSubjectCount(22, …)` at `test-layout.mjs:536`; every item id in
  the six `data/tab-fixtures/mock-*.json` files is in db.json. Two of the
  three new tests fail on the old code (`2026-11-03-resultrow-red.txt`);
  the third guards the level-0 case. The 20 `ResultRow.test.tsx` tests
  pass on Node v22.23.2. `python3 scripts/check_layout_gate.py
--print-hash` prints `d91768075a97…`, equal to the committed
  `testedTabHash`, and `2026-11-03-layout-gate-check-2.txt` is a measured
  green run (24 check-22 PASS) that wrote it.
- Unexamined: the layout gate and `pnpm verify` were not rerun by this
  axis (machine load); check 22 measures that the line is present and
  placed, not its number.

## Domain

- **D1 (wording): the level does not tell most same-named ring rows
  apart.** Comments and the ticket said the level tells same-named ring
  rows apart (`ItemNameCell.tsx:49`, `test-layout.mjs:44-47`, the
  `ResultRow.test.tsx` comment, the ticket's closing note). That holds
  only for steps of one chain. db.json gives the 12 "Band of Eternity"
  items four levels: 128 (29294, 29298, 29302, 29307), 136 (29295, 29299,
  29303, 29306), 135 (29300, 29304) and 144 (29296, 29308); the 8 epic
  "Violet Signet" items get 110 and 120 (python read of db.json, checked
  again by the dispatcher). A live run's rows
  (`.scratch/agent-reports/2026-10-20-live-dps-spec-coverage/{warlock,rogue,hunter}/rows.json`,
  in the main checkout) list these rows, so four rows still read "Band of
  Eternity / ILvl 136". The on-screen number is true; the claims around
  it said more than it does. The analysis the owner ruled on
  (`.scratch/agent-reports/2026-11-03-general-task-620-ruling-prep.md`,
  main checkout, option B row) also said "Two 'Band of Eternity' rows now
  differ on screen".
- **D2 (count): the ticket said db.json gives "the 28 ring-step items" no
  source.** db.json has 32 sourceless ring-step items (29276-29291 and
  29294-29309); 28 reach the pool, which keeps epics only
  (`pool_source.ts:44`), and the 4 Friendly Violet Signets are rare.
- Confirmed: ids 29298-29301 are 128, 136, 135, 152; standings Friendly,
  Honored, Revered, Exalted (`data/atlasloot_sources.json`); "ILvl" is the
  picker's column word (`translation.json:377`, `ItemList.tsx:227`); the
  tab's number equals the picker's for every db.json item (see A2). No
  claim contradicts `docs/stage0-findings.md` or
  `docs/verification-log.md`, which say nothing about item level.
- Unexamined: whether a spec preset holds a Friendly (rare) Violet
  Signet; WCL fields (the diff adds none).

## Standards + Spec

### Standards

**No documented standard is broken.** Commit subjects are 43-50
characters, bodies are at most 6 lines and 72 columns; the re-pin is two
steps (lock `commit` and `sim-implemented-effects.json` `forkCommit` are
both `594d07f66`); `git -C vendor/tbc-new-fork diff --numstat
--diff-filter=M cec2a7b68 594d07f66` prints only `6 0
ui/app/SimTabsSection.tsx`, so no upstream wowsims file changed; the
ticket close has `Verified by:` with `<repo>@<sha>` and commands.

Judgement calls:

- **S1:** duplicated read of one fact with two operators (same as A2).
- **S2:** both acceptance boxes ticked (same as A1).
- **S3:** the `ResultRow.test.tsx` comment says "136 at Honored and 135
  at Revered in db.json"; db.json gives the levels only, the standings
  come from `data/atlasloot_sources.json`. The ticket's closing note had
  the same wording.
- **S4:** the test comment "Below the name, in the line the badges share"
  claims more than the assertions check (DOM order and "not inside the
  link"); check 22 is what checks "below".
- **S5:** the context `{ ...CONTEXT, itemOf: (itemId: number) =>
RINGS[itemId] }` is written twice, and the second test writes the
  `<table>` render by hand because `renderRow` takes no `notUpgrade`.
- **S6:** `ResultRow` passes `quality={item?.quality}` and
  `ilvl={item && ilvlOf(item)}`, two values from one item (possible Data
  Clump).
- **S7:** the `b5251c39` body says "275 PASS, 0 FAIL" without naming
  `pnpm layout-gate:check`.

### Spec

**One finding, about the ticket text; the build matches the owner's
rulings.** Every row shows "ILvl N" under its name in the main table and
the fold-out, beside BiS, "(Owned)" and "(Not an upgrade)"; the axis
viewed `620-ring-table-post-run-375-0.png` (rank 7 "ILvl 135", rank 8
"ILvl 136", rank 9 "ILvl 115 BiS (Not an upgrade)"),
`620-foldout-post-run-375-0.png` and `620-owned-post-run-653-0.png` in
the pair's `.scratch/agent-reports/2026-11-03-tab-review/`. No document
credits "ILvl" to the owner: the ticket, scope doc, three commit
messages and lock `_comment` credit the gear picker's heading, and the
implementer's report says "The coordinator ruled to keep 'ILvl'". The
ticket's vitest command reruns to `3 passed | 17 skipped`, rc 0. The
scope doc drops 620's row and notes the close under judgment call 10.

- **SP1:** acceptance box 1 ticked but not built (same as A1); the
  owner's actual ask had no acceptance line.
- The no-level state is covered by a unit test only; no db.json item
  needs it today.

## Code quality

Rows for the one code-quality pass before round 2. CQ1-CQ4 are in the
fork; CQ2 also touches `scripts/tab-harness/test-layout.mjs`, which is in
the layout digest, so the pass needs a green `pnpm layout-gate:check` (or
`--update-baseline` for a comment-only change, which the lock's comment
allows) and a fork re-pin.

| ID  | Where                                                                                                                           | Fix                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| CQ1 | fork `ResultRow.test.tsx`, "shows the item level under the name, as the gear picker reads it…" (A2, S1)                         | Make the name true: drop "as the gear picker reads it", or assert the line against the picker's read in `ui/features/gear/model/item_data.ts`. |
| CQ2 | fork `ItemNameCell.tsx:49`, `scripts/tab-harness/test-layout.mjs:44-47`, the `ResultRow.test.tsx` comment above `ringStep` (D1) | Say the level tells two steps of one chain apart; steps of different chains can share a name and a level.                                      |
| CQ3 | fork `ResultRow.test.tsx` comment "in db.json" (S3)                                                                             | Levels from db.json, standings from `data/atlasloot_sources.json` in tbc-gear-prio.                                                            |
| CQ4 | fork `ResultRow.test.tsx` comment "Below the name, in the line the badges share" (S4)                                           | Say what the assertions check (after the name, outside the link), or point at layout check 22 for "below".                                     |
| CQ5 | fork `ResultRow.test.tsx`, the two `itemOf: RINGS` contexts and the hand-written table render (S5)                              | One shared context constant; give `renderRow` a `notUpgrade` option or keep the hand render with no change.                                    |

## Summary

The branch does what the owner ruled: every Upgrades-tab row, in the
main table and the fold-out, shows "ILvl N" under its name, the number
equals the gear picker's for every db.json item, and an item with no
level shows no line. No finding is a wrong number, data loss, a gate that
passes on nothing, or a loud failure, so nothing blocks the merge.

The one domain fact the owner may not have had: the level separates the
steps of one ring chain, not the chains. Of the 12 "Band of Eternity"
rows, four read "ILvl 136" and four "ILvl 128", so those rows still look
alike apart from their DPS and the Wowhead tooltip; the analysis the
owner ruled on said "Two 'Band of Eternity' rows now differ on screen".
The ticket now says this (D1).

Bookkeeping applied in this review's commit, to ticket 620: acceptance 1
struck through as set aside by the ruling, with an acceptance line for
the item level (A1, S2, SP1); the sourceless count corrected to 32, 28
in the pool (D2); the standing source named (S3, ticket half); the
cross-chain fact added (D1, ticket half).

Round 1 left CQ1-CQ5 for the code-quality pass (fork `b603564ee`, main
`085fc8b4`). Round 2, the focused check below, passed with no finding,
and its Disposition table gives CQ1-CQ5 their rows. No finding is open,
and no finding blocks the merge.

Merge note from the coordinator (2026-11-05): the p45 branch also edits
ticket 620, `.scratch/carry-forward/issues/NEXT` and
`.scratch/carry-forward/map.md`, and merges before this branch. At this
branch's merge, keep 620's closed text and append p45's Comments entry
after it, take the higher `NEXT`, and keep both `map.md` lines.

Tickets, counted after round 2 at `76559172`: this branch's own range
filed 1 (795) and closed 1 (620)
(`git diff --name-status b073d1fe...HEAD -- '.scratch/carry-forward/issues/*.md'`
and the `Status: closed` count). Against `dev...HEAD`, which includes the
stacked branch, filed 1 and closed 3 (603, 607, 620). Ticket 795 is open:
`pnpm verify` fails under high load while every test passes.

Merge check (`pnpm merge-to-dev --check-only`, logs under `$TMPDIR/r620/`
of the reviewing agent, not kept):

- Run 1 at `df22da24`, load average 21 at the start: verify passed
  (`gates: 1573 ran, 0 skipped`, layout skipped on the unchanged digest
  `d91768075a97`); merge-ready failed on the A2 Disposition row, whose
  backquoted `||` the parser read as column breaks. `59bbbbdb` rewrote
  the row.
- Run 2 at `59bbbbdb`, load 45 at the start: rc 1 at the verify step,
  "vitest exited nonzero, but its JSON report lists no failed test or
  file"; the report says `success: true`, 1529 passed, 2 todo, 0 failed.
- Run 3 (the one rerun), load 48 at the start: rc 1, same step, same
  message. `packages/core/test/fork-meta-repair.test.ts` took 133 s and
  143 s as a whole file in runs 2 and 3; ticket 683 (closed) traced the
  same message to a long synchronous case in that file. That machine load
  brings back ticket 683's RPC timeout is a hypothesis, untested:
  `run_verify.mjs` prints only the JSON report's failures, so vitest's
  own error line is not in the log. Ticket 795 records it.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                     |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | Ticket 620 acceptance 1 struck through as set aside by the 2026-11-03 rulings, plus an acceptance line for the item level (this review's commit). Same as S2 and SP1.                                                                                                                                                             |
| A2  | Adversarial | wontfix     | The tab's nullish fallback and the picker's falsy fallback (see A2 above) give the same number for every item: every item in db.json (8253) and leftover_db.json (6748) has a nonzero key-0 level and no top-level `ilvl`. The misleading test name is CQ1. Same as S1.                                                           |
| D1  | Domain      | fixed       | Ticket 620 closing note now says the level separates steps of one chain only, with the db.json levels per id (this review's commit). The code comments are CQ2. The lock `_comment` says "two reputation-ring steps with one name (Band of Eternity 136 and 135) differ on screen", which is true of the two it names; no change. |
| D2  | Domain      | fixed       | Ticket 620 now says 32 sourceless ring-step items, 28 in the pool (this review's commit).                                                                                                                                                                                                                                         |
| S1  | Standards   | wontfix     | Same finding as A2; disposed there.                                                                                                                                                                                                                                                                                               |
| S2  | Standards   | fixed       | Same finding as A1; fixed there.                                                                                                                                                                                                                                                                                                  |
| S3  | Standards   | fixed       | Ticket half: the closing note names `data/atlasloot_sources.json` for standings (this review's commit). Test-comment half is CQ3.                                                                                                                                                                                                 |
| S6  | Standards   | wontfix     | Not a defect: `ItemNameCell` already takes `quality` as a plain value, and `ilvl` follows that prop; passing the whole item would change the cell's inputs beyond this ticket.                                                                                                                                                    |
| S7  | Standards   | wontfix     | The commit is written; the command and its log are in the implementer's report (`2026-11-03-layout-gate-check-2.txt`). Rewriting history for a body line is not worth it.                                                                                                                                                         |
| SP1 | Spec        | fixed       | Same finding as A1; fixed there.                                                                                                                                                                                                                                                                                                  |

## Focused check (round 2)

Main range `b5251c39..76559172`; fork range `594d07f66..b603564ee`. One
fresh `general-task` agent on Opus ran it, told to write nothing.

- **Conditions.** C1 holds: `df22da24`, `59bbbbdb` and `3ea4b0a0` edit
  only this review file and ticket 620; `76559172` files ticket 795 and
  edits `NEXT` and `map.md`; fork `b603564ee` names CQ1-CQ5 in its
  message; `085fc8b4` is the code-quality pass with a re-pin (its message
  names CQ1-CQ5 and CQ2), not a plain re-pin, because
  `scripts/tab-harness/test-layout.mjs` is outside `data/` and `docs/`.
  C2 holds: the only non-test changes are comments (`ItemNameCell.tsx:49-50`,
  `test-layout.mjs:46-48`) and the pin fields (`commit` and one appended
  `_comment` sentence in the lock, `forkCommit` in
  `sim-implemented-effects.json`). C3 holds: `b603564ee` is not a merge,
  and `git -C vendor/tbc-new-fork diff --numstat --diff-filter=M cec2a7b68
b603564ee` prints only `6 0 ui/app/SimTabsSection.tsx`, as at
  `594d07f66`.
- **Check 1, conditions hold:** PASS.
- **Check 2, fixes change only what each finding asks:** PASS. The new
  comments are true against db.json and `data/atlasloot_sources.json`
  (each Scale of the Sands chain's steps have different levels; 29299 is
  Honored, 29300 Revered).
- **Check 3, tests assert their findings:** PASS. The CQ1 test now
  compares each rendered line with the picker's heading and the level
  from `itemsTabData` (fork `ui/features/gear/model/item_data.ts`), so a
  different number in the tab fails its `toEqual`.
- **Check 4, touched tests pass:** PASS. `npx vitest run
ui/features/upgrades/components/ResultsTable/ResultRow.test.tsx` in the
  fork: Node v22.23.2, 20 of 20 passed, rc 0.
  `python3 scripts/check_layout_gate.py --print-hash` prints
  `bdf129b3…e963`, equal to `testedTabHash`. The only changed digest
  inputs are `ItemNameCell.tsx` and `test-layout.mjs`, both comment-only
  (`ResultRow.test.tsx` is not a digest input:
  `check_layout_gate.py:266` skips `.test.` names), so the
  `--update-baseline` in `085fc8b4` stands without a measured run.
- **Findings:** none.

## Disposition (round 2)

| ID  | Axis      | Disposition | Ticket / note                                                                                                                                                            |
| --- | --------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CQ1 | Standards | fixed       | Fork `b603564ee`: the test compares the tab's line with the gear picker's heading and `itemsTabData` level. Round 2 check 3.                                             |
| CQ2 | Domain    | fixed       | Fork `b603564ee` (`ItemNameCell.tsx`, `ResultRow.test.tsx`) and main `085fc8b4` (`test-layout.mjs`): the level tells two steps of one chain apart, not different chains. |
| CQ3 | Standards | fixed       | Fork `b603564ee`: the test comment names db.json for levels and `atlasloot_sources.json` for standings.                                                                  |
| CQ4 | Standards | fixed       | Fork `b603564ee`: the test name and comment say what the assertions check (after the name, outside the link). Same finding as S4.                                        |
| CQ5 | Standards | fixed       | Fork `b603564ee`: one shared ring context and a `notUpgrade` option on `renderRow`. Same finding as S5.                                                                  |
| S4  | Standards | fixed       | Same finding as CQ4; fixed there.                                                                                                                                        |
| S5  | Standards | fixed       | Same finding as CQ5; fixed there.                                                                                                                                        |
