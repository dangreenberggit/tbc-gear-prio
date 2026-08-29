# Plan review — upgrades-ui-rebuild

Adversarial review of `plan.md` round 2, by the `gate-reviewer` seat (Opus),
2026-08-27. **Verdict: revise.** 4 blocking, 3 material, 3 minor.

Findings F1, F2 and F4 were independently re-verified by the orchestrator before
being accepted; the commands are in the decision log. F3 was accepted on the
reviewer's evidence without an independent re-run.

None of this threatens the owner's chosen direction. C1/C2/C3/C4/C21/C24 all
hold, so the Bulk-card copy is sound. What needed another round is the plan's
model of **where things are**, two register rows that would have sent the
executor at names and states that do not exist, and one acceptance criterion
that would have shipped a bug the report path already made once.

## Blocking

### F1 — the toolbar is not in the left panel; it is inside the shopping-list sub-tab pane

The plan's Approach describes appending the right panel "inside `contentContainer`"
and Step 3 moves the view controls "above `resultsRef` in the left panel". Both
skip a level.

Actual chain, read off the running page:

```
.upgrades-run-controls
  .upgrades-toolbar.content-block-body
    .upgrades-shopping-list.p-gap.content-block
      DIV.tab-pane.fade.active            <- #upgradesShoppingListTab
        DIV.tab-content
          .upgrades-tab-tabs
            .upgrades-tab-left.tab-panel-left
              .tab-pane-content-container
```

`upgrades_tab.tsx:419` sets `this.shoppingListElem = shoppingListRef.value!` —
the **pane**, not the panel — and `:458-460` appends the toolbar into it. Slot
sub-tab panes are **siblings**, appended to `tabContentElem` at `:1194`.

Two consequences the plan does not handle:

1. Slice 3 as written leaves the view controls trapped in one pane. Switching to
   a slot sub-tab shows rows with **no Set-potential / BiS-only / Content
   controls above them** — reproducing the exact failure this stage exists to
   fix. (Separately, this is a pre-existing defect the plan is silent about:
   today a slot sub-tab also hides Run, Stop, iterations, status and results.
   Slice 2 accidentally fixes half of it by moving the run controls to a
   persistent right panel.)
2. Slice 3's acceptance cannot catch it — "shows the three controls grouped
   above the results" is satisfiable entirely on the shopping-list pane.

**Fix.** Name the target parent explicitly: the view-controls row goes into
`.upgrades-tab-left` *outside* `.upgrades-tab-tabs`, or is otherwise made to
govern every pane. Add to Step 3 acceptance: "with a slot sub-tab active, the
three view controls are visible and still filter that pane's rows." Note in Step
2 that the right-panel move solves this for the run controls, so the executor
does not undo it.

### F2 — C20 names a field that does not exist; slice 4 will not type-check

`engine/rank.ts:260-270` — the field is **`piecesAfterSwap`**, not
`piecesWornAfterSwap`. C20 also calls all seven fields "exist on `RankedItem`"
without noting that `setContext` is itself optional (`:257`) and that
`prospectiveBonusDps` and `prospectiveBonusBreaks` are optional **inside** it.

`prospectiveBonusDps` is populated only when
`advancesPieceCount && !crossesThreshold && nextThreshold !== null`
(`:1431-1440`), so "**`setContext` present, no `prospectiveBonusDps`, not
crossing**" is a real fourth state the plan's three do not cover.

**Fix.** Correct the field name; record the three optionals; add the fourth
state to Step 4 — render nothing.

### F3 — slice 4's state (c) is unreachable through the control that gates it

Step 4 renders state (c) (confounded) "when the set-potential toggle is on". But
the toggle only appears when a confounded row is *excluded*:

```ts
// upgrades_tab.tsx:1849-1852
function hasRankableSetPotential(item: Ranking['items'][number]): boolean {
	if (item.setContext?.prospectiveBonusBreaks?.length) return false;
	return (item.setContext?.prospectiveBonusDps ?? 0) > 0;
}
```

with `:1047` `setVisible(items.some(hasRankableSetPotential))`. A pool whose only
set-context rows are confounded never shows the toggle, so state (c) never
renders. The plan's concession — "record which states were absent" — would then
paper over a **logic** gap as a **pool** gap.

**Fix.** State that (c) renders only when the pool also contains an unconfounded
set row, and require *constructing* that case. If it cannot be produced, drop
state (c) from the slice rather than shipping it unseen.

### F4 — slice 5's export will not match displayed order; C12 is incomplete

C12 says displayed rows and order come from `currentView()` + `applyBisFilter`.
There is a third stage:

```ts
// upgrades_tab.tsx:1449
const sortedShortlist = this.resultsSort ? sortRows(shortlist, this.resultsSort) : shortlist;
```

`resultsSort` is a user-clickable column sort (`:1548-1553`), shared across the
shopping list and every slot pane, applied again to the below-cutoff group at
`:1579`. An export from `currentView()` is in **engine order, not displayed
order** — precisely what `rank-report.ts:873-876` comments against.

