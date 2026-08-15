# Candidate pool — execution PROCESS

Plan: `docs/plans/wowsims-tab/candidate-pool.md` (rev 2, §9 orchestration).
Orchestrator: Opus session started by the human with that plan.
Feature branch: `feat/candidate-pool`. Base SHA for Round 1: `9ae92a324be891367398c8657b78b506903928ad`.

This file is the disk-canonical state of the run. Keep it current at every
round boundary so a fresh window can resume without re-deriving anything.

## Facts re-verified by the orchestrator at the base SHA

Re-run these before relying on them.

| Fact | Check | Result |
| --- | --- | --- |
| F1 — two filters only, no EP selection | `packages/core/src/rank.ts:576-582` | Confirmed: `filterPoolByPhase(...).filter(e => !isKaelTempLegendary(...))` |
| F2 — ret eligible counts | `node -e "const u=require('./data/universes/ret-p5.json');for(const p of [1,2,3,4,5])console.log(p,u.entries.filter(r=>r.phase<=p).length)"` | 155 / 246 / 390 / 437 / 518 — matches the plan exactly |
| F3 — serial candidate loop | `grep -n "for (const entry of candidates)" packages/core/src/rank.ts` | Confirmed at `:723`, second loop at `:1151` |
| Sim binary present | `./vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe version` | `v0.0.101`, runs in 0.2s |

## Fork isolation — resolved by the plan author

Raised at dispatch: §9.1 said slices D and F run in a "fork clone", but the fork
is nested at `vendor/tbc-new-fork`. The plan author amended the plan in
`bb61877`, adding **§9.1a Fork isolation**. That section is now authoritative;
this file does not restate it. The three obligations it puts on the
orchestrator:

1. One fork writer per round (D in Round 2, F in Round 3), using the clone's
   main working tree on `w/candidate-pool-<slice>` off `feat/upgrades-tab`.
2. **Clean the fork tree before spawning D.** Confirmed still dirty at
   `git -C vendor/tbc-new-fork status`: `tsconfig.json` modified and
   `.ew1-scratch/` untracked, on branch `w/a2-162-v1`. Commit the tsconfig fix
   citing ticket 156, clear the scratch dir, record the SHA as D's base.
3. `data/wowsims-fork.lock.json` is this repo's file and the **orchestrator**
   owns it — bump `commit` after D and F merge inside the fork, re-run 7.10,
   leave `pushed: false`.

## Round 1 — A ∥ B ∥ C

| Slice | Content | Model | Branch | Status |
| --- | --- | --- | --- | --- |
| A | M0 doc fixes: `plan.md`, ticket 162, ADR-0018 | Sonnet | `slice-a-m0-docs` | **merged** `80508a9`; acceptance grep re-verified by orchestrator |
| B | E-W5 §3.1 + §3.2 harnesses, numbers into §3.3 | Sonnet | `slice-b-ew5` | §3.1 **committed** `7e1f620`; §3.2 sweep still running, worker ended its turn early (see below) |

### Slice B §3.1 — landed and independently spot-checked

`experiments/e-w5-overhead.{json,md}` + `scripts/ew5_overhead.mjs`, median of 5
repeats, `iterationsDone` asserted per run:

| iterations | median ms | median dps |
| --- | --- | --- |
| 100 | 377.0 | 2026.7 |
| 300 | 391.0 | 2039.3 |
| 1000 | 435.8 | 2040.9 |
| 3000 | 575.5 | 2042.8 |
| 5000 | 685.2 | 2042.4 |

Fit: **`t_fixed` = 373.2 ms, `t_iter` = 0.0637 ms/iteration**. Peak RSS
**183.8 MB** at 5,000 iterations — that is §5.1.2's `memoryCap` input.

**F8 is resolved to a proven zero, not left ambiguous.** B's claim: `runPresims`
loops only while `doOne || remainingAgents > 0`; the only `Presimmer` in the
fork is `Character.GetPresimOptions`, which returns `nil` unless
`HealingModel.Hps == 0 && HealingModel.CadenceSeconds != 0`.

Orchestrator re-verified this independently:
`vendor/tbc-new-fork/sim/core/health.go:272-277` returns `nil` when
`healingModel == nil || Hps != 0 || CadenceSeconds == 0`; the fixture's
`healingModel` is `{}` (so `CadenceSeconds == 0`), it has no
`endFightAtHealth`, and the encounter is a fixed 180 s. So the presim loop body
never executes for this fixture and `t_fixed` is pure setup. Confirmed.

B also caught a real measurement artifact: a 50 ms RSS poller inflated
wall-clock 2–40× through CPU/IO contention, so timing and RSS are now sampled
in separate runs. That is the kind of thing that would have silently corrupted
every downstream ratio.

**Worker ended its turn with the §3.2 sweep still in flight** — the fan-in
abandonment the model policy names. The orchestrator did not treat that as
completion: a live `wowsimcli-windows.exe` and the absence of
`experiments/e-w5-rank.json` both confirm §3.2 is unfinished. The orchestrator
now owns waiting for it and will resume B (its context is intact) to do the
write-up and the go/no-go once the sweep lands. **No go/no-go exists yet — do
not record one.**
| C | M1 in `packages/core` | Sonnet | `slice-c-m1-core` | **merged** `162097e`; 6 commits, spawned at `55b5a51` and self-corrected |

### Slice C — what the orchestrator verified rather than took on trust

- `promisePool` keys results by task index and rethrows the **first error by
  index**, which is what makes 7.3's "same error at any pool size" assertion
  meaningful rather than incidental.
