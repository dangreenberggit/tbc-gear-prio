Status: open
Type: bug
Origin: docs/reviews/feat-452-desktop-goldens.md (round 1, D1 and I6)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 363, 800, 820

# The candidate order ignores weapon damage, so a capped run can pick the wrong weapons

## What the player sees

With a candidate cap set, the tab sims only the first N candidates in its EP
order. That order gives a weapon no credit for its weapon damage. The case
seen: an enhancement shaman, `P3 Preset`, phase 4, cap 40, gets 40 main-hand
weapons that all lose DPS, 7 of them caster weapons with spell damage
(ticket 820, `data/desktop-gate/golden-enh-p4-cap40.json`). Every spec whose
weights value weapon damage can have its capped order skewed the same way;
what the list shows for specs other than enhancement is untested. The
uncapped default (`candidateCap` 0, ticket 363) sims every candidate, so its
numbers are right.

## Where (fork, at tbc-new-fork@b603564ee, read, not run)

- `epScore` (`ui/features/upgrades/model/engine/stats.ts:29-42`) sums the
  item's own stat array times the weights. The stat array is the item's own
  stats only (`model/engine/items.ts:26`) and holds no weapon damage.
- The tab loads each spec's weights with `.weights` only
  (`model/data/data.ts:39-51`, `epWeightsFor` `:147`), so a weights file's
  `pseudoWeights` never reach the order. In the enhancement file the tab
  reads, `model/data/enh-fallback.ep-weights.json`, `pseudoWeights` is
  `{"0": 8.19, "1": 3.59}`: main-hand DPS and off-hand DPS
  (`proto/common.proto:261-262`, `PseudoStatMainHandDps`,
  `PseudoStatOffHandDps`). Other files the tab reads with a weapon-DPS
  pseudo-weight: `rogue-fallback` (`{"0": 9.34, "1": 3.4}`),
  `warrior-fallback` (`{"0": 2.79, "1": 1.47}`), `ret-p2` (`{"0": 5.34}`) and
  `hunter-fallback` (ranged DPS, `{"2": 1.75}`).
- The order is `bestEpDelta` (`model/engine/candidate-order.ts:29-47`), and
  the cap keeps its first N (`model/engine/rank.ts:1486-1491`).

That this is the main reason enhancement's first 40 are all weapons comes
from the domain reviewer's rebuild of the order
(`docs/reviews/feat-452-desktop-goldens.md` D1): pricing two-handers against
both worn hands (ticket 820) still leaves 39 weapons in the first 40. Not
re-run for this ticket (hypothesis, untested here).

## Done when

The candidate order counts weapon damage at the weights' `pseudoWeights` for
every spec that has them, or the tab says in one plain sentence that the
order ignores weapon damage. `stats.ts` and `candidate-order.ts` are ported
engine files with twins in this repo (`packages/core/src/stats.ts`,
`packages/core/src/candidate-order.ts`); a change follows
`docs/agents/known-traps.md` § Before editing a ported engine file.

The core twins cannot follow the fork as they are: the core's item data,
`data/items/index.json`, has no weapon-damage field. This command, run from
the repo root on 2026-11-06, printed 8249 items and 15 keys, none of them
weapon damage:

```sh
python3 -I -c "import json; d=json.load(open('data/items/index.json')); print(len(d), sorted(set().union(*(i.keys() for i in d.values()))))"
```

The plan for this ticket picks one of two
options and says which: add weapon damage to the core's item data through
the data pipeline, so the twins stay at parity; or record a divergence in
the port's provenance row (`docs/fork-provenance/engine.md`) with the reason.

A change to the order can move every gated golden. Re-record each golden
that moves as `data/desktop-gate/README.md` § Regenerating a golden says,
and update or remove the `enh` entry in that README's § Known defects of a
golden.

## Comments

**2026-11-07, branch `fix/821-weapon-damage-order` (fork commit
`6cc79f742`, not yet on `dev`).** The tab's order now counts weapon damage.
It no longer scores items with the port's stats-only `epScore`; it calls
wowsims' own `EquippedItem.calcStats(slot)` and `Stats.computeEP`
(`ui/sim/proto/equipped_item.ts:10-26`, `:263-268`; the same two calls the
gear picker's `Player.computeItemEP` makes, `ui/sim/player/player.ts:1188-1206`)
at the weights file's `weights` plus `pseudoWeights` (new fork file
`model/item_ep.ts`, passed to the engine as `Deps.itemEp` from `model/run.ts`).
So a weapon's damage per second counts at the main-hand, off-hand or ranged
weight of the slot it would take. It does not call `computeItemEP` itself,
because that scores with the page's EP weights and the tab orders by its
bundled weights set. No wowsims file changed. The order is still an estimate:
procs, on-use effects and weapon speed are not scored.

Effect on the enhancement page (`P3 Preset`, phase 4), measured by running
the fork's real `orderCandidatesByEp` with `itemEpFor` over the test
database's pool (a throwaway test, not committed) and reading each position's
DPS from the uncapped readback
`.scratch/agent-reports/2026-11-07-candidate-cap-evidence/enh-p4-uncapped-readback.json`
(gitignored, main checkout): of the 14 real upgrades, the first is now
candidate 1 (Madness of the Betrayer), 4 are in the first 40 (Madness, Empty
Mug of Direbrew, Berserker's Call, Tsunami Talisman), and the last is
candidate 212 of 1024. The first 40 still hold 29 weapons, all losing DPS. The
committed golden's first 40 are 40 losing weapons and no upgrade.

Left before this ticket closes:

- **Owner decision: the core twins.** `packages/core/src/candidate-order.ts`
  and `stats.ts` still score by stats alone. Options as in "Done when": add
  weapon damage to `data/items/index.json` through
  `scripts/generate_item_gem_index.py`, or record a divergence in
  `docs/fork-provenance/engine.md`. Neither is done. Until then that file's
  rows are stale in text, not in hash: `candidate-order.ts` says "none (import
  paths only)" and `rank.ts` says M1's EP ordering is "ported unchanged". The
  hashes were updated, so `pnpm engine-port-drift:check` passes.
- **Re-record the goldens and the README's `enh` entry.** Not done, for the
  sandbox reason in ticket 820's comment of the same date.
