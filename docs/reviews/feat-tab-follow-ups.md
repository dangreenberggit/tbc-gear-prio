# Pre-merge review — feat/tab-follow-ups

Reviewed range: `e25123a4c36fd60b87f618328e04aac61fa6af08..946a98752757f6fedcd252d765d3df9c16536ecc`

Fork range: `093cd5981..3bdacb8c6` (`vendor/tbc-new-fork`, branch `feat/tab-follow-ups`).

Dispatch (round 1): full axes. `git diff --shortstat dev...HEAD` reported
112 files changed, 2976 insertions, 704 deletions, and the branch changes
paths under `data/`, so the small-change lane does not apply. `codex` is not
on `PATH`; each axis ran as a fresh `general-task` subagent on Opus (review
lane), in one parallel batch. The domain axis ran because the diff changes
item source labels (boss, zone, PvP season, badge and vendor sources).

## Adversarial

Result: no upstream-edit violation, no narrow heuristic patch, nothing ret/feral-only without saying so; 535-O1 keeps the same assertions. Six findings, none blocking. Tree: only untracked `docs/reviews/feat-tab-follow-ups.md`; fork clean.

**A1 — silent wrong result (latent).** `scripts/check_wowhead_list_gaps.py:50-53,60-70` takes the stage file list from the builder's own `WOWHEAD_STAGE_FOR_MAX_PHASE` and skips any missing file. If the builder stops reading a list file, the check stops too; the docstring's "cannot pass by construction" is false. Already happens with `data/wowhead-lists/ret/pre-raid.json` (72 ids), read by neither builder nor check: 37 of its 48 pre-raid-only ids are absent from ret-p2 and 6 ship `unknown`, none counted (python one-off over the list and `ret-p2.json`). Fix: build the stage list from the folder's files, and fail on any file no phase reads unless an explicit exemption names it.

**A2 — incomplete fix.** `cross_spec_list_sources` (`assemble_universe.py:1897-1902`) uses the same stage map, so it also skips pre-raid.json. These still ship `unknown` in ret-p5, warrior-p5, enh-p5, though the parser reads their pre-raid text: 29382 `badge` cost 25 (also `unknown` in rogue-p5); 28645 and 28646 honour; 31318 and 31322 `world`. Checked with `parse_wowhead_source` and the universe files. Fix: have the index read every list file, since these kinds describe the item, not the phase. Whether skipping pre-raid is deliberate is hypothesis, untested; nothing documents it.

**A3 — loud failure with advice that loses data.** `check_universe_rebuild.py:43-48` exits 2 only when db.json is missing. The builder skips a missing gear-set file silently (`assemble_universe.py:1083-1084`). Simulated in memory: ret profile without `ret_p2.gear.json` → 16 entries in ret-p3 changed; the check would print `MISMATCH ... run pnpm universe:assemble` with rc 1, contradicting its docstring ("2 an input is missing"); following that advice drops curated-set labels. Fix: exit 2 when any `vendor/wowsims` key in `data/wowsims.lock.json` `files` is missing.

**A4 — code quality (latent).** `check_boss_aliases.py:150-166,216-226` drops `origin`. A five-man boss that came from a Wowhead row would be confirmed by that same row. Today `unkept_wowhead_place` (`assemble_universe.py:2324-2329`) prevents it; the check depends on that filter silently. All 7 wowhead-origin bosses are 30017 in Tempest Keep (universe scan). Fix: do not accept a Wowhead witness for a hit whose origin is wowhead.

**A5 — bookkeeping.** `pnpm tab-fixtures:check` warns for 4 fixtures recorded at 8cd8d1c80a09. Opened 3 (feral-p3-nordrassil4, -p2bis, -th-hands-legs): they still show honour rows with no season (33879-33881, 33893, 32814) and 32087 as `unknown`. Same problem as ticket 682. No open ticket for re-recording them.

