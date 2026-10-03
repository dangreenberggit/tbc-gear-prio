Status: closed
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

## Comments

2026-09-25 (targeted engine review, finding D2;
`docs/reviews/feat-tab-signoff-followups.md`): one cause to weigh in the
ruling. "Stop where it pays" (fork `view.ts` `setPotentialCredit`) adds
bonus values and subtracts breaks, but it never counts the stat cost of the
other pieces on the path. In scenario D each Malorne row gets +108 of
credit (ON ranks 5–10), while the whole Malorne set's end state is only
+8.5. A player decides on the end state. The owner approved the rule, so
this does not block anything; it is recorded here as input to the ruling.

### 2026-09-27 — owner direction (replaces options A and B)

The owner, answering Q-502-cap after reading an explanation of option B (limit a set piece's row to the simulated gain from wearing the whole set), verbatim:

> This sounds like there needs to be a way to include measure of the other set items own stats. That's ok but it's work that needs to be logical and consistent. It can be included (amount gained or lost on net) in the ranking with the set bonus toggle on

This changes the 2026-09-20 rule ("... NOT OTHER ITEMS"): with Set potential on, a set piece's figure should also include the net DPS gained or lost from the stats of the other set pieces the counted bonuses need. The rule still needs a design (which pieces count, how it fits the stop-where-it-pays rule, the popover line) before any build. Source: `.scratch/stage-gate/501-502-467-lineup/owner-answers-2.md` (gitignored).

## 2026-09-27 — closed

The owner's direction (Q-502-cap), verbatim from
`.scratch/stage-gate/501-502-467-lineup/owner-answers-2.md`:

> This sounds like there needs to be a way to include measure of the other set items own stats. That's ok but it's work that needs to be logical and consistent. It can be included (amount gained or lost on net) in the ranking with the set bonus toggle on

The owner agreed to the designed rule (R1) and to building it before
tickets 511 and 512, verbatim from
`.scratch/stage-gate/501-502-467-lineup/owner-answers-3.md`:

> Agreed on 502 rule and it's order

The owner approved the renders at the render gate, verbatim from
`.scratch/stage-gate/502-other-pieces-rule/owner-answers-renders.md`:

> It looks good except for the cover issue.  It seems weird that one helm would be -200 DPS but this one would only be -81. And if I understand correctly, that's without adding a set bonus. I wonder if it's a sign of some other issue with the system for determining these numbers. If it was closer to -200 then we wouldn't see it as a contender.
>
> There is the other possible issue of being able to get a set bonus via a better method. (4 pieces other than the helm).
>
> We can file this as a separate ticket since it doesn't seem to be the tooltip.

The Thunderheart Cover point is ticket 519.

For the Set potential toggle's help text, the owner first wrote, verbatim
from the same file:

> I think there could be simpler wording that basically says a set pieces gain includes the gain of equipping other set pieces

The orchestrator proposed "When on, a set piece's DPS gain includes the gain
of equipping the other set pieces its set bonus needs, if that adds to the
total." The owner answered:

> Yes

What landed. With Set potential on, a set-piece row the player does not
wear shows `deltaDps + credit`, where the credit also counts the own stats
of the other set pieces the counted bonuses need (rule R1, ADR-0034's
ticket 502 paragraph). A row inside a measured package now shows that
package's measured delta, so each Malorne row in scenario D that is in a
measured swap shows that swap's figure. The popover lists one
"{item name} stats" line per counted piece.

- Fork `ebd38a6ae` ("Count path pieces' own stats in set futures"): each
  set future carries its path pieces and their own stats.
- Fork `2117d5271` ("Show other set pieces' stats in Set potential"): R1 in
  `view.ts` and the popover lines.
- Fork `a5cd0d357` ("Simplify the Set potential toggle help text"): the
  approved toggle text.
- Main `6e291ed8` ("Re-pin fork for the other-pieces set rule"): re-pin,
  the five tab fixtures re-recorded at `2117d5271`, the test changes and the
  new `packages/core/test/fork-set-fixtures.test.ts`.
- Main `709aa950` ("Advance the layout gate baseline") and `4bc20961`
  ("Re-pin fork for the Set potential help text").

Checks: `npx vitest run packages/core/test/fork-set-net.test.ts packages/core/test/wowsims-fork-parity.test.ts packages/core/test/fork-set-fixtures.test.ts`
exited 0 (fork-gated; skipped in CI). `corepack pnpm verify` exited 0 on the tree
of each main commit above, and `corepack pnpm layout-gate:check` printed
`layout gate: PASSED` (129 passed, 0 failed) at `2117d5271` and again at
`a5cd0d357`.
