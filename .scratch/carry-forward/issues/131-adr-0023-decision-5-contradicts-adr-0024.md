Status: open
Type: docs
Origin: pre-merge review of `feat/set-bonus-value`, round 3, 2026-08-12 (spec axis, 3-S1)
Blocks: none
Blocked by: none

# ADR-0023 decision 5 now contradicts ADR-0024 and the shipped code

ADR-0023's header states that "Decisions 1, 3, 4 and 5 stand as written."
Decision 5 reads:

> A row may point at the panel, but never restate its figure… It carries no
> number — restating any part of a break-confounded figure on a row would
> reintroduce decision 3's failure by another route.

ADR-0024's 2026-08-11 amendment, item 5, does the opposite: the pointer "now
states the set's measured package figures itself." The code follows ADR-0024 —
`formatCuratedPackagePointer` emits lines of the form
"its measured packages: 2pc +11.31 / 4pc −6.83".

The behaviour is defensible. Decision 5 was protecting against restating a
**break-confounded** figure, and what the pointer restates is
`packageDeltaDps` — a directly measured package-versus-baseline delta, not the
derived `bonusDps` that carries the confound. So the reasoning behind decision 5
does not actually apply to the number now shown.

But no document says that. ADR-0023 was amended this round for ticket 119 and
this contradiction was left standing, so the two ADRs now give opposite
instructions to the next reader, and the one that matches the code is not the one
that claims to still stand.

## Fix

One sentence in ADR-0023 narrowing decision 5 to `bonusDps` specifically, and
noting that ADR-0024 permits a row to restate the measured `packageDeltaDps`
because that figure carries no break confound.

## Acceptance

- [ ] ADR-0023 decision 5 names which figure it forbids restating.
- [ ] A reader of either ADR alone reaches the behaviour the code implements.
