# Wowsims tab — orchestration plan

How the delivery slices in [`plan.md`](plan.md) §9 get executed by agents.
Lanes follow `docs/agents/model-policy.md` (Claude Code table): Sonnet-class
workhorse for implementation, Opus at effort `medium` for review, Fable for
design only. The orchestrator seat is an interactive Claude Code session —
per the model policy, orchestration and merge coordination are not
design-lane work, so the seat does not need Fable; name the model on every
spawn (unnamed workers inherit the parent).

Date: 2026-08-14. Status: proposed, uncommitted.

## Slice-to-lane table

| Slice                        | Worker lane / model                               | Group                                | Isolation                                                                                                                                                                                            | Handoff artifact                                                                                                                        | Gate that closes it                                                                                                                 |
| ---------------------------- | ------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1. Fork scaffold             | Workhorse / Sonnet                                | A (serial head of fork chain)        | Fork repo: the nested clone `vendor/tbc-new-fork/`, branch `feat/upgrades-tab`. The one this-repo file (`data/wowsims-fork.lock.json`) is committed by the orchestrator at fan-in, not by the worker | `.scratch/handoffs/wowsims-tab/slice-1/HANDOFF.md`: fork commit, build command that worked, toolchain versions found (Go, protoc, Node) | Plan §9.1 done-when: site builds and serves locally, tab visible after Batch, lockfile records branch + commit                      |
| 2. Engine port               | Workhorse / Sonnet                                | B (serial after 1)                   | Fork repo, main working tree of the clone, branch off `feat/upgrades-tab`                                                                                                                            | `HANDOFF.md` + `engine/PROVENANCE.md` + E-W3 test in the fork's test setup, passing                                                     | E-W3 fixture parity (plan §8) **and** an Opus-medium port-fidelity review before the branch merges inside the fork                  |
| 3. Adapters + first ranking  | Workhorse / Sonnet                                | C (serial after 2)                   | Fork repo, main working tree                                                                                                                                                                         | `HANDOFF.md` with E-W1 delta recorded and E-W2 timings written into plan §5's budget comment                                            | Plan §9.3 done-when: ranking end-to-end, E-W1 inside the 3.4 DPS cutoff, E-W2 numbers filed                                         |
| 4. UI completion             | Workhorse / Sonnet                                | D (serial after 3)                   | Fork repo, main working tree                                                                                                                                                                         | `HANDOFF.md` + a checklist against every §4 behaviour                                                                                   | §9.4 done-when, then one Opus-medium review over slices 3+4 combined before the fork integration merge                              |
| 5. WCL gear-only importer    | Workhorse / Sonnet                                | B∥ (parallel with 2–4, needs only 1) | Fork repo, **its own `git worktree`** of the nested clone (see risk 1)                                                                                                                               | `HANDOFF.md` + E-W4 proto diff, verbatim                                                                                                | E-W4: empty diff outside gear fields → ship; else shelve with the diff recorded (plan §6). Opus-medium review before its fork merge |
| 6. Data: ret p3 bisTags + EP | Workhorse / Sonnet, invoking `data-pipeline-work` | A∥ (fully parallel, this-repo only)  | This repo, `parallel-phase` worktree, branch `feat/ret-p3-data`                                                                                                                                      | `HANDOFF.md` + refreshed `data/universes/ret-p3.json`, p3 EP file, provenance notes                                                     | `sme-rank-review` verdict (Opus, review lane) filed, `pnpm verify` green, then `pre-merge-review` on the branch                     |
| 7. Later work                | — not dispatched                                  | —                                    | —                                                                                                                                                                                                    | —                                                                                                                                       | Out of scope (plan §9.7)                                                                                                            |

## Sequencing

```
Phase 0 (user): create the personal fork on GitHub  ← ask, cannot be delegated
Phase A: slice 1 (fork chain head)      ∥  slice 6 (this repo, own worktree)
Phase B: slice 2 (fork main tree)       ∥  slice 5 (fork worktree)  ∥  slice 6 if still running
         └ gate: E-W3 + Opus review
Phase C: slice 3 (E-W1, E-W2 run here)
Phase D: slice 4
         └ gate: Opus review of 3+4 → fork integration merge
Fan-in:  this-repo branches → pnpm verify → pre-merge-review → ask user → merge-to-dev
```

Genuine overlap is limited: slices 1→2→3→4 are a dependency chain (plan §9),
so the fork side is mostly serial. What overlaps: slice 6 with everything
(different repo, disjoint files — verified: slice 6 touches `data/universes/`
and `data/presets/`; slice 1's only this-repo file is the lockfile, and the
orchestrator commits that itself), and slice 5 with 2–4 once slice 1 lands.
Cap is well under the 3–5 worker limit; at most three writers run at once.

