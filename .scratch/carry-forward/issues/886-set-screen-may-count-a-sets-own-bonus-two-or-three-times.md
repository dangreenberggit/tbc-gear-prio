Status: open
Type: task
Origin: .scratch/agent-reports/2026-11-18-general-task-sum-of-singles-explained.md
Blocked by: none

# Set screen may count a set's own bonus two or three times when the set is worn at 1 or 3 pieces

A behaviour question for the owner, to be looked at after the naming
review. Not started.

## What may be wrong

**The set screen may count the set's own bonus more than once for sets
worn at 1 (or 3) pieces.** hypothesis, untested. Singles are plain sims
(`rank.ts:1115, 1132`). When a set is worn at 1, each single swap of
one of its pieces reaches 2 pieces, so it includes the 2pc gain. The
code itself expects this: `CrossingGate.count` is "the count a one-item
swap reaches" (`rank.ts:384`). `sumOfSinglesEstimate` corrects only
*other* sets' broken bonuses (`set-value.ts:222` skips the completing
set). So `sumOfSinglesDpsAt(setId, 3)` at worn 1 counts the 2pc gain
twice. Then `measure` adds `pairDps`, which counts it a third time
(`set-screen.ts:344-355`). In partner choice this cancels, because
every group gets the same extra amount. In the screen, `measure` is
compared *across* sets (`set-screen.ts:407+`). An inflated set can
take a top-2 slot or raise the band and push out another set. If
`SCREEN_ON_RULE` was scored on recordings that had this property, the
scoring may already absorb it (`set-screen.ts:44-48`). A unit test of
`sumOfSinglesDpsAt` at worn 1 would confirm or rule it out.

The file:line references above are to fork commit `1283e6eb7`, under
`ui/features/upgrades/model/engine/`.

## Why it matters

If it is true, a set worn at 1 or 3 pieces can look more valuable in
the set screen than it really is. It can take one of the top-2 slots
and push another set out, so that other set gets no bonus sims.

## How to settle it

A unit test of the set screen's estimate for a set worn at 1 piece,
as the report suggests.

## Source

`.scratch/agent-reports/2026-11-18-general-task-sum-of-singles-explained.md`,
section 3, item 1.

## Comments

Owner's words, 2026-11-18: "Set bonus question seems like a separate issue for afterwards"
