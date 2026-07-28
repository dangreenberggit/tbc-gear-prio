# Sub-phase 5: rank wiring

**Status:** Plan. Not implemented.
**Parent:** `.scratch/handoffs/raid-scoped-pool-plan.md`, sub-phase 5.
**Scope:** how the ranking path consumes the new universe. No simulation
engine changes. No changes made by writing this document — it is a plan
only, and `packages/`, `scripts/`, and `data/` are untouched by this pass.

Files read to write this plan: `packages/core/src/pool.ts`,
`packages/core/src/rank.ts`, `packages/core/src/cli.ts`.

---

## 1. What changes and what does not

The simulation engine, `compose`, meta repair, candidate gem fill, and the
three seams (`GearSource`, `SimRunner`, `Store`) do not change. This
sub-phase only changes which `PoolEntry[]` reaches the loop in
`rankUpgrades` (`packages/core/src/rank.ts:233`) that calls `deps.sim.run`
once per candidate. The loop body, `swapItemAt`, `setBreakNote`, and the
ranking/sort/cutoff logic after it are untouched.

Concretely:

- `packages/core/src/pool.ts` — `prefilterPool` stops being the default
  path. See section 2.
- `packages/core/src/rank.ts` — the call site at lines 211-214 changes what
  it calls, not the surrounding stage.
- `packages/core/src/cli.ts` — gets a new `--raid <name>` flag (section 3)
  and stops printing pool size language that implies an EP cut is normal.
- Nothing under `packages/core/src/seams/` changes.
- Nothing about how a sim request is built (`compose`) changes.
- The gem solver, `meta-repair.ts`, `set-bonus.ts` do not change.

This list is the answer to plan item 5 (what must not change) and is
restated here at the top because every other section below depends on it
holding.

---

## 2. The EP prefilter and the `fullPool` flag

### Current behavior (measured)

`prefilterPool` (`packages/core/src/pool.ts:44-51`) sorts the phase-filtered
pool by the `ep` field stored on each row and keeps the top 80 globally,
across all slots at once — not per slot. `rankUpgrades` calls it
unconditionally at `packages/core/src/rank.ts:211-214`:

```ts
const candidates = prefilterPool(
  filterPoolByPhase(deps.pool ?? [], input.maxPhase),
  input.fullPool ? { fullPool: true } : {}
).filter((e) => !isKaelTempLegendary(e.itemId));
```

`fullPool` is a `RankInput` field (`rank.ts:56`) and a CLI flag
(`--full-pool`, `cli.ts:60-63`). Today it is an opt-in escape hatch: the
default path always runs the EP top-80 cut, and a caller has to know to ask
for the full pool.

### Why this ends (D2, measured)

Parent plan decision D2: the same EP score must not gate twice. The
generator already used `ep` (or a hand-typed stand-in, see section 3) to
decide which rows exist in `data/pools/ret.json` at all. `prefilterPool`
then re-sorts on that same value and throws away everything past rank 80.
Two gates on one number is not two independent checks, it is the same
check applied twice.

The measured cost of the second gate: `.scratch/handoffs/pool-redesign/ep-vs-sim-measurement.md`
found overall Spearman correlation between EP and simulated ΔDPS of 0.183
across 191 candidates (re-run with `python .scratch/ep-vs-sim/analyze.py`
after `python .scratch/ep-vs-sim/assemble_candidates.py` and
`npx tsx .scratch/ep-vs-sim/measure.ts`). The parent plan (§2) also states a
50% EP cut discards Hard Khorium Battleplate, the largest upgrade measured
at +42.67 DPS. An 80-item global cap from a universe of several hundred is a
harder cut than 50%, so it is plausibly at least as likely to discard a real
upgrade. This is an inference, not a measurement: no fixed-80 cut was itself
simulated against the larger universe, and the 50% figure comes from a
percentile cut on a 191-item set, which is a different mechanism on a
different population. The correlation number says the ranking it uses to choose what to
discard is close to arbitrary (0.183 is weak-to-none, not "noisy but
usable").

### Recommendation

Make `fullPool` the only path. Concretely:

- Remove the call to `prefilterPool` from the default flow in `rank.ts`.
  The candidates list becomes `filterPoolByPhase(deps.pool ?? [], input.maxPhase).filter((e) => !isKaelTempLegendary(e.itemId))`,
  with no further cut.
- Keep `prefilterPool` and `EP_PREFILTER_LIMIT` in `pool.ts` as dead code
  only if something else in the repo still calls them (grep before
  deleting: `rg "prefilterPool|EP_PREFILTER_LIMIT"` — at time of writing
  the only call site is `rank.ts:211`, so if that is the only hit, delete
  the function and the constant, do not leave unused exports).
- Remove the `fullPool` field from `RankInput` and the `--full-pool` CLI
  flag, since there is no longer a smaller default to opt out of. Grep for
  other readers first: `rg "fullPool|full-pool"` across `packages/core/src`
  and `packages/core/test` before deleting, and update every test that
  currently sets `fullPool: true` to expect it is simply gone (they should
  keep passing once the flag has no effect either way, but the field itself
  should not exist post-cleanup).

This is a straight simplification, not a new escape hatch: there is no
longer a "small" mode to escape from. If a future need arises for a smaller
candidate set (e.g. an interactive tool that wants a fast first pass), that
is a new, explicitly named feature, not a resurrection of `fullPool` — do
not restore the old flag under the old name for a different purpose.

**Do not decide alone which of "removed" vs "renamed and kept as a real
escape hatch" is right without checking one thing first:** whether sub-phase
4's assembled universe size (raid-scoped, a few hundred items per phase per
the parent plan §6 and §9 S5) is something the project is comfortable
simulating on every rank run with no size cap at all. Section 4 below gives
the wall-clock estimate that this decision rests on. If wall-clock turns out
to be unacceptable even after sub-phase 4's zone scoping, the fallback is
not to resurrect EP — it is to ask the user whether a raid-scope filter
(section 3) is an acceptable substitute for a numeric cap, since narrowing
by "which raid" is a choice the player already understands, unlike an
opaque top-80 by a score with 0.183 correlation.

