# Upstream data redundancy: what to drop, what to keep, what to push upstream

**Status:** proposal. No code or data changed by this document.
**Upstream pin:** `wowsims/tbc-new` @ `8aa378b3671a0923fd11fb34b4b3753e53f20c9b`
(tag `v0.0.101`, per `data/wowsims.lock.json`).

Every claim below either names a command a reader can re-run, or is labelled
**hypothesis** / **untested** in the same sentence (AGENTS.md § Durable claims).

## 0. How to reproduce anything here

`vendor/wowsims/` is gitignored. Restore it first:

```
pnpm run sync:wowsims:restore
```

Verify the pin before trusting any number below — every count in this document
was measured against the `db.json` whose sha256 is recorded in
`data/wowsims.lock.json`:

```
python -c "import hashlib,json,pathlib; \
lock=json.load(open('data/wowsims.lock.json')); \
print(hashlib.sha256(pathlib.Path('vendor/wowsims/db.json').read_bytes()).hexdigest() \
== lock['files']['db.json']['sha256'])"
```

Fetch an upstream file at the pin:

```
gh api "repos/wowsims/tbc-new/contents/<path>?ref=8aa378b3671a0923fd11fb34b4b3753e53f20c9b" \
  --jq '.content' | base64 -d
```

---

## 1. Redundancy inventory

| Our artifact                                                                                                            | Upstream equivalent                                                                        | Verified agreement                                                                                | Verdict                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Item phase derived via `zones_for_max_phase` + `data/phase_raids.json` (`scripts/assemble_universe.py:323`)             | `db.json` `items[].phase` — present on **8257 / 8257** items                               | **652 agree / 0 disagree** across all raid-sourced items (§2.1)                                   | **Adopt upstream** for phase. Derivation is redundant _for phase_.                                                    |
| `data/phase_raids.json` zone→phase rows                                                                                 | partially covered by `db.json` `zones` + `npcs` + `items[].sources`                        | zone→phase itself has no upstream equivalent; `sources` is **absent on 5237 / 8257 items** (§2.3) | **Keep ours**, narrowed to raid-scoped **membership** only. Phase column becomes derived/asserted, not authoritative. |
| `data/phase_raids.json` `{"phase":1,"name":"World Bosses","zoneId":null}`                                               | **nothing** — Doomwalker / Doom Lord Kazzak have no zone, npc, or item source in `db.json` | 13 world-boss items carry a correct upstream `phase` but `sources: null` (§2.3)                   | **Keep ours.** Also the strongest **upstream** gap (§5.1).                                                            |
| `data/presets/ret/p2.raid-sim-skeleton.json` `encounter.targets[0]` (built by `scripts/compose_slamaltman_raid_sim.py`) | `db.json` `encounters[]` → `Default/Raid Target`                                           | identical on every scalar field; stats arrays differ at exactly **one index** (§4.1)              | **Keep both, re-rooted.** Derive the target from the upstream preset; keep the skeleton as the golden fixture.        |
| No per-boss encounter profiles                                                                                          | `db.json` ships **7** presets, incl. 3 real TBC bosses                                     | n/a — we consume none of them today                                                               | **Adopt upstream** as the backing data for the PLAN.md §14 boss filter (§4.2).                                        |
| `scripts/parse_atlasloot.py`                                                                                            | `tools/database/atlasloot.go`                                                              | upstream reads **MoP URLs only** (§3.1)                                                           | **Keep ours.** Not redundant. Do not remove.                                                                          |
| `packages/core/src/meta.ts`                                                                                             | `ui/core/proto_utils/gems.ts` `isMet()`                                                    | structural difference, **zero** behavioural difference at this pin (§3.2)                         | **Keep ours.** Add a regression test, not a rewrite.                                                                  |

---

## 2. Item phase is already upstream

### 2.1 The load-bearing check

All 8257 items in `db.json` carry a `phase` field. Where an item has a raid drop
source that our zone map knows, upstream's `phase` and our derived phase agree
everywhere:

