# ADR-0028 — The local universe is primary for pool membership; the wowsims DB audits it

**Status:** accepted
**Date:** 2026-08-23
**Related:** [`ADR-0027`](0027-the-wowsims-upgrades-tab-is-the-primary-product.md), tickets `.scratch/carry-forward/issues/211-fork-bundled-ret-p3-universe-diverges-from-this-repos.md` (closed here), `17-phase2-plus-no-source-gap.md`, `89-season-3-pvp-weapons-missing-from-p3-pools.md`, `173-nothing-detects-the-next-silently-dropped-item.md`

## Context

The Upgrades tab ranks a candidate pool. Two things could define that pool,
and until now nothing said which:

- **This repo's assembled universes** (`data/universes/*.json`), built by
  `scripts/assemble_universe.py` from a pinned wowsims item DB plus AtlasLoot
  source data, Wowhead lists, curated gear sets and phase/rep tables.
- **The wowsims item database itself** (`vendor/wowsims/db.json`), which the
  owner asked to treat as the source "ideally".

The question is not academic. The owner's stated worry is a _missing source_:
an item that belongs in the pool and silently is not, with nothing to notice.
Ticket 173 says exactly that — "nothing detects the next silently dropped
item" — and tickets 17 and 89 are two instances of it.

## Decision

**Membership stays local. The wowsims DB becomes the auditor and the
vocabulary.** Precedence is per field, not per system:

| Field                          | Primary                                                         |
| ------------------------------ | --------------------------------------------------------------- |
| membership and source metadata | the local universe                                              |
| phase                          | the wowsims DB                                                  |
| zone vocabulary                | the wowsims DB's own `zones[].name`                             |
| completeness                   | the wowsims DB is the reference the universe is audited against |

`scripts/list_phase_pool.py` implements the audit. It builds a
wowsims-primary membership, diffs it against the universe, and classifies
every difference by a rule it can cite. What it cannot classify it reports
under "Unexplained" — it never adds an item to a pool.

Two gates keep this honest, both in `pnpm verify`:

