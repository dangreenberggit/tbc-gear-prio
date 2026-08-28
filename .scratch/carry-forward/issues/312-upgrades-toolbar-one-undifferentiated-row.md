Status: open
Type: design
Origin: Owner review of the running tab, 2026-08-27 (branch `feat/upgrades-dedup-wowsims`, fork `342f6a74`)
Blocks: none
Blocked by: none

# The run toolbar puts too much on one row, with no grouping and no hierarchy

**Owner's words, on seeing the running page: "this still looks like shit, too
much stuff on one row."** This is a design ticket, not a bug — nothing is
overlapping or broken, which is exactly why two automated passes missed it.
Both reported the toolbar as "aligned, evenly spaced, nothing overlapping." All
true, and not the point.

## This is a re-report of ticket 304 item 3, which was closed as Fixed

**Do not treat this as a new finding.** The owner raised it in the original UI
review (2026-08-27) as item 3: *"the one row of options is shit: there's too
much on one line and stuff inside the numbers iterations field for example gets
cut off."* Ticket 304 dispositioned it **Fixed**, with: *"`6ch` won the cascade
but was too narrow under `border-box`; probed to `8ch`. Toolbar split into two
rows. Five-digit values still clip."*

The owner has now looked at the running page and raised it again. Verified in
the markup (`upgrades_tab.tsx:461, 514`):

- `.upgrades-run-controls` holds **all seven** crowded controls — Run, Stop,
  Import log, Iterations, Candidates, the BiS checkbox, the Phase selector.
- `.upgrades-view-controls` is the second row — and it holds the **post-run
  view toggles** (set-potential, BiS-only, Content), whose children carry
  `d-none` until a run completes.

So the "split into two rows" is real markup that **did not split the crowded
row**. It counted a second row that already existed for a different purpose and
is invisible in the state the owner is complaining about. Pre-run — the state in
the owner's screenshot — there is exactly **one** row with seven controls on it.

**The half of item 3 that was closed honestly:** the `8ch` iterations width. The
SCSS comment records 6ch and 7ch clipping "3000" and 8ch being the first that
does not, and explicitly records that five-digit values still clip. That
measurement should be re-confirmed at the current tip rather than assumed —
the owner's screenshot shows `3000` sitting tight against the field edge — but
it was not a false claim.

**The lesson for whoever picks this up:** a disposition can be literally true
and still not do the thing. Do not close this one by pointing at markup; close
it by looking at the pre-run toolbar.

## What is on the row today

Eight controls, left to right, all at the same visual weight:

`Run` · `Stop` · `Import log` · `Iterations [3000]` · `Candidates [all 227
eligible]` · `[x] Sim only Phase 2 (2.1 - T5) BiS-list items` · `Phase 5 (2.4 -
SWP) v`

## The specific problems

1. **No grouping.** These are three different kinds of control with nothing
   saying so:
   - **Actions** — Run, Stop, Import log
   - **Run inputs** — Iterations, Candidates
   - **Scope of the candidate pool** — the BiS-list checkbox, the Phase selector

2. **A sentence used as a control label.** "Sim only Phase 2 (2.1 - T5) BiS-list
   items" is the widest element on the row and reads as prose wedged between
   form controls. It dominates a row where it is not the most important thing.

3. ~~**An apparent contradiction.** The checkbox says Phase 2 while the selector
   says Phase 5.~~ **Withdrawn — this was an orchestrator misread, not a
   defect.** Investigated 2026-08-27: both numbers come from the *same* source,
   `this.simUI.sim.getPhase()`. The selector reads and writes it directly
   (`ui/core/components/inputs/other_inputs.ts:86-89`); the checkbox label
   computes from the same call in `refreshPhaseLabels()`
   (`upgrades_tab.tsx:705-709`) and re-renders through `phaseChangeEmitter` →
   `settingsChangeEmitter` → `sim.changeEmitter` (`ui/core/sim.ts:194-209`) —
   the same chain the selector listens on. They cannot diverge by design.

   A screenshot showing two different numbers means the label had not yet
   repainted, or was captured mid-transition — a staleness question, not two
   competing phase concepts. **Untested:** whether a frame exists where both are
   visible and inconsistent. That needs the running page.

   Left in the ticket rather than deleted, because "two phase numbers side by
   side" is still a **legibility** problem even when both are correct: the row
   gives a reader no way to tell that the checkbox label is describing the
   selector's own value. A regrouping should make that relationship visible.

4. **No hierarchy.** Run is the primary action of the entire tab and carries no
   more visual weight than `Import log`, a secondary utility.

## What would close this ticket

A design proposal first, not a patch:

- A grouping that separates action / input / scope, whether by rows, separators,
  a settings drawer, or moving pool-scope controls next to the pool they scope.
- A shorter checkbox label, with the full explanation moved to a tooltip, helper
  text, or the Assumptions drawer that already exists.
