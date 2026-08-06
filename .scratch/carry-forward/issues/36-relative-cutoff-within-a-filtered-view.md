Status: open
Type: question
Origin: `docs/reviews/phase-2-apply-view.md` (adversarial A3), branch `phase-2/apply-view`
Blocks: none
Blocked by: none

# Does §12's "cutoff within the filtered view" mean a *relative* cutoff?

`applyView` recomputes `belowCutoffInView` after filtering, per PLAN.md §12:

> Filtering is the second mechanism that hides rows, alongside the below-cutoff
> expand. They compose as **filter first, then apply the cutoff within the
> filtered view** — because a 2 DPS gain may be the best thing available in one
> specific raid, and hiding it there would answer the user's actual question
> with "nothing".

The pre-merge review pointed out that as implemented this recomputation can
**never change a value**. `CUTOFF` is a pair of absolute constants
(`{ absDps: 3.4, pct: 0.15 }`), and `meetsCutoff` reads only `deltaDps`,
`deltaPct` and that constant — none of which filtering alters. So
`belowCutoffInView === belowCutoff`, always.

That is not a bug in the ordering. Filtering never *deletes* a row, so the
small-gain row §12 is worried about does still appear under its raid filter,
flagged rather than absent. The open question is narrower:

**Did §12 intend the threshold itself to be relative to the filtered set?**

Two readings, and they differ in what the user sees:

1. **Absolute (shipped).** "Best available in this raid" is still below cutoff
   and is displayed behind the expand. The user filtering to Karazhan sees the
   rows greyed. Honest about magnitude — a 2 DPS gain *is* noise at SE ~2 —
   but arguably still answers "nothing" in the way §12 objects to.
2. **Relative.** Recompute the cutoff against the filtered maximum, so the top
   of each filtered view is always above the line. Answers the user's question
   directly, but promotes noise to a recommendation and would make the same
   item read as an upgrade in one filter and not in another — which collides
   with §2's "no view changes a number".

Reading 2 conflicts with a stated product constraint, so the shipped behaviour
is the conservative choice, not an oversight. But the field and its comment
should not imply a recomputation that does not happen, and §12's wording should
be tightened once this is settled.

## Done when

Either §12 is amended to say the cutoff is absolute and the redundant
recomputation is collapsed, or a relative cutoff is specified and implemented
with a test showing a row above the line in one filter and below it in another.
