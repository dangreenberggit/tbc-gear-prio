Status: open
Type: task (presentation; no ranking-logic defect)
Origin: `sme-rank-review` verdict during ticket 222, 2026-08-18 — verdict
  `trust-with-caveats`, handoff at
  `.scratch/handoffs/sme-rank-judgment-ticket-222-within-slot-ordering.md`
Blocks: none
Blocked by: none

# Screened rows are presented as an ordered list in slots where no order exists

## The finding

Ticket 222 measured within-slot ordering below the promotion floor and closed
its ranking question: the sort order is defensible. Among pairs whose recorded
truth separates them by more than the pairwise noise scale (√2·SE = 7.25 DPS),
the inversion rate is **0.67%** (587 of 88,046 over 30 draws), and **0.4%** in
the weapon slot — the 78-row list users actually read. Re-run with:

```
npx tsx packages/core/test/measure-within-slot-ordering.ts
```

**What ticket 222 deliberately left open is the presentation.** Two slots have
no resolvable order at all:

| slot | rows | pairs | raw inv% | truth-resolvable pairs |
| --- | --- | --- | --- | --- |
| trinket | 12 | 66 | 43.2% | **0** |
| finger | 11.7 | 63 | 45.9% | 5 of 63 |

Zero of trinket's 66 pairs are separable at screening precision. The product
nonetheless presents those 12 trinkets as an ordered list.

## Why this is a game fact, not a precision failure

From the SME handoff, and the reason more iterations cannot fix it: TBC
itemises trinkets as an **effect**, not a stat line, and the Phase 3 feral
trinkets converge on a budgeted tie from two directions — static agility/AP
versus proc/on-use. Rings below the top one or two are famously flat. The items
really are equivalent in DPS terms; there is no hidden ordering to recover.

Engineering should not chase the 43% figure as a bug.

## Why the existing structural signals are not enough

The current design distinguishes screened rows by `rank: null`, sorting them
below every full-iteration row, and giving them their own tie groups
(`rank.ts:1558-1562`, `:1576-1579`; `view.ts:328-335`, `:239-248`).

The SME's judgment is that this does not do the work: **a list in an order reads
as a ranking** to anyone who has read a BiS thread. A feral scanning 12 trinkets
numbered 1..12 chases the first one, when the honest answer is that all 12 are
the same and the decision should turn on drop source, cooldown alignment with
Tiger's Fury and Berserk, and fight length — none of which is in the DPS number.
An ordered list actively hides the real decision.

The stated risk is spillover: a user who sees an overconfident trinket list and
later learns those items were indistinguishable discounts the whole tool,
including the weapon slot where the ordering is genuinely excellent.

## The proposed change

Group ties by the **measurement's own resolution** rather than by exact
equality, and mark such slots as tied sets rather than ordered lists.

Per the SME, this needs **no reordering, no extra iterations, and no row
removal** — the per-candidate screening SE is already known (mean 5.128 DPS at
1,000 iterations; pairwise scale √2·SE = 7.25 DPS, measured in ticket 222).

## Acceptance criteria

- [ ] Tie grouping for screened rows keys off the measurement's resolution
      (per-candidate SE) rather than exact delta equality, in both `rank.ts` and
      the view layer, which currently mirror each other.
- [ ] A slot whose screened rows are all within the noise band renders as a
      tied set rather than a numbered order, so it cannot be read as a ranking.
- [ ] The feral Phase 3 trinket slot (0 of 66 resolvable pairs) is verified to
      render as a tied set, and the weapon slot (2,751 resolvable pairs, 0.4%
      inversion) is verified to keep its ordering.
- [ ] `sme-rank-review` judges the revised presentation, and its verdict is
      recorded here.
- [ ] `pnpm verify` green.

## Out of scope

- Changing `DEFAULT_PROMOTE_TOP_J`, `DEFAULT_PROMOTE_TOP_K`, or the promotion
  rule. Ticket 222 measured the floor as inert on this pool at K=150 and K=210
  alike, for reasons of pool shape rather than the K value; nothing here argues
  for a defaults change.
- Re-measuring the ordering. Ticket 222 did that; this ticket consumes its
  numbers.
- Dropping screened rows from the output. They are informative; the issue is
  the ordering they are presented in, not their presence.
