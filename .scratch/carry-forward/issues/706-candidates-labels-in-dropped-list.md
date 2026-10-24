Status: open
Type: task
Origin: docs/reviews/feat-704-plain-drop-lines.md (P4)
Serves: .scratch/plans/upgrades-tab-finish-line.md
Blocks: none
Blocked by: none

# The tab's dropped list still says "candidates" in its title and two labels

## What the player sees

The Upgrades tab's list is titled "Dropped candidates and substitutions
(<count>)", and two of its labels read "one-hand candidates" and "off-hand
candidates". "Candidate" is the engine's word for an item the ranking tries,
not a player word. Ticket 704 rewrote the lines' text in player words but left
these three strings, which are older than that branch.

## Where

- Title: fork `assets/locales/en/upgrades.json:166`
  (`upgrades_tab.assumptions.substitutions_title`).
- Labels: fork `ui/features/upgrades/model/engine/rank.ts`, `field:
  "one-hand candidates"` and `field: "off-hand candidates"` (about lines
  4106 and 4120 at fork 6324167c5), with the core copies in
  `packages/core/src/rank.ts`.

## Done when

The title and both labels use player words (owner rule 2026-10-20: player-facing
strings are one plain sentence in player words), core and fork agree, and the
merge ask shows the exact new strings.
