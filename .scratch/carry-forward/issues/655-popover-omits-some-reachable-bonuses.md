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
   `model/set_bonus_tip.ts:287` (fork `f4b78f65d`; `:293` at `80a876bb0`) then skips the "Not counted" lines. So a
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

## 2026-11-01: the owner's rulings and what was built

### The owner's words, verbatim

Case 1. The session proposed listing the Malorne 4pc under "Not counted" as
"Malorne 4-piece (adds Mantle and Greaves of Malorne): 11.5 DPS less than
stopping at the 2-piece." The owner replied:

> "The wording isn't great. It could just show that the 4 piece is that amount (negative) but ehh okk
> I do not like your wording it's lame"

Case 2. The session offered: "Option A adds a popover that lists each bonus
under "Not counted". The mock-ups are images 9 and 10 ... They use the words
"too small to measure", and you can name different words. Option B keeps
today's behaviour." The owner replied:

> "Case 2 a sounds fine"

### The session's reading and rule (the session's words, not the owner's)

- Reading of the case 1 reply: with the toggle on, list each eligible step
  past the stop under "Not counted", after the Total, with one figure: that
  step's gear DPS minus the stop's gear DPS (Malorne 4pc: -11.5). No
  explanatory sentence. The Total stays the row's figure. Toggle off does not
  change.
- Rule: every "Not counted" line, in both toggle states, shows how much the
  row's figure would change if the tab counted that step in place of what it
  counts now. Toggle off, Gauntlets of Malorne: 2pc 90.2 DPS more and 4pc 78.7
  DPS more, against a Total of -110.9. Toggle on: 4pc 11.5 DPS less, against
  a Total of -20.7. The case 1 line uses the same label and figure format as
  the toggle-off line.

### What was built

- Case 1: fork `tbc-new-fork@fba7e1ad9` ("List set bonuses past the stop with
  the toggle on"), re-pinned in `tbc-gear-prio@fe1fb2dc`.
- Case 2: fork `tbc-new-fork@5b9182ed0` ("Name set bonuses within the noise
  in the popover"), re-pinned in `tbc-gear-prio@10866ee1`. It replaces the
  test "gives nothing in either state for a future below the noise gate".
- `pnpm verify` rc=0 after each re-pin, with node v22.23.2 (logs:
  `.scratch/agent-reports/2026-11-01-verify-655-case1.log` and
  `-case2.log` in the pair, gitignored).

Popover text for the recorded rows, from `setBonusTipLines` and
`setBonusTipText` over `.scratch/655-snapshots/work/th-hands-legs-trim.json`
and `ret-p2-trim.json` (gitignored; text saved in
`.scratch/655-snapshots/work/case12-built-popover-text.txt`). The text is from
the tab's own functions, not from a rendered page:

```
29097 Gauntlets of Malorne, toggle on:
  Item stats                          -16.7
  Breaks Thunderheart Harness 2pc     -94.2
  Set potential
  Breastplate of Malorne (2pc)        +90.2
  Total                               -20.7
  Not counted
  Malorne Harness 4pc with Mantle of Malorne, Breastplate of Malorne and Greaves of Malorne   11.5 DPS less
30990 Lightbringer Breastplate, toggle off and on (the same):
  Total                               +3.9
  Not counted
  Lightbringer Battlegear 2pc         too small to measure
  Lightbringer Battlegear 4pc         too small to measure
```

### Still open

Check 3 of "What would close this" is not met. The `pnpm tab-review` capture
did not run in the build session: its sandbox refuses Unix-socket listens, so
`npx tsx vite.build-workers.mts` failed with `listen EPERM` and Chromium
aborted with `process_singleton_posix.cc:292 ... socket() failed: Operation
not permitted`. The manifests are ready in the pair:
`.scratch/655-snapshots/work/case1-built.manifest.json` and
`case2-built.manifest.json` (widths 1280 and 375).
