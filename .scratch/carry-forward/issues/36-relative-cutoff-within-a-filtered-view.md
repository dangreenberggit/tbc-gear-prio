Status: open
Type: question
Origin: `docs/reviews/phase-2-apply-view.md` (adversarial A3), branch `phase-2/apply-view`
Blocks: none
Blocked by: none

# §12 says the cutoff applies "within the filtered view" — but the cutoff is a constant, so nothing is recomputed

**Rewritten 2026-08-05.** The first draft asked whether the cutoff should be
"relative", without saying relative *to what*, or a cutoff *of what*. Both
omissions made it unanswerable, and "relative cutoff" is worse than vague — it
reads as proposing the `pct` term that already exists. Stated properly below.

## What the cutoff is

The threshold below which a candidate item is judged indistinguishable from
noise and is flagged `belowCutoff` (hidden behind an expand, never deleted).

It is applied to **`deltaDps`** — the sim'd DPS change from swapping that one
item into the player's logged gear — and to `deltaPct`, the same quantity as a
percentage of baseline DPS. `packages/core/src/cutoff.ts`:

```ts
export const CUTOFF = { absDps: 3.4, pct: 0.15 } as const;
meetsCutoff = (deltaDps, deltaPct, c) => deltaDps >= c.absDps || deltaPct >= c.pct;
```

Both terms are **constants**, derived once from the five-seed spread experiment
(§10: `max(3.0, 2 × mean reported SE 1.678)`), not from the ranking they judge.

## The observation

`applyView` recomputes `belowCutoffInView` after filtering, per §12:

> They compose as **filter first, then apply the cutoff within the filtered
> view** — because a 2 DPS gain may be the best thing available in one specific
> raid, and hiding it there would answer the user's actual question with
> "nothing".

The review noted this recomputation **can never change a value**. `meetsCutoff`
reads `deltaDps`, `deltaPct` and a constant; filtering changes which rows are
present, never any row's numbers. So `belowCutoffInView === belowCutoff` for
every row, in every view.

That is not a bug in the *ordering* — filtering never deletes a row, so the
small-gain row §12 worries about does still appear under its raid filter,
flagged rather than absent. The question is whether §12 wanted more than that.

## The actual question

**Should the threshold be a function of the filtered set rather than a constant?**

Concretely, the candidate reading is: recompute the bar against the best delta
*within the current filter*, so the top row of any filtered view is always above
the line. Filter to Karazhan and the bar derives from Karazhan's best row
instead of sitting at a flat 3.4 DPS.

Two consequences, and the second is why this is a question and not a task:

1. It answers the user's question directly. "What should I want from Karazhan
   tonight" never returns an all-grey list.
2. **The same item would read as an upgrade in one filter and noise in
   another**, with an unchanged `deltaDps`. That collides with §2's "no view
   changes a number" and with the whole reason `ViewOptions` sits outside
   `contentHash`. It also promotes genuine noise — a 2 DPS delta at SE ≈ 2 is
   not distinguishable from zero, and saying "best in Karazhan" does not make it
   so.

The shipped behaviour (absolute) is therefore the conservative choice, not an
oversight. But the field and its comment must not imply a recomputation that
does not happen, and §12's wording invites exactly that reading.

## Done when

Either:

- §12 is amended to say the cutoff is absolute and that "within the filtered
  view" governs only the *ordering* (filter never deletes), and the redundant
  recomputation in `applyView` collapses to reusing `belowCutoff`; or
- a filtered-set-relative threshold is specified — including how it survives
  §2's "no view changes a number" — and implemented with a test showing one row
  above the line in one filter and below it in another.
