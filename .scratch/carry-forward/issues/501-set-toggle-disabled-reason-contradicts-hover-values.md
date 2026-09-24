Status: open
Type: bug
Origin: .scratch/stage-gate/upgrades-tab-closeout/set-rule-scenarios/report.md (scenario C, 2026-09-24)
Blocks: none
Blocked by: none

# Disabled-toggle reason says no upgrade gains a set bonus, while hovers list a 4pc value

Scenario C ran feral in four Malorne pieces at phase 2. After the run, the
tab disabled the "Set potential" toggle
(`controlsAfterRun.setPotential = {checked: false, disabled: true}`), so
the script's click did nothing and the "on" state equals the "off" state.

The tab disables the toggle when no row's `rankableSetPotential` is
non-zero (`upgrades_tab.tsx` `refreshViewControlVisibility`, lines
2049–2052), and shows the reason text from
`assets/locales/en/translation.json` line 889: "None of these upgrades
gain a set bonus."

But five rows' hover text lists a positive 4pc line for Nordrassil:
"4pc (0/4): +50.9" (Nordrassil Feral-Kilt, Feral-Mantle, Handgrips,
Chestplate, and twice on Headdress — reads: "4pc (0/4): +50.9 / to reach
4pc: breaks Malorne Harness 4pc: -22.9 / to reach 4pc: breaks Malorne
Harness 2pc: -84.3"). Full text: `analysis-C.md`; captures
`C-tip-NordrassilChestplate-off.png`, `C-tip-NordrassilHandgrips-off.png`,
`C-tip-NordrassilHeaddress-off.png` (and their `-on` twins, identical
since the toggle stayed off).

The credit is correctly 0 by the rule (N4 = 50.9 does not clear what it
breaks, M4 = 22.9 and M2 = 84.3), so the disabled toggle and the 0 credit
agree with each other. What disagrees is the reason text: a player reading
"None of these upgrades gain a set bonus" alongside a row that visibly
prints "4pc (0/4): +50.9" will read the tool as contradicting itself,
because the message does not distinguish "no bonus exists" from "a bonus
exists but never clears its break."

## What would close this

1. Reason copy that covers the case where a future bonus is listed but
   never net-positive (owner-confirmed wording, as with 494/479).
2. The tab change, fork commit, re-pin, `pnpm verify` rc=0.
