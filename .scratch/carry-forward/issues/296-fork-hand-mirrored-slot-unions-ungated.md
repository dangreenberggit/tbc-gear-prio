# Fork's hand-mirrored slot unions have no semantic drift gate

Status: closed
Origin: pre-merge review feat/upgrades-all-dps-specs (adversarial A7)
Blocks: none
Closed: 2026-08-25

Fork `upgrades/engine/pool.ts` replaces the outer repo's generated/`Extract`ed
`SimSlotName` (and `ItemSlot`, `ITEM_SOURCE_KINDS`) with hand-written mirrors
and drops the three compile-time keep-assertions. Mirrors verified in sync
today, but `check_engine_port_drift.py` hashes bytes only — a slot added to
`slots-table.json` regenerates the outer union and leaves the fork copy stale
with a passing gate. Add the keep-assertions to the ported copy or extend the
drift check to compare the unions semantically.

## Resolution

Branch `feat/upgrades-dedup-wowsims`. The second option was taken: extend
`scripts/check_engine_port_drift.py` to compare the unions semantically, rather
than adding keep-assertions to the ported copy. Keep-assertions would have
needed the fork to import from `packages/core`, which it cannot.

Three unions are now compared member for member against their sources on every
`pnpm verify`: `ItemSlot` (fork `engine/pool.ts` vs `packages/core/src/items.ts`),
`ITEM_SOURCE_KINDS` (vs `packages/core/src/item-source-kinds.json`) and
`SIM_ORDER` (fork `engine/slots.ts` vs `packages/core/src/slots-table.json`).

The compare is **order-sensitive**, which matters more than the ticket
anticipated: `SIM_ORDER` indexes a 17-slot gear array, so a reorder with
identical membership is a real divergence that a set-compare would miss.

Mutation-tested one union at a time — an extra `ItemSlot` member, an extra
source kind, and a two-element `SIM_ORDER` reorder each fail with the union and
the delta named; reverting restores green. The exact scenario the ticket
describes (a slot added to `slots-table.json` leaving the fork copy stale) now
fails the build.

Recorded as the "derive with a gate" disposition in ADR-0029.
