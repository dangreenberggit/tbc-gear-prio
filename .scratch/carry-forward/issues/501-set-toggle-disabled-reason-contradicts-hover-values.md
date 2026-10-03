Status: closed
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

## Comments

**2026-09-25, round 2c (owner decision).** The three reason messages drafted
in round 2c were rejected because they describe different mechanisms from
each other. The owner leans toward "None of these upgrades gain a set
bonus." if it is accurate, which it is only when no row has a future bonus
above the noise floor. This ticket moves to the 494 redo session, which
starts from `.scratch/handoffs/494-set-hover-redo.md` (§1 states the rule the
message must follow). No reason string changed in round 2c. Status stays
open.

**Correction to the round 2c comment above.** It says the owner leans toward
"None of these upgrades gain a set bonus." That is wrong. The owner wrote
"I''m leaning towards 1 if its accurate", and draft 1 was "None of these
upgrades lead toward a set bonus big enough to count."
(`.scratch/handoffs/owner-quotes-upgrades-tab-closeout.md`, Part 1,
2026-09-25 15:28). "None of these upgrades gain a set bonus." was the
message already on the page, not one of the drafts.

## 2026-09-27 — closed

The owner chose option A of Q-501-toggle, "never grey out the toggle":

> 501: A.

(`.scratch/stage-gate/501-502-467-lineup/owner-answers-1.md`; the options
are in `owner-decisions-checked.md` in the same folder.)

Landed in fork `cd2ca288a` ("Never grey out the Set potential toggle"),
re-pinned in main `3a9b617e` ("Re-pin fork to stop greying out Set
potential"). The Set potential toggle is now always enabled after a run.
The greying code and the message "None of these upgrades gain a set bonus."
are removed. When no row gets anything from Set potential, turning the
toggle on changes no DPS figure and no rank, and rows with an unmeasured
figure show their "couldn't measure" lines.

The case this ticket reported was already gone before this change. Since
fork `c2cb48f81` (the 494 popover), the popover lines for bonuses a row
leads toward show only while the toggle is on, and a greyed toggle was
always off.

Checks: `corepack pnpm verify` exited 0, and
`python scripts/check_layout_gate.py` measured 129 passed, 0 failed, 0
a11y failures.
