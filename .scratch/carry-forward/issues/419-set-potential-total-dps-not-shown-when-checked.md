Status: open
Type: bug
Origin: owner report, 2026-09-18 (viewing the running tab, "Set potential" on)
Blocks: none
Blocked by: none
Related: 313/315 (the set-bonus share display), 331 (the 4pc-accounting system question)

# "Set potential" changes the ranking but the row DPS doesn't include the bonus

Owner report on the Upgrades tab. Ticking **"Set potential"** changes the row
ranking (rows re-order to account for the set bonus), which is correct — but the
**DPS number shown on the row does not include the potential set bonus**. So a
row can rank higher because of a set bonus while its displayed DPS figure still
shows only the base swap gain, which reads as inconsistent (why did this row jump
if its number didn't change?).

The set-bonus breakdown lines ARE shown (e.g. "2pc bonus (0/2) (+35.1)", "4pc
bonus (0/4) (+75.9)") — good — but there is no single clear **total** that says
"this row's DPS gain including the set bonus is X."

## What the owner wants

When "Set potential" is on, show somewhere clear on the row the **total** DPS
gain including the set-bonus potential — the number the ranking is actually using
— not just the base number plus separate bonus lines the reader has to add up.

## What would close this

- With "Set potential" on, the row displays a total DPS figure that matches the
  value the ranking sorted on (base gain + counted set-bonus potential), clearly
  labelled as the with-set-bonus total.
- The base gain and the bonus breakdown can remain, but the reader should not
  have to do the arithmetic to know what the ranking used.
- Verify on a live run with a set-context row (e.g. a tier-set piece) that the
  displayed total equals the ranking value and that turning the toggle off
  removes it.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(the row DPS cell + `setBonusLine` / set-context rendering), the ranking value
in `rank.ts` / `set-value.ts`. Coordinate with 331 (whether the 4pc figure the
ranking uses is itself correct) — this ticket is display-of-the-total; 331 is
whether-the-total-is-right.

## Notes

New from the owner's sign-off pass, 2026-09-18. Distinct from 313/315 (those were
"show the share at all", now resolved) — this is "show the with-bonus TOTAL, and
make it match the ranking."