- The Phase-2-vs-Phase-5 relationship made legible, or the ticket states plainly
  that it is a real defect and hands it off.
- Run given primary-action weight.

## Investigated 2026-08-27 — facts a proposal can build on

**The seven controls, in DOM order** (`upgrades_tab.tsx:461-513`), with the
grouping this ticket argues for:

| Control | class | line | Kind |
| --- | --- | --- | --- |
| Run | `upgrades-run-button` | 462 | action |
| Stop | `upgrades-stop-button` | 465 | action |
| Import log | `upgrades-import-button` | 469 | action |
| Iterations | `upgrades-iterations-input` | 478 | run input |
| Candidates | `upgrades-candidates-input` | 489 | run input |
| BiS-prune checkbox | `upgrades-bis-prune-toggle` | 504 | pool scope |
| Phase selector | `upgrades-phase-selector` | 511 | pool scope |

**Ticket 310 will not collide with this one.** The toolbar's breakpoint rules
(`_upgrades_tab.scss:66-68`, `102-124`) and the results-table's
(`:333-424`) are **separate** `media-breakpoint-down(md)` blocks with disjoint
selector sets, and the two elements are siblings under
`.upgrades-shopping-list` with no shared parent (`upgrades_tab.tsx:459-568`).
A regrouping scoped to toolbar-control classes touches nothing 310 owns, so the
two can proceed independently. Static-analysis claim about the source, not a
rendered-pixel measurement.

**The second row is reserved, not absent — this constrains the redesign.**
`.upgrades-view-controls` always renders and holds `min-height: 2.25rem`
(`_upgrades_tab.scss:40-42`) deliberately, so revealing its children post-run
does not jump the layout (the anti-jitter work from the owner's item 5). Its
three children carry `d-none` and are gated by `refreshViewControlVisibility()`
(`upgrades_tab.tsx:1038-1046`, called from `render()` at `:912`) on
`state.kind === 'done'`. Any proposal that folds pool-scope controls toward that
row must treat it as **empty-but-occupying-space pre-run**, and must not regress
the reservation.

**The `8ch` iterations rule** (`_upgrades_tab.scss:90-93`) is unconditional — no
breakpoint guard, no `!important`, not overridden anywhere in that file. Its
comment records 6ch and 7ch clipping "3000", 8ch being the first that does not,
`ch` chosen over px so the rule tracks digit count, and five-digit values still
clipping as an accepted limit. **Untested:** whether a higher-specificity rule
outside `_upgrades_tab.scss` overrides it; only that file was checked.

### Site idioms to borrow rather than invent

The owner's overriding complaint was *"a failure to borrow from existing styling
elsewhere on the site."* Available vocabulary, all already in the fork:

- `.bulk-gear-actions` (`_bulk_tab.scss:140-144`) — flex row for an
  action-button cluster. Directly applicable to isolating Run/Stop/Import and
  giving Run primary weight.
- `.bulk-boolean-settings-container` (`_bulk_tab.scss:46-58`) — a
  `repeat(2, 1fr)` grid for grouping checkbox-style controls, collapsing to
  `1fr` at a breakpoint. On-point for a pool-scope cluster.
- `.bulk-settings-container` (`_bulk_tab.scss:17-23`) — bordered, padded,
  `background: var(--bs-body-bg)` settings-panel look.
- `.content-block-header` (`_content_block.scss:1-28`) — the site's labelled
  sub-group header. The toolbar is already inside a `.content-block` /
  `.content-block-body` (`upgrades_tab.tsx:459-460`) but **never uses the
  header**, so group labels can come from the existing idiom rather than a
  bespoke one. `_settings_tab.scss:46-57` shows it used in column orientation
  for grouped checkboxes.
- `.tab-panel-left` / `.tab-panel-col` (`_sim_tab.scss:1-44`) — the site's
  column layout with breakpoint collapse, if a proposal wants columns.
- `badge rounded-pill` — already borrowed twice in this file
  (`_upgrades_tab.scss:313-316`, `566-572`), if a count belongs on a control.

## Constraints a proposal must respect

- The tab lives in the gitignored fork checkout `vendor/tbc-new-fork`, and its
  SCSS is `ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss`. Both
  are outside `pnpm verify` — the fork's own gates are the only signal.
- **This row already has deliberate responsive work.** The toolbar reflows into
  stacked rows under `media-breakpoint-down(md)` and that behaviour was
  confirmed working in the same pass that produced this ticket. Any regrouping
  must not regress it.
- There is a second controls row (`.upgrades-view-controls`: set-potential,
  BiS-only, Content filter) deliberately hidden until a run completes. A
  regrouping proposal should say how it relates to that row rather than
  ignoring it.
- Ticket 310 (narrow-width table wrapping) is open against the same component.
  Coordinate; do not let two changes land on the same SCSS blind to each other.

## Comments
