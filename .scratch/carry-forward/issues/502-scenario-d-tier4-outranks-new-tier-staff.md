Status: open
Type: question
Origin: .scratch/stage-gate/upgrades-tab-closeout/set-rule-scenarios/report.md (scenario D, 2026-09-24)
Blocks: none
Blocked by: none

# Owner question: tier-4 Malorne pieces rank above the new staff for a tier-5 player

Scenario D ran feral in four Nordrassil (tier 5) pieces at phase 3, with
"Set potential" on. Thunderheart (the phase-3 set) jumps from OFF ranks
56–110 to ON ranks 1–4, as expected. But four Malorne (tier 4) pieces also
rise, from OFF ranks 169–206 to ON ranks 5, 6, 7 and 10 — each showing
+34.1 to +54.5 DPS (report.md Scenario D top-10 ON table; rule-check table
confirms each Malorne row nets the full M2+M4 = +108.0 credit with no rule
failure).

Rank 8 in the same ON top 10 is Vengeful Gladiator's Staff, a current
(non-set) BiS weapon. So the ranking places four tier-4 Malorne pieces
above the current-content staff, for a player who is already wearing the
newer tier-5 Nordrassil set.

The rule check passes: the credit is the documented "count each next
bonus less what it breaks, stop at the best total" computation, and no row
is miscounted (see report.md's Scenario D rule-check table, all "pass:
yes"). This is not a bug in the arithmetic. It is a question of whether
that ranking is the right thing to show a player: gearing back down into
an old tier's set bonus to beat a single BiS item may be correct in
isolation but will read as odd, since the player already owns better gear
in three of those four slots.

**This is a question for the owner, not a bug report.** File it so the
ranking behavior it raises does not go unrecorded; do not treat it as a
defect to fix without an owner ruling on whether "Set potential" should
weigh against downgrading to an earlier tier.

## What would close this

1. Owner ruling: is ranking a full old-tier set reacquisition above a
   single strong non-set item the intended behavior of "Set potential",
   or should the credit be discounted (or the row flagged) when it implies
   swapping out already-owned higher-tier pieces?
2. If the owner wants a change, a follow-up ticket with the ruling as its
   `Origin`.
