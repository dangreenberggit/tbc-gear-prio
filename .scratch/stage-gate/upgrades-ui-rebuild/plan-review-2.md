# Plan re-review — upgrades-ui-rebuild (round 2)

Bounded re-review of `plan.md` revision 2 against findings F1–F7 of
`plan-review.md`, by the `gate-reviewer` seat (Opus), 2026-08-27.

**Verdict: approve with conditions.** Six of seven findings addressed. F1 is
addressed in the half that mattered and introduces one new blocking layout
defect that the plan's own "what could go wrong" gestures at but does not
resolve. One condition, stated at the end, closes it.

## Integrity check on the paraphrase risk

The stage flagged that revision 2 was written against the orchestrator's
paraphrase of this review rather than the review text. I read `plan-review.md`
first and compared each fix to my own wording.

**The fixes track my text, not a paraphrase of it.** The tells are the details a
paraphrase would have dropped: revision 2 reproduces the `piecesAfterSwap` /
`piecesWornAfterSwap` distinction verbatim (F2), the fourth `setContext` state
with its exact population condition (F2), the "de-interleaving per child
selector, not duplication of a selector list" phrasing (F6), the `:44`→`:45`
cosmetic correction from F10, and the specific `:1076`/`:1080` second call site
from F8. Those are my sentences, not summaries of them. C27 is a new register
row created specifically to carry F3's mechanism.

The one place the revision lands **nearby but not on** my finding is F1 — see
below. That is a substantive miss, not a transcription artefact.

## Verification discipline

Every citation below is from a command I ran this round. Commands are given
inline. Fork checkout confirmed at the stated state:

```
$ git -C .../vendor/tbc-new-fork rev-parse HEAD
342f6a74e68bfb5604d043bc32c0bca324a2f1de
$ git -C .../vendor/tbc-new-fork branch --show-current
feat/upgrades-tab
```

Note for anyone re-running: `cd` into the fork from Bash fails with an fnm
shim error. Use absolute paths with `sed -n` / `grep -n`, or `git -C`.

## Finding verdicts

### F1 — toolbar is in the sub-tab pane, not the left panel — **addressed but introduces a new problem**

**The DOM correction is right.** Revision 2's Approach now states the chain
correctly and both consequences I raised are handled. Verified:

```
$ sed -n '385,395p;415,425p;1190,1198p' .../upgrades_tab.tsx
389:  <div className="upgrades-tab-left tab-panel-left">
390:    <div className="upgrades-tab-tabs">
411:      <div ref={tabContentRef} className="tab-content">
412:        <div id="upgradesShoppingListTab" ... ref={shoppingListRef} />
419:  this.shoppingListElem = shoppingListRef.value!;
1195:  this.tabContentElem.appendChild(<div id={paneId(id)} className="tab-pane fade" ref={paneRef} />);
```

Plan line 11 names this chain accurately, line 14 places the view controls
"as a direct child rendered *before* `.upgrades-tab-tabs`", and Step 3's
acceptance carries my exact added check: "with a slot sub-tab active, the three
view controls are visible and toggling BiS-only / changing Content filters that
pane's rows". Line 13 carries the F1 note to Step 2 telling the executor not to
undo the run-controls move. All three of my requested fixes are present.

I also confirmed the fix is **functionally** sound — the half a paraphrase-aimed
fix might have got wrong. The three view controls all route through `render()`,
which reaches every pane:

```
$ sed -n '600,612p;1118,1135p;1398,1408p' .../upgrades_tab.tsx
602:  this.setPotentialControl.input.addEventListener('change', () => this.render());
603:  this.bisOnlyControl.input.addEventListener('change', () => this.render());
604:  this.raidFilterSelect.addEventListener('change', () => { ... this.render(); });
1127:  const view = this.state.kind === 'done' ? this.currentView() : undefined;
1402:  const rowsForSlot = view.rows.filter(r => effectiveSlot(r) === slot);
```

`renderSubTabs()` builds one `view` and feeds both `resultsContent` and every
`slotPaneContent`, so filters genuinely govern all panes once the controls are
reachable. F1's stated goal is achievable.

**The new problem: `.tab-panel-left` is a multi-column auto-fit grid.**

