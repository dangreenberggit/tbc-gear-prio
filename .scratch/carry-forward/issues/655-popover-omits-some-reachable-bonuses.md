Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, follow-on of 336 (scope bucket for the orchestrator to set)
Type: bug
Origin: pre-merge review of feat/tab-set-bonus (docs/reviews/feat-tab-set-bonus.md, findings A1 and P1), 2026-10-15
Blocks: none
Blocked by: none
Related: 336, 511, 517

# The set-bonus popover still names some reachable bonuses nowhere

The owner's rule of 2026-10-11 (ticket 336): "what the set bonus toggle does
is whether that goes into the main DPS number in the row and affects the
items ranking, not whether the hiver tooltip/poop er is available". Fork
`f4b78f65d` (ticket 336) meets it for most rows. Two cases still list a
reachable bonus nowhere. Both behaved this way before that commit.

1. **Toggle on, a bonus past the best stop.** A row with a positive credit
   keeps its step popover, which `engine/view.ts:665`
   (`stops.slice(0, last + 1)`) cuts at the best stop, and
   `model/set_bonus_tip.ts:287` then skips the "Not counted" lines. So a
   4pc whose step is worth less than the 2pc stop is listed with the toggle
   off and not with it on. Example: Gauntlets of Malorne (29097) on
   `feral-p3-th-hands-legs`, mock-up row 5 of
   `.scratch/stage-gate/tab-set-bonus/mockup-336.html` (main checkout,
   gitignored): the Malorne 4pc (78.6 DPS more) shows only with the toggle
   off. The review's scratch probe (a 2pc step at 30.5 and a 4pc at 10,
   single 4.5) reproduced it: off lists both, on lists only the 2pc.
2. **A row whose only future bonus is below the noise gate.** It has no
   "set detail" hint and no popover in either state. Example: Lightbringer
   Breastplate (30990) on `ret-p3-p2`
   (`.scratch/handoffs/visual-review-tab-set-bonus-K3.md` lines 54-55). The
   test "gives nothing in either state for a future below the noise gate"
   in `set_bonus_tip.test.ts` pins this; plan claim C19 chose it. Ticket
   336's condition 5 asks only that such a bonus not be shown "as a real
   figure".

## What would close this

1. A decision, recorded here, on what each case shows: for case 1, the
   bonus past the stop under the "Not counted" heading; for case 2, a line
   that names the bonus with no figure (for example "within the noise"),
   or a recorded reason to keep the row without a popover. The popover keeps
   one Total, equal to the row's figure.
2. Fork tests for both cases replace the test that pins case 2, a fork
   commit and re-pin, `pnpm verify` rc=0.
3. A `pnpm tab-review` capture at 1280 and 375 px of 29097 on
   `feral-p3-th-hands-legs` with the toggle on and of 30990 on `ret-p3-p2`
   in both states.
