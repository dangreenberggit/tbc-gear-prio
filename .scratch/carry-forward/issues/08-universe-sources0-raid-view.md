Status: resolved
Type: bug
Origin: docs/reviews/phase-1-five-seed-spread.md
Blocks: phase-1
Blocked by: none

# Universe loader keeps only sources[0] for raid view

## Problem

`poolEntryFromUniverse` collapses `sources[]` to `sources[0]`. Report-time
`--raid` / `filterByZone` therefore miss items whose matching zone is not
first (e.g. Crystalforge Breastplate `30129` with SSC after TK; dual-zone
trash with Hyjal-first then BT).

Spec/subplan 04 asked to keep multi-source rows and match if **any** source
zone matches.

## Done when

- Rank/report path can filter by zone against the full `sources[]` (or an
  equivalent multi-zone view), not only the primary source.
- Dual-zone fixtures in tests cover at least one of the known IDs above.

## Resolution (2026-07-28)

`PoolEntry.sources` retained from the universe row; `filterByZone` /
`zonesInPool` match any source with a zone. Ranked items carry `sources`
through for report-time `--raid`. Test covers Crystalforge `30129` SSC/TK.
