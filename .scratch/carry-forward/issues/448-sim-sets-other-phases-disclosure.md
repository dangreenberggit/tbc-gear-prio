Status: open
Type: feature
Origin: ticket 438 design exploration, owner-confirmed pick 2026-09-19 (Q2 = disclosure)
Blocks: none
Blocked by: none
Related: 438 (the design exploration), 433 (current-phase default selection), 424/429/430 (the Sim-sets chips)

# Sim-sets → "Other phases (n)" disclosure

Implementation ticket for ticket 438's Part B, owner-confirmed pick (2026-09-19):
organize the Sim-sets chips so the current phase's sets + all saved sets show, and
off-phase sets collapse behind a disclosure.

The design exploration compared three candidates; the owner picked **(b) "Other
phases (n)" disclosure** over native phase tabs (runner-up, rejected because the tab
already has a phase selector at `upgrades_tab.tsx:774` — a phase-tab row would
duplicate it).

## What to build

In the Sim-sets chip render (`setsGroupRef`,
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx:816-822`,
loop `1958-2024`):
- Always show chips for `set.phase === sim.getPhase()` AND all saved (custom) sets.
- Put the remaining off-phase preset chips behind a `button[aria-expanded]` +
  collapse class — the tab's own disclosure idiom (`upgrades_tab.tsx:704-711`), not a
  new component. Label it "Other phases (n)" with the hidden count.
- A SELECTED off-phase chip stays visible by construction (it's current-phase-or-saved
  by the always-show rule, OR it must remain shown even when off-phase and collapsed —
  ensure a ticked off-phase chip is never hidden). The disclosure default is collapsed.

Default selection already keys off `sim.getPhase()` (ticket 433,
`defaultGuaranteedSetKeys`), so "relevant now" is defined. Chip markup itself is
unchanged; this is a grouping/disclosure wrap.

## What would close this

- Current-phase sets + saved sets show by default; off-phase preset sets are behind an
  "Other phases (n)" disclosure (collapsed by default); a selected off-phase chip is
  always visible; the disclosure toggles open/closed and reports the hidden count.
- Visual acceptance (session-3 gate-visual seat): at the current phase, only
  current-phase + saved chips show pre-disclosure; the "Other phases (n)" control
  shows the correct hidden count; expanding reveals the rest; a selected off-phase
  chip is visible whether collapsed or expanded.

## Where

`upgrades_tab.tsx` (`.upgrades-set-guarantee` chips, ~line 816 + render loop ~1958)
+ the tab scss. Disclosure idiom: the tab's own `button[aria-expanded]` at ~704.
