Status: open
Type: report defect
Origin: domain axis, pre-merge review of `feat/sweep-ret-tickets`, 2026-08-14
(`docs/reviews/feat-sweep-ret-tickets.md`, finding D3)
Blocks: none
Blocked by: none

# Candidates the sim cannot measure render as ordinary losses

Three librams in the ret-p3 ranged slot score **exactly** the same delta:

| Item | id | deltaDps |
| --- | --- | --- |
| Souls Redeemed | 28592 | -13.806909042320513 |
| Absolute Truth | 30063 | -13.806909042320513 |
| Tome of the Lightbringer | 32368 | -13.806909042320513 |

Identical to 16 significant figures, with identical `se`. That is not sim
noise. Those three exist only as commented-out `TODO: Manual implementation
required` stubs in the pinned fork's Go tree (ticket 163's diagnosis, at
`sim/common/tbc/stat_bonus_procs_auto_gen.go` lines 3856/4432/5291, with no
`NewItemEffect` registration), so they score on stats alone — their procs are
never simulated.

The rendered `ranged` section reads `7 candidates / 1 BiS candidate`, styles
all three rows with ordinary `delta down` loss styling, and carries **no
disclosure**. A reader is told the sim ranked seven relics against each other.
It ranked four and stat-scored three.

## Verify

```bash
python -c "import json; d=json.load(open('.scratch/handoffs/wowsims-tab/ret-p3-ranking/slamaltman-p3.json',encoding='utf-8')); print([(i['itemId'],i['deltaDps']) for i in d['ranking']['items'] if i['slot']=='ranged'])"
```

## Why this got worse as the data got better

Before ticket 157, item 27484 was missing from the pool, the slot tripped the
`worn-unrankable` guard, and ticket 164's machinery rendered a dead-slot
retraction. Now that 157 has made 27484 a real pool member, the guard correctly
has nothing to fire on — and the slot's *presentation* lost its only caveat
while its *data* improved.

The SME review named the relic slot as its blocker. On membership that blocker
is now met. On presentation it is not: a ret reading this page is not misled
about which relic is best (27484 correctly tops it) but is misled into
believing three unmeasurable librams were measured against one another.

## Done when

An item whose effects are not implemented in the pinned sim is rendered
distinguishably from one that was measured and lost — the same treatment
ticket 164 gave unmeasured *slots*, applied at *row* granularity — or the
report explicitly discloses that the relic slot contains stat-only rows.

Note the hard part, already flagged in ticket 163: detecting "unimplemented"
mechanically from this repo is nontrivial, because the stubs live in the fork's
Go source, not in any data file this pipeline reads. Options worth weighing:

- A curated list of known stat-only item ids at the pinned fork commit, with
  the pin recorded so it can be re-derived when the pin moves (cheap, honest,
  goes stale silently).
- A generator step that greps the fork's Go tree for registered item effects
  and emits a data file (real detection, costs a fork dependency in the
  pipeline).
- An exact-tie heuristic — flag N candidates in one slot sharing a delta to
  full float precision (no fork dependency, but it infers a cause from a
  symptom and would misfire on genuinely identical items).

## Related

- Ticket 163 records the diagnosis and scoped implementing the procs (layer 3)
  as out of scope at this pin.
- Ticket 164 covers unmeasured *slots*; ticket 169 covers candidates the pool
  never offered. This is the third case — a candidate present, and unmeasurable
  — which neither covers.
