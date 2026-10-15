Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 follow-on (Tab-adjacent)
Type: task
Origin: .scratch/handoffs/sme-rank-judgment-613-tab-item-lists.md (finding F3, contested)
Blocks: none
Blocked by: none
Related: 613

# The arena exclusion's recorded reason says all arena gear is rating-gated

Stage `tab-item-lists` decision N6 extended the arena-gear exclusion
(`ARENA_GEAR_IDS`) to ret and feral, citing "rating-gated currency" and
mis-valued resilience. `scripts/assemble_universe.py` says the same in the
`ARENA_GEAR_IDS` comment ("the rating-gated ones", line 325 at main
`e1f7909f`) and in the report note near lines 2618 and 2654
(`grep -n 'rating-gated' scripts/assemble_universe.py`).

The SME contests the premise: in TBC Classic only the current season's
shoulders and weapons needed a personal rating; other arena pieces needed
only arena points, and the previous season's gear needed no rating
([warcrafttavern](https://www.warcrafttavern.com/tbc/news/tbc-classic-arena-season-1-starts-today/)).
That Anniversary realms use the same rules is unverified. So the Vengeful
weapons at phase 3 are rating-gated, but Merciless Gladiator's Maul at phase
3+ and Vengeful Gladiator's Dragonhide Tunic were not.

The SME found that the exclusion leaves no fixture misleading; this ticket is
about the stated reason, not the rule.

Done when: the comment and the recorded reason state what is true (arena
points come only from rated arena play; which pieces need a rating), with a
source; and whether to keep excluding previous-season arena gear is put to
the owner as a decision, not changed silently.

## Comments

2026-10-15 (stage `tab-item-lists`, K5): the owner ruled, verbatim: "the
"dropping arena gear"--whether it requires a rating doesn't matter to us.
only whether the user is allowing or filtering out pvp weapons from an
existing season as a source." So arena gear should not be hard-excluded at
all: it should be a source the player keeps or filters out. That is a larger
change, left for the next session; the `_arena_gear_ids` docstring is
unchanged and this ticket stays open.
