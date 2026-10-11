# Feral token map lacks the three Sunwell token entries

Status: closed
Origin: pre-merge review feat/upgrades-all-dps-specs (domain D3; pre-existing)
Blocks: none

Tokens 34852/34855/34858 -> Harness pieces 34444/34556/34573 are unmapped in
`data/two-hop/feral-tokens.json` (its note 7 acknowledges this). Balance maps
the same tokens, so the grouping is proven; only feral's piece ids are absent.

## Closed 2026-10-11 — superseded by ticket 609

Ticket 609 (`609-generate-tier-token-tables-from-atlasloot-and-wowsims-db.md`)
replaces the hand-written token tables with ones generated from AtlasLoot
and the wowsims database. Its close condition 3 requires 34444, 34556 and
34573 in `data/universes/feral-p5.json`, which covers this ticket's three
unmapped tokens (34852, 34855, 34858). A prototype of that generator added
exactly these three feral rows and matched the 195 existing rows. The
owner asked for a programmatic fix on 2026-10-11 (quoted in 609).
