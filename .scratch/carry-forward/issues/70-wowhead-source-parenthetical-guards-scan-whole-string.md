Status: open
Type: bug
Origin: pre-merge review of feat/phase-3-vendor-and-craft-coverage (adversarial
  A1, standards axis finding 3 — found independently by both)
Blocks: none
Blocked by: none
Relates to: 59 (the same defect class; this is its un-closed remainder), 65

# `parse_wowhead_source` parenthetical guards scan the whole string

Two latent defects in `parse_wowhead_source`
(`scripts/assemble_universe.py`), both in how the quest-zone branch at
:1002 decides whether a parenthetical is a zone or a standing. **Neither
fires on any shipped row today** — see "Reachability" — so this is a
correctness ticket, not a live data bug.

## 1. A rep clause anywhere in the row drops a genuine quest zone

The guard is:

```python
if qm and not VENDOR_REP_RE.search(text) and not STANDING_PAREN_RE.search(text):
```

Both `search` calls scan the **whole** `text`, not the parenthetical
`qm` actually matched. So a row that carries both a real quest zone and
any rep mention loses the zone. Reproduced:

```bash
python -c "
import importlib.util,sys
spec = importlib.util.spec_from_file_location('au','scripts/assemble_universe.py')
m = importlib.util.module_from_spec(spec); sys.modules['au']=m; spec.loader.exec_module(m)
print(m.parse_wowhead_source('Quest: Foo (Nagrand), also sold by Vendor: Bar (Kurenai Honored)'))
print(m.parse_wowhead_source('Quest: Foo (Nagrand)'))
"
```

The first prints only the Kurenai rep source; `Nagrand` is gone. The
second correctly prints `{'kind': 'raid', 'zone': 'Nagrand'}`.

Consequence if reached: `zones_hit` misses `phase_zones`, and the item
can silently fall out of a universe — smaller pool, no error. That is
the project's stated worst case (a confidently wrong answer with no
error), which is why this is filed despite being latent.

Fix: scope the guards to `qm.group(2)` rather than `text`.

## 2. A bare standing with no faction fabricates a zone

`STANDING_PAREN_RE` requires a faction name before the standing, so a
parenthetical holding **only** a standing falls through to
`QUEST_ZONE_RE`:

```bash
python -c "
import importlib.util,sys
spec = importlib.util.spec_from_file_location('au','scripts/assemble_universe.py')
m = importlib.util.module_from_spec(spec); sys.modules['au']=m; spec.loader.exec_module(m)
print(m.parse_wowhead_source('Quest: A Reward (Honored)'))
"
```

prints `[{'kind': 'raid', 'zone': 'Honored'}]` — the invented zone
`"Honored"`. This is ticket 59's exact defect (which invented the zone
`"The Scale of the Sands Exalted"`), narrowed by the step-3 fix but not
closed: 59 handled the faction-plus-standing shape, not the bare
standing.

Fix: reject a parenthetical that is exactly a `REP_STANDING_ORDER` name.

## Reachability

Neither case is hit by committed data. Measured across all 215 distinct
`wowheadSourceText` values under `data/`: **zero at-risk rows**. Both
become reachable the moment a source text of either shape enters — the
same way 59 became reachable when step 3 admitted item 29301.

## Done when

- Both guards are scoped to the matched parenthetical.
- A test covers each shape: zone-plus-rep keeps the zone; bare standing
  yields no zone.
- Ticket 59's defect class is closed rather than narrowed again.
