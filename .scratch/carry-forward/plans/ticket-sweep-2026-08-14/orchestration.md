# Ticket sweep 154–164 — orchestration plan

Companion to [`plan.md`](plan.md). Read that first; this file says **who runs
what, in which order, from which SHA**. The orchestrator follows
`.claude/skills/parallel-phase/SKILL.md` + `adapters/claude-code.md` and
`docs/agents/model-policy.md`.

## Roles and lanes

| Role | Model | Notes |
| --- | --- | --- |
| Orchestrator (delegator + merger) | Opus, effort high | Owns partition, spawn, fan-in, merge, teardown, verify, review dispatch, ticket bookkeeping. Holds the turn through fan-in — never backgrounds workers and ends with "waiting". |
| Workers | Sonnet-class (`model: sonnet`), `isolation: worktree` | One per slice. Named model in every prompt. |
| Review axes | via `pre-merge-review` skill (Opus medium) | Not fanned out by hand. |

## Process state file

`.scratch/carry-forward/plans/ticket-sweep-2026-08-14/PROCESS.md` — the
orchestrator creates it before the first spawn and updates it at every
transition (spawned / handoff received / merged / verified / review filed).
Contents: base SHAs, worker branch names, worktree paths, what is in flight,
exact next spawn. This is the disk-canonical handoff if the session dies.

## Preconditions (orchestrator, before any spawn)

1. `git -C C:/Users/dgree/Code/lulz/tbc-gear-prio status` clean on
   `feat/shopping-list-wowsims-tab`.
2. Create branch B's checkout without touching the existing ret-p3-data
   worktree:
   `git -C C:/Users/dgree/Code/lulz/tbc-gear-prio worktree add C:/Users/dgree/Code/lulz/tbc-gear-prio-wt-sweep-ret -b feat/sweep-ret-tickets cffaee0`
   then `pnpm -C <that path> install` and confirm `node_modules` exists (an
   exit code is not evidence).
3. Create branch A in place: `git checkout -b feat/sweep-tab-tickets e1f460c`
   (this branch **is** the base tip, so A workers base off `e1f460c`).
4. Record both SHAs by `git rev-parse`, never hand-typed, into `PROCESS.md`
   and into every worker prompt with the SKILL.md Step 3 assertion text.
5. Write the fan-in brief into `PROCESS.md`: partition, path ownership,
   conflict policy (`ours` on nothing — every conflict is read and resolved
   by the orchestrator), per-slice acceptance, claims to re-check.
6. Budget check per model-policy § Budget the round: 5 workers in round 1 +
   1 in round 2 + 2 reviews. If the window will not hold that, run round 1
   as A-slices only and hand B to a fresh window via `PROCESS.md`.

## Rounds

### Round 1 — five workers in parallel

| Worker | Base | Branch | Slice |
| --- | --- | --- | --- |
| A1 | `e1f460c` | `w/a1-155-parity` | 155 |
| A2 | `e1f460c` | `w/a2-162-v1` | 162 v1 half |
| A3 | `e1f460c` | `w/a3-156-ew2` | 156 measurement |
| B1 | `cffaee0` | `w/b1-ep-weights` | 159 → 158 → 154 in that order |
| B3 | `cffaee0` | `w/b3-sync-docs` | 160, 161 |

Path ownership: as the tables in `plan.md`. Shared manifests
(`package.json`, `pnpm-lock.yaml`, `packages/*/src/index.ts`) are owned by
**no worker**; a worker needing a line there writes it verbatim in its
handoff and the orchestrator applies it at fan-in.

Post-spawn: `git worktree list`; every worker worktree must sit at its
stated base SHA. A worker at `origin/main` is respawned, not corrected
mid-flight.

### Fan-in 1

- Merge A1, A2, A3 into `feat/sweep-tab-tickets` (editorial: A3 makes
  measurement claims the orchestrator re-runs where possible).
- Merge B1, B3 into `feat/sweep-ret-tickets`. B1's regenerated
  `data/universes/**` must be byte-compared: orchestrator re-runs the
  assembler for one spec and confirms the tree matches HEAD after commit.
- Tear down round-1 worktrees, then `pnpm verify` on both branch tips.

### Round 2 — one worker

| Worker | Base | Branch | Slice |
| --- | --- | --- | --- |
| B2 | tip of `feat/sweep-ret-tickets` after fan-in 1 (`git rev-parse`) | `w/b2-relic-pool` | 157, 163, 164 |

B2's prompt carries B1's handoff (the new universe artifact format and the
EP-weights index) as `dependsOn`.

### Fan-in 2

- Merge B2 into `feat/sweep-ret-tickets`. Orchestrator re-runs the two
  ticket-163 commands (`27484` present in fixture and in the regenerated
  ranking) and reads the ranged section of the regenerated HTML report.
- Tear down, `pnpm verify`.

### Reviews

Run `pre-merge-review` once per branch. Commit each review file on its
branch. Every actionable worker concern → Disposition row. New findings
that are deferred → new tickets under `.scratch/carry-forward/issues/`
numbered from 165.

## Worker prompt skeleton

Every worker prompt contains, in this order:

1. Model and effort line (`Sonnet, default effort`).
2. The base-SHA assertion text from SKILL.md Step 3, with the resolved SHA.
3. The slice's ticket file paths — read them; they are the spec.
4. `pathsAllowed` / `pathsForbidden`.
5. Rules: `tdd` skill for red/green; a commit per green slice; comments
   explain why; durable claims point at a command or say untested; never
   `merge-to-dev`; never edit AGENTS.md / CLAUDE.md / skills.
6. Ticket bookkeeping rule from `plan.md`.
7. Handoff: `.claude/skills/parallel-phase/handoff-template.md`, written to
   `.scratch/handoffs/ticket-sweep/<worker>/HANDOFF.md` on the worker branch.
8. Verify recipe: `pnpm verify` green in the worktree before handoff.

## Stop conditions

- A permission denial on a spawn or merge precondition: record the exact
  blocked command in `PROCESS.md` and stop; do not rewrite the plan around
  it.
- A worker reports its base SHA is wrong and could not check it out: respawn.
- Rate-limit wall on the review lane: wait or serialise; never downgrade the
  review model.

## Final handoff (orchestrator's last message and `PROCESS.md`)

Per branch: tip SHA, `pnpm verify` result, review file path and verdict,
tickets resolved / still open with a one-line reason each, and the exact merge
ask for the user (`pnpm merge-to-dev` on branch A; on branch B note it
supersedes `feat/ret-p3-data`). Then stop. No merge to `dev`.