```
python -c "
import json
db = json.load(open('vendor/wowsims/db.json'))
zone_name = {z['id']: z['name'] for z in db['zones']}
npc_zone  = {n['id']: n.get('zoneId') for n in db['npcs']}
zone_phase = {r['name']: r['phase'] for r in json.load(open('data/phase_raids.json'))['zones']}

agree = disagree = 0
for item in db['items']:
    zones = set()
    for src in item.get('sources') or []:
        drop = src.get('drop') or {}
        zid = drop.get('zoneId') or npc_zone.get(drop.get('npcId'))
        if zid in zone_name:
            zones.add(zone_name[zid])
    phases = [zone_phase[z] for z in zones if z in zone_phase]
    if not phases:
        continue                      # no raid source we can map — see 2.3
    derived = min(phases)             # carryover: earliest raid that drops it
    agree    += item['phase'] == derived
    disagree += item['phase'] != derived
print('agree', agree, 'disagree', disagree)"
```

Observed at the pin: `agree 652 disagree 0`.

### 2.2 What that check does _not_ cover

`continue` skips every item with no mappable raid source. Scoped to the
universes we actually ship:

| Universe                     | Entries |        Covered by the check | Skipped (unverified) |
| ---------------------------- | ------: | --------------------------: | -------------------: |
| `data/universes/ret-p2.json` |     230 | 194 (agree 194, disagree 0) |      36 — **15.7 %** |
| `data/universes/ret-p3.json` |     354 | 304 (agree 304, disagree 0) |      50 — **14.1 %** |

Reproduce:

```
python -c "
import json
db = json.load(open('vendor/wowsims/db.json'))
zone_name = {z['id']: z['name'] for z in db['zones']}
npc_zone  = {n['id']: n.get('zoneId') for n in db['npcs']}
zone_phase = {r['name']: r['phase'] for r in json.load(open('data/phase_raids.json'))['zones']}
by_id = {int(i['id']): i for i in db['items']}

def derived_phase(iid):
    item = by_id.get(iid)
    zones = set()
    for src in (item.get('sources') or []) if item else []:
        drop = src.get('drop') or {}
        zid = drop.get('zoneId') or npc_zone.get(drop.get('npcId'))
        if zid in zone_name:
            zones.add(zone_name[zid])
    phases = [zone_phase[z] for z in zones if z in zone_phase]
    return min(phases) if phases else None

for p in (2, 3):
    entries = json.load(open(f'data/universes/ret-p{p}.json'))['entries']
    cov = agree = skip = 0
    for e in entries:
        want = derived_phase(e['itemId'])
        if want is None:
            skip += 1
        else:
            cov += 1
            agree += by_id[e['itemId']]['phase'] == want
    print(f'p{p}: covered {cov} agree {agree} skipped {skip} ({100*skip/len(entries):.1f}%)')"
```

The skipped population breaks down (p2 / p3) as: `raid` 14 / 14,
`crafted` 7 / 13, `raid`+`token` 7 / 13, `token` 3 / 2, `badge` 3 / 3,
`pvp` 2 / 5.

### 2.3 Why the skips exist — and why they _strengthen_ the case

**5237 of 8257 `db.json` items have no `sources` at all.** Every one of the 14
`raid`-kind skips is an item whose source we know from AtlasLoot / two-hop /
Wowhead but which `db.json` leaves sourceless — the 13 TBC world-boss drops
(30722, 30726, 30728–30731, 30735–30741) plus tier pieces such as 29073
Justicar Crown and the Crystalforge set (30129–30133).

Every one of those items still carries a **correct** upstream `phase`
(world bosses → 1, Crystalforge/T5 → 2). Reproduce:

```
python -c "
import json
db = json.load(open('vendor/wowsims/db.json'))
print('items with no sources:', sum(1 for i in db['items'] if not i.get('sources')), '/', len(db['items']))
wb = {30722,30726,30728,30729,30730,30731,30735,30736,30737,30738,30739,30740,30741}
for i in db['items']:
    if int(i['id']) in wb:
        print(i['id'], i['name'], 'phase', i['phase'], 'sources', i.get('sources'))"
```

