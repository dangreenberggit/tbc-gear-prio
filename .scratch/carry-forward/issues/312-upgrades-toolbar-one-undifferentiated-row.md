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

## Owner review of the post-run row, 2026-08-27 (screenshot)

Two further defects, on the **second** row (`.upgrades-view-controls`), which
this ticket had until now treated only as a constraint to preserve. Owner's
words: *"this is unreadable btw, theres no clear organization separating
label/elements such as checkbox and description"* and *"theres a missing toggle
for 'Bis-only' — which should be less wordy and should be able to be applied
post-siming to the results."*

**1. Checkbox and label do not read as a unit.** The row renders, left to right:

```
☐ Include set-bonus potential   ☐ Only items on a Phase 3 (2.2 - T6) BIS list   Content [All ▾]
```

Two bare checkboxes each followed by a sentence, then a bare label followed by a
select — with the same gap between *every* element. Nothing groups a control
with its own text, so a reader cannot tell where one control ends and the next
begins. Strings: `view.set_potential`, `view.only_bis`, `view.raid_filter` in
`assets/locales/en/translation.json:879-881`.

**2. The BiS-only toggle is not missing — it is unrecognisable.** Verified:
`bisOnlyControl` exists, is gated post-run on `state.kind === 'done'`
(`upgrades_tab.tsx:1049`), and does filter the rendered results (independently
click-tested in an earlier pass: 272 rows → 10, all BiS, and back). Its string is
`"only_bis": "Only items on a {{phase}} BIS list"`.

So **the capability the owner asked for already ships.** The defect is that it
does not read as a post-run filter: the wording is a sentence rather than a
control name, and it sits in a row visually indistinguishable from the run
options above it. The owner looked at the running page and concluded the feature
was absent — that is the bug, and no amount of correct filtering behaviour fixes
it.

**Implication for a proposal.** This row can no longer be treated as
"preserve the height reservation and otherwise leave alone". It needs the same
grouping treatment as the run row, plus a clear signal that it acts on
**results already computed**, not on the next run. Shorter labels
("Set potential", "BiS only") with any qualifier demoted to secondary text, and
a visual separation from the run controls, are the minimum.

## Owner's direction, 2026-08-27 — decided

Three directions were designed in parallel: (A) group everything in place on one
surface, (B) demote all configuration behind a settings trigger, (C) copy the
Bulk/Batch tab's structure.

**Owner chose C for the run settings:** *"copy the batch tab for run settings."*

What that means concretely, from the C proposal (the only one of the three whose
research was done against the actual files — 17 reads vs. zero for A and B, so
its file:line claims are the trustworthy ones):

- Run settings move into a **sticky settings card** modelled on
  `.bulk-settings-outer-container` / `.bulk-settings-container`
  (`_bulk_tab.scss:11-23`) — bordered, padded, `display: grid`, stacking
  vertically instead of wrapping horizontally.
- Internal order borrowed from Bulk: **info readout → primary CTA → config
  controls** (`bulk_tab.tsx:820-861`, `:159-161`, `:667-818`). The action sits
  next to the count it gates; the knobs that rarely change sit below it.
- Iterations, Candidates, BiS-prune and Phase become picker rows in that card,
  using the same `BooleanPicker` / `EnumPicker` row shape Bulk and Settings
  already use — which is also what lets the BiS-prune label **wrap normally**
  instead of being the widest thing in a horizontal row.
- Two-pane split via the site's existing `.tab-panel-left` / `.tab-panel-right`
  (`_sim_tab.scss:14-37`), collapsing to one column on mobile exactly as Bulk
  does (`_bulk_tab.scss:88-93`) — borrowed, not written.

### Carried from C, and independently the answer to the owner's post-run complaint

C observed that the three post-run controls are **named** "view controls" but
live beside the run controls as though they were run inputs, and proposed moving
them **above the results list** they act on. That is the structural fix for the
owner failing to find the BiS-only toggle: it is not merely worded badly, it is
in the wrong place. Bulk has no equivalent to borrow (its results are not
post-filterable), so C flagged this as a deliberate divergence rather than
forcing a false borrow. Keep it.

### Explicitly NOT taken from C

**The progress modal.** C also proposed moving the running state into
`ProgressTrackerModal` as Bulk does. C flagged the risk against itself: Upgrades
runs can be short, and a modal that flashes open and shut is worse than the
inline status line, which was built deliberately (see the live-region comments
at `upgrades_tab.tsx:529-561`). **Keep the inline status line.** Take the
settings-card structure, not the modal.

