# Ticket sweep 154–164 — process state

Disk-canonical orchestration state. Owner: the Opus orchestrator. Updated at
every transition. If the session dies, resume from this file.

Companion docs: [`plan.md`](plan.md), [`orchestration.md`](orchestration.md).

## Bases (resolved by `git rev-parse`, never hand-typed)

| Branch | Base SHA | How created |
| --- | --- | --- |
| `feat/sweep-tab-tickets` (A) | `dcec568f1f790ee2224d33fec1a82ea4c0f33676` (this file's own commit, on top of `a48594a`) | `git checkout -b feat/sweep-tab-tickets a48594a…` in the main checkout `C:/Users/dgree/Code/lulz/tbc-gear-prio`, then the PROCESS.md commit |
| `feat/sweep-ret-tickets` (B) | `cffaee096da40275e0026a1f52bc71db9ace8aed` | `git worktree add C:/Users/dgree/Code/lulz/tbc-gear-prio-wt-sweep-ret -b feat/sweep-ret-tickets cffaee0` |

Note: `orchestration.md` names `e1f460c` as branch A's base. The actual tip of
`feat/shopping-list-wowsims-tab` at spawn time was `a48594a` (the plan commit,
a descendant of `e1f460c`). `a48594a` is authoritative — confirmed by
`git -C C:/Users/dgree/Code/lulz/tbc-gear-prio rev-parse HEAD`.

Branch B's `node_modules` confirmed present, not merely exit-code-0:
`ls C:/Users/dgree/Code/lulz/tbc-gear-prio-wt-sweep-ret/node_modules` → 11 entries,
`node_modules/.bin/vitest` present.

The pre-existing worktree `C:/Users/dgree/Code/lulz/tbc-gear-prio-wt-ret-p3-data`
(`feat/ret-p3-data` @ `cffaee0`) is **not** touched by this sweep.

## Fan-in brief

### Partition

Round 1, five workers in parallel:

| Worker | Base | Worker branch | Tickets |
| --- | --- | --- | --- |
| A1 | `a48594a` | `w/a1-155-parity` | 155 |
| A2 | `a48594a` | `w/a2-162-v1` | 162 (v1 half only) |
| A3 | `a48594a` | `w/a3-156-ew2` | 156 (measurement) |
| B1 | `cffaee0` | `w/b1-ep-weights` | 159 → 158 → 154, in that order |
| B3 | `cffaee0` | `w/b3-sync-docs` | 160, 161 |

Round 2, one worker, after fan-in 1:

| Worker | Base | Worker branch | Tickets |
| --- | --- | --- | --- |
| B2 | tip of `feat/sweep-ret-tickets` after fan-in 1 | `w/b2-relic-pool` | 157, 163, 164 |

B2 runs in round 2 because it shares `scripts/assemble_universe.py` and
`data/universes/**` with B1. That is a sequencing problem, not a fan-out.

### Path ownership

| Worker | Owns |
| --- | --- |
| A1 | `packages/core/test/wowsims-fork-parity.test.ts` and its fixtures; `.scratch/handoffs/wowsims-tab/slice-2/HANDOFF.md` |
| A2 | the Upgrades tab assumptions drawer (`upgrades/**`) and one test |
| A3 | `docs/plans/wowsims-tab/plan.md` (§5 and the serving recipe) |
| B1 | `scripts/assemble_universe.py`, `data/presets/**`, the new EP-weights index (JSON + generated TS), `packages/core/src/cli.ts`, `data/universes/**` |
| B3 | `scripts/check_sync_wowsims.py`, `PLAN.md` §16 item 3, `.scratch/handoffs/wowsims-tab/slice-6/HANDOFF.md` |
| B2 (round 2) | `scripts/assemble_universe.py` (pool admission), `packages/core/src/rank.ts`, `packages/core/src/dead-slots.ts`, rank-report / HTML renderer, `data/universes/ret-*.json`, `.scratch/handoffs/wowsims-tab/ret-p3-ranking/**` |

Owned by **no worker**: `package.json`, `pnpm-lock.yaml`,
`packages/*/src/index.ts`. A worker needing a line there writes it verbatim in
its handoff; the orchestrator applies it at fan-in.

Disjointness check across round 1: A1/A2/A3 touch three different trees
(`packages/core/test`, `upgrades/`, `docs/plans/`). B1 and B3 share no file —
B1 owns the assembler and universes, B3 owns the sync checker and two docs. No
path appears in two round-1 slices.

### Conflict policy

No `-X ours`, no `-X theirs`. Every conflict is read and resolved by the
orchestrator by hand. The fan-in is **editorial**, not mechanical (A3 and B1
make measurement claims that must be re-run), so the delegator merges.

### Claims to re-check at fan-in

| Claim | Command the orchestrator re-runs |
| --- | --- |
| A1: perturbing `pairedReplicateSe` now fails E-W3 | the worker's stated mutation command, then revert |
| A3: any E-W2 wall-clock number | inspect the recorded method; numbers that cannot be reproduced must be labelled untested by the worker |
| B1: regenerated universes are byte-stable | re-run `python scripts/assemble_universe.py` for one spec and diff against the committed tree |
| B1: 253 vs 256 feral entry count | read the worker's stated evidence |
| B2: 27484 present in fixture and in the regenerated ranking | the ticket-163 python one-liner |
| B2: ranged section carries a local note | read the ranged section of the regenerated HTML report |

### Per-slice acceptance

Each ticket's own "Done when" section, as narrowed by `plan.md`'s per-ticket
table. `pnpm verify` green in the worker's worktree before handoff.

## Out of scope (all workers)

- Any merge to `dev`; `pnpm merge-to-dev`; `TBC_ALLOW_DEV_MERGE`.
- Ticket 162 v2 (opt-in toggle, fork shim, `epScore` pseudo channel).
- Implementing libram proc effects in the fork (163 layer 3).
- Editing `AGENTS.md`, `CLAUDE.md`, or any file under `.claude/skills/`.
- Merging `feat/ret-p3-data` into anything.

## Status log

- 2026-08-14 — Preconditions done. Main checkout clean; branch A created at
  `a48594a`; branch B worktree created at `cffaee0` with deps installed and
  `node_modules` confirmed. PROCESS.md written. Next: spawn round 1 (A1, A2,
  A3, B1, B3).
- 2026-08-14 — **Round 1 spawned**, five workers, `model: sonnet`,
  `isolation: worktree`. Post-spawn `git worktree list` confirmed every worker
  at its named base, but only after the workers ran their own assertions:
  every worktree was created on `origin/main` (`55b5a51`) by default, and each
  worker checked out its correct base itself. B3 was still sitting at
  `55b5a51` on the auto-named branch at the first check and had corrected to
  `cffaee0` on `w/b3-sync-docs` by the second. This re-confirms the Claude
  Code adapter's note: worktree basing ignores the delegator's branch, and the
  prompt-level assertion is the only thing that makes the fan-out usable.

  Confirmed bases: `w/a1-155-parity` `dcec568`, `w/a2-162-v1` `dcec568`,
  `w/a3-156-ew2` `dcec568`, `w/b1-ep-weights` `cffaee0`, `w/b3-sync-docs`
  `cffaee0`.

  In flight: all five. Next transition: collect handoffs, then fan-in 1
  (A1/A2/A3 → `feat/sweep-tab-tickets`; B1/B3 → `feat/sweep-ret-tickets`).

- 2026-08-14 — **Structural discovery: the wowsims fork is invisible to
  isolated worktrees.** Workers A2 and A3 both returned blocked, independently
  and for the same underlying reason.

  The Upgrades tab and the fork engine are not in this repository. They live in
  a **nested, separately-versioned clone** at
  `C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork`, which is its
  own git repo on branch `feat/upgrades-tab` at `adb0d1353`, and which the main
  repo **gitignores**. `git worktree add` does not carry gitignored paths, so a
  worktree-isolated worker cannot see it.

  Verified:
  - `git -C vendor/tbc-new-fork rev-parse HEAD` → `adb0d135336a26eab613215fa85b1265d7ce2e5d`, branch `feat/upgrades-tab`.
  - `ui/core/components/individual_sim_ui/upgrades/data/data.ts:88` defines `epWeightsFor` — ticket 162 names this as `upgrades/data/data.ts`, a path relative to the fork, not to this repo.
  - `git grep -l epWeightsFor feat/sweep-tab-tickets` matches only the ticket and a slice-3 handoff — no source file in this repo.

  Consequence for path ownership: **fork-side commits land in
  `vendor/tbc-new-fork`'s own history, not on `feat/sweep-tab-tickets`.** The
  branch-A review must say so, or a reader will look for tab changes in this
  repo's log and conclude nothing shipped.

  Per-worker effect:
  - **A2** (ticket 162) — blocked, committed `1b601d5`. Needs the fork. Respawned without isolation.
  - **A3** (ticket 156) — blocked, committed `86de068`. Its worktree has no `vendor/` directory at all. Needs the fork (`vite.build-workers.mts`, `dist/tbc`). Respawned without isolation.
  - **A1** (ticket 155) — **not** blocked. Its worktree does contain a `vendor/tbc-new-fork` directory carrying the engine sources, so it can read them. Note that directory is a plain copy, not the nested repo: `git -C .claude/worktrees/agent-abd559c4ed6de1152/vendor/tbc-new-fork rev-parse HEAD` returns the *main* repo's SHA. A1 may therefore read fork sources and run temporary mutations, but cannot commit fork-side changes — which its slice does not require, since the test it edits lives in `packages/core`.
  - **B1, B3** — unaffected; their tickets are Python and docs in this repo. B3 has committed `71a35a7`.

  **Respawn policy for A2 and A3.** Both run *without* worktree isolation,
  sharing the main checkout. That breaks the isolation rule deliberately, so
  strict path ownership is the compensating control and is non-negotiable:
  A2 writes only `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/**`
  plus ticket 162; A3 writes only `docs/plans/wowsims-tab/plan.md` plus ticket
  156 (and may run, not commit, fork builds). Their main-repo file sets are
  disjoint, and each commits only its own paths. This is tolerable only
  because the main-repo edits are few and file-disjoint.
