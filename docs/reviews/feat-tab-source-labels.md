# Pre-merge review — feat/tab-source-labels

Reviewed range: `ce0df3a0940f0ec7506fb6121a8c313728b0e795..15faafdd0d1173c8f8fc6cd9eb633fbc5ea964a5`

Round 1 covers main repo `ce0df3a0..15faafdd` (9 commits, 80 files, 970+/427-)
and fork `vendor/tbc-new-fork` `bc96d0a03..f28f40769` (6 commits, 30 files,
442+/87-). `bc96d0a03` is the fork commit that `dev`'s
`data/wowsims-fork.lock.json` names.

**Dispatch.** Full axes: the branch changes `data/` and `packages/core/src/`,
so the small-change lane does not apply. `codex exec` is not used here; each
axis ran as a fresh `general-task` agent on Opus (review lane). The domain axis
ran because the diff changes game-facing source labels. The standards + spec
agent was made to hand back before its two `code-review` sub-agents finished;
their reports reached the orchestrator, which forwarded them here in
substance. The orchestrator also gave five open items (O-rows below, and O3
for the scope doc).

## Adversarial

No wrong number or wrong membership. All 44 universes and 44 reports at
`15faafdd` are byte-identical to what `assemble()` builds from the committed
inputs (axis script `cmp_universes.py`: `checked 44 mismatched 0`), and the
fork's copies byte-match them (`python scripts/sync_fork_universes.py --check`:
63 bundled copies match). Both trees were clean.

- **A1** No `pnpm verify` gate rebuilds `data/universes/*` and compares it with
  the committed files (`package.json:15` `verify:steps`); a stale universe
  passes every gate. Before this branch. Same as the orchestrator's item 1.
- **A2** `packages/core/test/pool-hardening.test.ts:835-848`, the heroic-path
  test, read only `entry.source` (= `sources[0]`). Since this branch ret-p2 and
  ret-p3 give 28288 and 28034 a `heroic` row in `sources[1]`, which the test
  could not see.
- **A3** Fork `ResultRow.test.tsx:165` and one `format.test.ts`
  `rowSourceDetail` case asserted cell text for a row whose only zone was
  hidden; `sourcesView` (`results_view.ts:205-208`) removes such a row, so the
  text is never on screen.
- **A4** Fork `format.ts` `rowSourceLabel` and `rowShownSourceLabel` had no
  production caller (orchestrator item 3; same as S4).
- **A5** 27484 and 28288 left `WOWSIMS_NOT_YET_ADMITTED` but were not added to
  `WOWSIMS_ADMITTED_IN_P3`, so nothing asserted they stay in ret-p3; the
  comment still said "40/44".
- **A6** 22401, 28034, 28288 move from "Source not recorded" to Dire Maul,
  The Black Morass and The Mechanar; 27484 to "Heroic dungeon". A player who
  hid "Source not recorded" sees them return. No saved key becomes invalid.

## Domain

Every spot-checked label matches the committed sources: tier-token bosses
against `vendor/atlasloot/data-tbc.lua` (30993 The Illidari Council :3718, and
five more), the "(N)" mark (every db drop in a `phase_raids.json` zone is
difficulty 1), Band of Eternity standings (`factions-tbc.lua:462-525`), PvP
seasons, 33910 now on the honour line with its four siblings, 27484 Heroic
Blood Furnace (`verification-log.md:711`), and the two five-man aliases
(Pathaleon `data-tbc.lua:2148`, Temporus `:1661`).

- **D1** Libram of Hope (22401): db.json npc 16097 is named with a Lua
  fragment, and upstream's `ItemSource.tsx` prints it; the branch fixed only
  the universe row. Live render: hypothesis, untested. Before this branch.
- **D2** Sunmote rows (34397 Bladed Chaos Tunic) read "Sunwell Plateau (N) ·
  M'uru", the token form.
- **D3** Honour PvP rows name no season; arena rows do. The Wowhead text has it
  ("Honor Points (Season 3)", `data/wowhead-lists/feral/p3.json`).
