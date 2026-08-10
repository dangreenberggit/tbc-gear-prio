Status: open
Type: bug
Origin: pre-merge review of `feat/set-bonus-value`, 2026-08-10 (spec axis)
Blocks: none
Blocked by: none

# the Set potential panel is default-off, so the bonuses only it can carry stay unseen

Ticket 91 shipped **package-as-card**: a set-completion threshold whose bonus
reaches no row — the 4pc case at 0 pieces worn — is surfaced in the Set
potential panel instead of being smeared onto member rows. That panel is the
*only* surface those bonuses reach.

But the panel is gated off by default:

```
packages/core/src/rank-report.ts:382   withSetPotential && ranking.setBonuses?.length > 0
packages/core/src/rank-report.ts:209   const withSetPotential = meta.view?.withSetPotential === true;
```

and `spec.md:95` defines `ViewOptions.withSetPotential` as **default off**. So
the 4pc figure that reaches no row also reaches no *default reader*. Ticket
90's requirement to keep a break-confounded figure "still disclosed in the Set
potential panel" inherits the same gap.

The contrast makes it sharper: the plausibility panel added by ticket 98 renders
**unconditionally** (`cli.ts`, "Unconditional, unlike the set-potential block
below"). A warning that says "check what this package breaks" can therefore
render while the package it refers to does not.

## Why this is not simply "flip the default"

`withSetPotential` being default-off is a **deliberate spec decision**
(`spec.md` §4, §2.4), not an oversight, and it governs more than this panel —
it also gates the per-row set-potential column and the sort-key change. Turning
it on by default changes the default view of every report and would need its own
spec amendment. That is why this is filed rather than fixed in the review.

## Options, none chosen here

1. **Decouple the panel from the sort/column toggle.** Render the Set potential
   panel whenever `ranking.setBonuses` is non-empty, while leaving the per-row
   credit and the sort key behind the existing default-off flag. The panel is
   pure disclosure — it moves no number — so showing it does not violate the
   spec's reason for the default.
2. **Amend the spec** to make `withSetPotential` default-on.
3. **Accept it** and record that set-completion information is opt-in, which
   means the fix for ticket 91's user-facing complaint ("T6 chest/shoulders
   never surface") only lands for readers who pass the flag.

Option 1 looks right — the spec's default-off rationale is about not changing
the ranking, and a disclosure panel does not — but it needs a decision, not a
reviewer's guess.

## Interaction with ticket 96

Ticket 96 (BiS-tagged items ranked below cutoff) is expected to be answered by
this panel. If the panel is invisible by default, ticket 96's contradiction
stays visible by default while its explanation does not. Resolve this one first.
