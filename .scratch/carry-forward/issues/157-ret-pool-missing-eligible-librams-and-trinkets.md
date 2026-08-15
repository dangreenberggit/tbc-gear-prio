Status: open
Type: task
Origin: .scratch/handoffs/sme-rank-judgment-ret-p3-refresh.md (SME review of feat/ret-p3-data @ 9004654)
Blocks: none
Blocked by: none

# Ret pool excludes eligible librams and known TBC trinkets

The 2026-08-14 SME review of the ret P3 refresh (verdict:
trust-with-caveats) found two medium findings, both pool-membership, both
predating the `feat/ret-p3-data` branch. Evidence is in
`data/universes/ret-p3.report.json` under `wowheadRecall.missedItems`
(18 misses, 17 `d7Eligible: true`).

## Finding 1 — relic slot roughly half-empty

The P3 universe offers 4 ranged-slot items. Three more librams are
`d7Eligible: true` yet absent from the pool:

- 27484 Libram of Avengement — the 16th populated slot of upstream's
  curated P3 set, and the reason the tag match is 15/16
- 31033 Libram of Righteous Power
- 22401 Libram of Hope

Three of four missing relics are librams — one apparent cause. P2's relic
slot is thinner still (3 items), so this predates the P3 refresh.

## Finding 2 — known TBC ret trinkets missing

- 31856 Darkmoon Card: Crusade
- 28034 Hourglass of the Unraveller
- 28288 Abacus of Violent Odds

The other five misses are pre-TBC raid trinkets (Mark of the Champion,
Slayer's Crest, Drake Fang Talisman, Kiss of the Spider, Scrolls of
Blinding Light); excluding those is defensible.

## Done when

The pool-construction cause of the libram/trinket exclusions is identified
(hypothesis: one shared filter drops them), the eligible items above enter
the ret universes, and the affected universes regenerate with a recall
re-measure. The SME review's "would a ret trust this?" gate re-opens on the
result.
