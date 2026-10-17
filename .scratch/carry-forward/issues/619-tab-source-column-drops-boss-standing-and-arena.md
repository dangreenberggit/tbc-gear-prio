Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent)
Type: bug
Origin: SME reads of ticket 254 output (live tab capture .scratch/rank-reports/sme-254-tab-boundary.png on fork 316326a95; report .scratch/rank-reports/sme-254-slamaltman.html from .scratch/rank-reports/stage2-close-slamaltman.json), triaged 2026-10-11
Blocks: none
Blocked by: none
Related: 609, 613

# The tab's Source column drops boss, standing and arena for items upstream has no source for

Fork code, with no edits to upstream files. Paths are in fork 316326a95.

## What the player sees

- Lightbringer Greaves (30993) shows "Black Temple" with no boss and no
  "(N)", while the drop rows around it show both (capture
  `.scratch/rank-reports/sme-254-tab-boundary.png`).
- Each Band of Eternity step shows only "Reputation vendor". The ret-p3-p2
  fixture (`data/tab-fixtures/ret-p3-p2.json`) has 12 rows named "Band of
  Eternity", all below the cutoff.
- Vengeful Gladiator's Greatsword (33688) shows only "PvP vendor".

## Cause

Upstream `assets/database/db.json` has no `sources` entry for 30993, 29300
or 33688 (checked with a Python scan of `items[]`). ADR-0028 §1
(`docs/adr/0028-pool-membership-precedence-local-universe-primary-wowsims-audits.md:51`)
records this for badge, PvP and tier-token items; the reputation rings have
none either.

So `itemSourceShows` returns false and `SourceCell`
(`ui/features/upgrades/components/ResultsTable/SourceCell.tsx:26`) falls back
to `rowSourceLabel` → `sourceLabel` (`ui/features/upgrades/utils/format.ts:68-71`),
which prints only the zone, or else the kind's label. For the Greatsword,
upstream's PvP branch knows only the season names Wrathful to Cataclysmic
(`ui/sim/proto/items.ts:83-89`), so "Vengeful" gets no season and also falls
back. The same holds for "Merciless" rows (2 in `ret-p3-p2.json`) and plain
"Gladiator's" rows (Gladiator's Maul in the feral fixtures).

The row itself holds more than is printed (fixture `ret-p3-p2.json`):

- 30993: `kind: token`, `zone`, `boss: "The Illidari Council"`, `token`.
- 29300: `kind: rep`, `faction: "The Scale of the Sands"`, `standing: "Revered"`.
- 33688: `kind: pvp`, `via: "arena"`.

Check `via` before the tab prints it: it is parsed from Wowhead prose
(`scripts/assemble_universe.py:2072`), and it disagrees within one family.
Vindicator's Scaled Bracers (33910) has `via: arena` in `ret-p3-p2.json`,
while its siblings 33879, 33880, 33881 and 33893 have `honor` in
`feral-p3-p2bis.json`. Which value is right in game: hypothesis, untested.

The token source type has no difficulty field
(`ui/features/upgrades/model/engine/pool.ts:58`), so the "(N)" for a token
row has to come from somewhere other than the row.

## Acceptance

On `data/tab-fixtures/ret-p3-p2.json`:

- [x] Token rows show zone, difficulty and boss in the same form as drop rows.
  Token rows print "zone (N) · boss". The "(N)" is derived: every db.json
  drop in a phase-raids zone is Normal (plan tab-source-labels C30), and
  the text is upstream's `difficultyNames`. The plain text is one line with
  ' · ' where upstream's linked block uses two lines.
  Lightbringer Greaves reads "Black Temple (N) · The Illidari Council".
- [x] Reputation rows show the faction and the standing. All 12 Band of
  Eternity rows read "The Scale of the Sands · <standing>".
- [x] PvP rows say whether the item comes from arena or honor. Vengeful
  Gladiator's Greatsword reads "PvP vendor · Arena, season 3".

Verified by: `tbc-new-fork@e26c05bb2` on fixture `ret-p3-p2`, with
`npx vitest run ui/features/upgrades/components/ResultsTable/ResultRow.test.tsx ui/features/upgrades/utils/format.test.ts`
in the fork. Captures from the stage's step-6 check (ignored path, in the
pair `tbc-wt/tab-source-labels`):
`.scratch/tab-fixtures-smoke/ret-p3-p2-after-row-30993.png`,
`ret-p3-p2-after-row-29298.png` … `-row-29308.png` (Band of Eternity),
`ret-p3-p2-after-row-33688.png`, `ret-p3-p2-after-row-33910.png`,
`ret-p3-p2-after-sorted-source-asc-Ring1-below-cutoff.png`.

## Remaining: via data

33910 Vindicator's Scaled Bracers still reads "PvP vendor · Arena"
(`via: arena`, from its Wowhead prose "Arena Points - Arena Points"),
while its siblings 33879, 33880, 33881 and 33893 read "PvP vendor ·
Honor" in `feral-p3-p2bis`. Handled in step 12 of stage
tab-source-labels.

## Owner, 2026-10-16

Verbatim: "Make a note that tier token should show boss. I thought this was
already solved."

### Was it solved before?

No. The Upgrades tab has never shown the boss on a tier-token row. The
boss is in the data, and the command-line HTML report prints it; the tab
does not. So this is not a regression. Sources, checked 2026-10-16:

- **The data has the boss.** Token rows carry `boss` since the 18-piece
  token map (main `82bd24be`, 2026-07-28). The boss was guarded by ticket
  37 (`48c6e7ff`, 2026-08-05) and tickets 48-51 (`c3f5b97a`, 2026-08-07),
  and the tables are generated from AtlasLoot since ticket 609
  (`7e682fc1`, 2026-10-12). Lightbringer Greaves in
  `data/tab-fixtures/ret-p3-p2.json` has `boss: "The Illidari Council"`.
- **The command-line report shows it.** `formatItemSource`
  (`packages/core/src/rank-report.ts:54-57`) prints
  `zone · boss (token)` for a token row. That code came in with the HTML
  report (main `05ab947c`, 2026-07-28).
- **The old tab did not show it.** In the pre-React tab (fork `cb561067`,
  `ui/core/components/individual_sim_ui/upgrades_tab.tsx:3752-3781`) the
  cell used the site's `getSourceInfo` and fell back to `sourceLabel`,
  which prints only the zone. That code's comment names tier-token
  sources as a fallback case. Read it with
  `git -C vendor/tbc-new-fork show cb561067:ui/core/components/individual_sim_ui/upgrades_tab.tsx`.
- **The React tab does not show it.** Ticket 569 (fork `ce8ee77de`,
  2026-10-07, "Link the Source cell's zone and boss again") brought back
  the linked zone and boss for raid drops through upstream's `ItemSource`.
  Upstream has no `sources` entry for token pieces, so a token row still
  falls back to `rowSourceLabel`, which prints only the zone (see Cause
  above).
- **No fork commit added it.** `git -C vendor/tbc-new-fork log --oneline
  feat/upgrades-tab-react cb561067 -G'(source|s)\.boss' -- ui/features/upgrades
  ui/core/components/individual_sim_ui` lists only engine moves
  (`1b218b73b`, `7b539641d`, `1165b1fbf`) and an upstream commit
  (`f03b0d408`). None prints a token row's boss.

Why the owner remembers it as solved: hypothesis, untested. Ticket 569
restored the boss for drop rows, and the command-line report has always
shown it for token rows.
