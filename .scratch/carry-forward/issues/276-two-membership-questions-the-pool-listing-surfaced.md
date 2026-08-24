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

- A decision is recorded per bucket: admit with a source, force-include with
  a documented reason, or accept the exclusion with the reason written down.
- The Swiftsteel/Swiftstrike phase question is either confirmed or dismissed.
