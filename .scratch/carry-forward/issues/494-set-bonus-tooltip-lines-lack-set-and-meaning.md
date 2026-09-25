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

## Comments

### 2026-09-24, set-rule-scenarios run

More self-explanation gaps found while running the nine set-rule scenarios
(`.scratch/stage-gate/upgrades-tab-closeout/set-rule-scenarios/report.md`):

1. **A "to reach 4pc" line with no 4pc line above it**, because the 4pc
   value is at or below the rankable floor (hidden as noise). Scenario E,
   Stag-Helm of Malorne: the hover reads only "to reach 4pc: breaks
   Thunderheart Harness 2pc: -71.6 / Full set end state: -247.7" — no "4pc
   (…): +…" line precedes it, so the "to reach 4pc" has nothing to reach
   toward on screen. Capture: `E-tip-StagHelmofMalorne-off.png` /
   `-on.png` (report.md scenario E, `analysis-E.md`).
2. **Rows marked "set detail" whose hover holds only an unexplained
   total.** Scenario I, Lightbringer Breastplate: the row shows "+3.9 DPS
   / set detail" in both OFF and ON, but the hover's entire content is
   "Full set end state: -29.7" — no 2pc or 4pc line at all, because both
   Lightbringer bonuses are below the floor. A reader has no way to tell
   from the hover why this row is flagged "set detail" when nothing in it
   names a set. Capture: `I-tip-LightbringerBreastplate-off.png` /
   `-on.png` (report.md scenario I, `analysis-I.md`).
3. **"Full set end state" often disagrees with the row's credit**, which
   this ticket's finding 3 above already names, but the set-rule scenarios
   give a second, larger example: scenario D, the four Malorne rows each
   credit ON−OFF = +108.0 (rule (best) = 108.0, confirmed), but "Full set
   end state" on Breastplate of Malorne reads +8.5 — nowhere near the
   +108.0 the row's own DPS delta shows. (report.md scenario D,
   `D-tip-BreastplateofMalorne-off.png` / `-on.png`, `analysis-D.md`.)

These are additional instances of the same "lines lack meaning" problem
this ticket already tracks, not a new defect.

**2026-09-25, round 2c (owner decision).** Every wording drafted in round
2c was rejected: v1 grouped and flat, v2 wording A and wording B. This ticket
moves to its own session. Everything that session needs is in
`.scratch/handoffs/494-set-hover-redo.md` and the folder
`.scratch/handoffs/494-set-hover-redo/`: the mechanism to agree first, each
approach tried with the owner's reason for rejecting it, the findings that
still hold, the mistakes made, and copies of the draft code and pictures.
Round 2c changed no hover content. It did build the hover's placement (right
of the figure when it fits, else above, ticket 495) and the DPS cell changes
(ticket 499). Status stays open.
