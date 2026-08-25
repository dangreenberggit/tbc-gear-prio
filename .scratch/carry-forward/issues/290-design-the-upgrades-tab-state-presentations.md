Status: open
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
