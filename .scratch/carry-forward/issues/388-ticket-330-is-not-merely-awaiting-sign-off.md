Status: open
Origin: pre-merge review of `feat/tab-scope-truth` (domain axis, finding 4)
Blocks: none

# Ticket 330 is filed as awaiting sign-off but its question is still open

`docs/upgrades-tab-scope.md` places 330 in "Awaiting owner sign-off" with the
reason "rendered live per ticket 315's Resolution; waits on owner sign-off".
That bucket's own definition is that the fix has landed and rendered.

Ticket 330 does not say that. It asks first to:

> Determine what `+46.3` truly represents for such a row (2pc bonus, or the next
> measurable threshold's — possibly 4pc — value)

and states:

> This may be a labeling/data bug, not just copy... bigger than a reword.

Ticket 315's Resolution establishes that the set-bonus line **renders**. It does
not establish that the number and its label agree.

## Why this is a data question, not a copy question

It is the same threshold-selection mechanic as ADR-0023 decision 1 and ticket
331: a row at `piecesAfterSwap = 1` receives `nextMeasurableThreshold`'s answer.
Whether the displayed piece-count arrow matches the threshold the number was
computed at is a correctness question about which figure is being shown.

The player-facing risk: a 4pc-sized figure labelled as a 2pc step, and a player
gearing to it.

## Acceptance

- [ ] Determine, with a command, what the rendered figure represents for a row
      at `piecesAfterSwap = 1`
- [ ] If the label and the figure disagree, that is a data/labeling defect to fix,
      not a sign-off to collect
- [ ] 330 moved out of "Awaiting owner sign-off" unless the fix is genuinely landed
