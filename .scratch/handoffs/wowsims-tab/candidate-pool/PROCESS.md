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

## Deviation from the plan found at dispatch

§9.1 assumes slices D and F run in a **fork clone** ("fork clone, branch off its
integration branch"). The fork in this repo is **vendored** at
`vendor/tbc-new-fork`, not a sibling clone. Round 2/3 must resolve how D and F
are isolated before dispatch — this is unresolved and must not be guessed.

## Round 1 — A ∥ B ∥ C

| Slice | Content | Model | Branch | Status |
| --- | --- | --- | --- | --- |
| A | M0 doc fixes: `plan.md`, ticket 162, ADR-0018 | Sonnet | `slice-a-m0-docs` | dispatched, base asserted `9ae92a3` |
| B | E-W5 §3.1 + §3.2 harnesses, numbers into §3.3 | Sonnet | not yet dispatched — see below | **held** |
| C | M1 in `packages/core` | Sonnet | `slice-c-m1-core` | dispatched; **spawned at `55b5a51` (origin/main) — self-correction being watched** |

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