**Conclusion:** upstream's `phase` field is _more complete_ than upstream's
`sources` field, and strictly more complete than anything we can derive from
`sources`. Our derivation is not merely redundant — on the sourceless 15 % it
cannot produce an answer at all, and today those items inherit their phase from
a hand-maintained zone string. Adopting upstream `phase` shrinks the
hand-maintained surface and _increases_ coverage.

**The mapping still cannot be deleted.** `phase_raids.json` answers a second,
non-redundant question — _which raid zone is in scope at maxPhase N_ — which
`assemble_universe.py` uses for **membership** (`phase_zones` at line 445,
`in_phase` at line 546), not for stamping a phase number. That is
raid-scoped-pool membership, and it has no upstream equivalent.

---

## 3. Explicitly NOT redundant — do not propose removing these

### 3.1 `scripts/parse_atlasloot.py`

Upstream's `tools/database/atlasloot.go` reads **MoP** data exclusively. At the
pin, lines 21–23 fetch `source-mop.lua`, `data-mop.lua` (DungeonsAndRaids), and
`data-mop.lua` (Factions) from `AtlasLootClassic_MoP`. Verify:

```
gh api "repos/wowsims/tbc-new/contents/tools/database/atlasloot.go?ref=8aa378b3671a0923fd11fb34b4b3753e53f20c9b" \
  --jq '.content' | base64 -d | grep -n 'raw.githubusercontent'
```

It cannot produce TBC loot tables. Our parser is the only path to per-boss TBC
attribution and to the `WorldBossesBC` block. **Keep.**

### 3.2 `packages/core/src/meta.ts`

A documented port of upstream `ui/core/proto_utils/gems.ts`. Its min-colors
vs. compare-colors branch is an either/or where upstream's `isMet()` ANDs the
two. This is a **structural** difference with **zero behavioural** difference at
this pin: all four compare-color metas carry no min-color fields whatsoever, so
the AND's min-colors conjunct is vacuously true. Verify:

```
python -c "
import json
for e in json.load(open('data/gems/meta-conditions.json')):
    if e['id'] in (25897, 25895, 25893, 32640):
        print(json.dumps(e))"
```

Observed: each of the four is `{id, description, compareGreater, compareLesser}`
with no `minRed`/`minYellow`/`minBlue` key at all.

**Keep, and add a regression test** asserting that no entry in
`data/gems/meta-conditions.json` carries both a compare pair and a nonzero
min-color — the invariant that makes the two shapes equivalent. If a future pin
introduces such an entry the test goes red, which is the moment to restructure
`isMet` rather than now. **Do not rewrite.**

---

## 4. Encounter presets

### 4.1 We hand-build a target upstream already ships

`db.json` ships 7 presets. Enumerate:

```
python -c "
import json
for e in json.load(open('vendor/wowsims/db.json'))['encounters']:
    print(e['path'], '->', [t['target']['name'] for t in e['targets']])"
```

Observed: `Default/Raid Target`, `Default/Movement`, `Default/Dynamic Adds`
(2 targets), `Default/Custom Boss`, `Magtheridon's Lair/Magtheridon 25`,
`Serpent Shrine Cavern/Morogrim Tidewalker 25`,
`Serpent Shrine Cavern/Hydross the Unstable 25`. Each carries full
`stats`, `mobType`, `minBaseDamage`, `damageSpread`, `swingSpeed`,
`parryHaste`, `canCrush`, and (where applicable) `targetInputs`.

Our `data/presets/ret/p2.raid-sim-skeleton.json` `encounter.targets[0]` is the
same target, hand-carried through a wowsims share link. It matches
`Default/Raid Target` on **every scalar field** — `id` 31146, `level` 73,
`minBaseDamage` 15113, `damageSpread` 0.5, `swingSpeed` 2, `parryHaste` true,
`canCrush` true — and differs in exactly two places:

