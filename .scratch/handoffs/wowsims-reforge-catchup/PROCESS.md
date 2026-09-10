# Catch up the wowsims pins with `feature/backend-reforge`

Orchestration brief. The session owning this file is the **orchestrator** and
does not edit code itself. Every spawn below names its model explicitly, per
[`docs/agents/model-policy.md`](../../../docs/agents/model-policy.md) § Lane is
per job, not per parent — an unnamed subagent inherits the parent's tier.

## Why this exists

Measured 2026-09-09, all counts against live `wowsims/tbc-new`:

| Pin | Ref | Gap |
| --- | --- | --- |
| main `commit` (`3267f8d`, tag `v0.0.119`) | `feature/backend-reforge` (`ec5c5f2`, 2026-09-03) | 153 behind, 0 ahead, clean ancestor |
| `watchedRefs["feature/backend-reforge"]` (`cbf6b75`) | same | 121 behind, 0 ahead |

Two things are **separate axes** and must not be conflated:

1. **Branch drift** — how far the pins trail `feature/backend-reforge`.
2. **Content tier** — `--check` reads `CURRENT_PHASE` from the *latest tag's*
   blob (`scripts/sync_wowsims.py:569`), and tags are cut from `master`
   (`v0.0.134` = `72e0c8a` = master tip; **not** an ancestor of
   `feature/backend-reforge`). So the `*** CONTENT TIER CHANGED ***` line is a
   master-tag signal, not a backend-reforge one.

A prior read observed `CURRENT_PHASE = Phase3` at both branch tips against our
pinned `2`. **Treat that as unverified** — Worker R1 re-measures it. Do not
carry the figure forward as fact.

## Constraint that shapes everything

`--update` chases the latest tag and moves *every* pin in one diff
(`sync_wowsims.py:373`, and the runbook note at `sync_wowsims.py:71`). The
supported way to track this branch without disturbing the build pin is
`--update --ref <sha>`, which writes the ref into `lock["tag"]` as a literal —
so `lock["tag"]` stops naming a release tag. Any step that moves a pin states
which of these it used and why.

`vendor/wowsims/` is gitignored. Nothing may import from it
(`data-pipeline-work` § Before calling it done). Never claim a vendored file is
present for a fresh worktree — give the `--restore` command instead.

---

## Stage 1 — Research fan-out (parallel, read-only)

Three workers, **no writes, no pin moves, no checkouts**. All report to disk
under this directory. Dispatch together in one message.

### R1 — Content tier (Sonnet)

Answer, with commands a reader can re-run:

- What is `CURRENT_PHASE` in `ui/core/constants/other.ts` at (a) our pinned
  commit, (b) `feature/backend-reforge` tip, (c) `master` tip / `v0.0.134`?
- Which commits introduced any change, and are they ancestors of
  `feature/backend-reforge`?
- If the tier moved 2→3: enumerate what `sync_wowsims.py:571-574` says needs
  work — pools, gem palette, `engineVersion` — and which repo paths hold each.
- Does `TRACKED` already carry the p3 gear sets? (It lists `ret_p3.gear.json`
  and feral `p3_6p`/`p3_9p`.) If so, is the tier bump a *data* move or only a
  *default* move?

Output → `research/R1-content-tier.md`. Verdict line: tier moved / did not
move / unmeasurable, with evidence.

### R2 — Branch delta shape (Sonnet)

Classify the 153 commits between our pin and `feature/backend-reforge` tip
**by whether they touch anything in `TRACKED`** (`sync_wowsims.py:99`).

- For each `TRACKED` path, does its blob differ between pinned commit and
  branch tip? `git diff --stat <pin> <tip> -- <path>`.
- Which of the 153 are master-merge noise vs. real backend-reforge work?
- Flag anything touching `assets/database/db.json` — that is the big one and
  drives pool/universe regen.
- Name the `.proto` situation: PLAN.md §8 pins protos from the same release as
  the binary; does this branch move them?

