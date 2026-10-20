Status: open
Type: task
Origin: docs/reviews/chore-ticket-housekeeping.md (A3)
Blocks: none
Blocked by: none

# The tab's BiS tags and default sets can come from an older phase, and the page does not say so

When a spec's wowsims presets stop below the ranked phase, the tab takes its
BiS tags and its default-selected sets from the newest older phase that has a
preset. Nothing on the page says so, and the "BiS only" tooltip names the
ranked phase, which is wrong for these runs.

Code (tbc-new-fork@bc3cca6a1, paths under `ui/features/upgrades/`):
`presetPhase` and `bisSetsFor` in `model/pool_source.ts:93-117` pick the
sets; `bisTagPhaseFor` in `model/data/data.ts:127-140` returns
`{ tagsFromPhase, requestedPhase }`; `defaultSetKeys` in
`model/settings_pool.ts:160-170` selects the sets at `tagsFromPhase`.

## Affected spec and phase pairs

Ten pairs, across five of the eleven DPS specs:

| Spec | Ranked phase | Tags and default sets from |
|---|---|---|
| ret | P4, P5 | P3 ("P3", "Bulwark") |
| mage (arcane) | P4, P5 | P3 ("Arcane - Staff", "Arcane - Sword") |
| rogue | P4, P5 | P3 ("P3 Swords") |
| shadow | P4, P5 | P3 ("P2 Preset", "P3 Preset") |
| shadow | P2 | P1 ("Pre Raid Preset", "P1 Preset") |
| hunter | P5 | P4 (eight sets; see also ticket 690, duplicate hunter preset keys) |

Balance, elemental, enhancement, feral, warlock and warrior have a set at
each of P1-P5. Re-run from a checkout that has the fork (the main checkout or
a pair); it prints exactly the ten rows above. It applies the same rule as
`presetPhase` + `bisSetsFor` to the committed presets fixture, with item
phases from `db.json`:

```
F=<checkout>/vendor/tbc-new-fork python3 -I -c '
import json,os;F=os.environ["F"]
ph={i["id"]:i.get("phase") for i in json.load(open(F+"/assets/database/db.json"))["items"]}
S=json.load(open(F+"/ui/features/upgrades/model/pool_source.presets.fixture.json"))["specs"]
for s,ps in S.items():
  P=[(p.get("phase") or max([ph[i] for i in p["itemIds"] if ph.get(i)] or [0]),p["name"]) for p in ps]
  for m in range(2,6):
    t=max([q for q,_ in P if 0<q<=m],default=None)
    if t!=m: print(s,"P%d"%m,"<- P%s"%t,[n for q,n in P if q==t])'
```

The fixture matches the live presets for this purpose:
`git -C <fork> diff --stat e804c29e bc3cca6a1 -- assets/database/db.json ui/specs`
is empty.

### Shadow's P2 quirk (wowsims data, not ours to change)

Shadow's presets declare no phase, so each set's phase is the highest
`db.json` phase among its items. wowsims' "P2 Preset"
(`ui/specs/priest/dps/gear_sets/p2.gear.json`) holds item 281735 "Dark Iron
Smoking Pipe", which `db.json` puts in phase 3. So "P2 Preset" counts as a
phase-3 set: shadow at P2 falls back to the P1 sets, and at P3-P5 the chip
reads "P3 - P2 Preset". Check:
`grep -n 281735 <fork>/ui/specs/priest/dps/gear_sets/p2.gear.json` and look
up id 281735 in `<fork>/assets/database/db.json` (`"phase": 3`).

This is an item fact in wowsims' data. Item facts that wowsims lacks or gets
wrong are wowsims' issue, so this ticket does not change the data or the
derived-phase rule for it. The on-screen notice below covers it: at shadow
P2 the tab will name P1 as the source phase.

## What the player sees

Read from code, not yet seen live:

- **Default sets.** The older phase's sets are selected on first render
  (`model/settings_pool.ts:160-170`, `hooks/useUpgradesSettings.ts:71,77`).
- **Set chips.** The selected chips carry the older phase in their label,
  for example "P3", "P3 - Bulwark", "P3 - Arcane - Staff", "P3 Swords",
  "P4 - 2H - 6% hit" (`presetLabel`, `model/settings_pool.ts:124-127`). The
  chip tooltip is only "{n}/{m} in pool"
  (`components/SetChips/SetChips.tsx:41`).
