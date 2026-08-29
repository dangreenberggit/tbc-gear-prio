Status: open
Type: task
Origin: Owner review of the running tab, 2026-08-27
Blocks: none
Blocked by: none
Related: 312 (the toolbar/label redesign this rides along with)

# "Include set-bonus potential" should show how much of the number is the set bonus

Owner's words: *"include set bonus potential should also include a tiny bit of
info indicating how much is from the set bonus."*

Today the toggle changes the ranking values and says nothing about **why** a row
moved. A reader turning it on sees numbers shift with no way to tell how much of
any row's figure is the item itself versus the set bonus it is credited toward.

## The data already exists — this is a display gap, not a modelling one

`RankedItem.setContext` (`packages/core/src/rank.ts:309-330`) already carries,
per row:

- `prospectiveBonusDps` — the bonus not yet inside `deltaDps`. **This is the
  number the owner is asking for.**
- `crossesThreshold` — `true` means the bonus is *already* inside `deltaDps`, so
  there is no separate figure to show and the row must not imply one.
- `setName`, `piecesWornBefore`, `piecesAfterSwap`, `nextThreshold` — enough to
  say "3/5 → 4/5 Tier 6" without inventing anything.
- `prospectiveBonusBreaks` — non-empty means the figure is **confounded** and is
  disclosed but never ranked on (ticket 90).

And the formatting already exists:

- `formatSetPotentialLine` (`packages/core/src/rank-report-rules.ts`)
- `formatPackageMembershipLine` (same file, ~:669)
- `SET_POTENTIAL_WEIGHTS` (~:584) — the 2-piece/4-piece discount the displayed
  value credits.

So this is the same shape as ticket 311's presentation half: **a helper that
already exists on the report path was never wired into the tab.** Borrowing, not
inventing — which is the theme of the owner's whole original review.

## What to build

A compact secondary line or badge on rows that have a set context, shown when
the set-potential toggle is on. "Tiny bit of info" is the owner's own scoping —
this is a sub-line, not a column, and not a redesign of the row.

## The traps — read before writing a number on screen

1. **Do not show a bonus that is already counted.** When
   `crossesThreshold === true` the bonus is inside `deltaDps` already; showing
   `prospectiveBonusDps` beside it would double-count in the reader's head.
   These are two different states and must read differently.
2. **A confounded figure must not be presented as fact.** Non-empty
   `prospectiveBonusBreaks` means the number is inflated by `(k−1)·B` with no
   way to separate it after the fact. Ticket 90 already ruled such a figure is
   disclosed but never ranked on; whatever this ticket shows must keep that
   distinction visible rather than flattening it.
3. ~~**The displayed value is discounted.**~~ **CORRECTED 2026-08-27 — this trap
   does not apply on the tab, and following it would have introduced the bug it
   warns about.** `SET_POTENTIAL_WEIGHTS` (0.5 / 0.25) governs the **report**
   path. The fork's own view does not discount: `rankableSetPotential`
   (`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/view.ts:169-172`)
   returns the raw `prospectiveBonusDps` (zeroed when confounded), and the view
   adds it straight to `deltaDps` — `const effectiveDps = item.deltaDps +
   prospective` (`view.ts:163`). The row displays raw `deltaDps`
   (`formatDelta(row.deltaDps)`, `upgrades_tab.tsx:1606`).

   So **the number to show is the raw `prospectiveBonusDps`**, which reconciles
   exactly with what the toggle adds to the sort. Showing a *discounted* figure —
   what this ticket originally told an implementer to do — would have failed to
   reconcile with the ordering on screen. Verified by reading `view.ts:160-172`.

   Caught by the plan for this work, not by the ticket author.

## Acceptance

- [ ] Rows with a set context show, compactly, how much of the figure is the set
      bonus, while the set-potential toggle is on.
- [ ] `crossesThreshold` rows read differently from prospective ones, and
      neither can be misread as the other.
- [ ] A confounded figure (`prospectiveBonusBreaks` non-empty) is visibly not the
      same kind of claim as a clean one.
- [ ] The shown number is the **raw** `prospectiveBonusDps` — not discounted —
      so it reconciles with what the toggle adds to the on-screen ordering.
- [ ] The report-path formatters are **re-implemented locally** in the tab, each
      with a comment naming its original. They cannot be imported: none of
      `firstLineOf`, `wowsimsItemIdsJson`, `formatSetPotentialLine` or
      `SET_POTENTIAL_WEIGHTS` exists anywhere in the fork's `ui/` (verified by
      `grep -rln` over `vendor/tbc-new-fork/ui/`), and the engine port directory
      is byte-gated.
- [ ] Nothing is shown on rows with no set context.

## Comments
