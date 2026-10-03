Status: closed
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
- 2026-10-03, worked (main `6e2a8f8b` and `a96fc82d`; fork `4e807e900`
  and `d92c05941`). Not closed: an independent review comes first.
  Dispositions:
  - **Duplicated derivation:** fixed. `rank.ts` points at `netInflation`'s
    doc comment instead of repeating it.
  - **Duplicated comparator:** dropped. The two sorts use different fields
    (`threshold` in `brokenSetBonuses`, `count` in the `rank.ts` target
    ordering), so a shared comparator needs an adapter longer than the
    one-line sort.
  - **Inline keys:** fixed. `set-value.ts` exports `bonusKey`, used in
    `rank.ts`, `view.ts`, `partner-choice.ts` and `upgrades_tab.tsx`. The
    `rank.ts` ladder predicate keys by `count` inside one function and is
    left as it is.
  - **Unused fields:** fixed. `InflationKey` drops `setId` and `threshold`.
  - **Ticket-named constant:** fixed. `RULE_490` is now
    `DEFAULT_SET_CREDIT_RULE`; ADR-0034 and ADR-0035 follow.
  - **Dangling line:** fixed (`view.ts` header rewrapped).
  - **A4:** fixed. A3-U works out the raw figure from a modelled package,
    not from `netInflation`'s formula.
  - **A6:** fixed. Test 513-A6 checks `pairedSe` on values that spread; a
    mutation to `/ iterations` fails it and still passes 511-SR.
  - **A7:** fixed. 522-G's sim-failed check is gone: it cannot fail
    except by `applyCopies` finding no item row, which 522-G's per-request
    item check already catches on the baseline request, which uses the
    same composition. 522-C pins 7 consumable rows and 6 spell-effect rows.
  - **ST8:** partly fixed. `withSetValues` reuses `withValues`; both
    fork-gated suites import `SIM_ORDER` from `packages/core/src/slots.ts`;
    `check_layout_gate.py` imports `FIXTURE_DIR` from
    `check_tab_fixtures.py`. Dropped: `SIM_VERSION`, `ITERATIONS` and the
    one-line `RaidSimRequest` type in `fork-sim-database.test.ts` are
    scenario values, and sharing them would tie the suite to another
    suite's fixture module. Dropped: schema version `1` is written in
    TypeScript, Python and `.mjs` across two repos, and one source needs
    codegen. A different value in `record.mjs` fails
    `check_tab_fixtures.py`; a change to `fixture.ts` alone would make the
    tab refuse the committed fixtures that the layout gate renders
    (hypothesis, untested).
  - **ST10:** partly fixed. The one repeated predicate (the step branch of
    `setCreditUnmeasured` and the tab's unmeasured popover filter) is now
    `view.ts`'s `stepFutureUnmeasured`. Dropped: the other sites choose
    different behaviour per ranking kind, and merging them means splitting
    `view.ts` and the tab by ranking kind, a larger refactor than this
    ticket's tidy.
  - **ST11:** dropped. The extra `PartnerRule` values and the screen's
    "off" and "record" modes are what the K5P and K5E checks use to score
    the shipped rule (`partner-choice.ts` doc comment, `check_hooks.ts`),
    and `fork-set-net.test.ts` covers them. Removing them removes the
    means to re-run those checks.
  - **F1:** fixed. Both tool comments name `defaultSeedsFor` and
    `DEFAULT_SEED_BASE`, with no `rank.ts` line numbers.

## Closed 2026-10-03

Every item has a disposition in the 2026-10-03 comment above. An
independent reviewer passed the work with inline fixes, made in this close:
ADR-0034's paragraph on the default credit rule, the unused
`DEFAULT_SET_CREDIT_RULE` member of the `SubLineMod` test type, and the A7
reason above.

Fork commits (`dangreenberggit/tbc-new`, branch `feat/upgrades-tab`, not
pushed): `4e807e900` (engine and tab tidy, four PROVENANCE rows) and
`d92c05941` (F1 tool comments). Main commits: `6e2a8f8b` (tests),
`a96fc82d` (re-pin to `d92c05941`) and `2a47f885` (dispositions).

Evidence:

- The fork-gated suites (`npx vitest run` over the ten files
  `grep -l forkPresent packages/core/test/*.test.ts` lists): 148 passed,
  1 skipped, rc=0. E-W3
  (`npx vitest run packages/core/test/wowsims-fork-parity.test.ts`) rc=0
  before the hashes moved.
- Mutation checks. With `pairedSe` dividing by `iterations` instead of
  `iterations - 1`, test 513-A6 fails and 511-SR still passes. With
  `netInflation` subtracting `twoPcEnd`, A3-U fails. The reviewer's run with
  `DEFAULT_SET_CREDIT_RULE` set to "full-path" fails tests 502-D and 511-S2
  and the tab-fixture checks in `fork-set-fixtures.test.ts`.
- The reviewer's `pnpm tab-review` renders before and after the fork
  commits were byte-identical (reported by the reviewer; the renders are
  not committed). Their limit: no committed fixture reaches the changed
  step-unmeasured lines (the tab's unmeasured popover on a step ranking), so
  the renders do not test that change.
