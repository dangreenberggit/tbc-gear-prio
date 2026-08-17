Status: resolved (check reads the pin; generator asserts HEAD == pin)
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

- [x] `check_sim_implemented_effects.py` reads the pin from
      `data/wowsims-fork.lock.json` and compares `forkCommit` to it.
- [x] The id-set comparison against `sim/**/*.go` on disk is unchanged — a
      real Go-tree change still fails the check. Prove with a mutation: add a
      fake effect registration, confirm red, revert, confirm green.
- [x] With the clone ahead of the pin and no `.go` change, the check passes.
- [x] The generator/check source-of-truth disagreement noted above is
      resolved or explicitly documented in the script docstring.
- [ ] Lands before ticket 212 slice 3 starts.

## Resolution

`check_sim_implemented_effects.py` now compares `forkCommit` against the
`commit` field of `data/wowsims-fork.lock.json`. The disk-rebuilt id-set
comparison is untouched, so the Go tree moving under the artifact still fails
the gate.

The source-of-truth question (criterion 4) is resolved in the generator's
favour of failing loudly: `generate_sim_implemented_effects.py` now exits 2
when the clone's HEAD differs from the pin. The rejected alternatives were
stamping the pin into `forkCommit` — which would make the field name a commit
the scanned payload does not describe, since the payload comes from HEAD's
tree — and leaving the generator alone, which would let a mid-slice regen
overwrite the artifact with a non-pin stamp. Both scripts' docstrings record
the reasoning.

### Evidence (2026-08-16, worktree `.scratch/wt-ticket-213`)

Preconditions: fork clone clean, HEAD and the lockfile pin both
`5e26fa0d8ff57a7929e5f735d8e8a8e52d33f6e9`, gate green.

Red control — construct clone-ahead-of-pin, observe the old behaviour fail:

```bash
git -C vendor/tbc-new-fork commit --allow-empty -m "temp: ticket-213 clone-ahead probe (drop me)"
pnpm sim-implemented-effects:check
# exit 1: "fields differ: ['forkCommit']"
```

Green proof after the edits, same clone-ahead tree:

```bash
pnpm sim-implemented-effects:check
# exit 0: "check ok: 215 implemented, 460 stub-only, matches committed file"
```

Mutation proof, run with the clone still ahead of the pin — the state that
used to mask the live signal. A new untracked
`vendor/tbc-new-fork/sim/common/tbc/zz_ticket213_mutation.go` registering
`core.NewItemEffect(999999, nil)`:

```bash
pnpm sim-implemented-effects:check
# exit 1: fields differ: ['implementedEffectItemIdsCount', 'implementedEffectItemIds']

python scripts/generate_sim_implemented_effects.py
# exit 2: "clone HEAD is 17ed3ef7c... but data/wowsims-fork.lock.json pins 5e26fa0d8..."
git diff --stat -- data/sim-implemented-effects.json
# no output — the guard fired before any write

rm vendor/tbc-new-fork/sim/common/tbc/zz_ticket213_mutation.go
pnpm sim-implemented-effects:check
# exit 0
```

Clone restored to the pin (`reset --hard HEAD~1`, dropping only the empty
probe), then regeneration at the pin proved byte-identical:

```bash
python scripts/generate_sim_implemented_effects.py
# exit 0: "wrote data/sim-implemented-effects.json -- 215 implemented, 460 stub-only"
git diff --exit-code -- data/sim-implemented-effects.json   # clean
```

No new test script: this repo has no pytest infrastructure (see
`check_sync_wowsims.py`'s docstring), the convention is standalone check
scripts, and the added logic is reading one JSON field and comparing two
strings. The red/green transcripts above are the recorded evidence.
