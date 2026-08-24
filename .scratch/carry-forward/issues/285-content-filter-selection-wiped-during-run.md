Status: open
Type: UI defect
Origin: ticket-282 review, 2026-08-24
Blocks: none
Blocked by: none

# Content-filter selection is wiped by every running render tick

Found by the ticket-282 implementer while probing value preservation, then
independently reproduced by the review on both the 282 diff and the stashed
base (`da04366f5`), so it predates the optgroup change and affects the flat
list equally.

## Mechanism (review's verified paragraph)

`refreshRaidFilter()` unconditionally clears the content-filter `<select>`
on every render where the tab is not in the `done` state — its non-`done`
branch calls `this.raidFilterSelect.replaceChildren()` with no arguments
(`upgrades_tab.tsx:956-959`). Because the row-landed progress callback calls
`this.render()` on every `{kind:'row'}` event while running
(`upgrades_tab.tsx:785`), and `render()` calls `refreshRaidFilter()`
(`upgrades_tab.tsx:819`), the select is emptied hundreds of times during a
run. Emptying a `<select>` resets its `value` to the empty string, so by
the time the run reaches `done` and the branch that restores the selection
executes, `const previous = this.raidFilterSelect.value` reads `""` rather
than the user's pick — `options.includes("")` is false, and `keep` falls
back to `NO_RAID_FILTER`. The value-preservation logic is therefore dead
code in the re-run path it exists to serve.

Verified live at `/tbc/paladin/retribution/`: with "Karazhan" selected, a
re-run traces `Karazhan` (13 options) → mid-run `""` with 0 options →
done, value `""` — while "Karazhan" is still among the offered options, so
this is not the legitimate "the option disappeared" fallback.

Plausible fixes (untested): skip the clear when the select already holds
options, or hold the pending selection in an instance field rather than
reading it back off the DOM.

## Done when

- With a filter selected and a re-run completed on the served page, the
  selection survives whenever its option is still offered (and falls back
  to All only when it genuinely disappeared from the pool).
- The line numbers above re-verified against the tip being fixed (they are
  from fork tip e565d4a67's era and will drift).
