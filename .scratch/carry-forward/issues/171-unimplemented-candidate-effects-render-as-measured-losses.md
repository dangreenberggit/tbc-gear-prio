Status: resolved
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

## Resolution (2026-08-15, user ruling: exclusion, not disclosure)

The user picked the option this ticket's "Done when" section did not list as
a fourth: neither "distinguish the row" nor "disclose the caveat" — drop the
item from the pool entirely, so it is never simmed and never shown, with no
"unmeasured" styling anywhere. Rationale given: the fork's own source already
encodes implemented-vs-not (a registered `core.NewItemEffect(<id>, ...)` /
`shared.NewSimpleStatActive(<id>)` call versus a commented-out `TODO: Manual
implementation required` stub), so read that mechanically instead of
disclosing an unmeasured status this repo's tooling can already resolve for
certain.

Chose the second option this ticket weighed ("a generator step that greps the
fork's Go tree ... real detection, costs a fork dependency in the pipeline"),
not the curated list or the exact-tie heuristic — the fork checkout already
exists in this repo's toolchain for wowsimcli builds, so the dependency was
not new, and only this option can't silently misfire on a genuinely-tied pair
of implemented items the way the heuristic could.

### What shipped

- `scripts/generate_sim_implemented_effects.py` — scans
  `vendor/tbc-new-fork/sim/**/*.go`, emits `data/sim-implemented-effects.json`
  (215 implemented ids, informational; 460 stub-only ids, drives exclusion).
  Verified against this ticket's own known cases: 28592/30063/32368
  stub-only, 27484/23203 implemented (23203 via item_librams.go's
  `LibramMap{{ItemID: ...}}.RegisterAll(...)` indirection, not a literal call
  argument — the classifier covers both shapes).
- `scripts/check_sim_implemented_effects_classifier.py` — pure unit checks
  against synthetic fixtures, no fork needed, always runs in `pnpm verify`.
- `scripts/check_sim_implemented_effects.py` — regenerate-and-diff freshness
  gate, wired into `pnpm verify`, skips cleanly when the fork is absent
  (same contract as `check_engine_port_drift.py`).
- `scripts/assemble_universe.py` now drops any stub-only item before it
  becomes a universe entry, recording drops in a new
  `excludedUnimplementedEffect` report list. All six committed universes
  regenerated; every diff is pure entry deletion (verified byte-for-byte —
  zero additions, zero field mutation), every removed id a member of
  `stubOnlyItemIds`.
- `.scratch/handoffs/wowsims-tab/ret-p3-ranking/` regenerated: the ranged
  slot now shows exactly the four implemented librams (27484 worn, 31033,
  22401, 23203) and the -13.81 three-way tie cannot recur, because
  28592/30063/32368 no longer reach the artifact.
- Four pool/pool-hardening tests updated (they pinned exact counts or ids
  now correctly excluded: 28774, 32489, 34679, 29297) — each still proves
  its original membership route via an unaffected sibling id.

Commits (`feat/sweep-ret-tickets`, this worktree): `41f3941` (generator),
`1fcfcaf` (assemble_universe.py wiring + universe regen + test fixes),
`3c5a598` (verify gate), `c134a99` (ranking regen).

`pnpm verify` passes with the fork absent from this worktree (the freshness
check reports "skipped" rather than failing); it was also run once against
the fork's real checkout at `C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\
tbc-new-fork` to produce and validate the committed data file, but that run
itself is not part of the reproducible `pnpm verify` path from a fresh
checkout without the fork.
