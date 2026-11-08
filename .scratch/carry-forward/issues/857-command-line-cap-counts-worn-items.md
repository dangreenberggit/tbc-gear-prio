Status: open
Type: bug
Origin: .scratch/agent-reports/2026-11-07-general-task-enh-39-rows.md (pair weapon-order, gitignored)
Blocks: none
Blocked by: none
Related: 821, 855

# The command-line candidate cap counts worn items against N

## What a user sees

With `candidateCap: N`, the command-line ranking can rank fewer than N items
the player does not wear. `packages/core/src/rank.ts` (about line 1178) keeps
`ordered.filter((e, i) => i < cap || equippedIds.has(e.itemId))`: a worn item
that the EP order puts inside the first N takes one of the N places, and worn
items are kept beyond N anyway. A worn ring or trinket can sort high, because
in the other ring or trinket slot it scores above the other worn piece.

The tab had the same rule. On 2026-11-07 the enhancement page (`P3 Preset`,
phase 4, cap 40) showed 39 rows: the worn Bloodlust Brooch sat at place 29.
The tab is fixed at fork `b71e25086` (branch `fix/821-weapon-damage-order`):
its cap keeps the first N items the player does not wear plus every worn one,
which is what `docs/plans/wowsims-tab/candidate-pool.md` test 7.1 says
("`candidateCap: 20` → 20 + owned rows"). `docs/fork-provenance/engine.md`
records the divergence on the `rank.ts` row.

## Done when

Core's cap keeps the first N items the player does not wear plus every worn
one, with a `packages/core/test/rank.test.ts` case under "candidateCap (7.1)"
where a worn item sorts inside the first N; and the `rank.ts` row in
`docs/fork-provenance/engine.md` drops the cap divergence. The command-line
tool is outside the tab's scope (ADR-0027), so this ticket does not block
the tab.
