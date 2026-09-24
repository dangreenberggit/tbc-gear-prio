Status: open
Type: bug
Origin: stage-gate upgrades-tab-closeout round 2b (owner review of the round-1 Mantle of Malorne capture, 2026-09-24)
Blocks: none
Blocked by: none
Related: 467, 479, 490

# Set-bonus tooltip lines do not say which set or what they mean

The owner called the round-1 Mantle of Malorne tooltip "obviously bad"
(`C:\Users\dgree\AppData\Local\Temp\claude\C--Users-dgree-Code-lulz-tbc-gear-prio\0179e8a3-42d8-4e7b-8321-15978c6597f8\images\1.png`,
session-local). Round 2b fixed the parts inside 479 and 490–493 (the
piece count, the break lines per future, the sub-line overprint). Three
problems remain in the tooltip's content:

1. The future line ("2pc (0/2): +62.3") does not name its set. When the
   line above names another set ("breaks Thunderheart Harness 4pc"), a
   reader takes the 2pc to be Thunderheart's.
2. A single-break line ("breaks Thunderheart Harness 2pc: -108.6") does
   not say the loss is already inside the row's DPS figure. The
   activates line does say so ("included in this number").
3. "Full set end state: -248.7" is a large figure that matches nothing
   else in the tooltip or the row, with no words saying what it is (the
   top package's delta with this piece substituted). Since ticket 490 the
   credit no longer uses that package, so the figure is even less
   connected to the row.

Seen again on round 2b's captures,
`.scratch/stage-gate/upgrades-tab-closeout/round-2b/feral-worn2-tip-GauntletsofMalorne-on.png`
(gitignored).

## What would close this

1. Copy for the three lines, confirmed by the owner (copy is an owner
   preference, like 479).
2. The tab change, fork commit, re-pin, `pnpm verify` rc=0, a real layout
   gate run.
3. A gate-visual pass on re-captured tooltips.