- **D4** Two inaccurate citations: the `TICKET_157_FORCE_INCLUDE` comment says
  every item's db source names a five-man zone (31033, 31856 have none), and
  the 33910 `corrections` entry cites a docstring for "Season 3" that does not
  say it.

## Standards + Spec

**Upstream-file rule: pass** (orchestrator item 5).
`git -C vendor/tbc-new-fork diff --name-status upstream/master...HEAD -- . ':!ui/features/upgrades' ':!assets/locales/en/upgrades.json' ':!schemas/upgrades.schema.json'`
at `f28f40769` printed `M ui/app/SimTabsSection.tsx` and four `A` files under
`ui/app/tabs/` (new, not this branch's). The locale and schema files do not
exist in `upstream/master` (`git cat-file -e` fails), so all their keys are
ours. New locale keys are in the schema. Lock and
`sim-implemented-effects.json` name the fork HEAD.

- **S1** Fork commit `f28f40769` subject is 51 characters.
- **S2** Tracked tickets (44, 619, 293) and fork `format.ts:79` cited claim ids
  (C15, C19, C30, C34) from the gitignored stage plan; 44 stated C34's count as
  fact though the plan marked it untested.
- **S3** Fork `format.test.ts:225` stated "some of these rings are quest
  rewards" as fact.
- **S4** Same as A4.
- **S5** `scripts/check_boss_aliases.py:52` copied the brace-depth walk of
  `parse_atlasloot.parse_items_section`.
- **S6** Commit `bc626c07`'s body makes a causal claim with no command.
- **S7** `emitted_boss_names` docstring restated the return type.
- **P1** Badge and honour items that a committed Wowhead list names still show
  "Source not recorded" in other specs (33296 is `badge` in ret-p5, `unknown`
  in warrior/balance/feral-p5). Tickets 676 and 643 said no committed input
  names them. Measured after the review: 134 of 3481 unknown-first rows across
  the eleven p5 universes are named by some list (ticket 676 § Review
  correction).
- **P2** 27484: both dialogs file it under "Heroic dungeon" while upstream's
  block names The Blood Furnace; a K5 capture is named for a key that does not
  exist.
- **P3** Ticket 645 was closed with its Done-when (a primary source on how the
  rings are obtained) unmet.
- **P4** 33910's honour fix shows on no fixture (`data/tab-fixtures/ret-p3-p2.json`
  still has `pvp via arena`).
- **P5** Unplanned additions (boss check, 27484 test exemption, dead-slots
  comment, `data.md` entry), each authorised by a Gate C ruling.

**Orchestrator items.**

- **O1** Three "Failed to fetch" toasts on the K5 fixture page
  (`worker_pool.ts:293`).
- **O2** `scripts/check_boss_aliases.py` reads gitignored
  `vendor/atlasloot/data-tbc.lua` and fails closed without it.
- **O3** `docs/upgrades-tab-scope.md` had no rows for 676-678, a stale 293
  figure, and rows for tickets this branch closed.

## Code quality

| ID  | Row                                                        |
| --- | ---------------------------------------------------------- |
| A4  | Fork label helpers with no production caller               |
| Q1  | `shownSourceOf` fallback unreachable on a kept row (fixer) |
| S2f | Fork `TOKEN_DIFFICULTY` comment cites a plan claim id      |
| S3  | Fork test comment states a hypothesis as fact              |
| D4  | Two inaccurate citations in builder comment and list entry |
| S5  | Duplicated AtlasLoot brace walk                            |
| S7  | Docstring restates the return type                         |
| Q2  | Heroic-path check also over ret-p2 (fixer)                 |

Q1 and Q2 came from the round-1 fixer's list of other needed changes. One
fresh `general-task` (Opus) agent fixed every row in one pass (fork
`83f43858a`; main `db30ea84`, `960844d6`, `ad0ff4ef`, re-pin `ed8beb00`).
D4(b)'s text is in `data/wowhead-lists/ret/p3-p5.json` `corrections`, which no
script reads (`git grep -n corrections -- scripts packages`), so no output
changed. S5's checker output and the parser's JSON are byte-identical before
and after.

## Fixes (round 1)

