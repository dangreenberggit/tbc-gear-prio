# Pre-merge review — fix/tab-polish

Diffed against: main `14d807ce...` (dev = origin/dev at the start) and fork
`817c23d37...bf9c26a00`. The review started on main `d013a171` and fork
`690fcdeb5`; the commits after those are this review's fixes and the 866
re-scope the orchestrator added mid-review. Upstream footprint:
`git -C vendor/tbc-new-fork diff --numstat --diff-filter=M 24606be6bae2601e5ca3985431c8c1da2ab422c0 HEAD`
prints only `6	0	ui/app/SimTabsSection.tsx`, the one owner-approved
edit. No ported engine file (`ui/features/upgrades/model/engine/`) changed.

What the owner asked for: the polish tickets. The plan
(`.scratch/plans/tab-polish-2026-11-12.md` in the main checkout) quotes the
session's question, "should I take 703, 753, 641 and 747/866 as one pair
branch?", and the owner's answer, "sure do 745, then merge (i wouldnt really
check anything on that task) and send out a session to orchestrate the
polish tickets". 866's upstream test edit was then rejected by the owner on
2026-11-12: "Our job isn't to fix wowsims files, so no, even if this sounds
like a good fix it sounds to me like it wouldn't fit in an upgrades tab PR so
rejected. You can file it as a general wowsims fix for after the tab or maybe
separately before it". So 866 stays open, re-scoped, with no code change.

Reviewers, each with no part in writing the branch:

- Adversarial, standards and spec: one Opus `general-task` (the session
  that ran this skill). It ran `pnpm verify`, re-ran the 753 tests against
  the code before 753's fix, probed the risk the 753 builder named, and
  wrote the A1 fix.
- Domain: one Opus `general-task` at effort xhigh, read-only. Report:
  `.scratch/agent-reports/2026-11-12-general-task-pmr-domain-axis.md` in the
  pair (gitignored).
- Fix check (step 3): one fresh Opus `general-task`. Report:
  `.scratch/agent-reports/2026-11-12-general-task-pmr-fix-check.md` in the
  pair (gitignored).

## Summary

The four ticket closes hold up: every closing note's command re-runs and
prints what the note says, and the two `wontfix` closes (641, 703) rest on
evidence. One code defect: 753's fix offers one id of two identical items,
but the tab's gear-set logic still matched sets by exact id. A set naming the
other id read "0 in pool", lost its badge on the row, and prune mode dropped
the item from the run (A1). Fixed in the fork, test first. The fix's first
check round found that it broke 12 tab-body tests (a test mock, not the app);
that was fixed too, and verify and the layout gate are green on the final
commits. Three domain findings were ticket wording, fixed in the tickets
(D1-D3). The one point for the merge ask: for Sergeant's capes and cloaks the
tab now offers one row where wowsims' own gear picker lists two (D1).

## Verify

Before the fixes, `node --version; pnpm -C /home/daniel/Code/lulz/tbc-wt/polish verify; echo "rc=$?"`
at main `d013a171`, fork `690fcdeb5`
(log `.scratch/agent-reports/2026-11-12-pmr-verify-1.log` in the pair):

```
v22.23.2
gates: 1662 ran, 0 skipped
layout: skipped -- tab layout source unchanged since the last green run (digest 0e5c5d77bb35...). Nothing to re-test.
rc=0
```

After all fixes, the same command at main `e411a4f8`, fork `bf9c26a00`
(log `.scratch/agent-reports/2026-11-12-pmr-verify-3.log`):

```
v22.23.2
gates: 1662 ran, 0 skipped
layout: skipped -- tab layout source unchanged since the last green run (digest 18f6a0c3adcc...). Nothing to re-test.
rc=0
```

## Layout gate

