Status: closed (2026-08-24, fork commit fe1e4ad42 — one SOURCE_LABELS map
exported from view.ts, consumed by the tab; old maps verified byte-identical
before merging; E-W3 green.)
Type: refactor
Origin: pre-merge review feat/upgrades-ui-fit, domain axis, 2026-08-24
Blocks: none
Blocked by: none

# Source-label truth is duplicated across two maps that already drifted

`SOURCE_LABELS` (`upgrades_tab.tsx`) and `ZONELESS_SOURCE_LABELS`
(`upgrades/engine/view.ts`) in the fork encode the same domain mapping
(source kind → display label). They drifted by one key — `heroic` — and
the drift shipped a real defect: heroic items filed under "Raid zones" as
a raw lowercase token (fixed at fork `e637fa284` by adding the key to the
engine map). Two copies of one truth made that bug possible and will make
the next one possible.

## Done when

- One map, exported from the engine, consumed by the tab; or a recorded
  reason the two must stay separate plus a check that fails when their
  key sets diverge.
