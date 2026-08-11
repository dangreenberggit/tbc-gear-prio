# ADR-0024 — The opt-in view may score a set piece by the package it completes

**Status:** accepted
**Date:** 2026-08-10
**Amends:** ADR-0023 decision 2 (a package is disclosed, not scored), for the
opt-in view only. ADR-0023's decisions 1, 3, 4 and 5 stand unchanged.
**Implements:** `.scratch/set-bonus-value/spec.md` §2.1 and §4.1, both amended
2026-08-10
**Tickets:** `.scratch/carry-forward/issues/103-package-delta-reads-low-versus-a-regemmed-wowsims-run.md`
**Origin:** project owner's decision, 2026-08-10, amending a previously settled
one. Delivery shape from
`.scratch/handoffs/set-potential-weighted-toggle-scope-miss.md`.

## Context

ADR-0023 decided that a completion package is **disclosed as a card, never
scored onto rows**. That decision was made on a measurement argument: the figure
available to credit was `bonusDps`, inflated ~2.6× by a break confound that
cannot be removed after the fact, and "a wrong number in the ranking is worse
than a correct number in a panel."

The decision held, and it left a real question unanswered. On the feral P3
reference character the four Thunderheart rows read −106.16, −100.16, +21.75 and
+23.29 as single swaps, while the package they belong to is **+64.07**. Every
one of those rows is individually honest and the set of them is collectively
misleading: a reader scanning the ranking sees two large downgrades and concludes
T6 is not worth starting, when the measured answer is that it is. The panel says
so, but the panel is not what organizes the list.

The owner's framing: the point is to show "yeah, this piece in particular isn't
worth breaking the T4 set bonus, but it's ultimately worth it", and to let the
reader opt in to letting that organize the shortlist — so they can decide to
start collecting tier without waiting to own three other pieces.

### What changed since ADR-0023: the currency

ADR-0023 rejected per-row credit because the only figure on the table was
`bonusDps`. It is not the only figure. `packageDeltaDps` is a **different
measurement**, and the difference is the whole of this ADR:

|                  | `bonusDps`                                                 | `packageDeltaDps`                            |
| ---------------- | ---------------------------------------------------------- | -------------------------------------------- |
| how obtained     | derived: `packageDelta − Σ singles`                        | measured: one sim of the package vs baseline |
| break handling   | charged once in `packageDelta`, k times across the singles | inside the measurement                       |
| confound         | inflated by `(k−1)·B`, unseparable                         | none — nothing is derived back out           |
| T6 4pc, feral P3 | 193.89 (against ~73.5 isolated)                            | 64.07                                        |

ADR-0023 decision 3's own words: `packageDeltaDps` is "the only one that is
genuinely **net of any break**". The reason per-row credit was rejected therefore
does not apply to it. Crediting `packageDeltaDps` is not the alternative that ADR
considered and rejected.

## Decision

**1. The opt-in view may organize member rows by the whole-package figure.** A
row whose item id appears in a measured package's `packageItemIds` carries
`setContext.package`. Under the report's `package` display mode, the row sorts
and displays by `package.deltaDps`.

**2. The figure is `packageDeltaDps` and never `bonusDps`.** ADR-0023 decision 3
stands: a break-confounded `bonusDps` is suppressed from every sort key and
cutoff comparison, and is corrected nowhere. Package mode does not consult it.

**3. This is still not a per-piece split.** Spec §2.1 is intact. Every member row
of one package shows the **same** whole-package number, labelled as the
package's, and renders its own single-swap delta beside it. A split would give
four pieces four different shares and invent a value no piece delivers; this
shows one measured figure against several rows, which is the opposite operation.
The row label is load-bearing and is asserted in test.

**4. Membership is keyed on `packageItemIds`, not `nextThreshold`.** The two
disagree exactly where the feature matters. At 0 pieces worn every single swap
lands at `piecesAfterSwap === 1`, so ADR-0023 decision 1's walk stops at an
implemented 2pc and a threshold-keyed lookup reaches only the 2pc package's two
members — missing the two rows (shoulders, chest) whose invisibility prompted
this decision. Decision 1's threshold rule is unchanged; this simply does not use
it for membership.

**5. Only a measured, positive package is credited.** A package measuring ≤ 0
moves no row. Nordrassil's 4pc package measures −21.18 on the reference gear;
crediting it would demote its rows below their own honest deltas.

