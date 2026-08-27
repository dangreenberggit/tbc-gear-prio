Status: blocked
Type: task
Origin: ticket 304 execution, owner questions deferred at the Step 3a design gate, 2026-08-27
Blocks: none
Blocked by: owner ruling on whether absent slots should render as tabs

# Should all 17 equip slots always render as tabs?

Deferred out of ticket 304 (Upgrades tab UI quality pass) rather than guessed.
This is a **behaviour ruling, not styling** — which is why it was not decided by
the implementer.

## The question

Today the Upgrades tab builds a slot sub-tab only for slots present in the
ranking (`slotsInView(this.unfilteredView())`, `upgrades_tab.tsx`). A slot with
no candidates at all simply has no tab.

Ticket 304 item 10 asked for empty tabs to be "slightly disabled if they have
nothing". That request has two readings, and they differ in behaviour:

1. **Filter-emptied tabs** — a tab exists because the ranking has rows for that
   slot, but the active view filter (e.g. BiS-only) leaves it showing zero.
   **This is already implemented**: those tabs render muted with a `(0)` badge.
2. **Absent slots** — the ranking has no rows for that slot at all, so no tab is
   built. Making these appear greyed is a new behaviour: it means rendering all
   17 equip slots unconditionally.

Reading 1 is done. **Reading 2 is what this ticket asks.**

## Why it was not just implemented

Rendering all 17 would contradict a recorded design comment in
`renderSubTabs()`, which states that a display filter must change which rows a
pane shows, never which panes exist. Absent-from-the-ranking is not a display
filter, so absent slots stay absent under the current design. Overriding that is
a product call.

## What is already settled and does not depend on this

The owner ruled on 2026-08-27 that the sub-tab strip is **two rows, always**
("trying to fit all on one row is too much"), and it is implemented that way —
the strip reserves 92.2px in every state, measured constant across idle,
running and done while the tab count goes 1 → 17.

So this ticket **cannot move the layout**: the strip already reserves two rows
whether or not empty slots render into them. Answering it changes only which
tabs appear, not the page's geometry.

## Options

- **Render all 17, greyed when the ranking has no rows.** A player sees the full
  slot vocabulary and learns that a slot yielded nothing, rather than that slot
  silently not existing. Costs: contradicts the recorded design comment, and
  adds up to 16 non-interactive tabs to a strip in the common case.
- **Keep current behaviour** (absent slots do not render). Costs: "no tab" and
  "nothing found for this slot" look identical to a player.

## Acceptance

- [ ] Owner rules between the two options.
- [ ] If all 17 render: the recorded design comment in `renderSubTabs()` is
      updated to say why, not left contradicting the code.
- [ ] Strip height stays constant across idle / running / done (it already
      reserves two rows; confirm the ruling does not disturb it).
- [ ] Fork gates green (`tsc`, `stylelint`, `oxlint`, `test:locales` — see
      `.scratch/stage-gate/upgrades-ui-quality/fork-gates.md` for the working
      invocations; the `.bin/` shims fail with an fnm error).

## Comments
