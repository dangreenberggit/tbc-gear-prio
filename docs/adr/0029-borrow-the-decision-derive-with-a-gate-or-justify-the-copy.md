# ADR-0029 — Borrow the decision, derive with a gate, or justify the copy

**Status:** accepted
**Date:** 2026-08-25
**Related:** [`ADR-0027`](0027-the-wowsims-upgrades-tab-is-the-primary-product.md), [`ADR-0028`](0028-pool-membership-precedence-local-universe-primary-wowsims-audits.md), tickets `.scratch/carry-forward/issues/301-eligibility-reimplements-canequipitem.md` (closed here), `296-fork-hand-mirrored-slot-unions-ungated.md` (closed here), `300-assemble-universe-spec-profile-duplication.md` (re-scoped here)

## Context

`eligible_d7` in `scripts/assemble_universe.py` re-implemented the fork's
`canEquipItem` in Python, with per-spec armor and weapon constants hand-copied
from `ui/core/player_classes/capabilities_auto_gen.ts`. The copy drifted, and
the drift shipped: a rogue's pool carried two-handed swords that wowsims' own
gear picker refuses (review findings D1/A2, ticket 301). The user's judgment
was that this was "an absolutely absurd reinvention of the wheel" and that the
symptomatic patches were not an answer.

The constants were never the whole bug. The mis-ported rule was the
per-weapon-type `canUseTwoHand` flag — _logic_, not data — so a generator that
emitted the constants and kept the Python rules would have left the same class
of drift in place.

A survey found this was not an isolated case. The pipeline and the fork port
between them re-stated things wowsims already owns in eight distinct places,
gated by nothing, by a byte hash, or by inspection.

## Decision

Every place this repo restates something the fork owns takes exactly one of
three dispositions, and each carries the evidence for why it is that one.

### 1. Borrow the decision

When the fork exposes a **function** that answers the question, run that
function and consume its answer. Do not re-express the rules, and do not
generate the constants the rules read — a constants generator still leaves
hand-written logic to drift.

Equip legality is now this. A fork-side exporter
(`ui/core/components/individual_sim_ui/upgrades/tools/export_equip_eligibility.mts`)
runs the real `canEquipItem` over the fork's own `db.json`, parsed by the
fork's own `UIDatabase`, and writes per-spec eligible item ids.
`scripts/check_equip_eligibility.py` re-runs it at the pinned commit and diffs
on every `pnpm verify`.

The exporter needs a small harness (`headless.mts`, `hooks.mjs`) because
modules in `utils.ts`'s import graph touch `window.location` and `localStorage`
at evaluation time and import Vite's `virtual:i18next-loader` — none of which
the equip decision consults. The harness stands those up as inert placeholders.
**No inherited upstream file is modified to make this work**, and that
constraint is deliberate: gratuitous edits to inherited fork code are their own
failure mode.

### 2. Derive with a gate

When the fork exposes **data** but no callable answer, keep the local copy and
make a check re-derive it from the named source at the pin. A gate that
compares meaning, never one that compares bytes: a byte hash passes happily
while two sides mean different things, which is exactly how ticket 296's slot
unions stayed "in sync by inspection".

| What                                                                       | Gate                                                                        |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `ItemSlot`, `ITEM_SOURCE_KINDS`, `SIM_ORDER` hand-written in the fork port | `check_engine_port_drift.py` compares members, order-sensitive              |
| EP preset weights, ~20 files                                               | `check_ep_presets.py` reads the named symbol from the named file            |
| Meta-gem activation conditions                                             | `check_meta_conditions.py` compares counts, compare-colors and descriptions |

Each gate reads its own enum numbering out of the fork's generated proto rather
than restating it, so a renumbered enum cannot pass quietly.

### 3. Justify the copy

When nothing borrowable exists, keep the copy and **write down the
impossibility** with the command that shows it.

- **Cap and talent constants** (16% spell hit, 12.615385 rating/%, per-point
  talent values) live in `packages/core/src/cap-profile.ts` and `caps.ts`.
  The fork embeds these in Go sim logic (`sim/*/talents*.go`) and inherited
  upstream TS exports no constant for them:
  `grep -rn "SPELL_HIT_CAP" vendor/tbc-new-fork/ui --exclude-dir=upgrades`
  returns nothing. The `--exclude-dir` matters and the plan's claim C9 omitted
  it: without it the grep hits
  `upgrades/engine/cap-profile.ts:105`, which is **our own ported copy** of the
  constant, not an upstream source it could be derived from. There is no
  borrowable artifact, so the copy stands with its cited comments.
