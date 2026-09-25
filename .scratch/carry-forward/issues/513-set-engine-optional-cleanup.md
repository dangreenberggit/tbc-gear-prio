Status: open
Type: task
Origin: docs/reviews/feat-tab-signoff-followups.md (targeted engine review 2026-09-25, finding S6)
Blocks: none
Blocked by: none
Related: 476, 478, 490

# Optional cleanup in the set-bonus engine and its tests

## Evidence

From the standards axis of the targeted engine review
(`.scratch/stage-gate/upgrades-tab-closeout/engine-review/standards-spec.md`,
S6). All paths are under
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/`.
Line numbers are at fork `7ed8c9941`.

- **Duplicated derivation.** The inflation derivation is written out twice:
  in `set-value.ts` (`netInflation`'s doc comment, about lines 278–289) and
  in `rank.ts` (the block ending near line 2017).
- **Duplicated comparator.** Sorting by `setId`, then by threshold
  descending, appears in both `brokenSetBonuses` and the `rank.ts` target
  ordering.
- **Inline keys.** The `${setId}:${threshold}` key is built inline in about
  six places, although `rank.ts` has a `breakKey` helper.
- **Unused fields.** `InflationKey.setId` and `InflationKey.threshold` are
  not read by `netInflation`.
- **Ticket-named constant.** `RULE_490` in `view.ts` is named after a
  ticket, not after what it selects.
- **Dangling line.** A rewrap of the `view.ts` header (about line 8) left a
  line ending "— rather".

Added from the adversarial axis
(`.scratch/stage-gate/upgrades-tab-closeout/engine-review/adversarial.md`,
A4), not in the round's fix list: test A3-U in
`packages/core/test/fork-set-net.test.ts` works out its expected value with
`netInflation`'s own formula, so it cannot disagree with the code. Fixture
476-B pins the sign through the model.

## What would close this

Each item is optional. For each, either make the change, or note here why
it stays. An engine change needs the PROVENANCE cycle in
`docs/agents/known-traps.md` § Before editing a ported engine file.