- `complete: true` is a **literal** on `Ranking`, and `PartialRanking` is
  `Omit<Ranking,"complete"> & {complete:false}`. The ranking cache therefore
  cannot accept a partial by construction, which is what §5.1.4 asked for
  ("enforced by type, not by convention").
- Ran `promise-pool`, `candidate-order`, `content-hash` tests directly in the
  worktree: 38 passed.

**Carried to review — slice C's own flag:** an aborted run skips paired
replication *and* set-bonus packages. Both dispatch new sims for refinement
rather than coverage, so this reads as faithful to §5.1.4's "finishes in-flight
sims"; it is an interpretation the plan does not state outright, and the plan
author should confirm it. Belongs in the `## Disposition` table.

**Orchestrator slip, recorded:** an earlier `cd` into slice C's worktree
persisted across Bash calls, so the first `git merge` ran from there and checked
out `slice-c-m1-core` inside that worktree instead of merging. No commits were
lost — `feat/candidate-pool` was untouched. Fixed by restoring the worktree to
its own branch and re-running the merge with an explicit `git -C`. AGENTS.md
already says to prefer `-C`/`--prefix` over `cd` in shells whose cwd persists;
this is that rule earning its place.

### B sizing — measured by the orchestrator, 2026-08-15

Per-sim wall-clock on this machine, pinned binary, `test/fixtures/slamaltman.raid-sim-request.json`,
seed 42, one run per point. `iterationsDone` was read back from each result to
confirm the work actually happened (an earlier attempt reported ~210 ms per
point because a Git Bash `mktemp -d` path is unreadable to Windows-native
`node` — the request file was never written and the binary failed instantly;
AGENTS.md § CLI environment documents exactly this trap).

| iterations | wall-clock | dps avg | iterationsDone |
| --- | --- | --- | --- |
| 100 | 462 ms | 2027 | 100 |
| 300 | 468 ms | 2039 | 300 |
| 1000 | 519 ms | 2041 | 1000 |
| 3000 | 651 ms | 2043 | 3000 |
| 5000 | 807 ms | 2042 | 5000 |

Sum across the five points ≈ **2.91 s per candidate**. The binary auto-splits
one request across all logical CPUs (logged `Running N iterations on 20
concurrent sims`), so these are wall-clock on a 20-core box, **not** CPU-time,
and they will not hold on a 4-worker browser. This measures the Node harness
cost for §3.2 only; it is not a substitute for §3.1's `t_fixed`/`t_iter` fit,
which slice B still owes.

**§3.2 as literally written is affordable.** Corrected eligible counts (below):
ret 246 + feral 246 = 492 candidates × 2.91 s ≈ **24 minutes** of sim time,
plus per-spawn overhead. It does not need narrowing. The user's standing
instruction — narrow on a stated rule, report the cost — therefore costs
nothing here; B runs §3.2 in full and records the timing table above as its
§3.1 starting point.

### Count corrections (orchestrator, verified)

A sizing pass reported ret p2 = 155. That is wrong — 155 is the p1 row. Verified
counts at `maxPhase 2`:

- `ret-p5.json` → **246** (matches F2)
- `feral-p2.json` → **246**
- `feral-p3.json` → **251**

**Open discrepancy for slice B:** `ret-p2.json` holds **240** entries, but
`ret-p5.json` filtered to `phase <= 2` gives **246** — a 6-row gap between two
committed universes for the same spec and phase. F2 cites `ret-p5.json` only,
so the plan never confronts this. B must record which file its harness reads and
report the gap; it is not B's job to reconcile the universes.

### Worktree base-SHA hazard (observed again this round)

The Claude Code adapter's warning reproduced: auto-created worktrees base at
`origin/main` (`55b5a51`), not the current feature branch. Slice A corrected
itself to `9ae92a3`; slice C spawned at `55b5a51`. The prompt-level assertion is
what makes worktree isolation usable here — never skip it, and always check
`git worktree list` after spawning.

## Path ownership (Round 1)

- **A:** `docs/plans/wowsims-tab/plan.md`, `.scratch/carry-forward/issues/162-*.md`, `docs/adr/0018-*.md`
- **B:** `experiments/e-w5-*`, and §3.3 of `candidate-pool.md` only
- **C:** `packages/core/src/**`, `packages/core/test/**`

No file appears in two slices — verified by listing, not eyeballing. Note A owns
`plan.md` while B owns a *section* of `candidate-pool.md`; these are different
files, and C touches neither.

## Conflict policy

Disjoint by construction, so any conflict is a scope breach: stop, do not
resolve creatively, and record which slice wrote outside its scope.

## Fan-in (editorial — the orchestrator merges)

1. Merge each worker branch into `feat/candidate-pool`.
2. Tear down worktrees **before** verifying (`.claude/worktrees/` is inside the
   repo and vitest picks it up otherwise).
3. `pnpm verify` on the integrated tip.
4. Every actionable `Notes / concerns` bullet becomes a row in the review's
   `## Disposition` table.

## Next spawn after Round 1

Round 2 is `D ∥ E(code) ∥ B′` — but only after: the D/F fork-isolation question
above is answered, and B's §3.2 go/no-go is recorded in §3.3. E's *code* may
start before B lands; E's **merge** requires the §3.2 go. On a no-go, E is
dropped, §6 is marked not shipped, M3 goes to a design pass, and F's M2 half is
skipped.

Never merge to `dev`: the user must ask separately, after `pre-merge-review`.
