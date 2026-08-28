Status: open
Type: feature
Origin: Owner request, 2026-08-27, during the toolbar redesign review
Blocks: none
Blocked by: none
Related: 312 (the redesign this needs a home in), 126 (token/pattern ids — a
separate correctness fix to the same export)

# The Upgrades tab needs a ThatsMyBis export box

Owner's words: *"there also needs to be space somewhere for a ThatsMyBis export
chat box ... that exports the JSON of the displayed bis items in order."*

The HTML report already has exactly this. **The tab has nothing.** Measured:
`grep -c` for `export|textarea|clipboard` in `upgrades_tab.tsx` returns 3, none
of them an export control.

## Correction 2026-08-27: it cannot be *imported*, only re-implemented

This ticket originally said "reuse it, do not reinvent". **Verified false for
this surface:** none of `wowsimsItemIdsJson`, `firstLineOf`,
`formatSetPotentialLine` or `SET_POTENTIAL_WEIGHTS` exists anywhere in the
fork's `ui/` (`grep -rln` over `vendor/tbc-new-fork/ui/` returns nothing), and
the engine port directory is byte-gated, so nothing can be added there to bridge
it. The tab must carry a **local re-implementation** — `wowsimsItemIdsJson` is
nine lines — each with a comment naming the report-path original it mirrors, the
same deliberate-drift pattern already used at `upgrades_tab.tsx:1840-1852`.

Read the sections below as *the specification to copy*, not as importable code.

## What already exists — the behaviour to mirror

The report path (`packages/core/src/rank-report.ts`) ships a complete version:

- **A live textarea** (`export-json`, wired at `:735`) whose contents are
  recomputed by `updateExport(chips)` (`:877-889`) every time a filter or sort
  changes.
- **A live count** (`export-count`, `:736`) and a **Copy JSON** button
  (`export-copy`, `:719`, selection at `:915`).
- **The shared formatter**: `wowsimsItemIdsJson`
  (`packages/core/src/rank-report-rules.ts:452-460`) — emits
  `{"items":[{"id":…}]}`, two-space indented.

## The rule that makes this correct, and is easy to get wrong

From the comment at `rank-report.ts:873-876`, which is load-bearing:

> The curated list, **in the order it is displayed**. Deliberately not the slot
> rows: those are grouped slot by slot in document order, so exporting them
> threw away the cross-slot ranked order that is the whole payload for a
> thatsmybis priority list.

**Exporting the table grouped by slot is the failure mode.** TMB wants a
priority order across all slots. An implementer who exports the tab's slot-tab
view, or the below-cutoff group, or the unfiltered ranking, has produced a
plausible-looking JSON that is wrong for its only purpose.

It must track the **displayed** rows: whatever the BiS-only toggle, the content
filter, and the current sort have left on screen, in that order. The report
rebuilds it on every filter change for exactly this reason, and the tab's
equivalent must too — a snapshot taken once at run completion goes stale the
moment a filter moves.

## Also carry over the caveat text

The report states, at `:718`, that the payload is *"a ranked list of candidates,
**not** a 17-slot gear set, so it will not reconstruct a character on import."*
That warning should survive into the tab. Without it the box invites a user to
try importing it as gear.

## Placement

Needs a home in the ticket-312 redesign. It belongs with the **results**, not
with the run settings — it exports what is displayed, so it follows the same
reasoning that moves the post-run view controls next to the results list.
Deliberately not specified further here; the 312 proposal owns the layout call.

## Note on ticket 126

Ticket 126 says this export should emit **token** ids for tier pieces and
**pattern** ids for craftables, since those are what actually drop. That is a
correctness fix to the payload and is independent of this ticket, which is about
surfacing the export in the tab at all. Build this against the current shape;
126 changes the ids for both surfaces at once when it lands. Do not
half-implement 126 here.

## Acceptance

- [ ] The tab has an export box showing `wowsimsItemIdsJson` of the displayed
      rows, reusing the existing formatter.
- [ ] The contents follow the **displayed** order and the active filters, and
      update when either changes — verified by toggling BiS-only and watching
      the payload change.
- [ ] Slot grouping is not what gets exported. A test or a recorded check that
      cross-slot ranked order survives.
- [ ] A count and a copy affordance, matching the report's.
- [ ] The "not a 17-slot gear set" caveat is present.
- [ ] Duplicate ids are suppressed, as `updateExport`'s `seen` map already does.

## Comments
