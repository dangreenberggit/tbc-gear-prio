Status: open
Type: bug
Origin: owner report, 2026-08-28 (relates to tickets 313, 315)
Blocks: none
Blocked by: none

# Set-bonus line names the 2-piece step but shows a higher-threshold number

Owner report, on the set-bonus line shipped by ticket 313 (now gated by the
noise floor from ticket 315): the rendered text

    +46.3 set bonus (0/2 → 1/2 Thunderheart Harness)

is "too wordy and extremely questionable." The owner's substantive point: the
line shows the **2-piece step** (`0/2 → 1/2`) but "+46.3" presumably reflects the
**4-piece** bonus that is the relevant increase — "there's no mention there of
the 4 piece bonus... so it's overreaching, and in a stupid manner." The label
claims the number is a 2-piece step when the number is really a higher
threshold's (or the full package's) figure.

## This may be a labeling/data bug, not just copy

Before rewording, confirm what `+46.3` actually measures. In
`packages/core/src/rank.ts` (`applySetContext`, ~1820-1855), `prospectiveBonusDps
= matching.bonusDps` where `matching` is the bonus for `nextThreshold =
nextMeasurableThreshold(setId, piecesAfterSwap)`. If a row that advances the
worn count to 1/2 shows the bonus for a threshold above 2 (e.g. 4), then the
`{{threshold}}` piece-count shown ("/2") and the threshold the bonus belongs to
disagree, and the template presents a 4-piece figure as a 2-piece step. That is
the "overreaching" the owner means and is bigger than a reword.

## What is wanted

1. Determine what `+46.3` truly represents for such a row (2pc bonus, or the
   next measurable threshold's — possibly 4pc — value). A copy pass on
   2026-08-28 investigates this.
2. If the label misrepresents the number: fix the line so it names the threshold
   the number actually belongs to (or drops the misleading piece-count arrow),
   and make it **shorter** and plain per the owner's standing copy rule.
3. Keep it consistent with the noise floor (ticket 315) and the crosses/confounded
   branches already in `setBonusLine`.

Candidate replacement strings from the copy pass; owner picks before it lands.

## Where

`assets/locales/en/translation.json` key `upgrades_tab.set_bonus.prospective`;
`upgrades_tab.tsx` `setBonusLine`; the value computation in `rank.ts` /
`set-value.ts`.