Before each fan-out phase, budget the round per model-policy ("Budget the
round at the phase boundary"): ~100k–240k tokens per worker; if the phase
does not fit the window, stop at the partition and leave the fan-in brief.
The orchestrator never backgrounds workers and ends the turn without a disk
handoff (`.scratch/handoffs/wowsims-tab/PROCESS.md` names in-flight work and
the exact next spawn).

## Review points and user asks

- **Opus effort medium (review lane):** (a) slice 2 port-fidelity review —
  PROVENANCE.md against the actual port surface, E-W3 evidence; (b) one
  combined review of slices 3+4 before the fork integration merge; (c) slice
  5 review including the E-W4 diff. These are fork-side reviews; the
  `pre-merge-review` skill's file-in-`docs/reviews/` mechanics apply only to
  this-repo branches, so fork review notes go in the slice handoff dirs.
- **`sme-rank-review` (review lane, Opus):** fires once, on slice 6's
  refreshed ret-p3 ranking, per plan §7 and §9.6.
- **`pre-merge-review` skill:** on every this-repo feature branch before any
  merge ask — slice 6's branch, and the small lockfile branch from slice 1.
- **User must be asked:** (1) Phase 0 fork creation on GitHub — account
  action, user does it; (2) **any push to the personal fork** — workers
  commit locally only, nothing is pushed without an explicit ask (plan §1
  "locked"); (3) merge-to-dev for each this-repo branch, as a separate ask
  after the review file exists (AGENTS.md "The loop" step 5); (4) the E-W4
  shelve decision, since it drops a planned slice; (5) toolchain installs if
  the E-W1 preflight fails (below).

## Open orchestration risks

| Risk                                                                                            | Handling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Single fork clone, two writers (slices 2–4 vs 5) share one index                                | Slice 5 runs in its own `git worktree` of the nested clone; if worktree setup fails there, serialize 5 after 4 instead — never two writers in one tree                                                                                                                                                                                                                                                                                                                                                                                     |
| ~~E-W1 needs `make wasm` (Go ≥1.25 + protoc) which may not be installed~~ **CLOSED 2026-08-14** | All three were absent; user approved winget installs. Now Go 1.25.4, protoc 35.1, GNU Make 3.81, plus **`protoc-gen-go`, a fourth dependency plan §9.1 does not list** (separate binary; `make setup` does not fetch it). Verified by building, not by `--version`: both proto generators run, `sim/core` compiles, and `dist/tbc/lib.wasm` builds (20,293,865 bytes). E-W1's missing artifact now exists; **the experiment itself is still unrun** (slice 3). Recipe and the fnm trap: `.scratch/handoffs/wowsims-tab/slice-1/HANDOFF.md` |
| E-W2 needs wall-clock timing in a real browser on this machine                                  | Slice 3 worker uses the local dev server + browser preview; if the harness cannot drive it, hand the user a one-page measurement script and record their numbers                                                                                                                                                                                                                                                                                                                                                                           |
| Fork reviews have no `docs/reviews/` home                                                       | Review notes live in `.scratch/handoffs/wowsims-tab/slice-N/review.md`; the fork merge does not proceed without one (hypothesis that this location is acceptable — confirm with user if it matters)                                                                                                                                                                                                                                                                                                                                        |
| Orchestrator commits in this repo while slice 6's worktree is live                              | lint-staged sweeps dirty files (AGENTS.md loop step 2); worktree isolation covers the worker, and the orchestrator checks `git status` is clean of others' work before each lockfile/doc commit                                                                                                                                                                                                                                                                                                                                            |
| Token wall mid-phase                                                                            | Stop at the partition; `PROCESS.md` + slice handoffs are the resumable artifact (model-policy, observed failure rows 16b/18)                                                                                                                                                                                                                                                                                                                                                                                                               |
| **New 2026-08-14 —** fnm breaks every shell whose cwd is in the clone                           | The clone's `.nvmrc` pins Node 22.17.1 and this harness's shells never run `fnm env`, so the shim fails closed _before the command runs_. Two independent causes; fixing one is not enough. Every fork worker's prompt must carry the `eval "$(fnm env --shell bash)"` recipe from slice 1's handoff, or the worker will read the error as a build failure and start debugging the wrong thing                                                                                                                                             |
| **New 2026-08-14 —** the fork is an **npm** repo, not pnpm                                      | `package-lock.json`, no pnpm. Workers habituated to this repo's `pnpm verify` will reach for the wrong tool. `cd`-ing in trips the fnm error, so the install that works is `npm ci --prefix <fork path>` driven from outside the tree (559 packages, exit 0)                                                                                                                                                                                                                                                                               |
| **New 2026-08-14 —** Makefile-level portability on Windows unproven                             | GNU Make 3.81 (a 2006 build) is installed, but every build step so far was run **directly**, not through `make`. `WATCH=1 make devmode` and `make wasm` are still untested end-to-end; slice 1's remaining build gate should expect Makefile portability problems as a live possibility, not assume the direct-command success carries over                                                                                                                                                                                                |
