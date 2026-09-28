Status: open
Type: bug
Origin: stage-gate 511-512-set-credit diagnosis, 2026-09-28 (`.scratch/stage-gate/511-512-set-credit/decision-log.md` 2026-09-28 entries, and `diag/report.md` in the same directory; both gitignored)
Blocks: none
Blocked by: none
Related: 511, 512

# The Upgrades tab's hit-cap readout omits debuff and enchant hit

## What is wrong

On the ret "Phase 2 / P2" preset at page phase 3, the tab says the
character is 58.6 hit rating below the melee hit cap. The sim puts the
same character 4.7 hit rating over the cap. The tab's figure is
`ranking.caps.hit.gap` in
`.scratch/handoffs/511-512-set-credit-redesign/measurements/ret-p3-p2-10000.json`
(tracked; `"gap": 58.615...`). The sim figure comes from
`.scratch/stage-gate/511-512-set-credit/diag/report.md` (gitignored),
which gets it from base melee hit plus Improved Faerie Fire against the
level-73 miss chance.

An independent check verified this evidence during the diagnosis. Line
numbers below are at fork commit `5f3080dbd31d5fb038f7edf697a15879c8d5fe86`
(`data/wowsims-fork.lock.json` `commit`); paths are inside
`vendor/tbc-new-fork`.

## Where the tab computes it

`ui/core/components/individual_sim_ui/upgrades/engine/caps.ts:165-189`
(`capStateFrom`). The cap is 9% × 15.769 = 141.92 rating
(`cap-profile.ts:87`, `PHYSICAL_HIT_CAP_PERCENT = 9`). The rating it
counts is `sumStat` (item stats plus gem stats) plus Precision talent
hit: 83.31 = 36 from gear + 47.31 from Precision.

It leaves out:

- Improved Faerie Fire: 3%, which is 47.3 rating
  (`sim/core/debuffs.go:44,365`).
- The head enchant's 16 hit (enchant 3003).

`sumStat` also never counts socket-bonus hit, or hit from any other
enchant.

## The sim's own rule

- `sim/core/target.go:394,401`: 8% base miss plus 1% hit suppression
  against a target 3 levels higher.
- `sim/core/spell_outcome.go:571,577`: the miss chance is floored at 0,
  so hit over the cap is wasted.

## Why it matters

The tab shows players a hit-cap state that disagrees with the sim it
ranks by. Any future popover text about the hit cap would contradict the
page.

## What would close this

- The readout counts every hit source the sim counts: raid debuffs,
  enchants, socket bonuses, talents and race.
- For the ret P2 case above, the readout matches the sim's own hit
  figure, checked with a command a reader can re-run.
- Every other spec's cap profile is checked the same way.

Other caps in `caps.ts`, such as expertise, may have the same omission.
This is a **hypothesis, untested**.