| Commit           | Findings                                                       |
| ---------------- | -------------------------------------------------------------- |
| `5306d814`       | A2 (every source checked, ticket-157 ids exempt), A5           |
| fork `b1ec045b1` | A3 (rows the filter keeps)                                     |
| `9af4fae8`       | A3 re-pin                                                      |
| `aea80521`       | P1, P3, P4, S2 ticket text; tickets 679-682 for A1, D1, D3, P4 |
| `f39cf3f5`       | O3                                                             |
| fork `83f43858a` | A4, Q1, S2f, S3                                                |
| `db30ea84`       | D4                                                             |
| `960844d6`       | S5, S7                                                         |
| `ad0ff4ef`       | Q2                                                             |
| `ed8beb00`       | re-pin for A4, Q1, S2f, S3                                     |

A2 and Q2 were proved: with the exemption list emptied the test fails
(`27484 Libram of Avengement carries a heroic source in ret-p2`; with only
27484 exempt, `28288 Abacus of Violent Odds carries a heroic source at
maxPhase 3`). `pnpm verify` at `ed8beb00`: rc 0, `gates: 1539 ran, 0 skipped`.

## Focused check (round 2)

Reviewed range: `15faafdd0d1173c8f8fc6cd9eb633fbc5ea964a5..ed8beb000660e671942aa79b356b0008fea3c9ea`

Fork range: `f28f40769..83f43858a`.

One fresh `general-task` (Opus) agent ran the four checks. It wrote nothing.

1. **Conditions: pass.** Every commit names its finding or row IDs, or is a
   fork re-pin (`9af4fae8`, `ed8beb00`: lock and
   `data/sim-implemented-effects.json` only). The only changed non-test,
   non-comment lines are the S5 helper (`check_boss_aliases.py`,
   `parse_atlasloot.py`), the A4 deletions and the D4(b) `corrections` text.
   The wowsims-file check at `83f43858a` prints the same five lines as round
   1. Lock `commit` and `forkCommit` both name `83f43858a`.
2. **Each fix does what its finding asks: pass.** The A2/Q2 exempt set equals
   `TICKET_157_FORCE_INCLUDE` (`assemble_universe.py:182-189`). The A3 cases
   assert the row is kept. No caller of the A4 helpers remains
   (`git grep` rc 1). S5: old and new parser outputs are byte-identical and
   equal the four committed files; `dungeon_encounter_loot` gives the same 940
   pairs. Every ticket command it re-ran reproduced; the scope-doc MISSING and
   STALE loops print nothing.
3. **New tests assert their findings: pass.** The recorded reverted runs agree
   with the data (not re-run).
4. **Touched tests pass:** `pool-hardening.test.ts` 247 passed, 2 todo;
   fork `format.test.ts` and `ResultRow.test.tsx` 43 passed; rc 0.

Findings:

- **R1 (test coverage, not bookkeeping).** The `shownSourceOf` fallback
  (`?? row.sources?.[0] ?? row.source`, fork `utils/format.ts:124-125`) lost
  its last test: A3 removed the both-zones-hidden `rowSourceDetail` case and
  A4 removed "falls back to the first source when every source is hidden".
  Q1 kept the branch on purpose, and `sortLabelsFor` (`format.ts:140`) still
  reaches it through `rowSourceDetail`. Suggested fix: one `rowSourceDetail`
  case that hides every source.
- **R2 (bookkeeping).** Ticket 676 gave three counts with no command.
- **R3 (bookkeeping).** Ticket 619 said "every zone" where World Bosses has
  no drop.
- **R4 (bookkeeping).** `.scratch/carry-forward/map.md` had no lines for 676,
  677 and 678 (filed on `dev` before this branch).

