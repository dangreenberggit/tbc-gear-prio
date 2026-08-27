Status: closed
Type: design
Origin: owner note during the upgrades-ui-fit pass, 2026-08-24
Blocks: none
Blocked by: none

# Design how the Upgrades tab looks in each state, deliberately

The ticket-286 ruling (Stop resets instead of showing a partial table)
surfaced a pattern: the tab's states — idle, running, done, done+stale,
stopped, error, unsupported-spec — were each verified to *render*
correctly, but nobody has designed what each state should *look like* as
a set. Decisions so far were made one finding at a time: banners were
retired for tone-colored text lines (WP2 Gate-B F13), the empty view
group collapses (WP2 F4), the hidden-controls affordance was wontfixed
(WP5), Stop went from partial-table to reset (286). Each call was
reasonable alone; nothing checked they compose into a coherent
loading/empty/error language, and the stopped message still says "rows
still simming were skipped" over a body that now shows nothing.

## Done when

- A short design note (or ADR, if it sets precedent beyond this tab)
  describes each state's presentation: what the status line, results
  area, and controls show, and why — including loading (is a status line
  plus progress bar enough, or does the empty results area need a
  skeleton/placeholder?), error (is one red text line enough signal?),
  and empty/idle.
- The stopped message wording is reconciled with the reset behavior.
- Any gaps between the note and the current rendering become tickets or
  fixes; the seven-state matrix on the served page matches the note.

## Resolution

Closed by the ticket-304 UI quality pass, 2026-08-27.

The design note is
`.scratch/carry-forward/notes/upgrades-tab-state-design.md`. It covers all
seven states plus the three empty variants, saying for each what the status
line, results area and controls show and why, and carries a text-emphasis
map decided from a devtools contrast measurement rather than by eye.

Against this ticket's three "done when" bullets:

- **Design note describing each state.** Done. It is a note rather than an
  ADR because the decisions are tab-scoped; this ticket made ADR
  conditional on setting precedent beyond the tab.
- **Stopped message reconciled with the reset behaviour.** Already true
  before this pass. The wording this ticket complains about ("rows still
  simming were skipped") no longer exists —
  `grep -rn "rows still simming" ui assets` returns nothing, and the
  current string is "Stopped early. Your current gear: {dps} DPS. No
  candidate rows to show — run again for a full ranking." No change was
  needed, and none was made.
- **Gaps between note and rendering become tickets or fixes.** The gaps the
  note found were fixed inside ticket 304: the three empty states, the
  emphasis map, and the reserved toolbar height. Two open questions remain
  and are recorded in the note as owner questions rather than guessed —
  whether slot sub-tabs should appear for slots with no rows, and whether
  the tab strip should be grouped into labelled sections. Both are
  behaviour/product rulings, not styling.