---

## 3. The `ep` field on pool entries

### What it is used for today

Two things, and only two, as far as this pass can find (verify with
`rg "\.ep\b" packages/core/src scripts` before acting):

1. `prefilterPool` sorts on it (section 2 — this use goes away).
2. `scripts/curate_ret_pool.py` sorts `rest` (non-forced rows) by `ep`
   descending before trimming to the per-slot cap (line 347:
   `rest.sort(key=lambda e: e.get("ep") or 0, reverse=True)`), i.e. it is
   also a curation-time ordering signal, not only a rank-time filter.

### The measured problem with the field itself

For librams, the values stored in `data/pools/ret.json` (40-60, per the
task description and confirmed by grep — `scripts/curate_ret_pool.py` has
hand-written `"ep": 40`, `"ep": 55`, `"ep": 60`, etc. on libram-slot rows,
around lines 288-328) were typed by hand. They are not computed by
`scripts/generate_pool.py`'s EP formula — that generator emits zero ranged
rows at all, because every libram scores exactly 0.0 under the linear stat
formula (librams have no melee stats; their value is an equip effect). So
today's `ep` field mixes two different kinds of number in the same JSON
field with the same name and the same apparent type: a computed score for
armor/weapons, and a human guess for librams, with no marker distinguishing
which is which.

### Recommendation

Once sub-phase 5's rank-time change lands (section 2: `prefilterPool` no
longer runs by default), the field's only remaining consumer is
`scripts/curate_ret_pool.py`'s curation-time sort. That script is out of
scope for this sub-phase (`packages/`, `scripts/`, `data/` are not touched
here), but the plan for it should be stated so sub-phase 6 and the eventual
implementer are not guessing:

- **Keep the field**, but stop treating it as a ranking signal in
  `rankUpgrades` — it already will not be, once section 2 lands.
- **Rename it** from `ep` to something that says what it actually is, e.g.
  `curationHint`, and document in the type (`PoolEntry["ep"]` in
  `pool.ts:19-27`) that it is an unvalidated ordering hint used only by the
  curation script, not a measured quantity, and specifically that libram
  values are hand-typed, not computed. A rename forces every remaining
  reader to be re-examined, which is the point — an unrenamed field invites
  a future caller to assume it means the same thing it meant when
  `prefilterPool` used it.
- Do **not** remove the field outright in this pass, because
  `scripts/curate_ret_pool.py` still reads it for its sort, and that script
  is not being rewritten here. Removing the field would break that script
  without a replacement ordering signal.
- Flag, but do not resolve here: once sub-phase 4's universe assembly
  replaces `curate_ret_pool.py`'s "trim to top N by EP" step with membership
  by raid/list/rules (parent plan §11: "`scripts/curate_ret_pool.py` —
  `FORCE` becomes a small gap list, not the main path"), the renamed field
  may become fully unused. That is a follow-up measurement, not a decision
  to make speculatively now.

What depends on the field after this sub-phase: only
`scripts/curate_ret_pool.py`'s sort. `rankUpgrades`, `prefilterPool` (if
kept as dead code — recommended against, see section 2), and the CLI do
not depend on it once the default path stops calling `prefilterPool`.

---

## 4. Raid view filter

