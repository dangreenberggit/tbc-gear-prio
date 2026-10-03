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

## Comments

- 2026-10-02, pre-merge review round 10 of feat/tab-signoff-followups
  (`docs/reviews/feat-tab-signoff-followups.md`). More optional items, each
  found by reading the code at main `fbd2e3df` / fork `f09d218e`:
  - **A6.** The `pairedSe` figures in `fork-set-net.test.ts` are only ever
    tested with zero spread: the fake sim fills `allValues` with one
    constant (about line 492), so a wrong formula at fork
    `engine/set-screen.ts` about line 472 would still pass. Record mode
    only.
  - **A7.** In `fork-sim-database.test.ts`, the 522-G "no sim-failed rung"
    check (about line 341) cannot fail, because the stub sim never
    rejects; the 522-C expected counts (about line 244) repeat the `want`
    value from the line before.
  - **ST8.** `withValues` (`fork-set-net.test.ts` about line 2735) repeats
    `withSetValues` (about line 1231). `SIM_ORDER`, `SIM_VERSION`,
    `ITERATIONS` and `RaidSimRequest` are declared again in
    `fork-sim-database.test.ts` (about lines 352-373). `FIXTURE_DIR` is in
    both `scripts/check_layout_gate.py` and `scripts/check_tab_fixtures.py`.
    The fixture schema version `1` is written in three places
    (`adapters/fixture.ts`, `check_tab_fixtures.py`, `record.mjs` about
    line 346).
  - **ST10.** The same `stepRanking` branch recurs at fork `view.ts` about
    lines 255, 331, 501, 572 and `upgrades_tab.tsx` about lines 489, 518.
  - **ST11.** `PartnerRule` keeps "sum-of-singles-plain" and "single-swap"
    for scoring only, and `setScreen` "off"/"record" are reachable only
    through the dev check hooks.
- 2026-10-02, independent review of ticket 530 (fork `b1eb1de85`), finding
  F1. Ticket 530 removed `DEFAULT_SEEDS` from fork `engine/rank.ts`, but
  two fork tool comments still name it:
  - `upgrades/tools/equiv-campaign.mts`, in the comment above the
    `rankUpgrades` call that says the engine reads
    `input.seeds ?? DEFAULT_SEEDS`;
  - `upgrades/tools/run-tab-cdp.mjs`, in the comment that calls 11 the
    tab's baseline seed (`DEFAULT_SEEDS[0]`).

  Fix: reword the first to `input.seeds ?? defaultSeedsFor(iterations)`
  and the second to `DEFAULT_SEED_BASE`, and drop the `rank.ts` line
  numbers both comments cite. Comment-only, in files outside `engine/`,
  so no PROVENANCE row moves; it still needs a fork commit and a re-pin.