```
$ sed -n '1,45p' .../ui/scss/core/components/_sim_tab.scss
	.tab-panel-left {
		display: grid;
		gap: var(--section-spacer);
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		flex: 4;
```

Today `.upgrades-tab-left` has exactly **one** direct child
(`.upgrades-tab-tabs`, `:390`), so `auto-fit` collapses to a single column and
the grid is invisible. The plan's F1 fix adds a **second** direct child. At any
width where two 220px tracks fit — which is every desktop width, the left panel
being `flex: 4` — `auto-fit` will place the view-controls row **beside** the
sub-tab area in a second column, not above it.

That is not a cosmetic slip. It defeats the fix's stated purpose ("the three
filters are visible and govern whichever pane is active" reads as *above the
results*, per the brief's "View controls above the results"), and it would land
as a fresh instance of owner ask 4 ("the spacing vertically between these
components is absolute crap") and the overall ask about borrowing existing site
styling.

Two independent confirmations that this is real, not speculative:

1. No override exists. `grep -n "grid-template\|grid-column\|tab-panel-left"`
   over `_upgrades_tab.scss` returns only results-table rules at `:175/:186`
   and `:538/:554` — nothing touching `.tab-panel-left` or its children.
2. **Bulk, the tab being copied, keeps exactly one child in
   `.tab-panel-left`.** `sed -n '105,160p' .../bulk_tab.tsx` shows
   `<div className="bulk-tab-left tab-panel-left">` containing only
   `<div className="bulk-tab-tabs">`. The idiom being borrowed has never been
   exercised with two children. `_bulk_tab.scss` has no `.tab-panel-left`
   rule either.

The plan is not silent on the neighbourhood — Step 2a's risk list says "the left
panel's `auto-fit` grid rendering badly next to a right panel (CSS-only fix)".
But that sentence points at the wrong slice and the wrong cause: it worries about
slice **2a** (adding the *right* panel, which does not change the left panel's
child count) and attributes the risk to the right panel's presence. The actual
break is in slice **3**, caused by the left panel's child count going 1→2, and
`_sim_tab.scss` is on Step 2a's **stop-and-report** list — so an executor hitting
this in slice 3 has a named forbidden file and a risk note pointing elsewhere.

This is exactly the "fix aimed at a nearby problem" pattern the stage warned
about: the DOM *parentage* was corrected, the DOM *layout consequence* of that
parentage was not.

### F2 — C20 names a field that does not exist — **addressed**

Verified against the fork:

```
$ sed -n '255,272p' .../upgrades/engine/rank.ts
  setContext?: SetContext;
export type SetContext = {
  ...
  piecesAfterSwap: number;
  ...
  prospectiveBonusDps?: number;
  prospectiveBonusBreaks?: BrokenSetBonus[];
$ sed -n '1425,1445p' .../upgrades/engine/rank.ts
1431:  const advancesPieceCount = piecesAfterSwap > piecesWornBefore;
1432:  if (advancesPieceCount && !crossesThreshold && nextThreshold !== null) {
```

C20 now reads `**piecesAfterSwap**` with the wrong name called out, records all
three optionals (`setContext` itself, `prospectiveBonusDps`,
`prospectiveBonusBreaks`), and reproduces the population condition. Step 4 gains
state **(d)** — "`setContext` present but none of the above … render
**nothing**" — which is the fourth state I named. Complete.

### F3 — state (c) unreachable through the control that gates it — **addressed**

Verified the mechanism still holds:

```
$ sed -n '1845,1855p;1038,1050p' .../upgrades_tab.tsx
1849: function hasRankableSetPotential(item: ...): boolean {
1850:   if (item.setContext?.prospectiveBonusBreaks?.length) return false;
1851:   return (item.setContext?.prospectiveBonusDps ?? 0) > 0;
1047:   this.setPotentialControl.setVisible(items.some(hasRankableSetPotential));
```

New register row **C27** carries this exactly. Step 4 now requires *constructing*
the mixed case ("sweep the ret pool across phases 3–5 and candidate caps until a
run contains at least one rankable set row (toggle visible) **and** one
confounded row"), and closes the escape hatch I objected to: "(c) may not" be
recorded as a pool gap, and "If no such run can be constructed after the sweep,
**stop and report** — do not ship (c) unobserved". That is my fix, including the
drop-rather-than-ship alternative. Complete.

### F4 — export will not match displayed order — **addressed**

Verified the third stage:

```
$ sed -n '1443,1455p;1578,1582p' .../upgrades_tab.tsx
1442:  const belowCutoffRows = allRows.filter(r => r.belowCutoffInView && !r.owned);
1449:  const sortedShortlist = this.resultsSort ? sortRows(shortlist, this.resultsSort) : shortlist;
1579:  const sorted = this.resultsSort ? sortRows(rows, this.resultsSort) : rows;
$ sed -n '1548,1553p' .../upgrades_tab.tsx
1548: private toggleResultsSort(column: ResultsSortColumn): void {
```

C12 now names all three stages including `sortRows` and `this.resultsSort`, and
records both wrinkles (`shortlist` + `belowCutoffRows`, and `slotPaneContent`).
Step 5 **decides** rather than delegating: "the **shortlist only, in
`sortedShortlist` order**", below-cutoff "**excluded**", slot-pane subsets "never
the source". My added acceptance check is present verbatim: "click a column
header to re-sort and confirm the payload reorders to match the displayed order".

One note, not a finding. The below-cutoff exclusion is a judgment call against
ticket 314's own wording, which says the export tracks "the **displayed** rows":

```
$ grep -n "displayed" .scratch/carry-forward/issues/314-*.md
58:It must track the **displayed** rows: whatever the BiS-only toggle, the content
91:- [ ] The contents follow the **displayed** order and the active filters, and
```

Below-cutoff rows *are* displayed (inside a `<details>` disclosure, `:1568`).
The plan flags this honestly — Step 5 requires the exclusion be "noted against
its 'displayed rows' wording as a deliberate reading (priority list =
shortlist)", and Out-of-scope lists it. I judge the reading correct: a
ThatsMyBis priority list of items the ranking says *not* to prioritize would be
worse than useless. Deciding it and recording the divergence is what I asked
for. **Stands as addressed** (judgment).

### F5 — slice 2 is three changes in a trenchcoat — **addressed**

Split exactly at the boundary I named. Step 2a is "the two-pane split and
settings card, existing markup moved unchanged"; Step 2b is "picker conversion +
clip measurement". The runtime-risk sentence I wrote is carried into the
Approach (line 18) and into Step 2b's risk row.

The revision goes one better than my finding. I identified that pickers change
*when* inputs are read; revision 2 turns that into an explicit invariant —
"**Preserve read-at-click semantics:** pickers update tab state on change, but
the Run handler continues to derive `readCandidateCap()` and read iterations at
click time" — with an acceptance check exercising an edited-value run. That is a
better fix than the one I asked for. Complete.

### F6 — the C23 defusal misses the `:45+` block's interleaving — **addressed**

Verified the interleaving is real:

```
$ sed -n '44,60p' .../scss/.../_upgrades_tab.scss
.upgrades-run-controls,
.upgrades-view-controls {
	.upgrades-iterations-label,
	.upgrades-candidates-label,
	.upgrades-bis-prune-label,
	.upgrades-set-potential-label,
	.upgrades-bis-only-label,
	.upgrades-raid-filter-label,
	.upgrades-phase-label {
$ grep -c "upgrades-run-controls" .../_upgrades_tab.scss   → 2
$ grep -c "upgrades-view-controls" .../_upgrades_tab.scss  → 3
```

Seven interleaved child selectors, exactly as I described. C23 now says "the
split is per child selector, not per selector list"; Approach line 20 repeats it
and adds the picker-conversion consequence I raised — the label rules "go dead
and are removed in 2b", and the `8ch` measurement is "taken against the **new
picker element**, not the old rule", which is also written into C26. Step 0
records baseline `grep -c` counts and Steps 2a/3 check them against expected
values — the countable check I asked for, which a screenshot cannot fake.

Minor drift, not a finding: the plan never states the *expected* post-slice
counts numerically, only "matches the expected counts recorded before the edit".
Step 3 does pin the end state qualitatively ("after this slice no rule anywhere
names `.upgrades-run-controls` and `.upgrades-view-controls` in one selector
list"), which is checkable. Adequate.

### F7 — the anti-jitter tripwire cannot see jitter — **addressed**

Replaced with the measurement I specified, hoisted into a named shared recipe
("Anti-jitter measurement, used by steps 2a, 3, and 6") rather than repeated:
sampled `getBoundingClientRect()` on `.upgrades-results` and the progress bar at
~200ms intervals across a full run via `javascript_tool`, **pass = spread 0**,
two numbers recorded. Step 6 explicitly routes owner items 5 and 11 to it
"not screenshots". The one addition — "excluding the run-start and run-end
transitions themselves" — is a correct refinement; the reservation exists to
stop the completion jump, and the state change itself is not the oscillation
being measured.

Verified the reservation it protects still exists:

```
$ sed -n '40,42p' .../_upgrades_tab.scss
.upgrades-view-controls {
	min-height: 2.25rem;
}
```

Complete.

## Summary table

| ID | Verdict |
| --- | --- |
| F1 | addressed but introduces a new problem |
| F2 | addressed |
| F3 | addressed |
| F4 | addressed |
| F5 | addressed |
| F6 | addressed |
| F7 | addressed |

## New blocking finding

### F11 — inserting a second child into `.upgrades-tab-left` activates the auto-fit grid; the view controls land beside the sub-tabs, not above them

**Where.** Plan Approach line 14 and Step 3; `_sim_tab.scss:19-27`;
`upgrades_tab.tsx:389-390`.

**What breaks.** `.tab-panel-left` is
`grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`. It has one child
today, so it renders as one column. The F1 fix makes it two, and `auto-fit`
will lay them out as two columns at any width fitting two 220px tracks. The
view-controls row renders as a narrow left column next to the sub-tab area
instead of a full-width row above it — defeating the fix's purpose and creating
a fresh instance of owner asks 4 and the overall borrow-existing-styling
judgment.

**Evidence.** `sed -n '1,45p' .../_sim_tab.scss` (the grid rule);
`sed -n '385,395p' .../upgrades_tab.tsx` (one child today);
`grep -n "grid-template\|grid-column\|tab-panel-left" .../_upgrades_tab.scss`
(no override); `sed -n '105,160p' .../bulk_tab.tsx` (Bulk, the copied idiom,
also keeps exactly one child — the two-child case is unexercised anywhere).

**Why the plan does not already catch it.** Step 2a's risk list mentions the
`auto-fit` grid, but assigns it to the wrong slice (2a, which does not change
the left panel's child count) and the wrong cause (the right panel's presence).
Step 3, where the break actually occurs, has no such note. Worse,
`_sim_tab.scss` is on Step 2a's stop-and-report list, so the executor meets a
forbidden file with no guidance.

**Condition to clear.** Step 3 must specify the containment, and it must not
require editing `_sim_tab.scss`. Either is sufficient and both are local to
`_upgrades_tab.scss`:

- Wrap: keep `.upgrades-tab-left` at one grid child by putting the view-controls
  row and `.upgrades-tab-tabs` inside a single wrapper div (a `.tab-panel-col`
  already exists in `_sim_tab.scss:39-43` as a
  `display:flex; flex-direction:column` container for exactly this), **or**
- Span: give the view-controls row `grid-column: 1 / -1` in `_upgrades_tab.scss`
  so it occupies a full row above the tabs.

Step 3's acceptance must then check position, not just presence: the current
wording "the three controls show above the sub-tab area" is satisfiable by a
reader who accepts a side-by-side column as "above". Make it "the view-controls
row spans the full width of the left panel, with the sub-tab nav directly
beneath it — confirmed at a desktop width where two 220px columns would fit".
Add a note that `_sim_tab.scss` stays unedited (it is shared with every other
tab).

## Register verdicts (changed rows only)

| Claim | Verdict | Evidence |
| --- | --- | --- |
| C5 | stands (corrected) | `sed -n '385,395p;415,425p;1190,1198p' upgrades_tab.tsx` — chain matches revision 2's account |
| C6 | stands (was refuted) | `sed -n '1038,1050p;1074,1082p' upgrades_tab.tsx` — both call paths now named, F8 folded in |
| C12 | stands (was refuted) | `sed -n '1443,1455p;1548,1553p;1578,1582p' upgrades_tab.tsx` — three stages, both arrays, per-pane subset all recorded |
| C20 | stands (was refuted) | `sed -n '255,272p;1425,1445p' rank.ts` — `piecesAfterSwap`, three optionals, population condition all correct |
| C23 | stands (defusal now sufficient) | `sed -n '44,60p' _upgrades_tab.scss` — seven interleaved selectors; per-child-selector split plus `grep -c` counts |
| C26 | stands as hypothesis | correctly marked; subject-change under 2b now recorded |
| C27 | stands (new) | `sed -n '1845,1855p;1045,1049p' upgrades_tab.tsx` — confounded rows return false; toggle gated on `items.some(...)` |

Rows validated in round 1 and unchanged in revision 2 (C1–C4, C7–C11, C13–C19,
C21, C22, C24, C25) carry their round-1 verdicts forward by reference.

## Note on a discarded probe

One `Explore` subagent was dispatched to refute the F1 placement claim. It
returned `REFUTED:` on the grounds that `.upgrades-view-controls` is not
currently a direct child of `.upgrades-tab-left` — which is a restatement of F1
itself, not a refutation of the *target* state the plan proposes. Its
substantive half (the `render()` → `renderSubTabs()` → `slotPaneContent` chain)
I re-ran and confirmed myself; the citations above are from my own commands.
The probe explicitly declined to check the `.tab-panel-left` CSS, calling it
moot — that is where the actual defect was, and I found it by hand.

## F11 confirmation (revision 3)

Narrow confirmation pass on revision 3, 2026-08-27. Scope: whether the F11
condition is satisfied and whether the fix damaged anything. Not a new review.

**Verdict: approve.** The condition is satisfied, the containment reasoning is
correct on both halves, and nothing regressed.

I read the revision as a diff against revision 2 (`git diff
.scratch/stage-gate/upgrades-ui-rebuild/plan.md`), which is 11 lines across five
hunks — title, Approach bullet, new C28 row, Step 3, and two "what could go
wrong" rows. That bounded surface is itself the answer to question 5: there is
nowhere for a regression to hide, and I confirmed each hunk below.

### 1. Does the containment work? — **yes, both halves verified**

The planner chose `grid-column: 1 / -1` over the `.tab-panel-col` wrapper. Two
claims carry that choice; both hold.

**Claim A — `grid-column` is inert below `lg`, so narrow-width stacking is
preserved by construction.** Correct:

```
$ cat -n .../ui/scss/core/components/_sim_tab.scss
19	.tab-panel-left {
20		display: grid;
22		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
25		@include media-breakpoint-down(lg) {
26			display: flex;
27			flex-direction: column !important;
28		}
```

Below `lg` the panel's `display` becomes `flex`, so its children are flex items,
and `grid-column` has no effect on a flex item. The row stacks because
`flex-direction: column` puts it there — not because of anything the plan adds.
"Preserved by construction rather than by a new wrapper's behaviour" is an
accurate description, and it is the stronger of the two options for exactly that
reason: the wrapper alternative would have introduced a new DOM node whose own
flex behaviour would need checking at every breakpoint.

**Claim B — the rule lands in a scope that will actually apply.** This is the
question C23 exists to make people ask, and here the answer is favourable for a
structural reason worth stating: `.upgrades-view-controls` already carries a
**top-level, parent-independent** rule:

```
$ grep -n "upgrades-view-controls" .../_upgrades_tab.scss
19:	.upgrades-view-controls {     <- nested inside .upgrades-toolbar (the C23 hazard)
40:.upgrades-view-controls {       <- top level (min-height: 2.25rem)
45:.upgrades-view-controls {       <- top level, interleaved block
```

The `:40` block is the anti-jitter `min-height` reservation, and it is already
written at top level with no ancestor selector. A `grid-column: 1 / -1`
declaration added to that same block inherits its parent-independence and cannot
be silently dropped by re-parenting — the C23 failure mode needs an ancestor
selector to lose, and this block has none. The row must be a grid *item* of
`.tab-panel-left` for the rule to have any effect, which is precisely the
position Step 3 puts it in.

**One band worth naming, which the containment already covers.** Bootstrap's
breakpoints here are stock (`node_modules/bootstrap/scss/_variables.scss:484-491`
— `lg: 992px`, `xl: 1200px`; the fork map-merges custom breakpoints at
`ui/scss/shared/_variables.scss:248` but does not alter these). Between 992px and
1200px the panel is **still `display: grid`** while
`.tab-pane-content-container` has already gone `flex-direction: column`
(`_sim_tab.scss:6-8`), so the left panel is full-width and fits two 220px tracks
comfortably. That band is the worst case for F11, and `grid-column: 1 / -1`
handles it identically to wide desktop. No gap.

### 2. Is the acceptance check non-vacuous? — **yes**

Step 3 now reads: "the view-controls row spans the full width of the left panel,
with the sub-tab nav directly beneath it — confirmed at a desktop viewport width
where two 220px columns would fit". That is my requested wording, and it tests
**position**, not presence — the defect it is aimed at is a row that is visible
but in the wrong place, which the old "show above the sub-tab area" phrasing
could not distinguish.

The parenthetical is a genuine catch, not padding: "a narrow-width check is
vacuous: below `lg` the panel is flex-column anyway". That is correct per
`_sim_tab.scss:25-28`, and it forecloses an executor satisfying the check at a
narrow viewport where it proves nothing. Given this stage's history with
`resize_window` reporting success while `innerWidth` never moved (C26, ticket
310), naming the width the check must run at is the right level of specificity.

### 3. Was the slice-2a/slice-3 misfiling corrected? — **yes, both directions**

Removed from slice 2a: "the left panel's `auto-fit` grid rendering badly next to
a right panel (CSS-only fix)" — the sentence that pointed at the wrong slice and
blamed the right panel's presence.

Added to slice 3, where the break actually occurs: the `auto-fit` break named as
the row's first risk, with the containment as its defusal and "If that rule does
not contain it, **stop and report** — `_sim_tab.scss` is on the forbidden list
and must not be edited."

That last clause resolves the trap I flagged. Slice 2a's stop-and-report list
still names `_sim_tab.scss`, and Step 3 now states plainly that the file stays
unedited and why (shared with every other tab). An executor meeting the grid in
slice 3 now has the cause, the fix, and the boundary in the same paragraph
instead of a forbidden filename and a risk note pointing elsewhere.

### 4. Is C28 sound and honestly marked? — **yes**

C28 asserts four things, each of which I verified independently in the previous
round and re-checked here: the grid rule (`_sim_tab.scss:19-27`), the single
direct child today (`upgrades_tab.tsx:389-390`), no override in the upgrades SCSS
(`grep -n "grid-template\|grid-column\|tab-panel-left"` returns only
results-table rules at `:175/:186/:538/:554`), and Bulk keeping one child
(`bulk_tab.tsx:105-160`). Marked load-bearing **yes**, with all four commands
re-runnable as written and attributed "re-review F11, reviewer-verified" — which
is accurate provenance, since these came from my commands rather than the
planner's.

It also records `.tab-panel-col` (`_sim_tab.scss:39-43`) as "the rejected
alternative", so the decision and its discarded option are both on the record
rather than the choice appearing arbitrary to the executor.

One cosmetic note, not a finding: C28 is inserted between C26 and C27, so the
register's last three rows read C26, C28, C27. Every reference resolves by ID and
nothing reads positionally, so this is ordering noise only.

### 5. Did anything weaken or reopen? — **no**

The diff touches no part of F2–F7's fixes. Specifically re-confirmed unchanged in
revision 3: Step 4's four states and the C27 stop-and-report for state (c);
Step 5's `sortedShortlist` decision and the column-sort acceptance check; the
2a/2b split and the read-at-click invariant; the per-child-selector de-interleave
and `grep -c` counts; the anti-jitter sampled-rect recipe. Step 3's F1 slot-sub-tab
check survives verbatim alongside the new position check — the two now sit
together, testing reachability and placement respectively.

The Approach bullet grew but did not change its decision: view controls still go
to `.upgrades-tab-left` before `.upgrades-tab-tabs`. F11 was a layout consequence
of that placement, not an argument against it, and the revision treats it that
way — which is the right reading of the finding.

### Standing conditions

None. The one condition attached to my round-2 verdict is discharged. Every F1–F7
verdict above stands as written, and F11 is closed.