PLAN.md already envisions filtering by raid. The mechanism is already
present in the data model: `PoolEntry.source` (`pool.ts:9-17`) is a tagged
union where `"raid"` and `"token"` variants carry a `zone: string` field.
Crafted-from-raid-recipe items (parent plan §5.3) are expected to gain the
same `zone` field on the `"crafted"` source kind, per the parent plan's
"two-hop problem" section — that is sub-phase 2's work, not this one's, but
this sub-phase's filter should be written against `zone` wherever it
appears on a source, not only on `"raid"` and `"token"`.

### Recommendation

Add a pure filter function in `pool.ts`, alongside `filterPoolByPhase`:

```ts
export function filterPoolByZone(
  pool: readonly PoolEntry[],
  zone: string
): PoolEntry[] {
  return pool.filter((e) => "zone" in e.source && e.source.zone === zone);
}
```

Wire it as an **optional** narrowing step, not a replacement for phase
filtering: `maxPhase` still controls what is eligible at all; a raid filter
is a further view on top, for a player who wants to ask "what does this
raid specifically offer me." Two integration points, pick one and state the
choice, do not leave it ambiguous:

- **Rank-time** (inside `rankUpgrades`, via a new optional `RankInput.raid?:
  string` alongside `maxPhase`): only sim items from that raid. Cheapest on
  wall-clock, but conflates "what should I consider" with "what does the
  ranking test."
- **Report-time** (`RankInput` unchanged; `rankUpgrades` sims everything
  under `maxPhase` as today; a view/filter step over the already-ranked
  `Ranking.items` restricts what is displayed). More expensive per run
  (section 5), but the ranking itself stays a single source of truth and a
  raid view is just a lens over it — consistent with PLAN.md §6's
  `applyView` being the named seam-adjacent pure function for this kind of
  post-hoc filtering.

**Recommended: report-time**, via `applyView` or a sibling pure function
next to it, not a new `RankInput` field. Reasoning: the simulation is the
expensive, authoritative step (parent plan: "the simulator remains the only
authority on whether an item is an upgrade" — §1). Running it once per
`maxPhase` and then slicing by raid for display means a player who checks
two raids back-to-back does not pay for two simulation passes, and it keeps
`rankUpgrades`'s contract simple: one `RankInput.maxPhase`, one full
ranking, filtering is a read afterward. This does cost more DPS-seconds on
any single invocation that only cares about one raid, which is why section
5 gives both the full-universe and narrowed-view cost.

If the eventual implementer picks rank-time filtering instead (e.g. because
wall-clock at full-universe size turns out to be unacceptable per section
5), that is a legitimate call, but it should be recorded as a deviation
from this plan with the wall-clock measurement that justified it, not made
silently.

### CLI surface

Add `--raid <name>` to `cli.ts`'s arg parser (same pattern as
`--max-phase`), plumbed to whichever integration point is chosen above.
Validate the name isn't silently accepted if it matches zero entries —
`console.error` a list of known zones (derived from `new Set(pool.map(e =>
"zone" in e.source ? e.source.zone : undefined))`) rather than returning an
empty ranking with no explanation.

---

## 5. Wall-clock impact

### What is measured today

`.scratch/handoffs/pool-redesign/ep-vs-sim-measurement.md` ran 191
candidate sims (one `deps.sim.run` call per candidate, single-slot swaps,
seed 42, 3000 iterations, real `wowsimcli` binary, not a recorded mock) as
part of a throwaway measurement script, not through `rankUpgrades` itself.
That document does not report wall-clock time for the run, and this plan
does not have a source for exact per-sim latency — that number should be
measured, not assumed, before this sub-phase is implemented. Re-run and
time it with:

```
time npx tsx .scratch/ep-vs-sim/measure.ts
```

(or the Windows equivalent, e.g. `Measure-Command`), then divide by 191 to
get a real per-sim figure. **This plan does not have that number and does
not invent one.**

### What can be said without that number

- Today's default path (EP prefilter, top 80) simulates at most 81 requests
  per rank run (1 baseline + up to 80 candidates), per `rank.ts:216`
  (`totalSims = 1 + candidates.length`).
- Parent plan §6 states the raid-zone-scoped universe is "roughly 200 at
  maxPhase 2 and roughly 310 at maxPhase 3" (measured against the 1,443
  items whose zone can currently be resolved — a lower bound, to be
  re-measured after sub-phase 1's AtlasLoot import per the parent plan).
- So going from 80 to a few hundred is roughly a 2.5x-4x increase in sim
  call count at maxPhase 2-3, not an order of magnitude. It is not free,
  but it is bounded and the bound is known before implementation, which is
  the property that matters for deciding whether it is acceptable.