**Round 2 stopped at R1, then R1 was fixed by ruling.** R1 is a finding
other than bookkeeping in the lines the fixes wrote, so by the skill's
"Round limit" the review stopped and the decision went up. The likely cause:
the round-1 fixer and the quality pass each deleted one of the two tests of
the fallback without checking what else covered it (hypothesis, untested).
The orchestrator ruled to fix it under the owner's standing rule for small
review findings (the gitignored handoff
`.scratch/handoffs/upgrades-tab-source-labels-HANDOFF.md`, line 51, the
2026-10-16T04:07Z quote "If it's a certain factual fix then of course", and
line 176). That is
the orchestrator's ruling, not an owner decision on R1. The fix is fork
`093cd5981`, one `rowSourceDetail` case in `format.test.ts` that hides every
source (`sourceKeysMatching`) of a two-source row and of a `source`-only
row; re-pin `272a3806`. With the fallback mutated to `row.sources?.[1]` the
case failed (`expected 'Hyjal Summit · Archimonde' to be 'Black Temple (N) ·
The Illidari Counc…'`); restored, `format.test.ts` gave 30 passed, and fork
`tsc --noEmit`, `oxfmt --check` and `oxlint` gave rc 0. No round reviews
this fix: the skill allows no round 3.

The bookkeeping rows R2-R4 were applied after round 2 in `154f1223`, which
changes only this file, tickets 619 and 676, and `map.md`; R2's script was
re-run at `ed8beb00` and printed the ticket's counts.

## Disposition (round 2)

