Status: open
Type: task
Origin: .scratch/handoffs/sme-rank-judgment-ret-p3-real-ranking.md, addendum (cffaee0 on feat/ret-p3-data)
Blocks: none
Blocked by: none

# Unmeasured-slot retraction does not travel to the slot section

The SME re-check that closed plan §9.6 (2026-08-14) found the
worn-unrankable warning renders once at the top of the HTML report,
while the `ranged` section sits last of fourteen (~387k characters down)
with no local note. Its header reads "4 candidates / 0 BiS candidates"
and the rows keep ordinary `delta down` loss styling identical to a
genuine downgrade. The slot nav is `position: sticky` but the
plausibility panel is not, so a reader who clicks the sticky "ranged"
chip lands on four red rows with the retraction scrolled off-screen.
"The original problem surviving at reduced strength."

Same treatment is owed to the trinket slot once ticket 157 lands: the
page currently declares that slot finished with no disclosure that
Darkmoon Card: Crusade, Hourglass of the Unraveller and Abacus of
Violent Odds were never candidates.

## Done when

An unmeasured/caveated slot carries a local note in its own section
echoing the retraction, and its rows are styled so they do not read as
plain losses; the sticky-nav chip distinguishes "unmeasured" from
ordinary no-BiS slots. Report-layer only (rank-report/HTML), no engine
changes.
