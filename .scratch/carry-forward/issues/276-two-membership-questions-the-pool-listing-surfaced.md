Status: open
Type: pool membership question
Origin: stage-gate `phase-item-pool`, Step 5, 2026-08-23
(`docs/adr/0028-pool-membership-precedence-local-universe-primary-wowsims-audits.md`)
Blocks: none
Blocked by: none

# Two buckets of phase-3 items the pool omits, each for a different reason

An owner decision, not an engineering bug.

The pool listing (`pnpm pool-listings:check`,
`data/pool-listings/{ret,feral}-p3.md`) classifies every item the wowsims DB
admits at phase 3 that the local pool does not carry. Two of its buckets are
**decisions, not defects** — the audit reports them and deliberately does not
act. Both need an owner call. They are stated separately because they have
different causes and different fixes.

## Bucket 1 — wowsims records no source at all (category f)

These items pass every eligibility rule and carry a phase, but the wowsims DB
has no `sources` entry for them, so no local route could ever find them. Three
concrete phase-3 examples:

| itemId | name |
| --- | --- |
| 32757 | Blessed Medallion of Karabor |
| 32649 | Medallion of Karabor |
| 31043 | Thunderheart Vest (feral listing) |

```bash
python -c "import json;db=json.load(open('vendor/wowsims/db.json'));print([(i['id'],i['name'],i.get('sources')) for i in db['items'] if i['id'] in (32757,32649,31043)])"
```

All three print `None` for sources. This is the same defect class as ticket
17 (`excludedNoSource`) and the reason ADR-0028 rejects making the wowsims DB
primary for membership: its source data has holes at exactly the badge, PvP
and tier-token origins.

**The question:** should these join the pools with a source supplied from
elsewhere (AtlasLoot, a Wowhead list, or a documented force-include), or stay
out with the reason recorded? Read the full category f table in both listings
before deciding — it is the largest bucket, and these three are examples, not
the whole of it.

## Bucket 2 — wowsims does record a source, and a local rule excluded it (category e2)

Distinct from bucket 1 and easier to act on: these items **do** have a source
in the wowsims DB, they simply never drop, and the local assembly's route for
that source kind did not admit them. The two the audit flagged by name:

| itemId | name | wowsims source |
| --- | --- | --- |
| 32570 | Swiftsteel Shoulders | crafted, Leatherworking |
| 32581 | Swiftstrike Shoulders | crafted, Leatherworking |

```bash
python -c "import json;db=json.load(open('vendor/wowsims/db.json'));print([(i['id'],i['name'],i['sources']) for i in db['items'] if i['id'] in (32570,32581)])"
```

Note 32581 is **already in the ret universe** with `crafted
profession=Leatherworking` and absent from feral's, so the local crafted route
is not uniformly failing — this is a per-spec route question, not a blanket
one.

**The question:** is the local crafted route wrong to exclude these, or right?
Answering it probably means reading the assembler's crafted admission rule
rather than adding two ids.

## A related doubt about these two shoulders — hypothesis, untested

Swiftsteel and Swiftstrike Shoulders carry `phase: 3` in the wowsims DB, but
both are patch **2.3** recipes. wowsims assigns crafted items a phase from an
item-level band (`tools/database/item_source_utils.go`, `InferPhase`), not
from the patch a recipe shipped in, so the phase may be an upstream inference
error rather than a fact. **Not verified.** If it is wrong, these two are
phase-4 items and the bucket-2 question about them dissolves.

This one wants an SME eye on whether the recipes really are 2.3, before any
engineering.

## Not in scope

Deciding any of this by editing a universe. ADR-0028's rule is that the audit
reports and the owner decides; nothing here should be resolved by growing a
force-include list, which is ticket 173's warning.

## Done when

- ~~A decision is recorded per bucket.~~ Done, 2026-08-23 — see the ruling
  below. All five items are to be included.
- Each of the five reaches the pool through a **source route the assembler
  recognises**, not a force-include.
- The pool listings show them moving out of the gap and into membership.