The acceptance check does not catch it: toggling BiS-only changes *membership*,
so the payload changes and the check passes, while a column-sort click leaves
the export stale. It tests the one axis that already works.

Two further wrinkles C12 misses: the displayed table is `shortlist` **plus** a
separate `belowCutoffRows` group (`:1443`), and `slotPaneContent` (`:1400`)
renders a different subset per sub-tab.

**Fix.** C12 must name `resultsSort` and `sortRows`. Step 5 must state which
array is exported (recommend shortlist only, in `sortedShortlist` order — decide
it, do not leave it to the executor) and whether below-cutoff contributes. Add
acceptance: "click a column header to re-sort, confirm the payload reorders to
match."

## Material

### F5 — slice 2 is three changes in a trenchcoat; split it

Slice 2 does four things: append right panel + card; convert four raw inputs to
`Input<>` pickers with a new `TypedEvent` field; re-home and split the C23 SCSS
across two parents; run the C26 clip measurement with a branch that may delete a
rule.

Only the picker conversion carries runtime risk — it changes *when* a run reads
its inputs. Today `readCandidateCap()` re-derives at click time
(`:678, :685-687, :787`); a picker writes through on change. If a run comes out
wrong after slice 2, the executor is bisecting a commit that also moved the DOM
and rewrote the stylesheet.

**Fix.** Split at the picker boundary. **2a** — right panel + card + move
existing markup unchanged + C23 SCSS re-home + screenshot. **2b** — picker
conversion + C26 clip measurement. 2a is screenshot-verifiable; 2b needs a run
exercised.

### F6 — the C23 defusal misses the `:45+` block's interleaving

The plan handles the nested `:17-24` block correctly. The `:45+` "top-level"
block is not flat (`_upgrades_tab.scss:45-100`): its inner selector lists **mix**
run-row and view-row children — `.upgrades-iterations-label` beside
`.upgrades-set-potential-label`. Splitting is de-interleaving seven child
selectors across two parents, not duplicating a selector, and getting it wrong
fails silently in exactly the way C23 warns about.

Worse: if the inputs become pickers, `.upgrades-iterations-label` and
`.upgrades-candidates-label` **cease to exist** — pickers render their own DOM.
Half these rules go dead, and C26's `8ch` measurement is taken against a rule
that may no longer apply.

**Fix.** Say the split is per *child selector*, and state what happens to the
label rules under the picker conversion. Add a countable acceptance:
`grep -c "upgrades-run-controls"` and `grep -c "upgrades-view-controls"` after
each slice with an expected count — a check a screenshot cannot fake.

### F7 — the anti-jitter tripwire cannot see jitter

Owner items 5 and 11 are *dynamic*; item 11 is explicitly intra-run ("jitters
back and forth … even during it showing progress"). Step 3 and Step 6 both
propose comparing three static screenshots of a ~90-second run. That cannot
observe oscillation.

The existing fix is a measured `min-height: 2.25rem` reservation
(`_upgrades_tab.scss:40-42`, comment at `:23-38` records the measured
69.6px→108.1px growth), and slice 3 moves the element carrying it.

**Fix.** Replace with a measurement: sample `getBoundingClientRect().top` of
`.upgrades-results` and `.left` of the progress bar at ~200ms intervals across a
full run via `javascript_tool`, assert the spread is 0. Re-runnable number;
three screenshots are not.

## Minor

- **F8** — C6 incomplete. `refreshViewControlVisibility` (`:1038-1049`) governs
  only `setPotentialControl` and `bisOnlyControl`; the raid filter is toggled
  separately at `:1076, :1080`. Slice 3 moves all three — name the second call
  site or the executor wires two and orphans one.
- **F9** — Step 1 changes `firstLineOf`'s suffix and adds a `console.warn` the
  original has no equivalent of. Fine, but acceptance never checks the console
  receives the full text. Add that line.
- **F10** — no transcription damage found. 26 register rows present and
  numbered, 8 steps, all sections intact, every referenced claim ID resolves.
  Only drift: C23 cites `:44+`; the block begins at `:45`. Cosmetic.

## Register verdicts

Stands: C1, C2, C3, C4, C5, C7, C8, C9, C10, C11, C13, C14, C15, C16, C19, C21,
C22, C23 (defusal insufficient — see F6), C24, C25.

- **C6** — refuted (partial). See F8.
- **C12** — refuted. See F4.
- **C20** — refuted. See F2.
- **C17** — promoted from hypothesis to **verified**: `min-height: 2.25rem` at
  `:40-42`, `8ch` at `:90-93`, flex squeeze `:49-61`, confirmed live.
- **C24** — residual corner **closed**: a live `overflowAncestors` probe on
  `.upgrades-toolbar` returned only `.sim-ui`; no Bootstrap `.tab-content`
  overflow.
- **C18** — untestable as stated. Disjointness confirmed by reading (no selector
  overlap), but is only meaningful against the executor's actual deletions. Keep
  the Step 0 re-confirm.
- **C26** — stands as hypothesis, correctly marked. But see F6: the `8ch` rule
  may not survive the picker conversion, so the measurement's subject changes
  under it.
