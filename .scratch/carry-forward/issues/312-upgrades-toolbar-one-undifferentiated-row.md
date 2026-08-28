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

3. **An apparent contradiction, unresolved for the reader.** The checkbox says
   **Phase 2** while the adjacent selector says **Phase 5**. Whatever the real
   relationship is (the checkbox label is presumably pinned to a BiS list phase
   independent of the selector), the row presents two different phase numbers
   side by side with no indication of how they relate. A reader cannot tell
   whether this is a bug.

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
