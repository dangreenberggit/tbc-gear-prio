Status: resolved
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

## Update (2026-08-28) — two findings, one bigger than a reword

**The displayed number is NOT mislabeled.** Traced: when the line shows `/2`,
`nextThreshold` is genuinely 2 and `+46.3` is the incremental 2pc bonus (the
lower tier is subtracted out in `computeSynergy`, `set-value.ts:372`). So the
number matches its threshold — not a data bug at that level.

**The arrow still overreaches.** `nextThreshold` is always strictly greater than
`piecesAfterSwap`, so a row can never show `after === threshold` — "0/2 → 1/2"
advertises the +46.3 two-piece bonus while the swap only lands the player at 1 of
2. The framing implies arrival at a bonus not yet earned. Owner picked the
plain, honest reword (a "need N more" / "at 2pc" form; exact string TBD with the
copy landing).

**The bigger issue (owner, verbatim): "the whole system is failing to take into
account a 4-piece bonus and its implications... I know the system got it wrong."**
The owner has a specific case in mind and is testing whether it's found
independently. This is escalated to its own investigation
(`.scratch/carry-forward/issues/331-...`): does the system correctly account for
4pc bonuses in ranking AND display — e.g. a row below 3 pieces shows only the
next (2pc) threshold and hides the 4pc implication; ranking may under-credit an
item that is a stepping-stone to a strong 4pc; the panel may be the only place a
4pc surfaces. The reword here does not fix that — 330 stays scoped to the line's
wording; 331 owns the system question.

## Where

`assets/locales/en/translation.json` key `upgrades_tab.set_bonus.prospective`;
`upgrades_tab.tsx` `setBonusLine`; the value computation in `rank.ts` /
`set-value.ts`.

## Update (2026-08-29) — reworded, owner-checklist-pending

Reworded in fork commit `a21681c33` (stage-gate wowsims-tab-tickets,
Execution D). SME step done (no ranking bug; number is correct). Landed
string in `upgrades_tab.set_bonus.prospective`:

    old: "counts toward {{threshold}}pc {{set}} (+{{dps}} at {{threshold}}pc)"
    new: "toward {{set}} {{threshold}}pc (+{{dps}})"

Win condition met: names the threshold exactly once, keeps the correct
number, implies no arrival ("toward"), implies no combo (the 4pc combo
story is 336's disclosure, a separate line), and is shorter than the old
string. Rendered live at both widths (feral: "toward Malorne Harness 4pc
(+15.9)"; readbacks in
`.scratch/stage-gate/wowsims-tab-tickets/d-evidence/after/readback.json`,
harness layout shots in `.../d-evidence/disclosure-harness/`).

NOT closed here — closes on owner sign-off of the rendered line.

## 2026-09-18 — owner sign-off (resolved: current wording approved)

Owner viewed the set-bonus line on the live tab and approved the current wording.
The line renders as `{{threshold}}pc bonus ({{worn}}/{{threshold}}) (+{{dps}})`
(`translation.json:893` key `upgrades_tab.set_bonus.prospective`; e.g. "2pc bonus
(0/2) (+35.1)"), with the 4pc `package_disclosure` line beneath it. The earlier
"0/2 → 1/2 arrow" overreach that opened this ticket is gone — the current form
shows the worn/threshold fraction without the misleading arrival arrow. Owner:
"it looks fine."

Note the 2026-08-29 update above is **stale**: it recorded the string as
`"toward {{set}} {{threshold}}pc (+{{dps}})"`, but the shipped
`translation.json:893` today reads `"{{threshold}}pc bonus ({{worn}}/{{threshold}})
(+{{dps}})"` — a later fork change moved it back to the worn/threshold form. The
owner approved the string that actually ships (verified in the file and on
screen), not the 2026-08-29 candidate. Trust the shipped string, not that note.

This closes 330's **wording** scope only. The bigger "the whole system is failing
to account for a 4pc bonus" concern the owner raised was split to ticket 331 when
this ticket was filed; 331 owns that and is unaffected by this sign-off.

Verified by: owner observation on the live tab, 2026-09-18; shipped string read
at `vendor/tbc-new-fork/assets/locales/en/translation.json:893`.
