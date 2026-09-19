Status: open
Type: design
Origin: owner viewing session, 2026-09-19 (re-raise of an earlier ask never actually explored)
Blocks: none
Blocked by: none
Related: 428 (the Sources content-block — shipped, but the component approach was never explored), 429/424/433 (the Sim-sets control)

# Sources filter + Sim-sets control need a real design exploration (options, not a straight-to-code fix)

Two tab-surface UI questions the owner raised that were NEVER properly explored —
ticket 428 just said "make it a contained element" and the executor wrapped
checkboxes in a content-block; no alternatives were generated or compared. The
owner explicitly asked "what solutions were looked at?" and the honest answer is
"none." This ticket is to DO that exploration.

## Part A — the "Sources" filter (renamed from "Content" this batch)

Owner: a flat pile of checkboxes (now in a content-block) is not a good UI
approach for these options, and the content-block wrap isn't one of the better
options either. Generate and compare real component approaches for choosing which
loot sources (raid zones + Crafted/Badge/Rep/PvP/World-drop buckets) to include:
e.g. a multi-select dropdown, a collapsible facet/filter list, a chip/tag
multi-select, a "select all / by-tier group" affordance, etc. Use the
`design-an-interface` skill (parallel option generation) — the owner wants to see
alternatives with trade-offs and pick, BEFORE code.

## Part B — the "Sim sets" control organization

Owner: the selected phase's sets should be viewable ALONGSIDE custom (saved)
sets; other phases' sets (when not the most relevant) should be hidden/collapsed
in some way — not a flat list of every phase's sets at once. Design how the chip
list organizes: current-phase BiS + custom shown, off-phase sets collapsed/behind
a disclosure. This interacts with 433 (the default selection already keys off the
current phase) — the default-selected sets are the current phase's, so the
"relevant now" grouping already has a definition to build on.

## What would close this

- A design pass (options + trade-offs) for BOTH Part A and Part B, presented to
  the owner for a pick. Then the chosen designs get their own implementation
  tickets/plan. This ticket is the EXPLORATION; implementation is downstream.
- Do not jump to code. The owner asked for solutions looked at, plural.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(the `.upgrades-source-filter` group and the `.upgrades-set-guarantee` chips) +
`_upgrades_tab.scss`. Borrow-native direction still applies — but part of the
exploration is finding which native wowsims idiom actually fits.

## Notes

New from the owner's 2026-09-19 viewing session; a re-raise of an ask that the
tab-ui-refinements batch addressed too shallowly (428). Distinct from the
already-shipped 428 content-block (which stands as an interim) — this is the
proper exploration. Design-lane work (Fable / design-an-interface), not workhorse.

## Correction / grounding in the owner's original words (added 2026-09-19)

Pulled from the origin report (earlier session "Orchestration system Opus
subagents"). The prior summary of this ticket overstated one framing and missed
the real through-line — recording accurately:

- The literal "content dropdown" complaint in that report was ONLY sizing:
  "the checkboxes for 'set potential' and 'bis only' and the content dropdown
  look a bit too big." That was ticket 328 and is fixed (native-sized controls).
  So "explore N brand-new component options for Sources" was the orchestrator's
  invention, not a direct owner ask — treat Part A's option list as *candidates
  to weigh*, not a mandate to reinvent.
- The REAL recurring desire (this report + ~11 messages across the chunk) is
  two-fold and is what the exploration should serve:
  1. **Match wowsims' own styling/components — study how the SITE builds these
     controls and reuse that, don't roll bespoke UI.** Owner, verbatim: "i
     question how much we've really tried to make this page match the styling
     elsewhere on wowsims." So Part A's exploration is "which native wowsims idiom
     fits this filter" FIRST, before any custom component — the content-block wrap
     shipped in 428 is exactly the kind of not-quite-native half-measure the owner
     is tired of.
  2. **The automated visual review was supposed to catch this.** Owner, verbatim:
     "there was supposed to be an automated viewing review of the tab... this is
     now the third time bringing up this specific issue." This is the
     already-approved visual + a11y reviewer (see
     `.scratch/stage-gate/visual-a11y-review-proposal.md` /
     [[project-visual-a11y-reviewer-approved]]) — build it so it FLAGS off-brand /
     broken-CSS controls before they reach the owner. That reviewer and this
     exploration should land in the same "next tab stage."

Net: Part A = "find and match the native wowsims control idiom for the source
filter" (options weighed against that bar), Part B = the phase-collapsing
organization, and BOTH are backstopped by finally building the automated visual
review so this stops recurring.
