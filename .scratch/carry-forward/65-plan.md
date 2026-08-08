Status: proposed
Ticket: 65
Specs in scope: ret paladin, feral druid (dps)
Relates to: 58 (partially supersedes — see "Why this is not just 58")

# Plan — P3 reputation vendors and their recipes, for ret and feral

Scope is the two P3 reputation vendors — **Ashtongue Deathsworn** (Black Temple)
and **Scale of the Sands** (Hyjal Summit) — plus the recipes they sell. Raid drop
tables for both zones are already in; see ticket 65 for that measurement.

## The measured payload

The gap is **identical for both specs** — a source-pipeline gap, not a spec one.
Neither universe has any of these ids by any route:

| faction | gear | missing in ret-p3 | missing in feral-p3 | recipes |
| --- | --- | --- | --- | --- |
| Ashtongue Deathsworn | 9 | 9 | 9 | 17 (gear patterns) |
| Scale of the Sands | 16 | 16 | 16 | 30 (gem designs) |

Re-run with `python .scratch/carry-forward/notes/65-faction-overlap.py <factions.lua>`.

**~42 items of real work**, not the ~74 raw rows: 25 vendor items plus
Ashtongue's 17 crafted outputs. Scale's 30 gem Designs need no work — outputs
already in `vendor/wowsims/db.json`, gem solver already has them.

## Why this is not just 58 — the two factions need different fixes

Ticket 65 assumed both factions needed AtlasLoot's Factions module vendored.
**That is true for only one of them.** `vendor/wowsims/db.json` already carries
a `rep` source on the Ashtongue talismans:

```bash
python -c "
import json
b={i['id']:i for i in json.load(open('vendor/wowsims/db.json'))['items']}
print(b[32485]['sources'])  # Ashtongue Talisman of Valor
print(b[29301]['sources'])  # Band of the Eternal Champion"
# [{'rep': {'repFactionId': 1012, 'repLevel': 8, 'factionId': 1}}]
# None
```

- **Ashtongue (9 items): the data is already on disk and is being thrown away.**
  `assemble_universe.py:585` returns `None` when a rep row has neither
  `factionName` nor `standing` — which is every row keyed only by
  `repFactionId`. The comment there says this affects one row
  ("Haramad's Bargain (29119) is the only affected row in the shipped tiers").
  **That comment is now wrong: it is 111 items across 10 factions.**

  ```bash
  # counts items whose rep source the faction=None guard discards
  python - <<'PY'
  import json
  n=0
  for it in json.load(open('vendor/wowsims/db.json'))['items']:
      for s in (it.get('sources') or []):
          if 'rep' in s:
              r=s['rep'] or {}
              if not (r.get('factionName') or r.get('faction')) and not (r.get('standing') or r.get('rank')): n+=1
              break
  print(n)  # 111
  PY
  ```

  The guard is not wrong in intent — `unknown with unknown` really is a useless
  source. It is wrong in remedy: the fix is an id->name table for the ~10
  faction ids and the `repLevel` scale, not discarding the row. `repLevel: 8`
  is Exalted.

- **Scale of the Sands (16 rings): genuinely absent from the DB** (`sources:
  null`). These need AtlasLoot's Factions module, i.e. actual 58 work.

So step 2 below is small and unblocks the ret/feral trinket, and step 3 is the
larger 58-shaped piece. **Sequencing them this way gets the ret and feral
talismans in without waiting on a vendoring step.**

## The risk this plan is shaped around

`curationHint` is pure stat-EP (`assemble_universe.py:1273`), and all nine
talismans have an all-zero `stats` array — their value is entirely proc. Every
proc trinket already in the universe therefore scores exactly zero:

```bash
python -c "
import json
u=json.load(open('data/universes/ret-p3.json'))
print([(e['itemId'],e['curationHint']) for e in u['entries']
       if e['itemId'] in (28785,30447,30621)])"
# [(28785, 0.0), (30447, 0.0), (30621, 0.0)]
```

The Lightning Capacitor, Tome of Fiery Redemption and Prism of Inner Calm all
sit at `0.00`, in a trinket slot topped by Madness of the Betrayer at `77.44`.

**So steps 1-2 will land Talisman of Valor (ret) and Talisman of Equilibrium
(feral) and rank both last.** Not a regression — it is the existing treatment of
proc trinkets — but shipping it silently would put a visibly wrong ordering in
front of a player. Step 4 exists for that reason and its disclosure is not
optional.

**Good news for pricing them later:** the DB *does* carry proc data —
`itemEffects` is populated on 802 items including all nine talismans, with
`buffId`, `effectDurationMs` and stat payloads. Ret's 32485 has a real stat
buff (Fire Blood, 12s); feral's 32486 is a `-1`-duration class-tier effect with
an empty stat payload, so it is **not** priceable from stats alone even in
principle. That asymmetry matters for step 4 and is why (b) is a sim job.

Two blockers checked and ruled out: trinkets are exempt from the caster-junk
filter (`is_caster_junk`, `assemble_universe.py:882`) and `junkFilter.applied`
is `false`, so nothing is silently dropped.

## Steps

Each step is independently landable and independently useful.

