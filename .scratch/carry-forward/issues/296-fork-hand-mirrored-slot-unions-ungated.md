# Fork's hand-mirrored slot unions have no semantic drift gate

Status: open
Origin: pre-merge review feat/upgrades-all-dps-specs (adversarial A7)
Blocks: none

Fork `upgrades/engine/pool.ts` replaces the outer repo's generated/`Extract`ed
`SimSlotName` (and `ItemSlot`, `ITEM_SOURCE_KINDS`) with hand-written mirrors
and drops the three compile-time keep-assertions. Mirrors verified in sync
today, but `check_engine_port_drift.py` hashes bytes only — a slot added to
`slots-table.json` regenerates the outer union and leaves the fork copy stale
with a passing gate. Add the keep-assertions to the ported copy or extend the
drift check to compare the unions semantically.