**6. The default view does not change, and neither does the bar.** Toggle off is
exactly today's order. `belowCutoff` is never recomputed from a package figure:
the report's package mode is a **re-sort of rows already rendered**, so a
below-cutoff member row rises within its section while keeping its muted marking
and its own sub-cutoff delta on screen. ADR-0020 is untouched — no threshold
moved, and no threshold was made to depend on the row set.

**7. Delivery is an in-browser toggle.** Both orders are embedded at generation
time (`data-delta`, `data-package`) and an inline `<script>` re-sorts the DOM.
`view.ts` stays a build-time library with no runtime reach-in. A previous attempt
at this feature shipped a CLI flag and was reverted for exactly that reason.

## Consequences

- A first tier piece is legible as a step toward a set without waiting to own
  three others — the outcome the owner asked for, and the one ADR-0023's
  package-as-card left to a panel the ranking did not reflect.
- Two figures now sit on one row (its own delta and its package's). That is
  deliberate and the label carries it; the risk it manages is a reader taking the
  package figure for the piece's own value.
- **Ticket 103 is disclosed, not fixed.** `packageDeltaDps` holds the player's
  current gem policy fixed, so it reads conservative against a re-gemmed wowsims
  run — +64.07 against a reported +97. The row line and the control's note say
  so. Being wrong in the conservative direction is the right way round, but the
  gap is ~30 DPS and a reader comparing the two would otherwise think one is
  broken.
- ADR-0023's core claim survives intact: no fraction of a package is attributed
  to any piece, and the confounded figure still reaches no sort key.

## Alternatives considered

**Leave ADR-0023 as it stands (package-as-card only).** Rejected by the owner on
the outcome: the panel discloses the figure but does not organize the list, so
the rows a reader actually scans still argue against starting the set.

**Credit a fraction of `packageDeltaDps` to each member row.** Rejected for the
reason ADR-0023 gave against splitting at all — a package is gained atomically at
a threshold, so a quarter-share corresponds to nothing measurable. The shipped
design shows the whole figure on every member instead.

**Recompute `belowCutoff` from the package figure**, so member rows enter the
shortlist proper. Rejected: it is not needed to get the owner's outcome (the
re-sort already surfaces them), and rewriting a cutoff verdict from a figure that
is not the row's own delta is the kind of move ADR-0020 exists to prevent.

**Fix ticket 103 first** by re-gemming the package. Rejected as out of scope and
wrong on its own terms: spec §2.2 requires byte-identical gem policy between
package and single swaps so PLAN.md §9's symmetry invariant holds by
construction. The conservatism is the price of that invariant, and ticket 103's
own recommendation is disclosure.

## Amendment, 2026-08-10 — package mode admits members into the curated list

Package mode did not deliver the outcome this ADR accepted it for. The owner's
stated intent was that it "organize the top area that ranks items for their
shopping list", and on the shredzepelin P3 report it could not: with package
mode selected and BiS-only on, Thunderheart Pauldrons (31048) and Chestguard
(31042) still did not appear in the Curated ranked list.

The cause is structural, not a sort bug. Chips are rendered from
`partitionShortlist`, which keeps only above-cutoff rows, so those two items had
**no chip element in the document at all**. The client-side script re-sorts and
filters chips; it cannot create one. No toggle state could ever have surfaced
them.

**Decision.** At the owner's direction, package mode admits package-positive
below-cutoff set members into the curated list _presentation_
(`packageOnlyShortlist`). Those chips are rendered in every document and shown
only under package mode, sorted by `packageDeltaDps`, carrying muted styling and
a tooltip saying the figure is the package's and the row is below cutoff as a
single swap. They keep their BiS tags, so the BiS-only filter includes them.

**Cutoff data is untouched.** `belowCutoff` is not recomputed, the rows stay
muted, and no count or sort key changes — this is the same
re-sort-not-repartition principle above, extended from rows to the chip strip,
plus render-but-hide so the other three modes stay byte-identical.

This does **not** reverse the rejected alternative "Recompute `belowCutoff` from
the package figure". That was rejected for rewriting a cutoff verdict from a
figure that is not the row's own delta, and nothing here rewrites a verdict: the
chip is a presentation element admitted under an opt-in mode, and the row it
points at still reads below cutoff wherever the cutoff is stated.
