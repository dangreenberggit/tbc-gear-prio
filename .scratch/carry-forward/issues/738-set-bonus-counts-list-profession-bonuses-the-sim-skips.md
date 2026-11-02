Status: open
Type: bug
Origin: docs/reviews/fix-644-655-set-bonus-list.md (finding D1)
Blocks: none
Blocked by: a tab setting for the player's professions — not yet built
Related: 644, 655

# The tab can list a profession set bonus that the sim never applies

The review's D1, word for word (round 1 of
`docs/reviews/fix-644-655-set-bonus-list.md`, `rank.ts` lines at fork
`5b9182ed0`):

> **D1 (visibly wrong result, minor, introduced in 3f2948ce1 and 5b9182ed0)
> — `rank.ts:3806-3846`.** The new rule takes the sim's active bonus names,
> and `GetActiveSetBonusNames` (`sim/core/item_sets.go:258-266`) lists a
> bonus even when the character lacks its required profession, while the
> effect itself is skipped (`item_sets.go:210-213`). Burning Rage, Fel Skin
> and Strength of the Clefthoof need a profession
> (`sim/common/tbc/items_sets.go:116,233,247`), the tab does not model
> professions (`engine/disclosure.ts:58`), and their items carry no
> `requiredProfession` in `db.json`. If such a piece is in the pool and the
> set screen keeps the set, the popover can print "Strength of the
> Clefthoof 3pc too small to measure" for a bonus the sim never applies.
> Whether these items reach a DPS pool and survive the screen: hypothesis,
> untested. The number of sims does not change: these counts were tried
> before the branch too.

(The paths in the quote are under `vendor/tbc-new-fork/`. The fix pass
after round 1 moved `setBonusCountsInReach` in `rank.ts`; find it with
`grep -n "function setBonusCountsInReach" vendor/tbc-new-fork/ui/features/upgrades/model/engine/rank.ts`.)

## Why deferred

The owner said "go, use the orchestration system" on 2026-11-01, in reply
to a plan that said: "Defer D1 to a ticket. It may never happen in
practice; a real fix needs the tab to know the player's professions, and
the tab has no setting for that."

## Done when

One of these:

- The tab has a setting for the player's professions, the engine drops a
  profession set bonus the player cannot use from the counts it lists, and
  a fork test shows a Strength of the Clefthoof piece in the pool with no
  Leatherworking gives no Strength of the Clefthoof entry.
- A check of the DPS pools (every spec the tab supports) shows that no
  Burning Rage, Fel Skin or Strength of the Clefthoof piece reaches a pool
  and survives the set screen, the command is written here, and the ticket
  closes as `wontfix` with that reason.
