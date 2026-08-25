# eligible_d7 re-implements wowsims' canEquipItem and drifted

Status: open
Origin: user, after pre-merge review feat/upgrades-all-dps-specs (root cause behind D1/A2)
Blocks: merge of feat/upgrades-all-dps-specs

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
