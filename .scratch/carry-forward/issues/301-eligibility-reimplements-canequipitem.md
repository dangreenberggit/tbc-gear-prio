# eligible_d7 re-implements wowsims' canEquipItem and drifted

Status: closed
Origin: user, after pre-merge review feat/upgrades-all-dps-specs (root cause behind D1/A2)
Blocks: merge of feat/upgrades-all-dps-specs
Closed: 2026-08-25

**Severity (user, 2026-08-25): MAJOR — potentially branch-invalidating.** The
user's words: an "absolutely absurd reinvention of the wheel", duplicating
code that wowsims already has — and duplicating it *badly* (the mirror
allowed a rogue a two-handed sword that wowsims' own gear picker refuses).
This is not a cleanup item: it is the seed from which the branch's worst
review findings grew, and the branch does not merge until the duplication
question is answered — either the mirror is mechanically derived and gated,
or eligibility moves to where `canEquipItem` already lives. The user's ruling
is about the problem (the duplication existing at all), independent of the
D1/A2 patches — those patches were not evaluated as an answer to it.

The pre-merge review found illegal two-handers in rogue/shadow/mage/warlock
pools (D1) and phantom offhand candidates (A2). Both were fixed
symptomatically, but the root cause stands: `eligible_d7` in
`scripts/assemble_universe.py` is a hand-written Python re-implementation of
the fork's own `canEquipItem` (`ui/core/proto_utils/utils.ts:1077-1117`) plus
per-profile constants hand-copied from `capabilities_auto_gen.ts`. wowsims'
gear picker already refuses a rogue a two-handed sword; our mirror silently
allowed it because it never encoded the per-type `canUseTwoHand` flag.

Any hand mirror of upstream eligibility will drift again. Options to evaluate:
derive the profile equip rules mechanically from the fork's
`capabilities_auto_gen.ts` (generated, committed, gated like the other
mirrors); or move eligibility filtering into TS where `canEquipItem` itself
can run; or add a check that regenerates the Python constants from the fork
file and diffs. Related: ticket 296 (fork hand-mirrored slot unions ungated) —
same failure class.

## Resolution

Branch `feat/upgrades-dedup-wowsims`. The second option was taken: eligibility
moved to where `canEquipItem` already lives, rather than deriving the constants.
Deriving them was rejected for the reason the ticket itself names — the bug was
the mis-ported `canUseTwoHand` *logic*, and a constants generator leaves that
logic in place to drift again.

A fork-side exporter
(`ui/core/components/individual_sim_ui/upgrades/tools/export_equip_eligibility.mts`)
runs the real `canEquipItem` over the fork's own `db.json` and writes per-spec
eligible item ids. This repo commits them as `data/equip-eligibility.json` and
looks items up in the set. `scripts/check_equip_eligibility.py` re-runs the
exporter at the pinned commit and diffs on every `pnpm verify`, so a fork-side
rule change fails the build instead of reaching a pool listing. The exporter
needs no edit to any inherited upstream file.

`scripts/assemble_universe.py` lost 182 lines and 53 hand-written constant call
sites; `grep -cE "\b(two_hand_weapon_types|excluded_weapon_types)\b"` returns 0.

The borrow immediately found a second instance of this ticket's own bug class:
the mirror had **no off-hand check at all**, so 99 off-hand-only weapons that a
non-dual-wielding spec can never equip were sitting in 24 committed universes.
Those are gone.

Where the fork's answer and the pool's needs genuinely differ, the difference is
now a named policy exclusion with a domain justification published in the
artifact, never a silent rule — see ADR-0029
(`docs/adr/0029-borrow-the-decision-derive-with-a-gate-or-justify-the-copy.md`).
