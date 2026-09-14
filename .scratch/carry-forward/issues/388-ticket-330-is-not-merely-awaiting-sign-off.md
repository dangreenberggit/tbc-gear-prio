Status: closed
Origin: pre-merge review of `feat/tab-scope-truth` (domain axis, finding 4)
Blocks: none
Verified by: `sed -n 1840,1870p packages/core/src/rank.ts` (one `nextThreshold` at :1846 feeds both `:1858` and `:1868`); `sed -n 2255,2272p vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`

## Resolution (2026-09-13)

**This ticket was wrong.** The number and the label do agree, so 330 really is a
wording sign-off and the scope doc's placement was right.

`applySetContext` computes `nextThreshold` once
(`packages/core/src/rank.ts:1846`, via `nextMeasurableThreshold`, which returns
the smallest *implemented* threshold strictly greater than `piecesAfterSwap`).
Both `setContext.nextThreshold` (`:1858`) and `setContext.prospectiveBonusDps`
(`:1868`, matched on `b.threshold === nextThreshold`) key off that one value.
`setBonusLine` (`upgrades_tab.tsx:2258-2270`) interpolates the same pair into
both template slots. There is no path where the label names 2pc while the number
carries 4pc's bonus.

Ticket 330's own 2026-08-28 investigation reached this conclusion first
("the displayed number is NOT mislabeled") and narrowed to the real defect: the
arrow implied arrival at a bonus not yet earned, since `nextThreshold` is always
strictly greater than `piecesAfterSwap`. That reword landed in fork commit
`a21681c33`.

## One thing left, and it is not this ticket

The i18n string on disk
(`assets/locales/en/translation.json:893`) is
`"{{threshold}}pc bonus ({{worn}}/{{threshold}}) (+{{dps}})"`, **not** the
`"toward {{set}} {{threshold}}pc (+{{dps}})"` that ticket 330 records as having
landed. Two independent passes have now noticed this. It does not affect
label/number agreement — one threshold variable still fills both slots — but
330's record of what shipped is inaccurate, and the owner is being asked to sign
off on a string different from the one the ticket quotes. Filed as ticket 389.

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
