Status: open
Type: bug
Origin: pre-merge review feat/tab-wowsims-items, D1
Blocks: none
Blocked by: none
Serves: .scratch/plans/upgrades-tab-finish-line.md, Tab-adjacent follow-on
Related: 505

# Off-spec tier pieces show "Source not recorded"

## What the player sees

Healer and tank tier pieces in a DPS run, for example Justicar Armor
(29066-29070) in ret's list, show "Source not recorded". Unticking their raid
zone does not hide them, and the TMB export gives the piece id where it should
give the token id. `data/tab-fixtures/ret-p3-p2.json` holds 30 such rows and
`feral-p5-th4pc.json` 18; all sit below the cutoff (best -55.7).

## Cause

`scripts/generate_fork_exchange.py` builds token rows only from the 11 DPS
specs' `data/two-hop/<spec>-tokens.json`. The run-time pool admits every tier
set a class can wear, so 108 pieces have no row (domain axis count over
db.json and `data/two-hop/tier-exchange.json`).

## Done means

Every tier piece the pool can admit has a token row in
`data/two-hop/tier-exchange.json`, built from the same AtlasLoot token data
(the owner's allowed exception), with `pnpm fork-exchange:check` gating it.