- Each `deps.sim.run` call is a real subprocess invocation
  (`CliSimRunner` wraps `wowsimcli`, per `cli.ts:182-188`) with its own
  process startup cost on top of the 3000-iteration Monte Carlo run itself,
  so the constant-per-call overhead (not just the iteration count) matters
  for a multiplier like this — that overhead is part of what the timing
  command above should capture, not just simulated-DPS-per-second.

### What makes the increase acceptable, and what would not

Acceptable if:

- The `--offline` CLI path (the only wired path today per `cli.ts:139-144`)
  is a developer/power-user tool run on demand, not a hot request path
  behind a UI with a tight latency budget. If a future web frontend calls
  this synchronously per page load, a few hundred sims per request is a
  different cost model and this recommendation should be revisited then.
- The existing `onProgress` callback (`rank.ts`'s `Progress` type,
  `stage: "simming", done, total`) already exists precisely because a
  multi-candidate run is not instant — the interface was built assuming
  more than 80 sims was always a live possibility, which weakens the case
  that scaling up is unprecedented.
- Sub-phase 4's assembled universe is explicitly sized to be "affordable"
  (parent plan §7: "simulating roughly 300 items is practical, where
  simulating 4,212 was not") — this sub-phase inherits that judgment rather
  than re-deriving it, but should re-verify the actual item count sub-phase
  4 produces before wiring, since parent plan §6's 200/310 figures are
  explicitly a lower bound pending AtlasLoot.

Not acceptable, and a signal to escalate rather than proceed silently, if:

- The measured per-sim wall-clock time (from the `time` command above)
  multiplied by sub-phase 4's actual final candidate count exceeds
  whatever latency the CLI's users tolerate for a single `pnpm rank`
  invocation — this plan does not set that threshold; ask the user what is
  tolerable before treating any specific number as a hard limit.
- Sub-phase 4's universe assembly comes in meaningfully larger than the
  200-310 lower bound once AtlasLoot and the Wowhead lists are folded in —
  if so, come back to section 2's `fullPool` recommendation and reconsider
  whether an explicit cap (not EP-based — see D1/D2) is warranted, e.g. a
  raid-scope-only default with `--all-raids` as an explicit opt-in for the
  full multi-raid universe.

---

## 6. Summary of concrete changes for the eventual implementer

| File | Change |
|---|---|
| `packages/core/src/pool.ts` | Remove or leave-dead `prefilterPool`/`EP_PREFILTER_LIMIT` (recommend remove, confirm no other callers first). Rename `PoolEntry.ep` → `curationHint` with an updated doc comment. Add `filterPoolByZone`. |
| `packages/core/src/rank.ts` | Candidates become `filterPoolByPhase(deps.pool ?? [], input.maxPhase).filter(e => !isKaelTempLegendary(e.itemId))` — no prefilter call. Remove `fullPool` from `RankInput` (confirm no other readers first). If raid filtering is rank-time (not recommended), add `raid?: string` to `RankInput` and filter before the sim loop; if report-time (recommended), filter `Ranking.items` after sort, likely via a function next to `applyView`. |
| `packages/core/src/cli.ts` | Remove `--full-pool`. Add `--raid <name>`, wired to whichever integration point section 4 settles on. Update the `pool=${pool.length}` log line so it no longer implies pool size is expected to be ~80. |
| Tests | Every test that sets `fullPool: true` or asserts on `prefilterPool`/`EP_PREFILTER_LIMIT` needs updating — grep before touching: `rg "fullPool|full-pool|prefilterPool|EP_PREFILTER_LIMIT" packages/core/test`. |

No change to `packages/core/src/compose.ts`, `meta-repair.ts`,
`candidate-gems.ts`, `set-bonus.ts`, `gems.ts`, or anything under
`packages/core/src/seams/`.

---

## What this document did not measure

Added after the writing review. Everything below is unverified.

- **Wall-clock time per simulation.** No timing figure exists in this repo. The
  estimate that simulating 200 to 310 candidates costs roughly 2.5 to 4 times
  today's 80-candidate cap follows from the candidate counts alone. It assumes
  per-simulation cost is constant, which has not been checked.
- **Whether the resulting run time is acceptable.** No target has been agreed.
  Measure first, then ask.
- **The recall of today's 80-item cap.** Section 2 argues it is at least as
  likely to discard a real upgrade as a 50% percentile cut. That is an
  inference from the 0.183 correlation and the relative cut sizes, not a
  measurement. No fixed-80 cut has been simulated against a larger universe.
- **What else reads the `ep` field.** Two readers were found by search:
  `packages/core/src/pool.ts:50` and `scripts/curate_ret_pool.py:347`. A rename
  should be driven by the compiler and a repository-wide search, not by that
  list alone.
