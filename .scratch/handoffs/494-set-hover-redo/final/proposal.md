# Set-bonus popover proposal (494): Mantle of Malorne, revision 2

Row: Mantle of Malorne (item 29100) in the `feral-p3-nordrassil4` tab fixture. The player wears four Nordrassil Harness pieces (shoulder 30230, chest 30222, hands 30223, legs 30229) and no Malorne piece. Rendered on fork 2d13cdc7 with `proposal.diff` applied, at 1280 wide.

Captures: `off.png` and `on.png` (the popover), `off-row.png` and `on-row.png` (the row). `on-with-comparison.png` shows the last comparison section that was tried and then removed.

## Set potential off

The row reads rank 185, `-57.2`, with `set detail` under the figure.

    Item stats                          -10.0
    Breaks Nordrassil Harness 4pc       -47.2
    ─────────────────────────────────────────
    Total                               -57.2      (bold)

- **Item stats -10.0:** the mantle's own stats give 10.0 DPS less than your Nordrassil shoulders, not counting any set bonus.
- **Breaks Nordrassil Harness 4pc -47.2:** replacing your Nordrassil shoulders leaves you with 3 Nordrassil pieces, which breaks the Nordrassil 4-piece bonus, worth 47.2 DPS.
- **Total -57.2:** the figure in the row's DPS cell.

How it adds up: -10.0 - 47.2 = -57.2.

## Set potential on

The row reads rank 7, `+50.8`, with `set detail` under the figure.

    Item stats                          -10.0
    Breaks Nordrassil Harness 4pc       -47.2
    SET POTENTIAL                                 (small grey heading)
    Malorne Harness 2pc (0/2)           +93.1
    Malorne Harness 4pc (0/4)           +14.9
    ─────────────────────────────────────────
    Total                               +50.8      (bold)

- **Item stats -10.0 and Breaks Nordrassil Harness 4pc -47.2:** the same as with Set potential off.
- **SET POTENTIAL:** the lines under this heading are what the Set potential toggle adds to this row.
- **Malorne Harness 2pc (0/2) +93.1:** you wear 0 of the 2 Malorne pieces this bonus needs, and Set potential adds the bonus's full value, 93.1 DPS, to this row.
- **Malorne Harness 4pc (0/4) +14.9:** you wear 0 of the 4 Malorne pieces this bonus needs, and Set potential adds its full value, 14.9 DPS, to this row.
- **Total +50.8:** the figure in the row's DPS cell.

How it adds up: -10.0 - 47.2 + 93.1 + 14.9 = +50.8.

## Where each number comes from

All values are from `data/tab-fixtures/feral-p3-nordrassil4.json`, item 29100.

- Cell with Set potential off: `deltaDps` = -57.2494.
- Nordrassil break: `setContext.singleBreaks[0].dps` = 47.1879. It is already inside `deltaDps`.
- Malorne bonuses: `setContext.futureBonuses` = 2pc 93.0847 and 4pc 14.9359. These are the ranking's `bonusDpsNet` values. Both are above the noise floor of 5.09 (sqrt(2) x cutoff `absDps` 3.6), and the running total is largest at 4 pieces, so Set potential adds both (108.0206).
- Cell with Set potential on: -57.2494 + 108.0206 = 50.7711, which shows as +50.8.
- Item stats is the balancing line: the displayed Total minus the other displayed lines, counted in tenths. Unrounded it is -57.2494 + 47.1879 = -10.0615. Rounded on its own, that would be -10.1, and the lines would add to -57.3 and +50.7 while the cell shows -57.2 and +50.8. The 0.06 difference is far below the row's standard error of 1.40.

## Changes from the first proposal, and the owner's words behind them

The owner's feedback is quoted from `owner-feedback-1.md`.

1. "Loses" became "Breaks". Owner: "'Breaks' might be better than 'loses' a set bonus since the set is broken"
2. The heading is just "Set potential". Owner: "'Set potential' doesn't need the needs more pieces. I think it's obvious what the potential means"
3. The comparison section ("4 Malorne Harness pieces instead", +8.5) is removed. Owner: "'4 malorne harness pieces instead' -- unclear what this is instead of or what this means (instead of current gear? Instead of some other hypothetical or partially worn set? Unclear)". Four wordings were tried, each with a cold read, and none was read with confidence. The last one, "Swap to Malorne Harness / Your shoulder, chest, hands, legs +8.5", made clear that the pieces replace current gear. It did not make clear what +8.5 includes, and a reader could add it to the Total.
4. "Item stats" is unchanged for now (ticket 517). Owner: "'item stats' should only display if thats not the same as the dps figure. That seems dependent on the toggle so we can save it for a minor future ticket."