- **Row badges.** A row held by a selected set shows that set's name
  ("P3", "Bulwark", "Arcane - Staff", "P3 Swords", "P2 Preset")
  (`components/ResultsTable/ItemNameCell.tsx:22-29`). The literal "BiS"
  badge shows only on a BiS-tagged row that no selected set holds, for
  example after the player unticks the default chips.
- **"BiS only" tooltip.** It reads "Show only items on the phase's curated
  BiS list. {{phase}} list" (`assets/locales/en/upgrades.json:63`), with
  `phase` set to the ranked phase (`components/ViewToggles/ViewToggles.tsx:62`,
  `components/UpgradesResults/UpgradesResults.tsx:57,62`). At ret P5 it says
  "Phase 5 (2.4 - SWP) list" while the list is from phase 3. This is a wrong
  statement on screen.
- **Console.** The only explicit notice is `BiS tags: from P3 sets,
  ranking P5`, part of the assumptions line that `model/run_session.ts:59`
  writes with `console.info` (`model/assumptions.ts:36-37`).

## wowsims has no newer presets

No wowsims ref has P4 or P5 presets for ret, mage, rogue or shadow, or P5
presets for hunter: not our pin `e804c29e`, not upstream `master`
(`3d604216`, 2026-10-18), and not any of the 63 upstream branches fetched on
2026-10-19. So moving the pin cannot fix this. Commands, after
`git -C <fork> fetch upstream`:

- `git -C <fork> ls-tree -r --name-only <ref> -- ui/specs/{paladin/retribution,mage/dps,rogue/dps,priest/dps,hunter/dps}/gear_sets`
  for `e804c29e`, `upstream/master` and the fork tip: the highest file is p3
  for ret, mage, rogue and shadow, and phase_4 for hunter.
- `git -C <fork> diff --stat e804c29e upstream/master -- ui/specs/<spec>/`
  is empty for all five specs.
- For each `refs/remotes/upstream/*`: no gear_sets file named for p4, p5,
  ZA or Sunwell in the five specs (hunter's phase_4 aside), and no `Phase5`
  in any of the five `presets.ts`.

Not checked: wowsims forks other than upstream, and upstream pull requests
that are not branches on `wowsims/tbc-new`.

## Chosen fix: (a) say the source phase on screen

The orchestrator chose option (a):

1. The "BiS only" tooltip names the phase the tags actually come from
   (`tagsFromPhase`), not the ranked phase.
2. Where the tags appear, the tab shows that older phase when it differs
   from the ranked phase: either on the "BiS" badge (for example
   "BiS (P3)") or in one line near the view toggles. The plan decides
   which, and should favour one consistent place over both.

Run behaviour does not change. Every file this touches is tab-added, not an
existing wowsims file (`git -C <fork> cat-file -e e804c29e:<path>` fails for
`assets/locales/en/upgrades.json`, `schemas/upgrades.schema.json`,
`ui/features/upgrades/components/ViewToggles/ViewToggles.tsx`), so the
no-wowsims-edits rule does not block it. Whether recorded tab fixtures or
visual captures go stale: hypothesis, untested.

Options not taken:

- **(b) Take newer presets from upstream.** No wowsims ref has them (section
  above). Revisit only if upstream adds presets.
- **(c) No BiS tags when no set exists for the ranked phase.** Drops the
  newest wowsims set, the best reference wowsims gives, and changes default
  run behaviour for ten pairs.
- **(d) Leave as is.** The tooltip keeps stating the wrong phase.
- **(e) Write our own P4/P5 sets.** The project keeps no gear of its own and
  no second source of item facts that wowsims holds.

## Acceptance

- The "BiS only" tooltip names the phase the tags come from.
- For each of the ten pairs above, the older phase is visible on screen in
  the place the plan chose.
- Verified on one live run, ret or mage at P5, with the fork SHA recorded.

## History

Ticket 153 held the CLI half of this (its `bisStale` box) and was marked
wontfix in `chore/ticket-housekeeping`; this ticket holds the tab half. The
investigation behind this text ran on 2026-10-19 against
tbc-new-fork@bc3cca6a1 (report in the main checkout's gitignored
`.scratch/agent-reports/2026-10-19-general-task-ticket-699-bis-fallback.md`).