**A6 — low.** `SourceCell.tsx:10-21` sets `npcId: 0`, so the Libram row loses its "(N)" difficulty and npc link; `ResultRow.test.tsx` asserts that loss (maybe deliberate: upstream `ItemSource` cannot be edited). Comments at `assemble_universe.py:1457-1459` and in `item_source.ts` quote `AL(?:IL)?\["(.*?)"\]`; the lazy pattern alone would stop at the first `"]`; the overrun comes from the trailing `\)?,` in `atlasloot.go:84`.

Owner constraints: upstream edits clean (only `ui/app/SimTabsSection.tsx` +6); overrun recovery reverses the generator regex (db.json has exactly 5 `"]` names, one real quoted name 6907); honour season read from Wowhead text that states it (upstream's season helper knows Cata names only, `ui/sim/proto/items.ts:83-96`); cross-spec index has 4 p5 conflicts decided by fixed rules, the two pvp ones on arena ids that `ARENA_GEAR_IDS` overrides; cross-spec fill applies to all 11 specs; list-gaps check covers ret and feral, the only specs with lists.

Re-run: universe-rebuild:check 89/0 rc 0; wowhead-list-gaps:check 923 rows, 36 gaps, 0 new, 0 stale, rc 0; boss-aliases:check rc 0; wowhead-parse:check rc 0; fork-universes:check rc 0; vitest -t 535-O1 passes, longest job 0.8 s.

Unexamined: full `pnpm verify`; fixture contents beyond the spot check; `docs/fork-provenance/data.md`; ticket-vs-spec fit; Linux CI bytes.

## Domain

Domain: three findings, none in the tab's visible labels. Two badge costs are wrong in data that the CLI rank report prints (D1, D2). One latent conflict rule picks the older PvP row (D3). The recovered boss, the honour seasons, the other badge costs and the Empty Mug stats are right.

Tree: `docs/reviews/feat-tab-follow-ups.md` is untracked in the pair (`git status --porcelain`). I left it alone.

**D1 — Brooch of Deftness (33296) costs 35 badges, the universes say 25.** Effect: visibly wrong result in the CLI rank report (`packages/core/src/rank-report.ts:58-59` prints `${cost} badges`); the tab's Source cell does not print the cost. The cause is the Wowhead guide text `ret/p4.json:598` ("25 Badges of Justice"). This branch copies it to 10 more specs (for example `warrior-p5.json:11848`). Sources: https://warcraft.wiki.gg/wiki/Badge_of_Justice_rewards (35) and https://warcrafttavern.com/tbc/guides/badge-of-justice-guide-farming-vendors-rewards (35). The existing `correctedSourceText` field (as on 33910) is a route.

**D2 — rows with cost 0 contradict the priced rows.** Effect: visibly wrong result in the CLI ("0 badges"). Feral keeps cost 0 from its own list for 29381 Choker of Vile Intent (`feral-p5.json:8823`) and 29383 Bloodlust Brooch (`:11387`). The other nine non-ret specs get 25 and 41, so the same item has two sources. The "priced beats cost 0" rule (`assemble_universe.py:1929`) runs only where a row would be `unknown` (`:2208`). New on this branch: 29390 Everbloom Idol, cost 0, in balance (`balance-p5.json:9950`). Its real cost is 15 (same two sources as D1).

**D3 — the pvp rule ignores the list's stage (latent).** Effect: other; no output today (ticket 676 § Conflicts). `assemble_universe.py:1931` keeps the row that names a season, else the first row in folder/stage order, which is the earliest stage. The stage is the direct signal. For 31984 it keeps arena, but `ret/p3.json:858` (and p4) say "Honor Points - Arena Vendor". For 28476 the honour season 1 row wins only because it names a season. This is a proxy rule; the owner rejects narrow heuristics.

**Checked, correct:**

- 22401 → Isalien, Dire Maul. Wowhead xml `sourcemore n:"Isalien", ti:16097, z:2557, bd:1` (https://www.wowhead.com/tbc/item=22401&xml).
- The other four overrun npcs (Valthalak, Theldren, Mor Grayhoof, Kormok) recover real Tier 0.5 names (db.json `npcs`).
- 33910 and 33880 (and 33879/33881/33893) are honour season 3: `source [3]`, `sourcemore p:2`, transmog set "Vengeful Gladiator's" (https://www.wowhead.com/tbc/item=33910&xml).
- 32814 is honour season 2 (ilvl 126). It is also sold for 25 badges (warcraft.wiki.gg), so the label names one of two routes.
- Costs 25/41/50/150 (29381, 29383, 32087, 34891) match both sources.
- 31334 is a BoE world drop (`source [2]`).
- 281739 Mug: ilvl 141, 98 AP, use 376 AP (https://nether.wowhead.com/tbc/tooltip/item/281739).
- The copied dicts hold only kind/cost/via/season (`assemble_universe.py:1749-1765`), so nothing spec-specific is copied. The fixture source changes (28034 Temporus, 28288 Pathaleon) are right.

**Other (minor):** the tab's overrun row reads "Dire MaulIsalien" with a zone link. Real npc drops read "Dire Maul (N)…" with an npc link (`ResultRow.test.tsx:171,176`).

**Unexamined:** gap-file boss notes beyond a read; Brooch of Deftness phase timing; the existing `raid` kind on the five-man rows.

## Standards + Spec

### Result

- Standards: 8 findings. Three hard: commit-message format (S1, S2) and one commit that changed the builder without regenerating its output (S3). Five judgement calls. All owner constraints hold. `pnpm verify` passed (rc=0, "gates: 1542 ran, 0 skipped").
- Spec: 3 findings. One real spec gap (P1). Tickets 677 and 679 to 683 are met. Ticket 676 correctly described as still open.
- Tree: only `?? docs/reviews/feat-tab-follow-ups.md`; fork clean.

### Standards

- **S1 (hard; bookkeeping).** Three commit bodies are single lines not wrapped at 72: f4951822 (247 chars), 99abc083 (143), 66d6b19a (156). Source: awk over `git log --format=%B`.
- **S2 (hard; bookkeeping).** Three subjects over 50 chars: 6a86ef98 (52), 99abc083 (51), fork 3bdacb8c6 (51).
- **S3 (hard; bad bisect point).** Commit 5cbb2d59 changed the honour-season parse in `scripts/assemble_universe.py:1759-1764` and regenerated no universe file; 5674783e regenerated them (84 files). Breaks the generated-artifacts rule in AGENTS.md § Durable claims. Source: `git show --stat 5cbb2d59`. Whether 5cbb2d59's builder output differs from its committed universes is hypothesis, untested; `docs/fork-provenance/data.md` says the season change affects 19 honour rows.
- **S4 (judgement; loud failure; duplicated code).** `scripts/check_wowhead_parse.py:23` imports `assemble_universe` with no db.json guard (`assemble_universe.py:345` parses db.json at import), so with db.json missing it crashes with a traceback and rc 1, not rc 2. 99abc083 copied the guard into `check_universe_rebuild.py:43-48` and `check_wowhead_list_gaps.py:42-47`. Fix: one shared helper called from all three.
- **S5 (judgement; duplicated code).** `cross_spec_list_sources` (`assemble_universe.py` ~1897) and `wowhead_drop_witnesses` (`check_boss_aliases.py`) repeat the same folder loop and `parse_wowhead_source(source_text_for_parsing(row))`. Fix: one iterator over list rows.
- **S6 (judgement; misleading comment and name).** The comment at `assemble_universe.py:1458` and the `overrunNpcKey` docstring quote only part of the upstream regex; the full pattern at `vendor/tbc-new-fork/tools/database/atlasloot.go:84` ends with `\)?,...`, which causes the overrun. `GARBLED_NPC_NAME_RE` now marks an overrun, and line 1495 splits on a separate `'"]'` literal. Fix: rename and use one constant in both places.
- **S7 (judgement; bookkeeping).** `_comment` in `data/wowhead-list-gaps.json` and the new PLAN.md Stage 4 paragraph cite gitignored `.scratch/` files as evidence.
- **S8 (judgement; divergent change).** 5674783e mixes cross-spec list sources (676) and boss-key recovery (680).

Checked clean: wowsims files (only `6 0 ui/app/SimTabsSection.tsx`); ADR-0029 (no item db added); Python `newline=` rule; fork re-pin (7de8a2c2 lock + sim-implemented-effects together); universe JSON regenerated (`universe-rebuild:check` 89 files, 0 mismatches); narrow heuristics not flagged (`"]` marker comes from the generator's own regex).

### Spec

- **P1 (spec gap).** Ticket 173 is closed, but its detector covers only items a Wowhead list names, and only ret and feral have lists: 8 of 44 universes. Spec lines: 173:49 "A regression that increases the silently-dropped set trips a test", 678:19-22 "for every spec and phase". Evidence: `scripts/check_wowhead_list_gaps.py:4,83-85`; `assemble_universe.py:432,482`. An item no list names that lands in `excludedNoSource` is caught only by the `universe-rebuild:check` byte-compare, which passes again once the regenerated file is committed; 173:79-84 already called that weakness not enough. No ticket tracks the items no list names; 678's resolution does not point to 293.
- **P2 (minor UI inconsistency).** For 22401 the 680 fix sets `npcId: 0` at fork `SourceCell.tsx:10-20`, so the row loses the difficulty marker and npc link: test expects `'Dire MaulIsalien'` linking to the zone, while a sibling drop reads `'Dire Maul (N)Eric "The Swift"'` linking to the npc. Ticket 680 asked only for "a readable source" (680:42).
- **P3 (minor test gap).** The cross-spec conflict rules in `cross_spec_list_sources` have no unit test; only the universe byte-compare pins them. 676 owns that work and is open.

Per-ticket: 173 partial (P1); 676 correctly described; 677 met; 678 partial (P1); 679 met; 680 met (P2 minor); 681 met; 682 met; 683 met.

Not re-run (hypothesis, untested): five full verifies for 683; planted-mismatch runs for 678/679; fixture-page and upstream-picker renders for 680-682; Linux CI byte equality for 679.

## Round 2

Reviewed range: `946a98752757f6fedcd252d765d3df9c16536ecc..199b32892481144ad4a785e167e540b5dda9649f`

Fork range: `3bdacb8c6..160ae36c2` (`vendor/tbc-new-fork`, branch `feat/tab-follow-ups`).

## Scope rulings applied to the findings

Two owner rulings of 2026-10-17, relayed by the coordinating session,
set the dispositions below.

- Badge cost, about D1 and D2: "I'm not sure why we care about badge
  cost--not remotely what we're building here and I'm not sure what task
  involved this bizarre detour". The coordinator's instruction from the
  same relay: fix only what affects what the tab shows, the item pool, or
  the correctness of the gates, and reject the rest as out of scope with a
  one-line reason.
- A second source of truth, about ticket 676's candidate C: "we should be
  especially careful not to put lots of effort into building a second
  source of truth, which is already generally a bad idea unless there is a
  specific reason it is very necessary and _also_ isn't an actual second
  source of truth on a specific thing (for example, missing items that for
  some reason are needed is one thing--items that are on wowsims already
  with the info needed and then "atlasloot has different IDs" is
  immediately suspicious)". Recorded in ticket 676 § Owner ruling
  2026-10-17. No fix on this branch adds item facts from a source other
  than wowsims or the Wowhead list layer the project already reads: A2
  reads a list file that is already vendored (`ret/pre-raid.json`), for
  items `vendor/wowsims/db.json` gives no source.

D1 and D2 were first fixed in the working tree (a `correctedSourceText`
for 33296 and 29390, and a badge-cost rule change) and reverted before any
commit, when the badge-cost ruling arrived; no commit holds them.

## Fixes

Main repo (`feat/tab-follow-ups`):

- `c90d416c` Read the pre-raid list's item sources (A2). The cross-spec
  index also reads `data/wowhead-lists/ret/pre-raid.json`. Five items that
  showed "Source not recorded" now name a source, in 104 universe rows over
  p2-p5: 29382 (badge, all 11 specs), 28645 and 28646 (honour, ret and
  warrior), 31318 and 31322 (world drop). No universe gained or lost an
  item (scratch `a2diff.py`: membership changed in no universe). The pick
  rules are unchanged; `cross_spec_list_sources(n)[1]` gives the same 2, 4,
  4, 4 conflicts at p2-p5 with the same kept rows as before.
- `1c077172` Close gaps in three checks (A1, A3, A4, S4).
  - A1: `wowhead-list-gaps:check` places each list file by its own name
    (`p3`, `p1-p2`: read at that phase and later), not by the builder's
    stage map, and fails `UNPLACED LIST` on a file whose name states no
    phase unless `unreadLists` in `data/wowhead-list-gaps.json` names it.
    `ret/pre-raid.json` is named there, with ticket 676 (whether p5 should
    read it for membership is that ticket's open owner question; no
    universe has ever read it for membership: `36da6411` created
    `WOWHEAD_STAGE_FOR_MAX_PHASE` without it, and the map at HEAD has the
    same four rows). `STALE UNREAD` fails on an exemption
    that a phase reads or whose file is gone. Planted runs: an extra
    `ret/extra.json` gave `UNPLACED LIST`, rc 1; moving the exemption to
    `ret/p3.json` and to a missing path gave `STALE UNREAD` twice plus
    `UNPLACED LIST` for pre-raid, rc 1.
  - A3: `universe-rebuild:check` exits 2 when any file the wowsims lock
    pins is missing. Planted run: with `vendor/wowsims/ret_p2.gear.json`
    moved away it printed `missing vendor/wowsims/ret_p2.gear.json`, rc 2.
  - A4: `boss-aliases:check` keeps each universe row's `origin` and does
    not let a Wowhead list witness a row whose origin is `wowhead`. Planted
    run: marking Isalien's 22401 rows `wowhead` gave the five-man failure,
    rc 1.
  - S4: `scripts/_vendored_inputs.py` holds the one guard; the three
    checks that import the builder call it. Planted run: with `db.json`
    moved away all three printed `missing vendor/wowsims/db.json`, rc 2.
- `1bc2a617` Reopen ticket 173 for specs without lists (P1). Also adds the
  pointer in ticket 678, the A2 update in ticket 676 § Why own-spec list
  rows stay `unknown`, and the owner ruling above in ticket 676.
- `03257900` Pin fork 160ae36c2 (P2, A2): lock, `sim-implemented-effects`
  regenerated, `docs/fork-provenance/data.md` refresh record.
- `199b3289` Re-record six tab fixtures on fork 160ae36c2 (A5). Only `source`/`sources` and recording metadata changed; item order and DPS figures are the same in all six (fixture agent, `.scratch/agent-reports/2026-10-17-general-task-tab-fixtures-rerecord-a5.md`, gitignored). The four older feral fixtures now show the honour seasons and 32087's badge source (the ticket 682 defect).

Fork (`vendor/tbc-new-fork`, branch `feat/tab-follow-ups`):

- `18a42296e` Link an overrun drop to its npc, as upstream does (P2, A6).
  The fork-added `SourceCell.tsx` draws the drop link itself for an
  overrun npc: zone and difficulty over the recovered boss, linking the
  npc. Upstream's `ItemSource` is unchanged. `ResultRow.test.tsx` now
  expects `Dire Maul (N)Isalien` linking to npc 16097.
- `160ae36c2` Refresh 44 bundled universes (review A2).

## Focused check (round 2)

Main range `946a9875..199b3289`; fork range `3bdacb8c6..160ae36c2`. One
fresh `general-task` agent on Opus (review lane) ran the check and wrote
only its report (`.scratch/agent-reports/2026-10-17-general-task-tab-follow-ups-round2-check.md`,
gitignored). Result: all four checks pass, no findings.

1. **Conditions 1-3: pass.** Every commit is a fix that names its finding
   IDs (`c90d416c` A2; `1c077172` A1, A3, A4, S4; `1bc2a617` P1, tickets
   only; `199b3289` A5; fork `18a42296e` P2; fork `160ae36c2` A2) or a fork
   re-pin (`03257900`: the lock, the sha in
   `data/sim-implemented-effects.json`, and `docs/fork-provenance/data.md`).
   Every other changed line is at a place a fixed finding cites.
   `git -C vendor/tbc-new-fork diff --numstat --diff-filter=M e804c29e8 HEAD`
   prints `6	0	ui/app/SimTabsSection.tsx`, as at `3bdacb8c6`.
2. **Each change does only what its finding asks: pass.** A2 changes only
   the `sources` of 28645, 28646, 29382, 31318 and 31322 (104 rows), with no
   membership change and the same conflict picks. No commit touches D1, D2,
   D3, S5, S6 or the A6 comments.
3. **Each test asserts its finding: pass.** With `SourceCell.tsx` put back
   to `3bdacb8c6`, `ResultRow.test.tsx` fails
   (`expected 'Dire MaulIsalien' to be 'Dire Maul (N)Isalien'`). The planted
   runs for A1, A3, A4 and S4 (in-memory patches) fail with the fix and
   show the finding's gap with the old code: A1 extra file passes, rc 0; A3
   prints five `MISMATCH` lines, rc 1; A4 passes, rc 0; S4
   `check_wowhead_parse.py` traceback, rc 1.
4. **The touched tests pass: pass.** `check_wowhead_list_gaps.py`,
   `check_universe_rebuild.py`, `check_boss_aliases.py`,
   `check_wowhead_parse.py`, `tab-fixtures:check`, `fork-universes:check`
   all rc 0; fork vitest on `ResultRow.test.tsx` and `item_source.test.tsx`
   rc 0, 31 tests.

Two observations, not findings: the gap check would place a `p6.json` that
no phase 2-5 reads (TBC has no phase 6); `docs/fork-upstream-touchpoints.md:48`
names the older base `5262ff38`, outside this range.

## Summary

Round 1 raised 20 findings (A1-A6, D1-D3, S1-S8, P1-P3). Round 2 passed.
Fixed on the branch: A1, A2, A3, A4, A5, A6 (the row half, with P2), P2,
S4. Ticket 173 is reopened for P1's remainder. Rejected as out of scope by
the owner's rulings above: D1, D2, D3, S5, S6, S7, P3. Accepted without a
history rewrite: S1, S2, S3, S8. No finding blocks the merge.

What the player sees: five items (Blood Knight War Cloak, two General's
honour pieces, Singing Crystal Axe, The Hammer of Destiny) show a source
instead of "Source not recorded" in 104 list rows; Libram of Hope's Source
cell reads "Dire Maul (N)" over "Isalien" and links to the boss, like the
other boss drops; the six recorded tab results show the current source
text. No ranking or DPS figure changed.

Tickets: this branch files 1 (684) and closes 7 (677, 678, 679, 680, 681,
682, 683), from
`git diff --name-status dev...HEAD -- '.scratch/carry-forward/issues/*.md'`
and the skill's `Status:` grep. Ticket 173, closed earlier on the branch,
is open again with a narrowed scope. Open tickets this review links: 173,
676, 684.

## Disposition (round 2)

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                             |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `1c077172`: the gap check places list files by name and fails `UNPLACED LIST` unless `unreadLists` names the file; `ret/pre-raid.json` is named with ticket 676                                                                           |
| A2  | Adversarial | fixed       | `c90d416c`, fork `160ae36c2`: the cross-spec index reads `ret/pre-raid.json`; 5 items, 104 rows named; no membership change (pre-raid membership stays ticket 676's owner question)                                                       |
| A3  | Adversarial | fixed       | `1c077172`: `universe-rebuild:check` exits 2 when any locked vendored file is missing                                                                                                                                                     |
| A4  | Adversarial | fixed       | `1c077172`: `boss-aliases:check` does not accept a Wowhead witness for a row whose origin is `wowhead`                                                                                                                                    |
| A5  | Adversarial | fixed       | `199b3289`: all six fixtures re-recorded on fork `160ae36c2`; ticket 684's hang did not occur                                                                                                                                             |
| A6  | Adversarial | fixed       | fork `18a42296e` with P2 (the row keeps "(N)" and the npc link); the comment half is S6's row                                                                                                                                             |
| D1  | Domain      | wontfix     | rejected, out of scope (owner, 2026-10-17): "I'm not sure why we care about badge cost--not remotely what we're building here and I'm not sure what task involved this bizarre detour". An uncommitted fix was reverted before any commit |
| D2  | Domain      | wontfix     | rejected, out of scope (owner, 2026-10-17), same words as D1. The cost rule is unchanged; it never changes which source kind a row shows. An uncommitted fix was reverted before any commit                                               |
| D3  | Domain      | wontfix     | no row shows it today: both pvp conflicts (28476, 31984) fill no universe, and 31984 is replaced by `ARENA_GEAR_IDS` (ticket 676 § Conflicts between lists)                                                                               |
| S1  | Standards   | wontfix     | history on an unpushed branch; no rewrite (no interactive rebase here, and a rewrite would invalidate the stage records); new commits follow the rules                                                                                    |
| S2  | Standards   | wontfix     | history on an unpushed branch; no rewrite, as S1                                                                                                                                                                                          |
| S3  | Standards   | wontfix     | history: a bisect point at `5cbb2d59`; no rewrite, as S1; `universe-rebuild:check` now catches the same gap at every later commit                                                                                                         |
| S4  | Standards   | fixed       | `1c077172`: `scripts/_vendored_inputs.py`, called by the three checks; each exits 2 when `db.json` is missing                                                                                                                             |
| S5  | Standards   | wontfix     | out of scope (owner direction, 2026-10-17): duplicated loop with no effect on the tab, the pool or a gate                                                                                                                                 |
| S6  | Standards   | wontfix     | out of scope (owner direction, 2026-10-17): comment and constant name only; no effect on the tab, the pool or a gate                                                                                                                      |
| S7  | Standards   | wontfix     | out of scope (owner direction, 2026-10-17); both texts already say the cited file is local (`data/wowhead-list-gaps.json` "gitignored", PLAN.md "local, untracked files")                                                                 |
| S8  | Standards   | wontfix     | history: a mixed commit (`5674783e`); no rewrite, as S1                                                                                                                                                                                   |
| P1  | Spec        | defer       | `.scratch/carry-forward/issues/173-nothing-detects-the-next-silently-dropped-item.md` — reopened, narrowed to the nine specs without lists and items no list names; gap predates this branch                                              |
| P2  | Spec        | fixed       | fork `18a42296e`: `SourceCell.tsx` draws the overrun drop as upstream's npc link; upstream `ItemSource` unchanged                                                                                                                         |
| P3  | Spec        | wontfix     | out of scope (owner direction, 2026-10-17): a unit test of the badge/pvp pick rules, which choose between rows of the same kind                                                                                                           |
