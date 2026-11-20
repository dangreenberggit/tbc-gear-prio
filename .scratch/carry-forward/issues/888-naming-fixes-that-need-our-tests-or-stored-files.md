Status: open
Type: task
Origin: docs/reviews/chore-344-pr-prep.md
Blocked by: none

# Naming fixes from the pre-merge review that need our tests or stored files

The 2026-11-19 pre-merge review of `chore/344-pr-prep` found these four
problems. Each fix needs an edit in this repo's fork-loading tests, its
stored recordings and fixtures, or a doc under `packages/`, which that
review was not allowed to make. The review fixed everything that lived only
in the fork.

The owner has not agreed to put these off. The review recommends fixing
them on `chore/344-pr-prep` before the merge ask, so its Disposition rows
become `fixed` and this ticket closes.

Paths are relative to `vendor/tbc-new-fork/ui/features/upgrades/` unless
they start with `packages/`. Line numbers are at fork `e08efd6ec` and our
`b5d48f5f`. Fork edits under `model/engine/` need the ported-file cycle
and a re-pin (`docs/agents/known-traps.md` § Before editing a ported
engine file).

## Items

- **N-1: `bonusGearMeasured` says "measured" but marks the method.**
  `model/engine/rank.ts:286` is set on every row of a ranking made with
  `measureSetBonuses` (`rank.ts:3139`), even when a bonus was not measured.
  So `setCreditUnmeasured(ctx) && ctx.bonusGearMeasured`
  (`model/set_bonus_popover.ts:123`) reads as "unmeasured and measured".
  The review added a comment that says what it marks
  (fork `9f8dd091a`). The full fix is a rename, for example to
  `bonusGearRanking`, in code and in the stored files:
  - Fork: the field and every reader (`rank.ts`, `view.ts`,
    `set_bonus_popover.ts`, `set_bonus_labels.ts`,
    `components/SetBonusPopover/SetBonusPopover.tsx`, tests,
    `testing/ranking_fixture.ts`), and the key in
    `testing/set_bonus_popover_on.snapshot.json`.
  - Ours: `packages/core/test/fork-set-net.test.ts`,
    `fork-set-fixtures.test.ts`, `tab-fixtures/make-mock-fixtures.ts`; the key
    in the 6 recordings under `packages/core/test/fixtures/tab-recordings/`
    (707 keys across the 18 stored files, by the review's count), done by
    script with a proof as batch 4 did; regenerate the 11
    `data/tab-fixtures/mock-*.json`; the recordings README's rename list.
- **N-6: `hitCap` holds the hit budget.** The review's chosen word is "hit
  budget" (`GemContext.repairHitBudget`), but meta repair calls the same
  value `hitCap`:
  - Fork: `model/engine/meta-repair.ts:88-105` (`valueModel` param),
    `:123`, `:144`, `:258`, `:274`, `:338`, `:354` (the options field);
    `model/engine/rank.ts:712`, `:724`, `:734` (`wornHitCap`) and `:3623`.
  - Ours: `packages/core/test/fork-meta-repair.test.ts:56`, `:63`, `:332`,
    `:340`, `:983`, `:1105`; `packages/core/test/meta-repair-oracle.ts:49`,
    `:109`, `:133-134`, `:169-172`.
  - Rename to `hitBudget` and `wornHitBudget`.
- **N-7: the bonus term's `have` is the pieces worn.**
  `model/engine/view.ts:52` (`have: number`), set at `:343` from
  `piecesWornBefore` and read as `worn: term.have` at
  `model/set_bonus_popover.ts:163`. Rename to `worn`. Ours:
  `packages/core/test/fork-set-net.test.ts:1483`, `:2256`, `:2265`.
- **B-2: the recordings README leaves out one renamed key.**
  `packages/core/test/fixtures/tab-recordings/README.md:33-37` lists six of
  the seven keys batch 4 renamed; `stepGearSe` → `bonusGearSe` is missing.
  Add it after `stepGearDps` → `bonusGearDps`.