| ID  | Axis          | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                             |
| --- | ------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Focused check | fixed       | fork `093cd5981`, re-pin `272a3806` — all-hidden `rowSourceDetail` case, red against a mutated fallback; fixed on the orchestrator's ruling under the owner's standing small-findings rule (handoff lines 51 and 176), not an owner decision on R1                                                                                        |
| R2  | Focused check | fixed       | Ticket 676 gives the script, its output and the classification rule                                                                                                                                                                                                                                                                       |
| R3  | Focused check | fixed       | Ticket 619 says "every zone with a drop" and names World Bosses                                                                                                                                                                                                                                                                           |
| R4  | Focused check | fixed       | `map.md` lines for 676, 677, 678                                                                                                                                                                                                                                                                                                          |
| A1  | Adversarial   | defer       | `.scratch/carry-forward/issues/679-no-gate-rebuilds-committed-universes.md` — before this branch; the builder reads gitignored vendor inputs, so a gate needs CI restores                                                                                                                                                                 |
| A2  | Adversarial   | fixed       | `5306d814`, `ad0ff4ef` — every source of every ret-p2 and ret-p3 entry checked; the six ticket-157 ids exempt                                                                                                                                                                                                                             |
| A3  | Adversarial   | fixed       | fork `b1ec045b1` — cases use rows the filter keeps and assert a key stays unhidden                                                                                                                                                                                                                                                        |
| A4  | Adversarial   | fixed       | fork `83f43858a` — both helpers and their tests deleted                                                                                                                                                                                                                                                                                   |
| A5  | Adversarial   | fixed       | `5306d814` — 27484 and 28288 in `WOWSIMS_ADMITTED_IN_P3`; comment says 42/44                                                                                                                                                                                                                                                              |
| A6  | Adversarial   | wontfix     | Intended by tickets 174 and 646: these items now carry their real sources; membership unchanged in all 44 universes and no saved filter key becomes invalid                                                                                                                                                                               |
| D1  | Domain        | defer       | `.scratch/carry-forward/issues/680-libram-of-hope-source-shows-lua-fragment.md` — before this branch; upstream's block prints the npc name                                                                                                                                                                                                |
| D2  | Domain        | wontfix     | Owner ruling (b), "tier token should show boss": a Sunmote upgrade is the token pattern, and the row names where the needed drop comes from                                                                                                                                                                                               |
| D3  | Domain        | defer       | `.scratch/carry-forward/issues/681-honour-pvp-rows-drop-the-season.md` — the owner's season ruling covered arena only                                                                                                                                                                                                                     |
| D4  | Domain        | fixed       | `db30ea84` — both citations corrected; no output reads either text                                                                                                                                                                                                                                                                        |
| S1  | Standards     | wontfix     | Rewording one character means rewriting the fork history after `f28f40769`, which the lock's `_comment` names, and re-pinning                                                                                                                                                                                                             |
| S2  | Standards     | fixed       | `aea80521` — tickets 44, 619 and 293 give the claim and its command; the six-row count was run                                                                                                                                                                                                                                            |
| S2f | Standards     | fixed       | fork `83f43858a` — comment points at the builder guard and ticket 619                                                                                                                                                                                                                                                                     |
| S3  | Standards     | fixed       | fork `83f43858a` — "may be quest rewards (untested)"                                                                                                                                                                                                                                                                                      |
| S4  | Standards     | fixed       | Same change as A4                                                                                                                                                                                                                                                                                                                         |
| S5  | Standards     | fixed       | `960844d6` — `items_block_lines` in `parse_atlasloot.py` shared by both; outputs identical                                                                                                                                                                                                                                                |
| S6  | Standards     | wontfix     | A commit body is not worth a history rewrite; the commit sits under four later commits and a re-pin                                                                                                                                                                                                                                       |
| S7  | Standards     | fixed       | `960844d6` — docstring says why the zone is kept                                                                                                                                                                                                                                                                                          |
| P1  | Spec          | defer       | `.scratch/carry-forward/issues/676-badge-honor-holiday-items-need-a-source-input.md` — premise corrected with the measured 134 of 3481; remaining work is a builder change and a regen of all universes                                                                                                                                   |
| P2  | Spec          | wontfix     | The cell's plain text is "Heroic dungeon · The Blood Furnace" (fork `format.ts` `sourceDetail`, heroic case) and both dialogs key it "Heroic dungeon" (`settings_pool.ts:52-56`), as for every heroic row; the capture is a gitignored scratch file                                                                                       |
| P3  | Spec          | fixed       | `aea80521` — ticket 645 says the primary-source check was not done; it stays closed because the label reads "Reputation" whichever way the rings are obtained                                                                                                                                                                             |
| P4  | Spec          | defer       | `.scratch/carry-forward/issues/682-tab-fixture-still-shows-33910-as-arena.md` — needs a fixture re-record or live run                                                                                                                                                                                                                     |
| P5  | Spec          | wontfix     | Each addition is authorised by a Gate C ruling in the stage-gate decision log                                                                                                                                                                                                                                                             |
| O1  | Orchestrator  | wontfix     | The branch changes no worker or sim code (fork diff lists only `ui/features/upgrades/`, locale and schema); without `WASM_WORKER=1` the dev server serves `local_worker.js` (`vite.config.mts:37`), which posts to an absent `:3333` backend, as earlier execution reports record; that this caused K5's toasts is a hypothesis, untested |
| O2  | Orchestrator  | wontfix     | It fails closed and names `pnpm sync:atlasloot:restore` (`check_boss_aliases.py:164`); CI restores the Lua before verify (`.github/workflows/verify.yml:38`), as for the two existing AtlasLoot gates                                                                                                                                     |
| O3  | Orchestrator  | fixed       | `f39cf3f5` — rows for 676-682 added, closed rows removed, 293 says 29–34%; the scope-doc loop prints nothing missing or stale                                                                                                                                                                                                             |
| Q1  | Code quality  | fixed       | fork `83f43858a` — fallback kept, with a comment saying why                                                                                                                                                                                                                                                                               |
| Q2  | Code quality  | fixed       | `ad0ff4ef` — ret-p2 checked too                                                                                                                                                                                                                                                                                                           |

## Summary

**Every finding has a disposition; no finding blocks the merge.** Round 1
found no wrong figure and no wrong membership: all 44 universes and reports
rebuild byte-identically from the committed inputs, and the labels match
AtlasLoot, the wowsims db and the verification log on every spot check.
Round 1's findings are fixed (15), deferred to open tickets (5) or wontfix
with a reason (8). Round 2 passed all four checks and found R1 (the Source
cell's every-source-hidden fallback had no test) and three bookkeeping
items; all four are fixed, R1 after round 2 on the orchestrator's ruling.

The fork changes no existing wowsims file except the approved
`ui/app/SimTabsSection.tsx` (Standards + Spec, and round 2 check 1).

`pnpm verify` at `154f1223` (before the R1 fix): rc 0, `gates: 1539 ran, 0
skipped`. The run on the final tip is reported with the merge check.

Tickets: this branch filed 4 (679, 680, 681, 682) and closed 5 (44, 174,
619, 645, 646), by the two commands in the skill's step 3. Ticket 676 also
absorbs P1 with a corrected premise and stays open.
