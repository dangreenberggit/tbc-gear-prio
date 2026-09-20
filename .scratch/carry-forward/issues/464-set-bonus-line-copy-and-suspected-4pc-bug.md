Status: open
Type: bug
Origin: owner viewing session, 2026-09-20
Blocks: none
Blocked by: none
Related: 419/431 (set-bonus total on the DPS cell), 443 (inline set-bonus line), 90 (confounded/(k-1)*B bonus), 441 (rankable-set-potential toggle)

# Set-bonus line: copy is off, and a 4pc bonus may not show when it should

Owner report, 2026-09-20. Two things about the inline set-bonus line
("with {{threshold}}pc bonus (+{{dps}})", e.g. "with 2pc bonus (+35.1)"):

1. **Copy.** "with 2pc bonus (+35.1)" reads awkwardly; prefer
   "2pc bonus: +35.1".
2. **Suspected correctness bug (needs investigation, not confirmed).** The line
   looks factually misleading in a scenario where a **4-piece** set bonus is
   desired and four pieces are good but are NOT showing when they should. The
   owner is unsure what the actual behavior is for a 4pc bonus — the 2pc figure
   may be masking or mis-attributing the 4pc case.

## What would close this

- Copy: reword the inline line to "{{threshold}}pc bonus: +{{dps}}"
  (`upgrades_tab.set_bonus.inline`, value only).
- Bug: **investigate first.** Reproduce a case where a 4pc bonus should surface
  (a character/pool where four set pieces rank as upgrades) and confirm what the
  tab shows — does the 4pc threshold ever display, or does it always collapse to
  2pc? Trace `prospectiveBonusDps` / the threshold selection in the set-bonus
  presentation (`setBonusPresentation` and the rankable-set-potential path) and
  check against the confounded/(k-1)*B handling from ticket 90. Only then decide
  the fix.
- The behavior is what matters here; the copy tweak is trivial and can ride
  along once the display is correct.

## Notes

Do NOT assume the copy change fixes the number — treat the 4pc-not-showing report
as a real possible defect in threshold selection until a live repro says
otherwise. This is the set-bonus family that has been reworked several times
(419/431/90/441/443); check those before changing the math.
