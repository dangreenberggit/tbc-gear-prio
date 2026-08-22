Status: open
Type: bug (pool coverage — worn items absent from the candidate pool)
Origin: `gate-sme` seat 1, 2026-08-21, on the Stage 2 gate shortlists; handoff at
  `.scratch/handoffs/sme-rank-judgment-stage2-close-shortlists.md` (verdict
  `do-not-trust` on shredzepelin)
Blocks: phase-2
Blocked by: none

# Worn gear missing from the pool scores rows against an empty slot

## CORRECTION, 2026-08-21 — the defect is the warning, not the scoring

**The mechanism described below is wrong, and was wrong from the first filing.**
Found by the stage-gate planner while planning the fix; confirmed independently
before acceptance. Left in place rather than deleted, because three artifacts and
an SME verdict were built on it.

**The rankings were never scored against an empty slot.** The baseline sim is
composed from the character's full logged equipment — `rank.ts:652` builds it via
`equipmentFromLoggedGear(logged)` with no pool filtering — and every candidate
delta is measured after swapping the candidate over the worn item. The worn Ahune
items are in that request and the sim pays their stats (ticket 108, externally
verified against Wowhead).

The shipped numbers confirm it:

```
python -c "import json;r=json.load(open('.scratch/rank-reports/stage2-close-shredzepelin.json'))['ranking'];items=r['items'];[print(s,[(i['name'],round(i['deltaDps'],1)) for i in sorted([x for x in items if x['slot']==s],key=lambda x:-x['deltaDps'])[:3]]) for s in ('neck','back','waist')]"
```

→ neck tops out at **+12.9** (Telonicus's Pendant over the worn Amulet of Bitter
Hatred), back at **+7.8**. Against a genuinely empty neck, a phase-2 epic would
price at roughly +80–150. These deltas are already measured against real gear.

**The actual defect is the disclosure.** Because the worn item has no `PoolEntry`,
no identity row anchors the slot, `wornUnrankable` fires (`rank.ts:1195-1204`),
and the emitted message says:

> "every row shown for neck was scored against an empty slot, not against Amulet
> of Bitter Hatred. Do not read any of them as an upgrade or a loss"

That is false, and it is what the SME read. The `do-not-trust` verdict was a
correct response to a lying warning, not to a bad ranking. **So the fix is
narrower than this ticket assumed and the output was never wrong** — but the
ticket stays open, because a false retraction that makes a good shortlist
unreadable is still a defect worth fixing, and the missing anchor rows are real.

Everything below predates this correction. The heroic/Ahune analysis in the
earlier correction still stands as far as *pool membership* goes; only the
"scored against an empty slot" consequence is retracted.

## What happens

When a character's worn item is not in the candidate pool for its slot, that slot
is scored against an **empty slot** rather than against what the character is
wearing, so every candidate in it shows an inflated gain. The report discloses
this — `ranking.plausibilityWarnings` emits a `dead-slot` / `worn-unrankable`
entry naming the slot and the worn item — but the affected rows still appear in
the shortlist with their inflated deltas.

This is what made the Stage 2 gate stay open. On the 2026-08-21 regeneration,
shredzepelin had three unrankable slots (neck, back, waist), leaving **4 of his 14
above-cutoff rows** measured against real gear. nexess, on identical code, pool
and spec, had one (wrist) and was judged `trust-with-caveats`. The difference
between a usable and an unusable shortlist was entirely pool coverage.

Reproduce:

```
python -c "import json;r=json.load(open('.scratch/rank-reports/stage2-close-shredzepelin.json'))['ranking'];[print(w['slot'],w['cause'],w.get('wornItemName')) for w in r['plausibilityWarnings']]"
```

## Two causes found — and only one of them is a defect

The SME seat identified two distinct gaps. **Both were independently re-derived
by the pre-merge domain axis on 2026-08-21 and both hold — but cause 1 is
described wrongly here, and the correction matters for whoever fixes it.**

