Status: closed
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

## Closed

Built on stage-gate branch `feat/tab-signoff-followups` (session tab-438-impl,
Unit 448), fork commit **994fcb9f3fd93cbac2c975698248ad888846dd84** on
`feat/upgrades-tab`. `refreshSetChips` now sorts each chip into the always-shown
row (`.upgrades-set-guarantee`) when it is current-phase (`set.phase === maxPhase`),
a saved set (`set.phase === undefined`), or currently selected
(`guaranteedSetKeys.has(set.key)`); every other preset chip goes behind an
"Other phases (n)" `button[aria-expanded]` + `.upgrades-set-more--open` collapse
class (`.upgrades-set-more`), collapsed by default, using the tab's own
button-plus-class idiom (not `<details>`). The disclosure open state lives on
the instance (`otherPhasesOpen`), not the DOM, so it survives the rebuilds
`refreshSetChips` fires on every tab show and settings change.

New selectors: three — `upgrades-set-more-summary` (the button), `upgrades-set-more`
(the collapsed mount), `upgrades-set-more--open` (the open modifier) — matching the
design's "~1 collapse class" plus the button and mount.

Selection logic (`guaranteedSetKeys`, `defaultGuaranteedSetKeys`, stale pruning) is
byte-unchanged; this is a grouping wrap.

**Both mount points cleared on every rebuild (C28).** `refreshSetChips` calls
`this.setsMoreElem.replaceChildren()` and re-hides the toggle+mount at the top of
the function, above the `!specId` early return, right after
`this.setsGroupElem.replaceChildren()`. Without this the off-phase chips would
accumulate in `.upgrades-set-more` on each of the many rebuild triggers and the
"(n)" would inflate. Empirically confirmed by the visual capture 448-d:
`hiddenChipsAfterToggle` = 3 = the pre-toggle `hiddenChips`, no duplication.

**Ticked-then-collapsed transition (code inspection, not a capture claim).** A chip
ticked/unticked via its click handler does NOT move between mount points at click
time — the handler is count-only and deliberately does not call
`refreshCandidatesPlaceholder` (which rebuilds the group and would drop the button
mid-click; the existing comment records this). So a newly-ticked off-phase chip
stays inside `.upgrades-set-more` and a newly-unticked one stays in the main row
until the next `refreshSetChips` (a `shown.bs.tab` or a spec/phase change), when
the `visible` rule (`set.phase === undefined || set.phase === maxPhase ||
this.guaranteedSetKeys.has(set.key)`) re-sorts it and the top-of-rebuild clear
(`setsMoreElem.replaceChildren()`) prevents any duplicate. The manifest cannot fire
`shown.bs.tab` (one activate per entry), so this transition is proven by inspection
of the `visible` rule and the clear line in FORK_448, not captured.

Visual review: **pass** by the `gate-visual` seat, handoff at
`.scratch/handoffs/visual-review-tab-438-impl-448.md`, judged against forkHead
994fcb9f3. Harness page is ret paladin at P3: 2 shown (P3 + P3-Bulwark saved), 3
hidden (P1-Preraid, P1, P2); toggle "Other phases (3)"; activeShown=1,
activeHidden=0; expand reveals 3, collapse returns to 3 with no duplication.

Copy string shipped as placeholder (owner-taste, to confirm): `sets_other_phases`
= "Other phases ({{n}})".
