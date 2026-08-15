Status: resolved
Type: task
Origin: .scratch/handoffs/sme-rank-judgment-ret-p3-real-ranking.md, addendum (cffaee0 on feat/ret-p3-data)
Blocks: none
Blocked by: none

# Unmeasured-slot retraction does not travel to the slot section

The SME re-check that closed plan §9.6 (2026-08-14) found the
worn-unrankable warning renders once at the top of the HTML report,
while the `ranged` section sits last of fourteen (~387k characters down)
with no local note. Its header reads "4 candidates / 0 BiS candidates"
and the rows keep ordinary `delta down` loss styling identical to a
genuine downgrade. The slot nav is `position: sticky` but the
plausibility panel is not, so a reader who clicks the sticky "ranged"
chip lands on four red rows with the retraction scrolled off-screen.
"The original problem surviving at reduced strength."

Same treatment is owed to the trinket slot once ticket 157 lands: the
page currently declares that slot finished with no disclosure that
Darkmoon Card: Crusade, Hourglass of the Unraveller and Abacus of
Violent Odds were never candidates.

## Done when

An unmeasured/caveated slot carries a local note in its own section
echoing the retraction, and its rows are styled so they do not read as
plain losses; the sticky-nav chip distinguishes "unmeasured" from
ordinary no-BiS slots. Report-layer only (rank-report/HTML), no engine
changes.

## Comments (2026-08-14)

Report-layer only, as scoped — `packages/core/src/rank-report.ts` and
`rank-report-css.ts`, no changes to `rank.ts`/`dead-slots.ts`/
`plausibility.ts`.

`renderRankHtml` now builds `deadSlotWarningsBySlot`, a `Map<string,
DeadSlotWarning>` keyed by the warning's own `slot` field (`dead-slot` is
the only `PlausibilityWarning` kind that names a slot;
`implausible-set-bonus` stays top-of-page only, which is correct — it is
not about any one slot). Each slot section checks this map and, when
present:

- echoes the warning's own `message` verbatim in a new `.slot-retraction`
  block inside that `<section>`, styled with the same
  border-left/background language as the top `.panel.plausibility` (so
  the two read as one claim, not two different warnings)
- adds `unmeasured` to the section's and each row's class list; CSS
  desaturates `.row.unmeasured .delta.down`/`.up` to `var(--muted)` so a
  scored-against-empty-slot row cannot be read as a genuine downgrade
  (border goes dashed/neutral instead of the ordinary hit/muted styling)
- adds `unmeasured` to the sticky-nav chip (`.nav a.unmeasured`, dashed
  border in `var(--down)`), distinguishing it from a plain `no-bis` chip

Tested at the module interface per AGENTS.md's testing rule — new cases
in `packages/core/test/plausibility-report.test.ts` build a real
`Ranking` with a `dead-slot` warning and real ranged/chest items, then
assert on `renderRankHtml`'s output: the retraction lands inside
`#slot-ranged` and not `#slot-chest`, the flagged row carries
`unmeasured`, and the ranged nav chip carries it while chest's does not.
No stage-internals assertions.

Re-ran the real ret-p3 ranking after ticket 157 landed (same worker,
this branch) to see the mechanism live — but with 157 fixing the pool
gap, the worn-unrankable warning no longer fires at all (see ticket
163's Comments), so this run has nothing to retract and the new markup
correctly renders as empty on every section. The unit tests above are
therefore the primary evidence this mechanism works; a live artifact
exercising it would need a still-uncovered dead-slot case (see "not done"
below), not this fixture.

**Trinket-slot half is not done.** The ticket names it as "owed... once
157 lands", and 157 has landed, but the report layer has no signal to
key off: `dead-slot`/`worn-unrankable` fires only when a *worn* item is
missing from its slot's pool, not when a *candidate the guide named* is
known-missing from an otherwise-complete slot (Darkmoon Card: Crusade
etc. were never worn, so no `DeadSlotWarning` was ever going to name
`trinket`). Producing that signal is engine-side work (a new
`PlausibilityWarning` variant or equivalent, computed from
`wowheadRecall.missedItems` against the ranked slot) and is out of this
ticket's report-layer-only scope. Filed as ticket 169 rather than
silently dropping it.

Commit: (recorded in the branch's commit for this ticket, see `git log`).
