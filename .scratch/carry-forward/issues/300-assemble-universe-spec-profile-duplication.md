# assemble_universe.py: nine spec profiles duplicate ~200 comment/constant lines

Status: open
Origin: pre-merge review feat/upgrades-all-dps-specs (standards axis)
Blocks: none

The nine new `*_TIER_PIECE_IDS` frozensets and `SpecProfile` blocks repeat
byte-identical comment triplets and `_ep_weights_map` pairs. A table + loop
(spec -> setIds, gear-set globs) would cut ~200 lines and state each WHY once.
Judgement-call refactor; behavior must stay byte-identical (universes cmp).