Output → `research/R2-delta-shape.md`. Deliver a table of TRACKED path →
changed yes/no → rough nature of change.

### R3 — Plan and ADR impact (Sonnet)

Read-only scope check. Does pulling this branch invalidate a written decision?

- `PLAN.md` — especially the content-tier row (line ~29), `maxPhase` semantics
  (~168), the "ret curated sets stop at P2" claim (~274), §8.5 sync, and the
  proto pin (~506).
- `docs/adr/` — 0025 (stay pinned, borrow gem-optimizer rules only), 0027 (the
  tab is primary), 0028 (pool precedence), 0029 (borrow the decision).
- `CONTEXT.md` glossary — tier vs stage vocabulary.
- Open tickets under `.scratch/carry-forward/issues/` that this would touch or
  close: 337 (upstream tier 2→3), 211 (fork-universes gate), 350, 351.

Output → `research/R3-plan-impact.md`. For each document: unaffected /
needs-an-edit / needs-an-ADR, with the line reference.

**Gate 1.** Orchestrator reads all three. If R3 says an ADR is needed, or R1
says the tier moved, the plan-affecting question goes to the user **before**
Stage 2. Tier 2→3 changes a user-facing default and the candidate pool; that is
not an orchestrator's call to make silently.

### Gate 1 outcome (2026-09-09)

Research landed. Summary of what the three workers established:

- **R1**: tier moved 2→3, confirmed. Bump commit `33617c607a50`, an ancestor
  of both `master` and `feature/backend-reforge`. It is a **default** move, not
  a data move — p3 gear sets are already tracked and checksummed at the current
  pin, and the default flows from `lock["currentPhase"]` through
  `defaultMaxPhaseFromLock()` (`packages/core/src/cli.ts:44`). Ticket 337's
  2026-08-30 reading is superseded.
- **R2**: only **8 of 78** tracked paths differ; the other 70 are byte-identical.
  `vendor/wowsims/` checksums all match the lockfile, so there are no local
  modifications and **no three-way merge** — the 8 are a clean overwrite.
  `db.json` adds consumable/buff icons and four corrected gem stat values, no
  new gear items. **Protos moved**: `api.proto` +225 lines (the BulkSim /
  ReforgeOptimize RPC surface), plus `common.proto`, `db.proto`, `ui.proto`.
  That forces a regen of the 16 pinned protos and is the real payload.
- **R3**: ADR-0025 is the blocker; PLAN.md line ~274 is already false today,
  independent of this pull.

**Owner decisions taken at Gate 1:**

3. **Tier bump ships in this same plan, but sequenced after the pin move.**
   A pin move and a user-facing default change stay separate commits so the
   regen diff stays attributable.

1 and 2 resolved after R4 (`research/R4-pin-vocabulary.md`) established the
vocabulary:

- **Engine pin** = `data/wowsims.lock.json` → `vendor/wowsims/` (flat file
  snapshot: `db.json`, gear presets, protos). This repo's TypeScript ranking
  engine reads these. Currently tag `v0.0.119`; only *watches*
  `feature/backend-reforge`.
- **Fork pin** = `data/wowsims-fork.lock.json` → `vendor/tbc-new-fork/` (full
  engine+UI checkout, branch `feat/upgrades-tab`). The Upgrades tab builds from
  this. Its HEAD **does** descend from `backend-reforge`; it does not descend
  from the engine pin.

ADR-0025 governs the **engine/data pin only** — it predates the fork and the
tab by ten days, its text says "for building," and its Decision #5 names
`data/wowsims.lock.json` by path. Nothing supersedes it; only its literal tag
number is stale. So the tab's use of `backend-reforge` never violated it, and
moving the engine pin there is a real amendment to it.

**Owner decisions taken at Gate 1 (2026-09-09):**

