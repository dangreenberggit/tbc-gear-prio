Status: closed
Type: ux
Origin: owner viewing session, 2026-09-19
Blocks: none
Blocked by: none
Related: 431 (moved the set-bonus breakdown into a DPS-cell hover tooltip), 313/336/430

# "Npc bonus possible" DPS-cell line is a poor label; owner wants both display options

Owner report from the 2026-09-19 viewing session, verbatim intent: the text
"4 pc bonus possible" is dumb. Tier sets can of course have 2- or 4-piece
bonuses; the real question is whether they're GOOD. Either the info should be
displayed, or the line should read as a hover affordance ("hover for set bonus
details"), or, when it's 2pc/4pc-specific, "hover for 2pc bonus" / similar.

## Current state (diagnosed)

The DPS cell ALREADY carries a tippy hover tooltip with the full breakdown
(base delta, per-threshold prospective/package DPS lines, and the total),
attached at `upgrades_tab.tsx:2546` when `setBonusPresentation` returns a `tip`.
The visible sub-line is built at `upgrades_tab.tsx:2745-2751`:

- toggle OFF → `set_bonus.available` = "{{threshold}}pc bonus possible"
- toggle ON  → `set_bonus.total`     = "with {{threshold}}pc bonus"

So the real numbers are one hover away, but the visible line neither signals the
hover exists nor conveys whether the bonus is worth caring about. That's the
owner's complaint.

## Owner decision (2026-09-19)

Provide BOTH as **visual display options** the user can choose between:

1. **Hover-cue mode** — the visible line reads as an affordance that a tooltip
   exists and names the reachable threshold, e.g. "hover for 4pc set bonus" /
   "hover for 2pc set bonus". Detail stays in the existing tooltip.
2. **Inline mode** — the actual bonus info is shown on the line itself (e.g. the
   bonus DPS / an at-a-glance figure), nothing hidden behind hover.

The exact wording and what "inline" surfaces is an SME/domain call — bring the
recommendation to the owner before it lands. The layout gate budgets ONE sub-
line under the DPS figure at 1.2 line-height (C30 / `_upgrades_tab.scss:257-267`),
so inline mode must stay within that budget or the gate must be re-reasoned.

## What would close this

- A view control (or extension of the existing Set-potential / BiS-only toggles)
  that switches the set-bonus sub-line between hover-cue and inline presentation.
- Wording confirmed by the domain reviewer + owner.
- Layout gate stays green (or its budget is deliberately re-set with reasoning).
- Verify live on the Go backend (:3333), Feral (shows the set-bonus lines).

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(`setBonusPresentation`, ~2690-2781; the sub-line at 2745; tooltip wiring at
2546), locale `set_bonus.*` in
`vendor/tbc-new-fork/assets/locales/en/translation.json:895-903`, and any new
ViewToggle wiring near the existing set-potential/BiS-only controls (~910).

## Notes

New from the owner's 2026-09-19 viewing session. UX + light domain-wording work;
the plumbing (tooltip, presentation split) already exists from 431, so this is
mostly a presentation-mode toggle + copy, not a data change.

## Closed

Fixed in fork commits `e4e1c28b8` + `b9b686530` (original, SME wording) then
`e01718feb` (owner-correction: hover mode dropped), re-pinned at repo commit
`aaa0e892` (fork tip `6c08a6a56`). The set-bonus sub-line now ALWAYS shows the
DPS figure inline: "{{threshold}}pc: +{{dps}} DPS" (the SME-chosen wording), or
"with {{threshold}}pc bonus (+{{dps}})" when set potential folded the bonus into
the shown figure. The full breakdown stays on the DPS-cell hover tooltip. On
owner feedback the originally-built hover/inline toggle was removed entirely
("hover for 4pc bonus" was as long as showing the number), returning the View
options row to two toggles. Layout gate 45/45 at 375/653/768/1280 (no clipped
text, no horizontal overflow); desktop gate golden unchanged; verify rc=0.