- `pnpm pool-listings:check` regenerates the listings and byte-compares.
- `pnpm fork-universes:check` byte-compares the fork's bundled copies against
  their `data/` sources (this is ticket 211's mechanism).

## Why not make the wowsims DB primary for membership

This inverts the owner's stated ideal, so the grounds are measured, not
preferred. Three findings, each re-runnable.

**1. The DB records no source for badge, PvP, or tier-token items.** Its
source union carries only `drop`, `crafted` and `rep`:

```bash
python -c "import json,collections;db=json.load(open('vendor/wowsims/db.json'));c=collections.Counter(k for i in db['items'] for s in i.get('sources') or [] for k in s);print(c)"
```

That prints `drop 2821, crafted 1113, rep 111` — and nothing else. Bloodlust
Brooch (29383), the Vengeful Gladiator's weapons, and every Lightbringer and
Thunderheart tier piece carry a phase but no `sources` entry at all. A
wowsims-primary pool therefore could not say _where an item comes from_,
which is half of what the pool is for.

**2. A wowsims-primary membership is several times the curated universe and
mostly older-phase leftovers.** The committed listings establish the figures
on every regeneration; read the "Counts" section of
`data/pool-listings/ret-p3.md` and `feral-p3.md` rather than trusting a
number quoted here.

**3. The DB's phase-to-zone knowledge is not readable by the page.** Phase is
assigned at DB generation time in Go (`tools/database/item_source_utils.go`,
`InferPhase`), and `DatabaseFilters` in `proto/ui.proto` has no phase field.
There is no TypeScript-side phase-to-zone table for the tab to use.

Against that, the local universe already _is_ a wowsims-derived pool —
`vendor/wowsims/db.json` is the assembler's primary input — so "wowsims
ideally, local as backup" is honored at the data level rather than the file
level. wowsims values win wherever wowsims has them; the local assembly
supplies only what wowsims lacks.

## The audited membership definition

Stated here because an explainable pool is the point. The wowsims-primary
membership is every item with `phase <= maxPhase`, `quality == Epic (4)`, and
spec-eligible under the assembler's own `SPEC_PROFILES` — class allowlist,
armor type, weapon and hand rules, relic type. Those rules are _imported_
from `scripts/assemble_universe.py`, never re-implemented, so the audit
cannot drift from the assembler it audits.

Two quality bounds are deliberate:

- **Legendary (`quality == 5`) is excluded.** The DB holds 18 legendaries,
  exactly two at phase 3 (the Warglaives, 32837 and 32838), and neither is
  ret- or feral-usable under these same rules: they are one-hand sword and
  dagger, ret admits no one-hand weapons, and a druid can use neither. Verify:

  ```bash
  python -c "import json;db=json.load(open('vendor/wowsims/db.json'));print([(i['id'],i['name'],i.get('phase')) for i in db['items'] if i.get('quality')==5])"
  ```

- **Rare and below are outside the audit.** The measured Rare phase-3 gap is
  zero for both specs, so auditing them adds noise and no finding. The
  listings recompute this figure on every regeneration, so it cannot go stale
  silently.

## A structural limit worth recording

Three of the reason categories the plan named — class allowlist, weapon/hand
exclusion, and the `eligible_d7` screen — **cannot fire** on the
wowsims-only side of the difference, and this is a property of the audit's
shape rather than a gap in it. The wowsims-primary membership is _defined_ by
`eligible_d7` passing, so no member of it can fail `eligible_d7`. Those
categories explain why an item never entered that membership at all; they
can never explain why a member of it is missing from the local pool. The
listings report them at a structural zero and say why, so the next reader
does not mistake three zeros for three checks that passed.

The categories that can fire are: stub-only sim effect; drops only outside
this phase's zone list; sourced but never dropping, by a route the local
assembly did not admit; no source recorded at all; and unexplained. The
last-but-one is a real test rather than a catch-all — an item that is
sourced, drops inside one of this phase's zones, and is still absent falls
through to "unexplained" — which is what keeps the zero-unexplained claim
worth something rather than true by construction.

The "drops elsewhere" and "never drops" cases are reported separately for a
reason that only appeared once the data was read: about a quarter of that
bucket is crafted and reputation gear that drops nowhere at all, and calling
those items "dropped outside this phase" would have been simply false. The
two also want different follow-up. Drops-elsewhere is the assembler working
as designed; never-drops is a question about a local source route, and it is
where the crafted-shoulder question below lives.

## Consequences

- A silently dropped item now has a detector. This is what tickets 17, 89 and
  173 asked for; see those tickets for what each still owns.
- Regenerating a universe changes a listing, and `pnpm verify` fails until
  the listing is regenerated and the diff read. That is the intended cost: a
  changed count is a change in what the pool explains.
- The listings audit phase 3 only, and only ret and feral. Extending to other
  phases or specs is a parameter change, not a redesign.
- The audit reads the pinned `vendor/wowsims/db.json`, never the gitignored
  fork clone, so the committed bytes do not depend on which machine
  regenerated them. The two copies agree on item membership and differ on
  phase for three items, none of them phase 3:

  ```bash
  python -c "import json;a=json.load(open('vendor/wowsims/db.json'))['items'];b=json.load(open('vendor/tbc-new-fork/assets/database/db.json'))['items'];A={i['id']:i.get('phase') for i in a};B={i['id']:i.get('phase') for i in b};print(len(A),len(B),set(A)^set(B),[(k,A[k],B[k]) for k in A if A[k]!=B.get(k,A[k])])"
  ```

- Two membership questions the audit surfaced are **not** decided here and go
  to the owner as tickets: items with no source route in either system, and
  items wowsims can source that a local rule excluded.

## Future direction (owner, 2026-08-23)

**The precedence rule above stands for now.** This note records a direction to
explore, not a decision that changes it.

The owner wants a future stage to examine whether this repo's hardcoded source
data could **extend** the data wowsims already carries for the tab, rather than
sitting beside it as a second store. The goals are one source of truth and
minimal clutter added to the wowsims repo — today the tab bundles copies of
artifacts this repo owns (universes, EP weights), and the audit above exists
partly because two stores can disagree.

That is a design question, not a plan. Nothing about it is measured: whether
wowsims' schema can carry origins it has no field for (badge, PvP, tier tokens
— the very gap that motivated the decision above), whether upstream would take
such an extension, and what it would cost to maintain are all **untested
hypotheses**. It also interacts with the standing rule that the fork is not
pushed, so any shape that requires upstream changes is gated on a decision the
owner has not made.

Revisit when a stage is scoped for it. The decision above is what holds until
then.