1. **The engine is the same on both sides, in practice: `feature/backend-reforge`.**
   Not a tagged release, and not the repo-in-general — that branch. This
   overrides the orchestrator's earlier `PER_FILE_PIN`-only recommendation
   (take just the protos, keep 0025 intact); the owner chose one engine over
   the narrower change. ADR-0025 therefore **needs a recorded amendment** as
   part of this work.
2. Follows from 1: both the engine pin and the fork converge on that branch.
3. **Tier bump ships in this same plan, sequenced after the pin move.** A pin
   move and a user-facing default change stay separate commits so the regen
   diff stays attributable.

**R5 landed** (`research/R5-reconciliation-cost.md`). It corrects two earlier
findings — carry R5's numbers, not R2's or ticket 251's:

- **Divergence today**: fork `feat/upgrades-tab` (`6d0edd69d`) is **126 ahead,
  121 behind** `backend-reforge` tip, merge-base `cbf6b75a889e` (2026-08-13).
  Ticket 251's `20 ahead / 52 behind` (2026-08-22) is stale.
- **Supersession, corrected**: the native BulkSim/ReforgeOptimize RPC surface
  already existed *at the merge-base*. R2's "+225 lines in `api.proto`" was
  measured from the engine pin, an older reference point than the fork's actual
  branch point. Between `cbf6b75` and today's tip `api.proto` gains only a
  finalist-stage enum value and two paired-error fields. So the protos are
  **not** the payload this pull delivers — the fork already had them.
- Our fork's HTTP transport already calls the real `bulkSimAsync`. Only the
  **WASM** transport loops per candidate, and upstream's WASM `bulkSimAsync` is
  a stub — that fallback is forced, not a local mistake. The late ~15-commit
  batch-sim run does re-derive parts of upstream's staged/paired-comparison
  design from the WASM side, sharpening the standing
  `project-fork-tab-handrolls-batch-sim` memory.
- **Conflict surface**: 8 files touched by both sides; a real `git merge-tree`
  simulation found exactly **1 genuine conflict** —
  `ui/core/components/sim_header.tsx`, adjacent-edit, mechanically resolvable.

**Recommended path**: `git merge feature/backend-reforge` into
`feat/upgrades-tab` (not rebase, not abandon-and-reapply) — 1 conflict, no SHA
rewrite, no force-push. Pair with the engine pin moving via
`--update --ref <sha>`.

**Biggest risk, and it is a real blocker**: `scripts/fetch_wowsimcli.py` reads
`lock["tag"]` to download a GitHub **Release asset by tag name**. Once the pin
is a branch or sha, that fetch path breaks for real — not cosmetically, unlike
the other `tag` readers. A build-from-source or CI-artifact alternative must
land **before** `pnpm verify` can run clean in a fresh worktree. Treat this as
the plan's first slice, not an afterthought.

**Ticket 251** does not close on convergent SHAs alone: its acceptance boxes
require a recorded decision and a D2 plan-doc amendment, and its three original
options never contemplated the *engine* pin becoming a branch pin. Closing it
needs a note saying the shape changed. **Ticket 263**'s precondition ("one
wowsims repo, one branch") is satisfied outright.

---

## Stage 2 — Plan the pull (design lane)

Only after Gate 1. One **Fable** planner (design lane, `effort: low`) via the
`stage-gate` skill, briefed with all three research files.

The plan must decide and justify:

- `--update --ref <sha>` vs `--update --tag <tag>` vs `--watch-ref` only, and
  what `lock["tag"]` ends up naming.
- Whether the build pin moves at all, or only `watchedRefs` refreshes.
- If the tier moves: whether `DEFAULT_MAX_PHASE` changes in the same commit or
  a separate one. Prefer separate — a pin move and a default change are
  different claims.
- Regen order for anything under `data/`, with the predicted artifact list
  written down **before** running (`data-pipeline-work` rule 2).
- Rollback: the exact command to restore the current pin.