### Worth taking from A, independently of the direction

A's diagnosis of the clipping: the label currently sits **inline beside** the
input (`display: flex; align-items: center`, `_upgrades_tab.scss:50-61`), which
squeezes the field — that is why `8ch` was needed and why five digits still clip.
Stacking the label above the input frees the width and fixes the cause rather
than the symptom. Verified against the CSS. This composes with C's picker rows
rather than competing with them.

### Verify before building

C did **not** confirm that the Upgrades tab's outer markup already sits inside a
`.tab-pane-content-container` with `.tab-panel-left` / `.tab-panel-right` as its
direct children. If it does not, the two-pane split is a larger structural change
than C advertised. C flagged this itself and called it a five-minute check.
**Do that check first.**

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

## 2026-08-29 — styled, owner-checklist-pending (Execution B, layout-residual)

State: **styled — awaiting owner sign-off on the rendered result.** The owner's
chosen direction C (copy the Batch tab for run settings) is landed on the fork
before base SHA `43f460c`; this executor verified the rendered result, it did not
re-architect (C17: structure landed; no progress modal; inline status preserved).

Landed structure, confirmed in the DOM and screenshots:

- **Run-settings card** modelled on the Batch tab (`.upgrades-settings-container`,
  `_upgrades_tab.scss:31-43`): info readout ("N eligible items") → Run (primary
  `btn-primary`, full width) → Stop (outline) → the four set-once knobs
  (Iterations, Candidates, BiS-prune, Phase) as native picker rows. Below `xl`
  the four knobs collapse behind a "Run settings ›" disclosure so Run sits above
  the results on a phone; at `xl`+ they show inline (`_upgrades_tab.scss:854-950`).
- **Post-run view controls** ("Set potential", "BiS only", "Content") moved
  ABOVE the results as a labelled "Filter results" group
  (`upgrades_tab.tsx:646-676`), with short labels — resolving the owner's
  "couldn't find the BiS-only toggle" and "no grouping" complaints.
- Run carries primary-action weight; the crowded single row is gone.

Evidence (CDP, innerWidth read back; F3):
`.scratch/stage-gate/wowsims-tab-tickets/layout-evidence/prerun-{375,653,767,1280}.png`
(pre-run toolbar), `postrun-*.png` and `ranking-stage-1280.png` (post-run view
controls + card). The 322 layout gate (`test-layout.mjs`) asserts the settings
panel renders above the results at narrow widths and the view-controls host sits
above the sub-tabs — 37 assertions green at 375/653/768/1280.

Note: the fully-`done` state (all three view controls visible together) is also
captured in Execution A's `.scratch/.../cdp-reverify.json` (done:true). Closes on
owner sign-off.

## Comments

## 2026-09-18 — re-verified on the post-Chunk-1 fork tip (Chunk 3)

Re-proven on fork tip `d754ac1b`. The redesigned toolbar structure survives the
Chunk-1 merge and the runner rename:

- The run/view controls are native picker components, not the raw-checkbox
  toolbar the ticket complained about. The one raw `<input type="checkbox">` that
  remains is the export flavour toggle (`upgrades_tab.tsx:754`), a deliberate
  plain checkbox that switches the export FORMAT rather than a run/view control —
  so it is out of this ticket's scope. `grep -c 'type="checkbox"'
  vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx` → 1
  (that toggle); `grep -c '<input type="checkbox"' …` → 0 misses it only because
  `ref=…` sits between `<input` and `type=`, so do not read the 0 as "no raw
  checkboxes anywhere".
- The post-run view controls sit above the results and the run settings sit
  above them, proven by the layout gate on a real WASM run:
  `[375] view-controls-host top 1216.5 <= tabs top 1276.0`,
  `[375] settings panel top 975.3 <= results panel top 1216.5`,
  with `settings-outer-container position: sticky` keeping Run reachable — all
  four widths. At 1280 the filter row spans full width
  (`grid-column 1/-1, width 664.3 == tabs 664.3`). 37/37 assertions green.

Verified by: `grep -c '<input type="checkbox"' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
and `cd vendor/tbc-new-fork && node test-layout.mjs` (log at
`.scratch/stage-gate/chunk3-tab-layout-verify/evidence/test-layout-run.log`).
Status unchanged — closes on owner sign-off.
