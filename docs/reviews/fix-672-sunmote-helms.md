# Pre-merge review — fix/672-sunmote-helms

Diffed against: main `59e48629...` (dev = origin/dev at the start) and fork
`bf9c26a00...b7231a0c4` (one commit). The review started on main `44d797b8`
and fork `b7231a0c4`; main `08863d87` and `f72d9d0c` are this review's fixes
(text only). The fork did not change during the review, so there was no
re-pin. Upstream footprint:
`git -C vendor/tbc-new-fork diff --numstat --diff-filter=M 24606be6bae2601e5ca3985431c8c1da2ab422c0 HEAD`
prints only `6	0	ui/app/SimTabsSection.tsx`, the one owner-approved edit.
The fork commit's two files, `ui/features/upgrades/model/data/tier-exchange.json`
and `ui/features/upgrades/utils/item_sources.test.ts`, are not in the upstream
base (`git cat-file -e 24606be6...:<path>` fails for both). No ported engine
file changed.

What the owner asked for: "Launch a session to handle 672, 811, 623, 635. It
should oversee them and make sure they get done but not get in the weeds
itself (that's for its subagents)" (2026-11-12, quoted in
`.scratch/plans/tickets-672-811-623-635-2026-11-12.md` in the main checkout).
The branch answers ticket 672.

Reviewers, each with no part in writing the branch:

- Adversarial, domain, standards and spec: one Opus `general-task`, which ran
  this skill. One reviewer ran all three axes because the hand-written change
  is two deleted `if` clauses, their comments and four docs; the rest is
  generated data. The game-data checks went to three Sonnet web helpers, the
  first told to parse Wowhead's data per item, not with the regex the triage
  and the executor shared.
- Fix check (step 3): one fresh Opus `general-task`. Report:
  `.scratch/agent-reports/2026-11-12-general-task-672-pmr-fix-check.md` in
  the pair (gitignored).

## Summary

The code change is right. Yrma (Wowhead `tbc/npc=25977`) sells exactly the 28
pairs in `data/two-hop/sunmote-pairs.json`, the five 164 to 159 helm trades
among them, so dropping ticket 612's item-level rule is right, and
`tier-exchange.json` now holds all 28 and nothing else. No list gained or lost
an item: 25 p5 entries changed their source only. The exchange file stays the
one exception ADR-0038 allows. Every regenerated file matches its generator.

Three findings, all in the text that describes the change, all fixed. The
docs said the tab shows "Sunmote + <helm>" for the five helms; the tab shows
"Sunwell Plateau (N) · Kil'jaeden" (D1). The ticket's Band of Eternity answer
left out a Wowhead label that points the other way and leaned on user comments
without saying so (D2). Its Ogri'la answer rested on a search snippet where a
Wowhead page says the same thing (D3). None of the three changes what the tab
does.

## Verify

Before the fixes, at main `44d797b8`, fork `b7231a0c4`:
`node --version; GOFLAGS=-buildvcs=false pnpm -C /home/daniel/Code/lulz/tbc-wt/t672 verify; echo "rc=$?"`
(log `.scratch/agent-reports/2026-11-12-672-pmr-verify-1.log` in the pair):

```
v22.23.2
universe-rebuild: 89 files checked, 0 mismatches, 4.2 s
fork exchange check ok: data/two-hop/tier-exchange.json is current
sim-implemented-effects check ok: 226 implemented, 450 stub-only, matches committed file
fork data copies check ok: 22 bundled copies byte-match their data/ sources; no unlisted JSON
pool-completeness: ok: 44 lists, 0 findings, 0 drifted listings, 1.0 s
gates: 1662 ran, 0 skipped
layout: skipped -- tab layout source unchanged since the last green run (digest b1b9d63882b7...). Nothing to re-test.
rc=0
```

After fix `08863d87`, the same command, run by the fix checker (log
`.scratch/agent-reports/2026-11-12-672-pmr-verify-2.log`):