The fix changed the tab's layout source (`settings_pool.ts`,
`pool_source.ts`, `data.ts`, `useUpgradesSettings.ts`), so the gate ran at
fork `bee90b468`:
`node --version; PLAYWRIGHT_BROWSERS_PATH=/home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/2026-11-03-p45-runs/pwshim python scripts/check_layout_gate.py`
(the shim from ticket 860's closing note). It printed verdict `measured`,
`pass: true`, 496 `PASS` lines and 0 `FAIL` lines over 11 fixtures at widths
375, 653, 768 and 1280, and rc 0; it advanced
`data/wowsims-fork-layout.lock.json` to `18f6a0c3adcc...` (commit `c3cd26a6`).
Log: `.scratch/agent-reports/2026-11-12-pmr-layout-gate.log` in the pair.
The later fork commit `bf9c26a00` changes only a test file, which the digest
does not hash.

## Findings

**A1 (low): a gear set that names the other id of an item the pool offers
once loses that item.** 690fcdeb5 makes `selectPool` keep one id of items
db.json describes the same but the id: the worn one, else one a preset holds,
else the lowest (fork `ui/features/upgrades/model/pool_source.ts`,
`mergeTwins`). Every place the settings match a set's items still compared
exact ids (fork `ui/features/upgrades/model/settings_pool.ts` at `690fcdeb5`):
`inPool` in `setOptions`, `defaultSetKeys`, `selectedSetItemIds` (which feeds
prune), `rowTags` and `rowTagIndex` (badges), and `bisHeadingIndex`. Evidence:
a probe over the real db.json (`selectPool` over 28377 and 28380, a saved set
"Mine", prune on), run at `690fcdeb5` and deleted after:

```
[{"named":28380,"worn":[],"poolKeeps":28377,"inPool":0,"pruned":[],"badge":[]},
 {"named":28377,"worn":[28380],"poolKeeps":28380,"inPool":0,"pruned":[],"badge":[]}]
```

So with that set selected the chip's tooltip says the cloak is not in the
pool, the cloak's row has no badge for the set, and with prune on the run
leaves the cloak out. The settings view also builds its pool in a memo that
does not depend on the gear worn (`hooks/useUpgradesSettings.ts`, the `offer`
memo), so after a gear change it can hold a different twin than the run's
pool; with exact-id matching that would show as the same symptoms. Low,
because the state is rare: no wowsims preset names any of the four ids (no
file under `ui/` outside the tab names them), and in TBC Classic only 28377
and 28378 have a vendor, so the case needs a set picked by hand in wowsims'
picker or a worn twin that differs from the set's. Fix: fork `bee90b468`.
`twinIdsOf` (`pool_source.ts`) maps each id to every id of its twin group
over the page's database, and the settings hold a set's item under every id
of its group (`SetOption.sameItemIds`, `heldIds`). Matching then no longer
depends on which twin the pool kept, so the stale memo has no visible
effect. Tests: `pool_source.test.ts` "maps each id db.json describes the
same as another but the id to every id of the group, and leaves the Marks
apart" and `settings_pool.test.ts` describe "a set that names the other id
of an item the pool offers once" (3 cases). Fork `bf9c26a00` fixes the mock
the first check round tripped on (below).

**D1 (medium, domain F1): 753's close did not say the tab now differs from
wowsims' picker for the capes.** wowsims' picker lists both ids of each pair:
its list keeps an item by phase and search only
(`ui/features/gear/components/SelectorModal/ItemList.tsx:76`), and its
faction filter keeps an item with no faction (`ui/sim/player/player.ts:1299-1304`);
none of 28377-28380 has a faction in db.json. The close cited the picker to
keep the two Mark of the Champion rows but not that the capes now show one
row where the picker shows two, which is what the owner's "generaly we should
match what wowsims has and not try to reinvent new things" (2026-11-11) would
be checked against. The ticket body also still said the pairs were an
Alliance and a Horde version, "Recalled, unverified"; the 753 investigation
had found from Wowhead's TBC Classic vendor data that both factions buy 28377
and 28378, and 28379 and 28380 have no vendor. Fixed in `397ddf6d`: the 753
note says the tab differs from the picker on purpose and why, the faction
line is corrected, and judgment call 14 in `docs/upgrades-tab-scope.md` says
so. The merge ask should say it too.

**D2 (low, domain F2): 753 called the Marks "the same case" as ticket 620's
ring steps.** The ring steps differ in item level, which the tab now shows;
both Marks are item level 90, so their rows read the same in every word.
Fixed in `397ddf6d`: the note keeps the owner's 620 quote and its source, says
how the cases differ, and rests the Marks on the picker showing them the same
way.

**D3 (low, domain F3): 703 and 574 disagreed about Stop.** 703's close said a
never-answering sim's run is not ended by Stop and is ticket 574's case; 574
said "Stop still ends a run". 574's live check was a normal Stop. By the
code, Stop only sets `stopping: true` (fork
`ui/features/upgrades/model/run_state.ts:115`) and the candidate loop waits
for every sim (`model/engine/promise-pool.ts:65`), so the tab would stay on
"stopping" until a reload (not tested live). Fixed in `397ddf6d`: 703 states
this as a code reading, and 574 has a dated comment with the case and the
tab-side option the 703 report names (race each in-flight sim against Stop,
as `readStats` does), recorded only.

## Ticket closes

- **747 (closed):** true and re-runnable. `node ./test-locales.mjs` in the
  fork printed four `✅` lines and rc 0. `schemas/upgrades.schema.json` is the
  fork's own file (added in `2c88a1192`, on no upstream ref).
- **753 (closed):** true and re-runnable; wording fixed (D1, D2). Its
  `Verified by:` now also runs the A1 tests; at `bee90b468` the two commands
  printed `Tests  59 passed | 125 skipped (184)` and
  `Tests  3 passed | 36 skipped (39)`, rc 0. The builder's tests are not
  theatre: with `pool_source.ts` put back to its `dc9dbda76` text, "offers each
  Sergeant's cape and cloak once…", all 55 "%s offers no two items db.json
  describes the same but the id" cells and the three "keeps the id the player
  wears…" cases fail.
- **641 (wontfix):** true and re-runnable. Both commands print the quoted
  output, and upstream `5a7dd2496` / `19c4c4856` (PR #351) and `7b1e187dc` say
  what the note says. Settled by wowsims, which the owner's 2026-09-24 and
  2026-10-17 rulings on item facts decide (Note N4).
- **703 (wontfix):** the figures are true (8 runs, rc 0, 200-319 s wall;
  19 settled since `ea2254ed`; 0.9^19 ≈ 0.135). Wording fixed (D3), and the
  re-run line now says to give the recorder a scratch `--out` (Note N2).
- **866 (open, re-scoped mid-review on the owner's ruling, `85663526`):**
  `Serves: none (general wowsims fix, not part of the Upgrades tab; owner
2026-11-12)`, the owner's words in a comment, and the tested diff with its
  four checks, byte-identical to the 866 report's addendum
  (`cmp` printed nothing). Its scope row moved to Out-of-scope beside 629, the
  other upstream fork-test ticket. Both maintenance loops in
  `docs/upgrades-tab-scope.md` § Maintenance printed nothing (153 open ids,
  866 among them).

## Check the fixes

Step 3 ran once, by a fresh agent, on main `85663526`, fork `bee90b468`:

- `pool_source.test.ts` T1 with `pool_source.ts` at `690fcdeb5`:
  `Tests  1 failed | 183 skipped (184)` (`twinIdsOf is not a function`);
  at `bee90b468`: `1 passed`.
- `settings_pool.test.ts` T2 with `settings_pool.ts` at `690fcdeb5`:
  `Tests  3 failed | 36 skipped (39)`, all on assertions (`inPool` 0, and
  `expected [] to deeply equal [ 'preset:5:Fury/BIS' ]`); at `bee90b468`:
  `3 passed`.
- `pnpm verify`: **rc 1.** The fork tests check failed 12 of 901:
  `ui/app/tabs/UpgradesTabBody.test.tsx` mocks `data.ts`'s db readers
  (`poolFor`, `presetsWithPhase`, `bisTagPhaseFor`) and gives the page a db
  with no `getAllItems`, so the real `twinIdsFor` the fix wired into
  `useUpgradesSettings` threw `host.sim.db.getAllItems is not a function`.
  The app's `Database` has `getAllItems()` (`ui/sim/proto/database.ts:188`),
  and `buildPool` already calls it under the same guard.

The round failed on that check. The reviewer then mocked `twinIdsFor` beside
the other db readers (fork `bf9c26a00`, one line), re-pinned (`e411a4f8`),
ran the four fork test paths verify runs (`Tests  901 passed (901)`, rc 0) and
verify (above). No second fresh check round ran.

## Notes

- **N1 (domain):** 703's "the sim path has not changed" is true of the four
  folders its command names; the tab's own code and 17 files under `sim/`
  changed. The wontfix does not rest on that sentence.
- **N2 (domain):** 703's re-run pointed at the README's recorder commands,
  whose `OUT` is the tracked fixture folder; the batch wrote to a scratch
  folder instead. The note now says to (`397ddf6d`).
- **N3 (domain):** 703's "0 failed backend requests" comes from `summary.json`
  files in the dev worktree `wt-global-lane-split`, which a domain helper
  read (read-only) though the brief said not to touch that worktree.
- **N4 (domain):** 641's "the tab's phase test is the picker's" differs only
  for an item with no phase (the pool never admits one; the picker shows it
  at every phase). db.json has 0 such items of 8253. 641 quotes the 11-11
  ruling, made about an error line; the rulings that decide item facts are
  2026-09-24 ("items come from wherever wowsims gets items from") and
  2026-10-17, and they lead to the same close.
- **N5:** db.json has 21 groups of items equal but the id. Only the capes and
  cloaks reach a pool cell; the rest are rare quality and below the floor.
  Where Go names a pair (Totem of Impact 27947/27984, Libram of Zeal
  27949/27983) it registers the same effect for both
  (`sim/shaman/items.go:87-113`, `sim/paladin/item_librams.go:62-64`), and
  `tier-exchange.json` names none of the 42 ids. So no pool merge today joins
  ids the sim treats differently; the plan's guard against that ("never
  merge ids with a Go-side effect") could not be built, since the page cannot
  see Go's ids.
- **N6:** `pool_source.cells.fixture.json` changed by exactly -2 exclude and
  -2 include in each of the 55 cells, with `bisRows` unchanged; its
  `_comment` says the new numbers came from the old and new `selectPool` over
  the same db.json, not from the independent script.
- **N7:** `buildPool`'s read of the worn ids is not tested through a page
  with gear on (`dbPoolHost` wears nothing); it is three lines of wiring.
- **N8:** judgment call 13 in the scope doc still lists 747, 753 and 866 among
  that day's Tab-adjacent tickets; call 14 below it says what changed.
- **Modes:** A1 is where the pool's twin choice meets the set settings. The
  pairs are prune on or off, a selected set naming the kept twin, the other
  twin or neither, and the player wearing no twin, the kept one or the other
  one. Since `bee90b468` a set's match does not depend on which twin is kept,
  so every pair reduces to "the set holds the offered item". The A1 tests
  cover a set naming the other twin with nothing worn and with the other
  twin worn, prune on, and the count, the badge and the BiS heading.
- Nothing on the branch goes beyond what the tickets asked for, apart from
  the A1 fix this review asked for.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                       |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `settings_pool.test.ts` "a set that names the other id of an item the pool offers once", `pool_source.test.ts` "maps each id…" (fork `bee90b468`, mock `bf9c26a00`) |
| D1  | Domain      | fixed       | 753 closing note and scope judgment call 14 say the tab differs from the picker; faction line corrected (`397ddf6d`)                                                |
| D2  | Domain      | fixed       | 753 note no longer calls the Marks the same case as 620 (`397ddf6d`)                                                                                                |
| D3  | Domain      | fixed       | 703 states the Stop case as a code reading; dated comment on 574 (`397ddf6d`)                                                                                       |