Then an **Opus at effort `medium`** plan-reviewer (review lane) per
`stage-gate`. Adversarial axis: does this plan move a pin it did not say it
would, and does it claim verification a green `pnpm verify` cannot give? Recall
that all three verify gates are **AtlasLoot-only** — they say nothing about a
wowsims pin (`data-pipeline-work` § What `pnpm verify` already covers).

**Gate 2.** Orchestrator judges the reviewed plan. Loop back once at most.

### Gate 2 outcome (2026-09-10)

Plan written (`PLAN-catchup.md`), reviewed by Opus at effort medium
(`REVIEW-plan.md`). Verdict **APPROVE WITH CHANGES** — 2 blockers, 7
executor-inline findings. All folded into the plan; no loop-back needed.

- **F1 (blocker, owner-confirmed)**: the drafted P4 hand-edit is dropped.
  `defaultMaxPhase` flips with the pin; slice D is `ENGINE_VERSION` + docs.
  The reviewer showed the hand-edit made slice D's own acceptance command pass
  while proving nothing, and that no generator reads `defaultMaxPhase` — so the
  owner's "keep the regen diff attributable" intent is better served this way.
- **F2c (blocker)**: 78 → **98** tracked files. That number is the executor's
  "unpredicted path is a finding" baseline.
- **F3b (major)**: slice D's two CLI runs are **live sims**, not replays —
  `--offline` swaps only the gear source; `RecordedSimRunner` is unreachable
  from `cli.ts:308`. Iterations now bounded; runtime is a new open uncertainty.
- **F3, F4 (major)**: the fetch-binary regression and the unpushed-fork
  escalation now live in ADR-0030's Consequences, not only in this plan.
  Ticket 355 added for pushing/archiving the branch.
- **F5 closed three uncertainties** the executor must not spend measurements on:
  layout gate (no), `policy-notes:check` reads docs (no), recorded-adapter
  keying (a non-question).

**Verification honesty note carried forward**: no `pnpm verify` gate reads any
document slice E edits. ADR-0030, the PLAN.md corrections and `known-traps.md`
have no automated check — the `writing-for-agents` pass is the only gate.

---

## Stage 3 — Execute (workhorse, on a branch)

Branch `feat/wowsims-reforge-catchup` off `dev`. One **Sonnet** executor per
independent slice; if slices overlap on `data/wowsims.lock.json` they are
**not** disjoint and run serially — `parallel-phase`'s disjointness rule is a
claim to verify by listing files, not to eyeball.

Per `AGENTS.md` § The loop: commit per green slice, not one commit at the end.

Conflict handling: when a vendored-file update collides with a local edit,
hand that file to a **Haiku** worker with the `resolving-merge-conflicts` skill
and a narrow brief — one file, both sides quoted, the resolution rule stated.
Mechanical three-way resolution is the cheapest lane that does the job.
**Escalate to Sonnet** the moment a conflict requires judgment about game
semantics or ranking behaviour rather than text reconciliation.

Every regen follows `data-pipeline-work`:

- Predict the artifact list first, then `git diff --numstat -- data/`.
- Every unpredicted path is a finding.
- Generator run twice into temp paths, `cmp` identical.
- Grep `packages/core/` for each field name and count the change falsified.

## Stage 4 — Review and stop

`pnpm verify` on the integrated tip, then the `pre-merge-review` skill →
`docs/reviews/feat-wowsims-reforge-catchup.md`, committed on the feature
branch. Deferred findings become tickets under
`.scratch/carry-forward/issues/`.

**Stop there.** Do not merge. `pnpm merge-to-dev` only checks the review file
exists; it does not run the review. The merge needs a separate ask from the
user after they have seen the summary.

## Orchestrator conduct

- Never background workers and end the turn — fan-in dies that way
  (`model-policy` § Manager / multi-step fan-out). Either block on the fan-out
  or update this file with what is in flight and the exact next spawn.
- Name model and effort on every spawn.
- A permission denial is evidence about that call, not a capability model —
  report the exact blocked command rather than rewriting the plan around it.