```
v22.23.2
gates: 1662 ran, 0 skipped
layout: skipped -- tab layout source unchanged since the last green run (digest b1b9d63882b7...). Nothing to re-test.
rc=0
```

`f72d9d0c` and this file change only a ticket and a review file. The pre-push
hook runs `pnpm verify` again on the final tip; its result is in the push
record of the review's report.

## Layout gate

`tier-exchange.json` is in the layout digest, so the gate had to run. The
executor ran it at fork `b7231a0c4`:
`PLAYWRIGHT_BROWSERS_PATH=<main>/.scratch/agent-reports/2026-11-03-p45-runs/pwshim python scripts/check_layout_gate.py`.
Its log (`.scratch/agent-reports/2026-11-12-672-layout-gate.log` in the main
checkout) has `LAYOUT_GATE_VERDICT {"outcome":"measured","pass":true,...,"failed":0,"a11yFailed":0}`
over 11 fixtures at widths 375, 653, 768 and 1280, 497 `PASS` lines and 0
`FAIL` lines. It advanced `data/wowsims-fork-layout.lock.json` to
`b1b9d63882b7...` (`44d797b8`), the digest both verify runs above report as
unchanged.

## Findings

**D1 (low, domain and spec): three docs said the tab shows "Sunmote + <helm>"
for the five helms.** `docs/fork-provenance/data.md` ("the tab shows
"Sunmote + <helm>" at Kil'jaeden for 34400-34404"), `docs/upgrades-tab-scope.md`
judgment call 15 ("they now show "Sunmote + <helm>" at Kil'jaeden") and the
672 closing note ("the tab shows that source at Kil'jaeden"). The tab never
draws a token's name. The helms have no db.json source, so `itemSourceShows`
is false (fork `ui/features/upgrades/utils/item_source.ts:15`) and the Source
cell draws `rowSourceDetail` (`components/ResultsTable/SourceCell.tsx:73-78`),
which for a token is zone, Normal mark and boss (`utils/format.ts:99-102`;
test `format.test.ts:116`, "names a tier token’s zone, difficulty and boss, as a
drop row does, and not the token"). Evidence: a probe test over the real
db.json and the branch's exchange file (written to `$TMPDIR`, deleted after;
fork status clean) printed, for each of 34400-34404,
`upstreamBlock=false | "Sunwell Plateau (N) · Kil'jaeden"`, and
`"Source not recorded"` for an unknown source. The fix checker's own probe
built the cells from the exchange file at `b7231a0c4^` and got "Source not
recorded" for all five. Fixed in `08863d87`: each of the three now says the
cell reads "Sunwell Plateau (N) · Kil'jaeden" where it read "Source not
recorded".

**D2 (low, domain): the ticket's Band of Eternity answer (Q4) stated "right"
on partial evidence.** It cited the ring's quest and the Hyjal attunement's
objectives. Wowhead's own pages for both rings (`tbc/item=29298`, `29302`) say
"Added in content phase 3", and that the attunement opens the rings is said
only in user comments, which the triage had marked unverified and the close
dropped. Evidence: helper fetches of those pages on 2026-11-12 (saved under
`/tmp/claude-1000/wh672p/` and `wh672q.4oli/`); the fix checker found the
strings in the saved pages. For the other side, both ring quests (10462
Champion's Pledge, 10463 Sage's Pledge) say "Added in patch 2.5.2 "Overlords
of Outland"", the phase-2 patch, and 10445 needs two phase-2 boss drops and
gives 3,000 Scale of the Sands reputation. Fixed in `08863d87`, with the
comment dates corrected in `f72d9d0c` after the fix check found them wrong
(the comments are from 2007 and on three quest pages). The answer is still no
change: the tab takes phase 2 from db.json, as 641's close did, and the p2
placement only shows in the CLI's lists.

**D3 (low, domain): the Ogri'la answer (Q3) cited only a search snippet.** The
close said Warcraft Wiki's page was "seen through a search result, page not
opened"; the ticket's "Done when" asks for a cited source. Wowhead's pages for
the four epic rewards the p2 lists hold (`tbc/item=` 32645, 32647, 32648,
32651; each "Requires Ogri'la - Exalted") say "Added in content phase 2".
wiki.gg answers a fetch with 403. Fixed in `08863d87`: Q3 cites the Wowhead
pages first.

## Checked with no finding

- **The five trades.** A helper parsed the `sells` listview on
  `https://www.wowhead.com/tbc/npc=25977` as JSON, one object per item: 28
  items, each costing one base item plus one Sunmote (34664) and no money.
  The set equals `data/two-hop/sunmote-pairs.json` (28 each side, none on one
  side only) and, by `python3 -I` over the branch's file, the 28 Sunmote rows
  of `data/two-hop/tier-exchange.json`. The item pages agree: 34400-34404 are
  head items at item level 159, each "sold by Yrma" for 34345, 34243, 34332,
  34245 and 34244 plus a Sunmote; those bases are item level 164 and their
  only `dropped-by` npc is Kil'jaeden (25315). Armour types match pair by pair
  (plate, plate, mail, leather, leather; Wowhead and db.json agree).
- **No item wrongly admitted.** In the CLI, a field-by-field compare of every
  changed `data/universes/*-p5.json` (`git show 59e48629:<f>` against HEAD)
  found the same entry ids in all 8 files and no top-level change. 25 entries
  changed, each only in `sources`, each from `unknown` to one `token` source
  with origin `sunmote`, the right base helm, Sunwell Plateau and Kil'jaeden.
  No p2-p4 universe file changed. The 44 report files move only in counts
  that follow from that: `sourceRecordAdds.sunmote` 23 to 28 everywhere,
  `excludedNoSource` down by the helms each spec can wear in p2-p4, and the
  p5 origin counts. In the tab, the pool rule has no source term
  (`model/pool_source.ts:148`), so the exchange file changes only the helms'
  source, not which items are offered.
- **ADR-0038's exception.** The owner's ruling (2026-10-17) is "tier-token and
  Sunmote exchange data is the one stated exception the fork may carry". The
  fork commit adds five Sunmote rows to that file and one unit test beside the
  code; no token row, no item list and no other input. The rows are Yrma's
  real trades, not a second item database.
- **Every regenerated file came from its generator.** In verify above:
  `fork-exchange:check` (exchange file), `universe-rebuild:check` (89
  universe and report files rebuilt in memory, byte-equal),
  `pool-listings:check` (0 drifted listings), `fork-universes:check` (fork
  copies byte-equal), `sim-implemented-effects:check`. The lock's `commit` is
  the fork tip and its `_comment` gains one dated sentence, as
  `docs/agents/paired-worktrees.md` § Re-pin after a fork change asks. The
  layout lock came from the green gate run above.
- **What the tab shows for the helms, state by state** (code reading, with the
  probe for the cell text):
  - Results, Source cell: "Sunwell Plateau (N) · Kil'jaeden", plain muted
    text with no npc link; before, "Source not recorded".
  - Sources dialog: the helms count under "Sunwell Plateau", no longer under
    "Source not recorded" (`model/settings_pool.ts` `sourceOptions`). Both
    keys start ticked; only "Heroic dungeon" starts unticked
    (`DEFAULT_OFF_SOURCE_KEYS`). Unticking Sunwell Plateau now leaves the
    helms out of the run, which is right, since the trade needs a Kil'jaeden
    helm.
  - Results "Filter by source" and the boss filter: the rows file under
    Sunwell Plateau (`model/engine/view.ts` `matchesRaidFilter`) and match
    Kil'jaeden (`model/engine/pool.ts` `sourceMatchesBoss`); hiding Sunwell
    hides them, as they have no other source.
  - Assumptions: "source attribution: partial, N items with no recorded
    source" (`model/assumptions.ts:37-38`) counts up to five fewer items.
  - Export with "Use tier token ids": a Sunmote source has no token id, so
    the row exports the helm's own id (`model/export.ts:20-27`), as before.
  - Phases 1-4: the helms are db.json phase 5 and not in the pool, as before.
- **Ticket and scope doc.** The closing note's `Verified by:` names commands.
  Both maintenance loops in `docs/upgrades-tab-scope.md` § Maintenance printed
  nothing (153 open ids), and 672 has no row.
- **Standards.** The new docstring and gate text say why item level is no
  longer a test. `item_ilvl` and `ilvl` still have other callers
  (`scripts/assemble_universe.py:1415`, `scripts/check_pool_completeness.py:338`).

## Check the fixes

Step 3 ran once, by a fresh agent, on main `08863d87`, fork `b7231a0c4`. No
test was added (the fixes are text), so it checked each added sentence against
its evidence and ran verify (above, rc 0). It found every sentence true except
one: the user comments that link the attunement to the rings are from 2007 and
on quests 10445, 10462 and 10463, not "on quest 10462 (2008-04-30 and later)".
The reviewer confirmed that from the saved pages and fixed it in `f72d9d0c`,
with the quoted test name's curly apostrophe. It could not check the Warcraft
Wiki line (the saved page is wiki.gg's block page); the ticket says it was seen
through a search result. No second round ran.

## Notes

- **N1:** The cell names the raid and boss of the item a player trades in, not
  Yrma or the Sunmote. That is the token-row design from ticket 619 (the
  owner: "tier token should show boss"), and all 28 Sunmote upgrades show it
  the same way; this branch only adds five helms to it.
- **N2:** No committed test pins the cell text of a Sunmote helm. The token-row
  format is pinned (`format.test.ts:116`, `item_sources.test.ts` "the Source
  cell text from wowsims facts" for 30993), and 34401's source is pinned by
  the branch's new test. Adding one would need a fork commit and re-pin for a
  text-only finding, so it was not added.
- **N3:** The builder (`sunmote_upgrade_pairs`) and the gate (`_sunmote_upgrades`)
  still keep slightly different rules: the gate also needs the base to drop in
  a raid. All 28 bases are Sunwell Plateau drops (the fix checker counted 28),
  so the two agree today. This predates the branch.
- **N4:** The token class groups were not re-checked by this review; the
  triage and the executor each checked all six against Wowhead.
- **N5:** Merge order: `data/wowsims-fork.lock.json` conflicts with the 811
  and 623 branches, and judgment call 15 in `docs/upgrades-tab-scope.md` may
  take the same number as 623's; the second branch to land renumbers (plan
  decision log).
- **N6:** `pnpm merge-ready` (rc 0, both copies) lists six open tickets that
  name a file this branch changed: 173, 300, 524, 621, 673 and 725. Each
  names `scripts/assemble_universe.py`, `scripts/check_pool_completeness.py`
  or a `data/` file for another reason; none is about Sunmote pairs or the
  helms' source, so none is touched here.
- **Modes:** the change touches no state machine. The states the helms show
  in are listed above.
- Nothing on the branch goes beyond what ticket 672 asked for.

## Disposition

| ID  | Axis   | Disposition | Ticket / note                                                                                              |
| --- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------- |
| D1  | Domain | fixed       | data.md, scope call 15 and the 672 note say the cell reads "Sunwell Plateau (N) · Kil'jaeden" (`08863d87`) |
| D2  | Domain | fixed       | 672 Q4 gives the phase-3 label and says the attunement link rests on comments (`08863d87`, `f72d9d0c`)     |
| D3  | Domain | fixed       | 672 Q3 cites Wowhead's "Added in content phase 2" for the Ogri'la epics (`08863d87`)                       |