- **Badge, PvP and tier-token provenance.** The fork's `db.json` has **zero**
  `soldBy` entries — `grep -c '"soldBy"' vendor/tbc-new-fork/assets/database/db.json`
  returns `0` — and badge, PvP and token items carry a phase but no sources.
  Provenance is half of what the pool is for (ADR-0028), so it cannot be
  borrowed and the two-hop maps and AtlasLoot routing stay local. This is
  justified ownership, not deferred laziness.
- **`CURATED_SET_PHASE`** is an internal TS/Python twin, not a fork mirror, and
  is already gated by `check_curated_set_phase.py`.

## Capability is not membership

The distinction that makes all of this work, and the one the SME gate for this
branch named while ruling on two pool questions:

> `capabilities_auto_gen.ts` answers **"can this class equip it"**. That is the
> right question for a gear picker and the wrong one for an upgrade pool, which
> asks **"does this belong in this spec's list"**.

Borrowing the decision function is correct **and** does not subsume every pool
call. Where the two questions diverge, the pool's answer is a **policy
exclusion**, and a policy exclusion is first-class: named, justified by a
domain ruling, validated as non-empty, and published in the artifact rather
than hidden in the generator.

`SpecProfile` carries `policy_excluded_weapon_types` and `policy_two_hand_only`
alongside a mandatory `policy_exclusion_note`; constructing a profile with an
exclusion and no note raises. The note is published in each universe payload's
`d7Note`, so a reader of the committed artifact sees the overlay and its
reason. Two exist today, both from the SME gate
(`.scratch/handoffs/sme-rank-judgment-upgrades-dedup-wowsims-*.md`):

- **Ret is two-handers only.** A shield reads as a build recommendation, not as
  a low-ranked candidate, and this repo builds no holy or protection universe
  for one to belong to.
- **Feral excludes polearms.** TBC never itemised a polearm for druids — of the
  49 items carrying feral attack power, 39 are staves and 10 are maces, none a
  polearm — and in cat form the weapon is a pure stat stick, so a polearm with
  no feral attack power is a non-candidate rather than a low-ranked one.

A policy exclusion is **never** a place to work around a wrong equip answer.
That would reintroduce the drift the borrow removes.

The same gate also refused a third exclusion that looked symmetrical. Ret's
profile had omitted cloth armor, and it was the only spec that did — warrior,
the other plate class, already shipped 241 cloth pieces at p5. The omission was an
unexplained outlier rather than policy, so it was dropped. The SME further
found that **every back-slot item in the db is `armorType` cloth**, so a
plausible-looking "ret excludes cloth" rule would have deleted all 36 of ret's
cloaks, its top-ranked entry among them. A policy exclusion has to be scoped to
what it actually means.

## Consequences

- `scripts/assemble_universe.py` loses 182 lines and 53 hand-written constant
  call sites. `grep -cE "\b(two_hand_weapon_types|excluded_weapon_types)\b"`
  returns 0.
- `data/weapon-type-exclusions.json` is derived from the borrowed data rather
  than hand-written, and its two disagreements with the old hand rules (ret
  omitted OffHand; feral added Polearm) are resolved above.
- Four new or extended gates run on every `pnpm verify`, each mutation-tested.
- Two vocabularies remain unavoidable — this repo's spec slugs predate the fork
  — so `SLUG_TO_FORK_SPEC` is one flat 11-row map with no logic, asserted total
  and injective by `check_equip_eligibility.py`.
- Membership changed in 28 of 44 universes: 99 removals (off-hand-only weapons
  held by specs that cannot dual-wield — a class of bug the mirror could not
  see, since it had no off-hand check at all) and 306 additions (ret cloth).
  Every one is enumerated in the commit that made it.
- A future fork bump can now fail a check instead of silently changing a
  ranking. That is the point: these gates convert a class of silent wrongness
  into a build failure.
