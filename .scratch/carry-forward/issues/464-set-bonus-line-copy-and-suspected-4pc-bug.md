Status: closed
Type: bug
Origin: owner viewing session, 2026-09-20
Blocks: none
Blocked by: none
Related: 419/431 (set-bonus total on the DPS cell), 443 (inline set-bonus line), 90 (confounded/(k-1)*B bonus), 441 (rankable-set-potential toggle)
Resolution: Copy fixed in fork commit 7cc65f572 (re-pin da82e4c4): both
  set_bonus.inline and set_bonus.total_inline read "{{threshold}}pc bonus: +{{dps}}".
  The suspected 4pc bug is by design, not a defect — the inline figure is the
  per-row nearest implemented threshold above worn (engine rank.ts
  nextMeasurableThreshold, out of scope), and a reachable higher threshold is
  disclosed in the tooltip (the 336/443 decision: disclosure, never inline credit).
  Verified live on feral (Thunderheart 676, both thresholds implemented):
  worn-0 rows show "2pc bonus: +81.7" inline with "4pc bonus (0/4) (+114.8)" in the
  tooltip; wearing exactly 2 pieces, a third-piece row shows "4pc bonus: +75.6"
  inline with "4pc bonus (2/4) …" (the worn count is correct, so the engine does
  not miscount — Step 6 outcome (i)). No engine defect; no new ticket filed; engine
  files untouched (live-verify Step 6).

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