1. **Holiday-event loot never reaches the pool — and the id ceiling is not why.**
   shredzepelin's worn neck and back are Ahune items `278827` (Amulet of Bitter
   Hatred) and `278819` (The Frost Lord's War Cloak). The original wording
   ("no item with `id > 100000` enters any pool") points at a numeric filter
   **that does not exist**, and would send a fixer to the wrong file.

   What is actually true: `data/items/index.json` **does** carry both items, and
   `test/fixtures/shredzepelin-cat.raw.json` carries both ids, so WCL reports
   them faithfully. They vanish in the **pool builder**, and the mechanism is
   missing source data — `data/atlasloot_sources.json` returns `null` for both,
   because holiday-boss loot is not in AtlasLoot's raid/heroic/rep tables.

   So this is a **source-data gap**, not an id filter.

2. **Heroic-dungeon drops are excluded wholesale.** Confirmed, and at a level
   independent of the SME's difficulty-field route. Girdle of the Deathdealer is
   `29247`, and `data/atlasloot_sources.json` gives it exactly
   `[{"dungeon": "The Black Morass", "kind": "heroic"}]` — correct TBC, it drops
   from Aeonus in Heroic Black Morass. Across the whole sources file: 903 `raid`,
   602 `heroic`, 518 `rep`, with 583 distinct items carrying a heroic source.
   Across all three rank reports the source kinds present are `raid`, `crafted`,
   `rep`, `token`, `badge`, `pvp`, `world`, `unknown` — **no `heroic` in any
   pool**. Re-runnable:

   ```
   python -c "import json,glob;   [print(f, sorted({s.get('kind') for it in json.load(open(f))['ranking'].get('items',[]) for s in (it.get('sources') or []) if s.get('kind')})) for f in sorted(glob.glob('.scratch/rank-reports/stage2-close-*.json'))]"
   ```

**So the three items split two ways, not one:** neck and back are missing source
data (holiday); waist is a filtered source kind (heroic). A fix aimed at only one
of these leaves the box open.

## Correction, 2026-08-21 — cause 2 is deliberate, and cause 1 is not an AtlasLoot gap

Checked against the pool builder and the owner's recollection of prior work.
Both halves above needed narrowing.

**Cause 2 is a recorded scope decision, not a bug.** `scripts/assemble_universe.py:68-76`
says so in its own words: only Magisters' Terrace is admitted, because *"Every
other heroic in the pinned db drops phase-1 items (measured: 284 ret-eligible
items across 15 dungeons); admitting them would rewrite the phase-1 end of every
tier, which belongs to ticket 17's pre-raid question, not here."* Girdle of the
Deathdealer (Heroic Black Morass) is therefore excluded **by design**.

That does not make shredzepelin's waist slot correct — a slot scored against an
empty slot is still wrong output — but the fix is not "admit heroics". It is
either ticket 17's pre-raid scope question, or the worn-item handling in cause 3
below. **Do not widen the heroic gate as part of this ticket.**

**Cause 1 is upstream-wide, not an AtlasLoot omission.** The Ahune items carry
`sources: null` in wowsims' own `db.json`, not merely in
`data/atlasloot_sources.json`:

```
python -c "import json;db=json.load(open('vendor/wowsims/db.json'));[print(i['id'],i['name'],'| phase',i.get('phase'),'| sources:',i.get('sources')) for i in db['items'] if i['id'] in (278827,278819)]"
```

→ both `phase 2`, both `sources: null`. And `grep -in 'holiday\|ahune\|midsummer\|world.event' scripts/assemble_universe.py` returns nothing — the builder has **no world-event concept at all**. So there is no source row to read and nowhere to read it from; these items cannot enter a source-driven pool by any amount of AtlasLoot fixing.

**Related prior work the owner remembered correctly:** ticket 108 established
that these ids are legitimate TBC items, correctly resolved, with full stats the
sim pays (~96 DPS for the pair), externally verified against Wowhead on
2026-08-11. **That fix holds and is not regressed.** It fixed *item resolution*;
this ticket is about *pool membership*, a different layer. Nothing to re-do there.

## Cause 3 — the one that actually generalises

Both cases above are instances of a single defect that does not depend on why an
item is missing: **a worn item that is not in the pool is dropped from the
baseline instead of being scored against.** Whatever the reason for its absence —
no source data, a deliberate scope gate, a future filter nobody has written yet —
the engine should compare candidates against *what the player is wearing*.

Fixing cause 3 fixes shredzepelin's neck, back **and** waist at once, and
nexess's wrist, without reopening ticket 17's scope question or inventing
holiday-loot source data. It is also the only one of the three that prevents the
*next* silently-dropped worn item, which is ticket 173's standing complaint.

Force-including worn items in their own slot is the obvious shape. Ticket 174
("force-included items claim unknown origin they have") is adjacent and should
be read first.

## Acceptance

- [x] The two causes above are confirmed or refuted against the pool-building code
      with a re-runnable command.
      → **Both confirmed** by the pre-merge domain axis, 2026-08-21, with the
      commands above. Cause 1's description was corrected: it is a source-data
      gap, not an id ceiling.
- [ ] A character's worn item is in the pool for its own slot, or the rows in that
      slot are withheld from the shortlist rather than shown with an empty-slot delta.
- [ ] Regenerating shredzepelin at p2 yields a shortlist whose above-cutoff rows are
      measured against worn gear, and an SME seat re-reads it.