## Design choices kept from the first proposal, and the owner's words behind them

1. Each state shows only its own lines, and its Total equals the cell. Owner, 2026-09-25 15:28: "is the tooltip some sort of meta tooltip thats supposed to show what the tooltip would look like in two states (set potnetial toggled on or off) but combined in one tooltip no one would ever see? very confusing."
2. Two columns, one short label per line, figures right-aligned in one column, and no sentences. Owner: "bad formatting, hard to read, the "but loses" is starting to stick long sentences in what's supposed to be a tooltip and not a word document." Owner on 508: "It should be short but readability matters more than character count."
3. "Item stats" as the first label. Owner: "Could just be "DPS:" or "item stats:""
4. No label says "now". Owner: ""in this DPS now" is both wordy and poorly worded and misleading. Smelly. It's not "now" it's not already equipped."
5. The heading is a small grey uppercase row across the popover, so it reads as a label. Owner: ""not counted" as plain text, not clearly a label."
6. Nothing is indented, and there is no "too small to count" line. Owner: ""Too small to count" is also too wordy." and ""Needs breaking X" is weirdly indented and also horribly worded."
7. "(0/2)" counts the pieces worn now. Owner on 479: "(1/2) is wrong. this should be an indicaiton of how much progress a player has with their current gear"
8. The popover opens in the same place, to the right of the figure when there is room. Owner: "495: hover to right when it fits"

## Why this shoulder reads +50.8 while the whole Malorne set gains +8.5 (the owner's 511/512 question)

- Set potential adds the full value of the Malorne 2pc and 4pc bonuses (+108.0) to this shoulder's row. It does not subtract the stats of the other three pieces those bonuses need. Those three pieces are 42.2 DPS worse than the Nordrassil pieces they replace: Breastplate -7.3, Gauntlets -8.2, Greaves -26.7. Each is that piece's `deltaDps` plus the 47.19 Nordrassil break that `deltaDps` includes.
- Wearing all four Malorne pieces together measures +8.5 (`commitPackageDeltaDps`). The arithmetic: +50.8 (this row) - 42.2 (the other three pieces' stats) = +8.5.
- Every Malorne row gets the same +108.0: Breastplate -54.5 becomes +53.5, Gauntlets -55.4 becomes +52.6, and Greaves -73.9 becomes +34.1. The engine's best 2-piece pair is Breastplate and Gauntlets (+30.4), which does not include the mantle.
- Tickets 511, 512 and 514, and the 511/512 redesign, change how a bonus is measured and which bonuses count:
  - 511: ret bonuses that add no DPS.
  - 512: breaks of sets that are not tier sets, and 3pc thresholds.
  - 514: a leftover term inside a bonus value.
  - The redesign plan lists `view.ts`, which holds the credit rule, as "read, not changed" (`.scratch/handoffs/511-512-set-credit-redesign/plan.md:112`).

  None of them changes the rule that gives each piece the full bonus without the other pieces' stats. They may shift the 93.1 and 14.9 figures (hypothesis, untested), but not this gap.
- The rule is recorded in ticket 467 (`.scratch/carry-forward/issues/467-set-bonus-ranking-hides-net-value.md:65-69`: "NOT other items' stats. The owner has ruled: full credit on each contributing row by default"). That sentence is an agent's record, not a verbatim owner quote. It is also recorded in ADR-0034 (`docs/adr/0034-set-bonus-row-values-are-not-additive.md:75-77`).
- Open ticket 502 (`.scratch/carry-forward/issues/502-scenario-d-tier4-outranks-new-tier-staff.md:47-54`) records this exact gap as input to an owner ruling. No ticket proposes a fix.

## Not designed or captured

The diff has rules for these cases, but none of them was rendered or reviewed:
- a row that completes a bonus on equip ("Item stats + X 2pc")
- unmeasured values ("not measured")
- breaks that Set potential charges on the way to a bonus
- Set potential on with a credit of zero
- the single "Set potential" fallback line
- widths other than 1280
- any other row
