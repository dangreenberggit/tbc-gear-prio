Status: open
Type: defect (local gate; fails by construction during any fork slice)
Origin: ticket 212 slice 1, 2026-08-16
Blocks: ticket 212 slice 3 (mid-slice `pnpm verify` cannot go green without this)
Blocked by: none

# `sim-implemented-effects:check` compares against the clone's HEAD, not the pin

`scripts/check_sim_implemented_effects.py:83-85` compares the committed
artifact's `forkCommit` field against `git -C vendor/tbc-new-fork rev-parse
HEAD` — the live checked-out clone. Neither that script nor
`generate_sim_implemented_effects.py` ever reads
`data/wowsims-fork.lock.json`; the pin has no reader among the scripts.

`docs/plans/wowsims-tab/candidate-pool.md` §9.1a makes clone-ahead-of-pin the
**expected** mid-slice state: the lockfile is the parent repo's file owned by
the orchestrator, and fork workers structurally cannot bump it. So the clone
runs ahead of the pin for the whole duration of any fork slice, and this gate
goes red the moment a fork commit lands — even when the effects data provably
has not moved.

## Observed

2026-08-16, range `138fa77..5e26fa0` (five ticket-156 fork commits):

```bash
pnpm sim-implemented-effects:check
# data\sim-implemented-effects.json is stale against the fork's Go tree
# (fields differ: ['forkCommit'])
```

Zero `.go` files changed in that range — `git -C vendor/tbc-new-fork diff
--name-only 138fa77..5e26fa0 -- '*.go'` prints nothing — and the generator
reads only `sim/**/*.go`. A regen to a scratch path changed exactly one line,
`forkCommit`; `implementedEffectItemIds` (215) and `stubOnlyItemIds` (460)
were byte-identical. The staleness was pure bookkeeping.

Reconciled by the pin bump in `.scratch/plans/fork-pin-reconcile-plan.md`.
That fixed the instance, not the mechanism: the next fork slice reproduces it.

## Why it matters now

Ticket 212 slice 3 commits TypeScript-only work inside the clone, moving HEAD
past the pin again. That plan requires `pnpm verify` green per slice, and the
pin does not get bumped until slice 5 — so every mid-slice verify run between
them is red by construction, for a reason unrelated to the work being done.

Scope note: both fork-dependent checks skip cleanly when `vendor/` is absent
(`check_sim_implemented_effects.py:59-65`, `check_engine_port_drift.py:85-90`)
and `vendor/` is gitignored, so **CI is unaffected** — this is a local-only
`pnpm verify` failure. Contrast `engine-port-drift:check`, which is immune
because both sides of its comparison come from inside the clone
(`check_engine_port_drift.py:50-56`).

## Proposed fix

Compare `forkCommit` against the `commit` field of
`data/wowsims-fork.lock.json` instead of the clone's live HEAD. Keep the
disk-rebuilt id-set comparison exactly as-is, so the real signal — the Go tree
having moved under the artifact — stays live. The pin/artifact
move-together invariant is preserved and strengthened: the artifact is then
checked against the thing it actually claims to describe.

Note for whoever implements it: `generate_sim_implemented_effects.py` stamps
live HEAD into `forkCommit`, so regeneration stays valid only at pin-bump
time, when HEAD equals the new pin. That is already the documented workflow
(`generate_sim_implemented_effects.py:33,:184` — "after re-pinning"), but the
generator and the check would now disagree about their source of truth unless
the generator is left alone deliberately. Decide and record which.

## Acceptance criteria

- [ ] `check_sim_implemented_effects.py` reads the pin from
      `data/wowsims-fork.lock.json` and compares `forkCommit` to it.
- [ ] The id-set comparison against `sim/**/*.go` on disk is unchanged — a
      real Go-tree change still fails the check. Prove with a mutation: add a
      fake effect registration, confirm red, revert, confirm green.
- [ ] With the clone ahead of the pin and no `.go` change, the check passes.
- [ ] The generator/check source-of-truth disagreement noted above is
      resolved or explicitly documented in the script docstring.
- [ ] Lands before ticket 212 slice 3 starts.
