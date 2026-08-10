# Carry-forward delegation: run state

Live log of the fan-out against `.scratch/carry-forward/DELEGATION.md`, on
branch `fix/carry-forward-backlog`. `pnpm issues:open` is the authority on
ticket status; this file records routing decisions and their reasons.

Started 2026-08-06 from `a2dff47`.

## Done

| # | Commit | Note |
|---|---|---|
| 34 | `97ba019` | Wave 0. Test suite is now inside `tsc --build`. |

Ticket 34's stated blast radius (18 errors in 3 files) was **stale** — measured
9 in 3 after a predecessor's partial tsconfig work, which was kept rather than
discarded. Re-measure with `npx tsc --build`. The worker also repinned the
`rank-report.test.ts` golden digest, legitimately: the old fixture's
`{ absDps: 5, pct: 0.5 }` could never satisfy `Cutoff`'s literal type, so using
the real `CUTOFF` moved the rendered text. Reasoning is recorded at the test.

Consequence for every later worker: **tests are typechecked now.** An `as` cast
to silence a test type error re-opens exactly the hole 34 closed.

## Wave 1 — landed on the branch, `pnpm verify` green

| # | Commit | Status |
|---|---|---|
| 36 | `fcf9c4b` | closed — decision + ADR-0020 |
| 33 | `9e893e1` | closed |
| 38 | `0a3230f` | closed |
| 40 | `3b6d078` | **still open** — partial, see below |

Verified on the integrated tip `3b6d078`: `pnpm verify` exit 0, 382 passed,
2 todo, 32 files, plus codegen/skeleton/mirrors gates.

**Ticket 40 is deliberately not closed.** Only the `spec.ts` half shipped
(`matchesRequestedSpec`). Its "Done when" also wants wiring into
`rankUpgrades`/`resolveFight`, a new `RankErrorKind`, and an integration test on
a real protection capture — unreachable from `spec.ts` because `LoggedGear`
carries no class name today (WCL `actors[].subType` has it, unthreaded). The
ticket has a `Progress:` line and section saying so.

**Ticket 33 edited beyond its stated slice, correctly.** Besides `caps.ts` it
changed `rank.ts` (to pass `talentsString` into `capStateFrom`) and
`disclosure.ts` (`hitCapBanner` claimed "talents not counted" — once talents are
counted that sentence is false). Leaving it would have shipped a user-facing
lie. Note `rank.ts` is also ticket 39's file: 39 must rebase on this.

## Node version — verify needs Node 22, not 20

`pnpm verify` FAILS on Node 20 with `No such built-in module: node:sqlite` in 6
suites (`store`, `store-contract`, `gear-source`, `rank`,
`report-events-fallback`, `view-gate`). `node:sqlite` is Node 22+, and
`.github/workflows/verify.yml` pins `node-version: 22`.

This is environmental and predates the fan-out — reproduce on a clean `97ba019`.
It is not a defect in any ticket's work. Use Node 22 before believing a red run:

```bash
nvm use 22.16.0   # or: $env:Path = "C:\Users\dgree\AppData\Roaming\nvm\v22.16.0;" + $env:Path
pnpm verify
```

## Held back deliberately

Not yet dispatched, and the reason is not capacity:

- **44** (`pool.ts`) must go first of the remaining three. Its own text says
  ticket 35 "is the same root cause seen from the view layer; fixing this may
  close both", so 44 sets the source-precedence policy that 35 then consumes.
  Dispatching them together would have two workers inventing one policy.
- **35 + 39** share `view.ts` (the plan's contention table, confirmed by grep),
  so they are ONE worker, not two — and they wait on 44's policy.
- The 36 worker was told to report if its decision forces a `view.ts` edit, so
  35/39 can be sequenced around it.

## Index collision, 2026-08-06 — resolved, no work lost

The shared-index hazard the plan warns about fired, despite every worker being
told to stage by path. Sequence, reconstructed from `git reflog`:

1. The 38 worker committed `2e9e29a`, sweeping in the 40 worker's
   explicitly-staged files (`spec.ts`, `index.ts`, `spec.test.ts`) plus ticket
   40's own file. Its message names only ticket 38.
2. A later worker ran a mixed `git reset` back to `97ba019`, un-committing all
   of it. `2e9e29a` became unreachable.

The 40 worker reported its work was "committed in `2e9e29a`". That was wrong at
the time it was read — `HEAD` was already back at `97ba019`. Reports about
shared-tree git state are not trustworthy here; verify with `git reflog`.

**Nothing was lost.** `git diff --cached 2e9e29a -- <38/40 files>` is empty, so
the staged tree matches the orphaned commit byte-for-byte. The commit is pinned
against GC:

```bash
git rev-parse rescue-2e9e29a   # 2e9e29ac6213d01b5bd245b5de97c69fb690e918
```

Also `rescue-index-backup` branches the same state. Delete both only after the
work is committed properly on `fix/carry-forward-backlog`.

### Second collision, same cause

The 36 worker then ran `git commit --amend`, which swept in the same 38/40
staged files. It caught this itself on the file count, ran `git reset --soft
HEAD~1`, and recommitted with explicit pathspecs. Its final commit `fcf9c4b` is
its own 7 files — verified by `git show fcf9c4b --stat`. That reset is the one
that left `2e9e29a` orphaned and everything staged.

So the index was clobbered **twice by two different workers**, both of whom had
been told to stage by path. Both times the work survived; that is luck plus
alert workers, not a working method.

Verified after both incidents — 38/40 content in the worktree is byte-identical
to the rescue tag:

```bash
git diff rescue-2e9e29a -- packages/core/src/fixtures packages/core/src/spec.ts \
  packages/core/src/index.ts packages/core/test/spec.test.ts \
  packages/core/test/slamaltman-offline.test.ts   # empty
```

**Lesson for the rest of this backlog:** "stage explicitly by path" is not
sufficient protection when workers run concurrently in one tree — a commit
captures whatever else is staged at that instant. Either give each parallel
worker its own worktree (`parallel-phase` exists for this) or let workers edit
and have the DELEGATOR commit. Do not run another concurrent batch in one tree.

## Wave 2 — strictly serial, one worker

42 → 45 → 41 → 17, all editing `scripts/assemble_universe.py`, with 37
sequenced in. Do not fan these out.

## Wave 3 — blocked by design

31, 32 (need a phase-4 / WCL adapter that does not exist), 43 (wants a data
vendoring decision). 31 and 32 carry `Blocks: phase-4`, which is inert on a
phase-2 branch — nothing in this backlog gates landing.

## Standing instruction to every worker

Workers share one working tree and therefore one git index. Each is told to
stage explicitly by path and never `git add -A` / `git add .` / `git commit -a`,
because that sweeps another worker's half-finished edits into their commit.
