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

- [ ] Token rows show zone, difficulty and boss in the same form as drop rows.
- [ ] Reputation rows show the faction and the standing.
- [ ] PvP rows say whether the item comes from arena or honor.