| Field                                               | Ours                  | Upstream | Note                                                                                                                                                                                  |
| --------------------------------------------------- | --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mobType`                                           | `"MobTypeMechanical"` | `7`      | JSON-vs-numeric proto enum encoding. Cosmetic.                                                                                                                                        |
| `stats[27]` (`StatBlockValue`, `common_pb.ts:2045`) | `54`                  | `0`      | **Real divergence.** Origin unknown — **hypothesis, untested:** the share-link round-trip through the wowsims UI populated a default block value that the shipped preset leaves at 0. |

Reproduce:

```
python -c "
import json
ours = json.load(open('data/presets/ret/p2.raid-sim-skeleton.json'))['encounter']['targets'][0]
up = [e for e in json.load(open('vendor/wowsims/db.json'))['encounters']
      if e['path'] == 'Default/Raid Target'][0]['targets'][0]['target']
print({k: (v, up.get(k)) for k, v in ours.items() if k != 'stats' and up.get(k) != v})
print([(i, a, b) for i, (a, b) in enumerate(zip(ours['stats'], up['stats'])) if a != b])"
```

Observed: the two mobType encodings, and `[(27, 54, 0)]`.

**Whether `StatBlockValue` on a mechanical raid target changes ret DPS at all is
untested** — it plausibly does not, since ret does not attack from behind a
block check, but nobody has measured it. Resolve that _before_ re-rooting, not
after (§4.3 step 1).

### 4.2 Relating presets to the §14 boss filter

PLAN.md §14 Phase 2 gates on a raid/boss filter (`ItemSource.boss`, "All bosses"
default, line 739) and Phase 3 lists "per-boss encounter profiles" (line 845).
The 3 real presets are exactly that data, for 3 bosses.

Important scoping distinction, because they are easy to conflate:

| Concern                                                              | Data                                        | Status                                 |
| -------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------- |
| **Loot filter** — "show me only BT drops"                            | `ItemSource.zone` / `.boss` on pool entries | already built; needs no encounter data |
| **Encounter profile** — "sim against Hydross, not the generic dummy" | `db.json` `encounters[]`                    | not built; presets back it             |

These are independent. The boss _filter_ must not start depending on preset
availability — we have loot for ~10 raids and presets for 3 bosses, so coupling
them would silently shrink the filter. Keep the filter driven by
`ItemSource`, and treat the encounter profile as a separate opt-in axis.

Also note the path-string mismatch: upstream writes `Serpent Shrine Cavern`,
`db.json` `zones` and `data/phase_raids.json` both write `Serpentshrine Cavern`.
Any join between preset paths and zone names needs an explicit alias, in the
same spirit as `INSTANCE_ZONE_ALIASES` in `scripts/parse_atlasloot.py`. Do not
fuzzy-match.

### 4.3 Adoption plan

1. **Measure the `stats[27]` divergence first.** Run the existing sim path once
   with `stats[27] = 54` and once with `0`, everything else fixed (same seed,
   same iterations, same gear). If the DPS delta is inside noise, take
   upstream's `0`. If not, keep `54` and record _why_ in an ADR — an unexplained
   hand-edit that moves DPS is a finding, not a preference.
2. **Add a read-only accessor**, mirroring upstream's
   `getPresetEncounter(path)` / `getAllPresetEncounters()`
   (`ui/core/proto_utils/database.ts:361,367`), over the already-vendored
   `db.json`. This is a pure function over vendored data — no new architectural
   seam, so AGENTS.md § Testing's three-port rule is untouched, and it is
   directly unit-testable.
3. **Re-root the skeleton.** `scripts/compose_slamaltman_raid_sim.py` reads
   `Default/Raid Target` from `db.json` instead of carrying the target inline,
   normalising the proto enum encoding. The committed skeleton stays committed
   and byte-compared — it remains the golden fixture; it just stops being
   hand-authored. Per AGENTS.md § Durable claims, regenerate it from the pinned
   sources and confirm the working tree matches `HEAD` before commit.
4. **Expose the 3 boss presets behind a flag**, defaulting off. Assumptions
   drawer must name which preset produced a ranking (PLAN.md §14 line 730
   already requires the encounter in the drawer), and the preset path must enter
   `contentHash` — swapping encounters changes the numbers, so it is _not_ a
   `ViewOptions` re-render (PLAN.md §4.1 / line 460).
5. Do **not** hand-write a fourth boss profile. Three is what upstream ships;
   inventing more is exactly the kind of hand-maintained derivation this
   document is trying to retire (§5.2).

---

## 5. Upstream work — draft issue text

Two candidates. Be honest about which upstream actually wants.

### 5.1 Worth filing: TBC world bosses have no item sources

**Upstream benefit is real and general.** wowsims' own UI cannot tell a user
where Ethereum Nexus-Reaver drops. This is not a tbc-gear-prio-specific concern.

> **Title:** TBC world boss drops (Doomwalker, Doom Lord Kazzak) have no `sources` in `db.json`
>
> **Version:** `v0.0.101` (`8aa378b3671a0923fd11fb34b4b3753e53f20c9b`), `assets/database/db.json`
>
> All 13 items dropped by the two TBC outdoor world bosses have `sources: null`,
> so the UI shows no source for them. Their `phase` is correct (1). The bosses
> themselves are absent from `zones` and `npcs` entirely.
>
> Affected item IDs: 30722 Ethereum Nexus-Reaver, 30726 Archaic Charm of
> Presence, 30728 Fathom-Helm of the Deeps, 30729 Black-Iron Battlecloak, 30730
> Terrorweave Tunic, 30731 Faceguard of the Endless Watch, 30735 Ancient
> Spellcloak of the Highborne, 30736 Ring of Flowing Light, 30737 Gold-Leaf
> Wildboots, 30738 Ring of Reciprocity, 30739 Scaled Greaves of the Marksman,
> 30740 Ripfiend Shoulderplates, 30741 Topaz-Studded Battlegrips.
>
> **Repro** (against `assets/database/db.json` at that commit):
>
> ```
> python -c "
> import json
> db = json.load(open('assets/database/db.json'))
> wb = {30722,30726,30728,30729,30730,30731,30735,30736,30737,30738,30739,30740,30741}
> for i in db['items']:
>     if int(i['id']) in wb:
>         print(i['id'], i['name'], 'phase', i['phase'], 'sources', i.get('sources'))
> print('zones naming a world boss:',
>       [z['name'] for z in db['zones'] if 'Doom' in z['name'] or 'Kazzak' in z['name']])
> print('npcs naming a world boss:',
>       [n['name'] for n in db['npcs'] if 'Doom' in n['name'] or 'Kazzak' in n['name']])"
> ```
>
> Output at that commit: all 13 print `sources None`; both the zones and npcs
> lists are empty.
>
> **Likely cause (hypothesis, untested):** `tools/database/atlasloot.go` reads
> only MoP AtlasLoot URLs (lines 21–23), so the TBC `WorldBossesBC` block is
> never parsed. AtlasLootClassic's TBC data does carry these two bosses with
> per-NPC tables.
>
> **Suggested fix:** add a synthetic zone for TBC world bosses (or npc entries
> for Doomwalker / Doom Lord Kazzak) so the 13 items get drop sources. Happy to
> open a PR if the shape is agreed.

### 5.2 Probably NOT worth filing: more TBC encounter presets

Upstream ships presets for the 3 bosses whose mechanics the sim actually models
differently. Asking for a preset per TBC boss is asking upstream to maintain
data that only exists to serve a per-boss ranking feature that is **our** product
idea, not theirs — and each preset is a maintenance liability for them. **This is
our local concern.** If we ever want more, the honest move is to open a
discussion offering to _contribute_ profiles with sourced numbers, not to file a
gap report. Do not file this as a bug.

### 5.3 Not filing: item `phase`

Nothing to report. `phase` is present, complete (8257/8257), and correct on
every item we can independently check (§2.1). This section exists so the
question is closed rather than re-litigated.

---

## 6. Migration plan: item phase

### 6.1 Changes in `scripts/assemble_universe.py`

| Today                                                                                          | After                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `entry["phase"] = it.get("phase")` (line 566) — already upstream's value, passed through       | unchanged. **This is already correct.**                                                                                                                                                                                        |
| `zones_for_max_phase()` (line 323) reads `phase_raids["zones"][].phase` to build `phase_zones` | unchanged in behaviour. Reframe in the docstring: it answers _zone membership at maxPhase N_, not _what phase is this item_.                                                                                                   |
| No cross-check between the two                                                                 | **new:** assert during assembly that every entry whose zones are all inside `phase_zones` has `item.phase <= max_phase`, and fail the build on violation — same posture as the existing `source_errors` hard-exit at line 599. |

The net code change is small and deliberately so: the redundancy is conceptual
(two sources of truth for phase, only one of them authoritative) more than
textual. The value is (a) the assertion turns a silent drift into a build
failure, and (b) `phase_raids.json`'s contract narrows to one job.

### 6.2 What `data/phase_raids.json` must still carry

| Field                               | Keep?                 | Why                                                                                                                                                                                                                                                          |
| ----------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `zones[].name`                      | **yes**               | joins to `db.json` `zones[].name` and to AtlasLoot/Wowhead zone strings; drives `phase_zones` membership                                                                                                                                                     |
| `zones[].phase`                     | **yes**               | which raids are in scope at maxPhase N. Not the item's phase. Now cross-checked against `items[].phase` rather than being the source of it.                                                                                                                  |
| `zones[].zoneId`                    | **yes**               | the numeric join to `db.json`; makes the name join auditable                                                                                                                                                                                                 |
| `World Bosses` row (`zoneId: null`) | **yes, load-bearing** | the only thing tying Doomwalker/Kazzak drops to phase 1. `db.json` has no zone, no npc, and no source for them (§2.3). Delete this row and 13 items leave the p1/p2 universes. Remove only if §5.1 is fixed upstream **and** the pin is bumped past the fix. |

Update the `specNote` to say phase-per-item now comes from `db.json` and this
file scopes membership. Leave the existing world-boss explanation intact.

### 6.3 Before/after membership proof

The `.scratch/data_universes_ret-p*.json.ids.{before,after}.txt` precedent
(untracked scratch artifacts in the current working tree) is the pattern.
Universe membership must not change — this migration touches how phase is
_asserted_, not how membership is _decided_.

```
# BEFORE — on the current tip, with vendor/ restored
for p in 2 3; do
  python -c "
