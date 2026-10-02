Status: open
Type: defect
Origin: pre-merge review round 10 of feat/tab-signoff-followups, findings D2 and P4 (`docs/reviews/feat-tab-signoff-followups.md`), 2026-10-02; first recorded as an SME caveat in ticket 511
Blocks: none
Blocked by: none
Related: 511, 512, 494, 514

# The set popover shows one lost bonus at two values without saying which gear each is from

## What was found

Ticket 511 records an SME caveat
(`.scratch/carry-forward/issues/511-ret-set-credit-counts-bonuses-with-no-ret-dps.md`,
lines 125-127): the same lost set bonus (Malorne Harness 2pc) reads −96.3
on rows that break it from current gear and −59.1 on a step, and "the
popover does not say which gear each is measured on". Both figures are
valid sims of different gear. Ticket 511 is
closed, and no open ticket tracked the caveat
(`grep -rn "96\.3" .scratch/carry-forward/issues/` matched only 511).

A player who compares two rows sees two prices for one bonus and no
reason for the difference.

## What would close this

1. The owner picks how the popover names the gear a Breaks line is
   measured on (or rules that it should not).
2. The chosen text renders on a recorded fixture that has two rows
   breaking the same bonus at different values, and a gate-visual pass
   judges it.
