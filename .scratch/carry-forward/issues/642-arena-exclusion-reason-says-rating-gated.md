Status: closed
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

2026-10-16 (stage-gate tab-blocking-finish): the owner ruled, verbatim:
"Yeah sure arena items as a source are fine. If it's good it's good, as long
as it's the  season is open for the selected phase".

## Closed 2026-10-16 (stage-gate tab-blocking-finish, K2)

Arena gear is no longer excluded. `scripts/assemble_universe.py` admits every
item of the four Gladiator season lines to every spec's list once its season
is open (db.json `phase`; seasons 1-4 open at phases 1, 2, 3 and 5), with one
source `{"kind": "pvp", "via": "arena", "season": N}`; stub-only pieces stay
out. The tab files every such item under "PvP vendor", so unticking that
source in the Sources dialog removes all of it. The `_arena_gear_ids`
docstring and the report no longer give a rating reason: the docstring says
what the ids are, and the report's `arenaSource` counts admitted rows by
season. The completeness gate expects each open-season piece present with
that source (E-arena) and fails on any piece listed before its season opens
(P-season-closed), and on any piece whose db phase disagrees with its
season's opening phase. Per-list E-arena counts at phase 5: balance 102, ele
116, enh 138, feral 98, hunter 93, mage 55, ret 74, rogue 96, shadow 80,
warlock 71, warrior 136. No list holds a piece before its season opens.

Verified by: `python scripts/check_pool_completeness.py --report` (E-arena and
P-season-closed columns) at tbc-gear-prio@d74d5fcc, and the fork test
`ui/features/upgrades/model/arena_source.test.ts` at tbc-new-fork@ad6771f83
(`npx vitest run ui/features/upgrades/model/arena_source.test.ts` in the
fork).