## Owner ruling, 2026-08-23: include all five

The owner ruled that every item in both buckets belongs in the pools. The
reasons they gave, paraphrased, with the provenance of each marked — none of
the three has been checked against the data yet:

| Item(s) | Owner reason | Status |
| --- | --- | --- |
| Medallion of Karabor 32649, Blessed Medallion of Karabor 32757 | a quest item | **owner recall, unverified** |
| Thunderheart Vest 31043 | a tier-token turn-in — vendor exchange for a druid token | **owner recall, unverified** |
| Swiftsteel Shoulders 32570, Swiftstrike Shoulders 32581 | the recipes drop in phase-3 raids: Black Temple, possibly Hyjal — the owner was unsure which | **owner recall, unverified, and explicitly uncertain on the zone** |

Verified independently and unchanged: all five pass `eligible_d7`, none is
stub-only, and the wowsims DB records **no** source for 31043, 32649 or 32757
while giving 32570 and 32581 a Leatherworking `crafted` source. That is why
the audit could not place them; it is not evidence for or against the reasons
above.

The Swiftsteel/Swiftstrike phase doubt recorded earlier in this ticket is
**not** dismissed by this ruling. The owner says the recipes drop in a
phase-3 raid; the concern was that both are patch-2.3 recipes carrying
`phase: 3` from an item-level band. Those can both be true, or the phase can
still be wrong. Resolve it while implementing, not before.

## What implementing the ruling takes

**Not a hand-edit, and not a force-include.** Each item needs a source route
the assembler recognises and re-derives on every run — otherwise the next
universe regen drops them again, which is the failure ticket 173 exists to
prevent. The three reasons imply three different amounts of work, and one of
them is far smaller than it looked.

### The shoulders: the data is already here, so this is a bug, not a feature

Checked while recording the ruling, and it corroborates the owner exactly.
`data/two-hop/raid-recipes.json` already maps both products to a recipe that
drops in **Black Temple** — not Hyjal, which resolves the uncertainty the
owner flagged:

```bash
python -c "import json;d=json.load(open('data/two-hop/raid-recipes.json'));print([(e['productId'],e['recipeId'],e['zones']) for e in d['entries'] if e['productId'] in (32570,32581)])"
```

That file is loaded by `scripts/assemble_universe.py` (`RAID_RECIPES`, read at
line 1381) and its `zones` branch is consumed, not only its `reps`. So a
recognised route exists and the items still do not reach the pools:

| item | ret-p3 | feral-p3 |
| --- | --- | --- |
| Swiftsteel Shoulders 32570 | absent | absent |
| Swiftstrike Shoulders 32581 | **present** | absent |

32581 reaching ret but not feral, on identical recipe data, is the thread to
pull first — that asymmetry points at a spec-side filter rather than a missing
route. **Cause not established. Do not assume it is the crafted route until it
is measured.**

### The medallions: a genuinely new source kind

`ItemSource` in `packages/core/src/pool.ts` has no `quest` kind — the kinds are
raid, token, badge, crafted, rep, heroic, pvp, world and unknown, verified by
reading the union. A quest route therefore means a new kind, the input data to
populate it, and rendering wherever sources are displayed. This is the largest
of the three.

### Thunderheart Vest: probably data, confirm before assuming

The two-hop tier machinery exists (`data/two-hop/feral-tokens.json`,
`ret-tokens.json`) and `kind: "token"` is already a source kind, so a vendor
turn-in may need only data. **Unverified.** Check whether the vest is absent
from the token map or present and filtered out — the same question as the
shoulders, and worth answering at the same time.

### Then

Universe regen, then a fork-bundle refresh
(`python scripts/sync_fork_universes.py --write`) so the tab sees it too.

**The gate will show the work landing.** These five sit in the wowsims-only
tables of `data/pool-listings/{ret,feral}-p3.md` today. When the routes work
they move into local membership, the counts change, and
`pnpm pool-listings:check` fails until the regenerated listings are committed.
That diff is the proof.

No universe, assembler or two-hop file was edited when this ruling was
recorded.