import json,sys
print('\n'.join(str(e['itemId']) for e in
  sorted(json.load(open(f'data/universes/ret-p{sys.argv[1]}.json'))['entries'],
         key=lambda e: e['itemId'])))" $p \
  > .scratch/phase-migration/ret-p$p.ids.before.txt
done

# ... apply the change, then regenerate ...
python scripts/assemble_universe.py --max-phase 2
python scripts/assemble_universe.py --max-phase 3

# AFTER — same extraction into .ids.after.txt, then:
for p in 2 3; do
  diff -u .scratch/phase-migration/ret-p$p.ids.before.txt \
          .scratch/phase-migration/ret-p$p.ids.after.txt \
    && echo "p$p membership unchanged"
done
```

**Acceptance:** both diffs empty. A non-empty diff means the change altered
membership and must be understood before landing — it is not a rebaseline.

Also diff `data/universes/ret-p*.report.json`; `universeTotal`, `phaseZones`,
and the membership counters should be unchanged.

Expected counts to hold at: p2 = 230 entries, p3 = 354 entries (measured at this
pin, §2.2).

---

## 7. Risks

| Risk                                                                                                     | Severity                                                  | Mitigation                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bumping the wowsims pin silently changes `items[].phase` and moves items between tiers                   | **high** — this is the cost of adopting an upstream field | The §6.3 before/after ID diff becomes part of the pin-bump procedure, not just this migration.                                                      |
| Deleting the `World Bosses` row "because phase is upstream now"                                          | **high**                                                  | §6.2 marks it load-bearing; §8 forbids it explicitly.                                                                                               |
| Coupling the §14 boss _filter_ to encounter presets, shrinking it from ~10 raids to 3 bosses             | medium                                                    | §4.2 keeps the two axes independent.                                                                                                                |
| `stats[27] = 54` is load-bearing and re-rooting the skeleton silently changes DPS                        | medium — **currently untested**                           | §4.3 step 1 measures before changing.                                                                                                               |
| Preset path `Serpent Shrine Cavern` fails to join `Serpentshrine Cavern`                                 | medium                                                    | explicit alias table (§4.2); never fuzzy-match.                                                                                                     |
| The new phase assertion is too strict and fails on a legitimate carryover item                           | low                                                       | Assertion is `<=`, matching the union carryover policy in `phase_raids.json`'s `specNote`. Land it as a warning for one cycle if that proves noisy. |
| A future pin adds a meta gem with both compare-colors and min-colors, breaking the `meta.ts` equivalence | low                                                       | The §3.2 regression test is exactly this tripwire.                                                                                                  |

---

## 8. Do not do this

- **Do not delete `data/phase_raids.json`.** Phase is redundant; raid-scoped
  membership is not, and the `World Bosses` row has no upstream equivalent
  whatsoever (§2.3, §6.2).
- **Do not delete `scripts/parse_atlasloot.py`.** Upstream's AtlasLoot importer
  is MoP-only and cannot produce TBC data (§3.1).
- **Do not rewrite `packages/core/src/meta.ts` to match upstream's `isMet()`.**
  Behaviourally identical at this pin; write the tripwire test instead (§3.2).
- **Do not delete the committed `p2.raid-sim-skeleton.json`.** It stays the
  golden fixture; only its _provenance_ changes (§4.3 step 3).
- **Do not hand-author additional boss encounter profiles** to fill out the §14
  view (§4.3 step 5, §5.2).
- **Do not file an upstream issue about item `phase`** — there is no gap (§5.3).
- **Do not treat the encounter preset path as a `ViewOptions` field.** It changes
  the numbers, so it belongs in `contentHash` (§4.3 step 4).
- **Do not regenerate `data/universes/*.json` as a "rebaseline"** when the §6.3
  diff is non-empty. A non-empty diff is a finding.

---

## 9. Suggested sequencing

Each step is independently landable and independently revertable.

| #   | Slice                                                                 | Touches                                                        | Gate                                                      |
| --- | --------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | Meta-conditions tripwire test                                         | `packages/core/test/`                                          | `pnpm verify` green                                       |
| 2   | Phase cross-check assertion + `phase_raids.json` `specNote` rewording | `scripts/assemble_universe.py`, `data/phase_raids.json`        | §6.3 diffs empty                                          |
| 3   | File the upstream world-boss issue (§5.1)                             | none                                                           | issue link recorded here                                  |
| 4   | Measure `stats[27]` (§4.3 step 1)                                     | none (probe under `.scratch/`)                                 | delta recorded, ADR if nonzero                            |
| 5   | Preset accessor + re-root the skeleton                                | `packages/core/src/`, `scripts/compose_slamaltman_raid_sim.py` | committed skeleton byte-identical, or the delta explained |
| 6   | Boss presets behind a flag, in `contentHash`                          | engine + assumptions drawer                                    | PLAN.md §14 boss-filter gate items                        |

Steps 1–3 are safe now. Step 5 is blocked on step 4. Step 6 is Phase 2/3 work
and should not be pulled forward.