### 1. Faction id -> name/standing tables

Add an explicit `repFactionId -> display name` dict and a `repLevel -> standing`
scale to `assemble_universe.py`. Ten ids cover every affected row; 1012 is
Ashtongue Deathsworn, 933 The Consortium. `repLevel: 8` is Exalted.

Explicit dict, not a de-camel rule — `TheShatar` -> `The Sha'tar` has an
apostrophe no rule produces. Same reasoning already applied elsewhere in this
repo.

- **Done when:** the tables exist with a source for the id->name mapping
  recorded, and are unit-tested directly (pure function, no port — allowed by
  AGENTS.md testing policy).

### 2. Stop discarding resolvable rep sources

Replace the `return None` at `assemble_universe.py:585` with a lookup through
step 1's tables, falling back to `None` only when the id is genuinely unknown.
Correct the stale "only affected row" comment to the measured 111.

- **Yields:** the 9 Ashtongue talismans — **including the ret and feral ones** —
  in both universes, with `origin: db`, no vendoring required.
- **Watch for:** `pool.ts` reads `sources[0]`, and the current comment says
  returning `None` deliberately lets Wowhead prose supply the real source
  instead of being appended behind it. Landing this may **reorder** sources for
  the ~111 items. Check that no item that previously showed a prose rep source
  now shows a worse one — this is the one place this step can regress
  something.
- **Done when:** ret-p3 and feral-p3 both list Ashtongue Deathsworn in their rep
  factions, the 65 script reports 0 missing Ashtongue gear, and `pnpm verify`
  is green.

### 3. Vendor the Factions module for Scale of the Sands

Now the actual 58 work, needed because the 16 rings have no DB source. Add
`AtlasLootClassic_Factions/data-tbc.lua` to `TRACKED` in
`scripts/sync_atlasloot.py` (currently one entry), `--update`, commit the
lockfile. Upstream has both tables at the already-pinned commit `0bc91eb`
(46,868 bytes), so no version bump.

Then extend `parse_atlasloot.py` to walk the standings tables into
`{kind: "rep", faction, standing}`. `ItemSource` already has that variant
(`pool.ts:45`) — no type work, no new `ItemSourceKindName`.

- **Done when:** `sync_atlasloot.py --check` exits 0, the 16 rings appear in
  both universes, and the 65 script reports 0 missing gear for both factions.
- **Also:** confirm P4/P5 inherit. Carryover is verified working (ticket 65), so
  this should fall out — confirm rather than assume.

### 4. Ashtongue's 17 crafted patterns

`parse_raid_recipes` (`parse_atlasloot.py:300`) already maps recipe -> output for
raid drops; this is the vendor-bought analogue. All 17 outputs resolve in the
items index; none is in either universe.

Settle **in this step, not before**: whether a vendor-bought recipe needs a
source shape distinct from `recipeZone`/`recipeBoss`, or whether `crafted` plus
faction is enough. Recommendation: reuse `crafted` and add the faction — the
player-facing question is "can I get this", and the answer is a rep grind either
way.

### 5. Decide what to do about proc-only trinkets

The step that makes the payload useful, and the one with a real open question.
Three options, cheapest first:

- **(a) Disclose only.** Flag proc-only trinkets so a `0.00` reads as "unpriced",
  not "worthless". Cheap, honest, changes no ranking.
  `packages/core/src/disclosure.ts` already has the machinery.
- **(b) Sim them.** The `SimRunner` seam is the correct home for "what is this
  proc worth". `itemEffects` gives the sim real input. Needs a recorded fixture
  per spec. Note feral's 32486 has an empty stat payload, so it is sim-only —
  no shortcut exists.
- **(c) Hand-price in the preset.** Fast, and wrong in the way this repo has
  been burned before: a transcribed number with no second witness.

**Recommendation: (a) in this branch, (b) as its own ticket, never (c).**
Do not fold (b) in — it is a different kind of work and would stall steps 1-4,
which are useful alone.

### 6. Re-measure ticket 57's 94 prose rows

58 asks for it; only possible once 2-3 land. `KNOWN_UNCORROBORATED` and the
`real-source.ts` fixture gate should get **strictly easier** to satisfy. If
either gets harder, something in step 2 or 3 is wrong.

## Sequencing and parallelism

1 -> 2 are serial. 3 -> 4 are serial. Both chains touch
`assemble_universe.py`/`parse_atlasloot.py`, so **this is not a `parallel-phase`
candidate** — fanning out would put two writers in one file, which the skill's
disjointness rule forbids. Step 5(a) is genuinely disjoint (disclosure/report
layer) and could run alongside if there is reason to.

**Both specs come free from steps 1-4.** The parser feeds the shared source
layer and `assemble_universe.py` already runs per spec. No feral-specific work
is expected — but verify against `feral-p3` explicitly at each step rather than
inferring from ret.

## Verification

`pnpm verify` after each step. After step 4, regenerate both universes:

```bash
python .scratch/carry-forward/notes/65-faction-overlap.py <factions.lua>
# expect: 0 missing gear for both factions, in both ret-p3 and feral-p3
```

Then `pre-merge-review` before any land ask.
