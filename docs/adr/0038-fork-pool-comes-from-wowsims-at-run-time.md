# ADR-0038 — The fork's candidate pool comes from wowsims at run time

**Status:** accepted
**Date:** 2026-10-18
**Supersedes for the fork:** [ADR-0028](0028-pool-membership-precedence-local-universe-primary-wowsims-audits.md) § Decision ("Membership stays local"). ADR-0028 still holds for this repo's builder and CLI.
**Related:** [ADR-0029](0029-borrow-the-decision-derive-with-a-gate-or-justify-the-copy.md), [ADR-0036](0036-the-fork-follows-upstream-master-by-merge.md); tickets `.scratch/carry-forward/issues/505-fork-candidate-pool-should-use-wowsims-item-source.md` (closed by this ADR), `293-wowhead-source-attribution-backfill.md`, `676-badge-honor-holiday-items-need-a-source-input.md`, `17-phase2-plus-no-source-gap.md`, `173-nothing-detects-the-next-silently-dropped-item.md`; stage `.scratch/stage-gate/tab-wowsims-items/` (gitignored, owner's checkout)

## Context

Until this ADR the fork's Upgrades tab ranked candidates from 44 bundled
universe files (`ui/features/upgrades/model/data/<spec>-p<N>.universe.json`,
p2 to p5 for 11 DPS specs). Each file was a byte copy of this repo's
`data/universes/<spec>-p<N>.json`, which `scripts/assemble_universe.py`
builds from the wowsims item database plus AtlasLoot, Wowhead lists,
token maps and hand-written includes. The tab also read each row's source
text, BiS tags and token id from those files.

The owner ruled on this, in these words:

- 2026-09-24 (ticket 505): "items come from wherever wowsims gets items from
  as far as this fork is concerned."
- 2026-10-17: "Yes: tier-token and Sunmote exchange data is the one stated
  exception the fork may carry. Plan ticket 505 with everything else from
  wowsims only."
- 2026-10-17: "we should be especially careful not to put lots of effort
  into building a second source of truth, which is already generally a bad
  idea unless there is a specific reason it is very necessary and _also_
  isn't an actual second source of truth on a specific thing (for example,
  missing items that for some reason are needed is one thing--items that are
  on wowsims already with the info needed and then "atlasloot has different
  IDs" is immediately suspicious)"
- 2026-10-17: ""only ret or feral" is a smell. for development it makes
  sense, for the app it sounds absurd like a 2nd or even 3rd source of truth
  in one line you mentioned. yikes. if wowsims has no named source for it
  then fine. thats an issue for wowsims for another day, not our job"
- 2026-10-17, about the AtlasLoot, Wowhead and hand-written inputs: "they
  can be in tbc gear prio but not the upgrades tab repo"
- 2026-10-17: "Precisely. token items seem to be the kicker." and "no, this
  seems to also include sunmote items"

## Decision

The tab builds its pool at run time, per spec and phase, in
`vendor/tbc-new-fork/ui/features/upgrades/model/pool_source.ts`
(`buildPool`, `selectPool`). The fork bundles no universe file.

### The pool rule

For spec S at phase p, an item is a candidate when all of these hold:

1. It is in `sim.db`, `canEquipItem(item, S, undefined)` accepts it
   (`ui/sim/proto/items.ts`, the rule wowsims' gear picker uses), and its
   `item.type` maps to one of the 14 pool slots (type 13 is `weapon`).
2. It is not one of the 7 Kael'thas temporary legendaries
   (`model/engine/kael-temp.ts`) and not in wowsims' `MISSING_ITEM_EFFECTS`
   (`ui/sim/constants/missing_effects_auto_gen.ts`, 450 ids).
3. It meets the floor or is in a preset set:
   - **Floor:** `item.phase <= p`, quality epic or better, and base item
     level (`scalingOptions[0].ilvl`) 100 or more, or an "effect record
     present" (see below).
   - **Preset clause:** the item is in one of S's wowsims preset gear sets
     whose phase (see "Preset phase") is `<= p`. This brings back 383 rows
     the floor removes, such as 8345 Wolfshead Helm and 28288 Abacus of
     Violent Odds.
4. The heroic five-man switch passes it (see "Heroic five-man drops").

**The floor is an engineering decision, not an owner ruling.** The tab sims
every candidate in a loop. wowsims' gear picker as is gives 177,761 rows
over the 44 spec-phase cells, about 5.4 times the old 32,796. The rule
above gives 36,945 rows with the heroic box unticked and 38,897 with it
ticked, 1.08 to 1.32 times the old cells.

**"Effect record present"** (`hasEffectRecord`): db.json gives the item an
`itemEffects` record and `MISSING_ITEM_EFFECTS` does not name it. It is not
"simulated": the page cannot see Go's id-keyed effect registrations. Ten
old epics have a record but no registration, so they join without a
simulated effect: 16448, 16463, 16555, 16571, 17142, 18646, 22003, 23073,
23838 and 23839 (196 rows). Their records have the same fields as Mark of
the Champion (23206, 23207), which is simulated, so no db.json field tells
them apart. They stay; a hard-coded id list would be a second source of
truth.

The exemption keeps 16 of the 17 low-level epics that the old lists ranked
for their effects (both Mark of the Champion, Earthstrike, the ZG charms
and others). The one it loses is **19019 Thunderfury, Blessed Blade of the
Windseeker** (ilvl 80; db.json gives it no `itemEffects`), 20 rows. Under
the owner's 2026-10-17 ruling that is a wowsims data gap, not ours to fill.

No pre-TBC zone exclusion, no ret two-hand-only rule, no feral no-polearm
rule, and no class-restricted-sets file. No owner words set any of them;
they were agent or SME-gate decisions for the builder.

### Heroic five-man drops

`HEROIC_FIVE_MAN` in `pool_source.ts` takes `exclude`, `include` or
`include-unticked`; all three are built and tested. Its value is
`include-unticked`. An item whose every source is a heroic drop outside
Magisters' Terrace (zone 4131) is in the pool, under the Sources dialog's
"Heroic dungeon" entry, which starts unticked. So a default run ranks what
`exclude` would rank, and one tick adds 76 items (1,948 rows).

The owner's words on heroic dungeons, both from 2026-08-03 and about the
builder:

- "magisters terrace only but we should be aware that phase 1 may include a
  broader array of dungeons when we get to it (lowest priority)"
- "obviously if a heroic dungeon drops "bis" or extremely good gear and it
  becomes available in say phase 5 that needs to be included. the wowhead
  "gap" is the hint"

Asked on 2026-10-18 to choose for the fork, the owner answered "1", the
option worded: "Add it, but leave it switched off. The heroic gear shows up
as a "Heroic dungeon" checkbox in the tab's Sources list. The box starts
unticked. By default the tab ranks exactly what it ranks today, and a player
can tick the box to include heroic gear."

**Magisters' Terrace drops of either difficulty key under the "Magisters'
Terrace" zone row,** which starts ticked. So the 19 Magisters' Terrace
heroic epics the old lists ranked (Shard of Contempt, Timbal's Focusing
Crystal, Commendation of Kael'thas, 34601 to 34616; 135 rows) stay in every
default run. Their Source cell reads "Magisters' Terrace (H)", with "H" from
upstream's `difficultyNames` (`ui/sim/proto/names.ts`), as upstream's own
source block prints it.

One item leaves ret's default run: **27484 Libram of Avengement.** Its only
db.json source is a heroic Blood Furnace drop, so it sits behind the
unticked box.

### Preset phase and BiS tags

`presetPhase(preset) = preset.phase ?? max(item.phase)` over the preset's
items. Five specs declare `phase`; for the six that do not, the newest item
decides. The BiS sets at phase p are the presets whose phase is the newest
preset phase `<= p`, minus presets whose name matches
`/pre[- ]?raid|prebis|realistic|\balt\b|bulwark/i`. This is a **name rule**:
wowsims' `PresetGear` has no BiS field. `bulwark` is in it because the tab
already treats ret's "Bulwark" set as a same-phase alternative it never
selects by default (`model/settings_pool.ts` `defaultSetKeys`). Items of a
BiS set get `bisTags: ["BiS"]` and `bisSets`; items of any preset get
`curatedSets`. The new pool tags 842 rows (the old lists tagged 788).

Two visible effects:

- Feral p4 and p5 BiS badges follow the fork's own p4 and p5 sets. The old
  feral lists used the p3 sets because the p4 and p5 files were never
  vendored.
- Shadow's "P2 Preset" counts as phase 3, because it holds 281735 Dark Iron
  Smoking Pipe, which db.json marks phase 3. So shadow p2 tags the P1
  Preset, and p3 to p5 tag both the P2 and P3 Presets. Session ruling: follow
  wowsims' item phase, edit no preset file, read no phase from a name.

### Sources

`ui/features/upgrades/utils/item_sources.ts` (`sourcesOf`) builds each row's
sources from wowsims' facts: `item.sources` named through
`sim.db.getZone`/`getNpc` and upstream's `professionNames`,
`REP_FACTION_NAMES` and `REP_LEVEL_NAMES`, and `isPVPItem` for arena gear
("PvP vendor · Arena", no season: wowsims' season table is not TBC's). An
item wowsims gives no source shows "Source not recorded".

The `badge` and `world` source kinds stay in the ported `ItemSource` type
(`model/engine/pool.ts`), because `pnpm engine-port-drift:check` compares
that union member for member with `packages/core`. Nothing in the fork
builds them.

### The one exception: `tier-exchange.json`

wowsims states no tier-token or Sunmote exchange. The fork carries one
copied file, `model/data/tier-exchange.json`, written by
`scripts/generate_fork_exchange.py` from `data/two-hop/<spec>-tokens.json`
and `data/two-hop/sunmote-pairs.json`: 198 tier piece to token rows (54
tokens) and 23 Sunmote pairs. It gives tier pieces their token source and
the export's token id, and Sunmote upgrades their source. It holds no spec
and no date.

### Effect data: wowsims' own lists, not a copy

Stub-only effects come from `MISSING_ITEM_EFFECTS` and effect records from
db.json `itemEffects`; the fork carries no copy of this repo's
`data/sim-implemented-effects.json`. The lists differ from this repo's Go
scan by three stub-only ids: 12344 Seal of Ascension and 28370 Bangle of
Endless Blessings (rare, so the floor removes them either way) and 33808
The Horseman's Helm (epic, ilvl 110, phase 1), which joins the pool.

## Consequences

- **The gate on the fork's data folder.** `scripts/sync_fork_universes.py
--check` (`pnpm fork-universes:check`) byte-compares the 20 copies
  `docs/fork-provenance/data.md` lists (19 EP-weight files and
  `tier-exchange.json`), and fails on any other JSON file in the folder.
- **A fork-only upstream update changes the pool directly.** The pool reads
  the fork's own `assets/database/db.json`, so a fork merge that moves
  db.json moves the pool with no sync step.
- **Phase 1 now has a pool.** The old lists started at p2; the rule applies
  to every phase. The "No candidate list" message shows only for an empty
  pool.
- **Saved preset picks.** For presets that declare no phase, the selection
  key changed from `preset::<name>` to `preset:<phase>:<name>`, so a saved
  pick of such a preset is dropped once.
- **Size against the old lists** (44 cells, box unticked): 114 rows of 20
  items leave (94 rare rows, among them ret's 4 rows of 28034 Hourglass of
  the Unraveller, and Thunderfury's 20). The Hourglass is a rare Temporus
  drop in The Black Morass, normal and heroic (db.json). The rare-quality
  floor removes it from ret's lists, whose presets lack it; feral keeps it
  because feral's presets hold it. 4,263 rows of 290 items join, among them
  2,842 crafted epic rows, 588 pre-TBC raid rows, and ret shields,
  one-handers and off-hands.
- **This repo is unchanged.** Its builder, universes, CLI, AtlasLoot and
  Wowhead inputs stay (owner, 2026-10-17: "they can be in tbc gear prio but
  not the upgrades tab repo").

Re-runnable checks:

```bash
pnpm fork-universes:check                     # 20 bundled copies byte-match
python scripts/generate_fork_exchange.py --check
pnpm fork-tests:check                         # the fork's ui/features/upgrades tests, pool_source.test.ts among them; part of pnpm verify
cd vendor/tbc-new-fork && npx vitest run ui/features/upgrades/model/pool_source.test.ts
```

`pool_source.test.ts` builds all 44 cells from the fork's db.json and checks
each size against `model/pool_source.cells.fixture.json` (36,945 rows
unticked, 38,897 ticked, 842 BiS rows). The comparison with the old lists
comes from the stage script named in that fixture's `_comment`, which lives
in a gitignored folder.
