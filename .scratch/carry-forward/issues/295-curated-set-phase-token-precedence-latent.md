# curatedSetPhase first-match scan has no tier-vs-phase precedence

Status: open
Origin: pre-merge review feat/upgrades-all-dps-specs (adversarial A5)
Blocks: none

`packages/core/src/rank-report-rules.ts` resolves a curated-set label's phase
by the first underscore token found in a flat map that now mixes `p1..p5` with
`t4/t5/za/t6/swp`. A label carrying both vocabularies resolves by position,
not precedence. No vendored label collides today (checked) — latent, not
live. Add a precedence rule or an assertion that a label matches exactly one
vocabulary.
