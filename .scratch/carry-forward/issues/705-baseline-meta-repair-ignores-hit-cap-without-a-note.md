Status: open
Type: task
Origin: docs/reviews/feat-704-plain-drop-lines.md (D2)
Serves: .scratch/plans/upgrades-tab-finish-line.md
Blocks: none
Blocked by: none

# The tab's own meta-gem fix on the worn gear counts hit at full value, and on a level-73 fight it says nothing

## What the player sees

When the player's meta gem is not active, the Upgrades tab swaps gems in its
own copy of the worn gear and shows a "Meta gem" line in the "Dropped
candidates and substitutions" list. Those swaps on the worn gear value hit
rating at full weight with no hit cap, even on a fight where every target is
level 73 and the cap is known. On such a fight no "Meta gem and hit rating"
line appears, so nothing tells the player that the swaps may have stacked hit
past the cap.

The "Meta gem and hit rating" line that does appear on other fights gives the
reason "because the hit cap is only known for a fight where every target is
level 73". That reason is true only for swaps on candidate gear, and "only
known" reads like a fact about the game; it is this ranking that works the cap
out only for level 73.

## Evidence

- Worn-gear repair passes no `hitCap`: fork
  `ui/features/upgrades/model/engine/rank.ts:803-808` (at fork 6324167c5).
- Candidate repair passes `hitCap` when the cap is known: same file
  `:3923-3937`.
- Where the cap is worked out: `cap-profile.ts:112,436-446` (domain reviewer's
  citation, not re-read for this ticket).

The behaviour is older than branch feat/704-plain-drop-lines; that branch only
reworded the note.

## Done when

Either the worn-gear repair uses the same hit budget as candidate repairs, or
the tab says in one plain sentence that the swaps on the worn gear count hit at
full value. Decide which with the owner if it changes rankings.
