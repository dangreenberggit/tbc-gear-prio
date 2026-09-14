# Fan-in brief — retro deep-dive (`feat/fan-out-retro`)

Written **at spawn time**, per the recommendation in CTX-3/CTX-4 of
[`../2026-07-26-phase-1-fan-out.md`](../2026-07-26-phase-1-fan-out.md). This file is the
artifact that lets a *fresh* merger agent complete fan-in if the delegator's context runs
out. It is deliberately written before the workers finish, while it is cheap.

## Base

- Branch: `feat/fan-out-retro`
- Base SHA all workers must assert: **`94debea`** (carries the retro + this brief; workers
  need it present in order to read their input). Worker prompts are authoritative on this.

> **Confirmed during this fan-out — ORCH-1's root cause in the retro is wrong.**
> `isolation: worktree` does **not** base on current HEAD, and it is not flaky. All
> **7/7** auto-created `worktree-agent-*` branches sit at `55b5a51`, which is `main` =
> `origin/main` ("Add minimal verify harness and git hooks"). Since `main` here only
> receives merges at PLAN.md phase gates, that base is a near-empty repo. Worktree
> isolation on a feature branch therefore fails **silently and 100% of the time** unless
> the worker is told a ref and checks it. Pinning the base SHA in the prompt is not
> insurance — it is the only thing that makes the feature work.
- Branched from `phase-1/five-seed-spread` (evidence for most findings only exists there:
  `packages/core/src/proto/`, `data/items/index.json`, ticket 05, the merge commits).

## Partition

Each worker owns **exactly one output file**. No worker edits a file another worker
touches, and **no worker edits shared docs** (`AGENTS.md`, `PLAN.md`, `parallel-phase/SKILL.md`,
`handoff-template.md`, any config). Proposed edits are *quoted as diffs inside the report*.
This is deliberate — ORCH-3 in the retro records that several findings prescribe edits to the
same handful of files, so applying them in parallel would guarantee conflicts.

| W | Branch | Findings | Output file |
|---|---|---|---|
| W1 | `retro/w-env` | ENV-1 … ENV-6 | `.scratch/retros/reports/01-env.md` |
| W2 | `retro/w-orch` | ORCH-1 … ORCH-6 | `.scratch/retros/reports/02-orch.md` |
| W3 | `retro/w-ctx` | CTX-0 … CTX-5 | `.scratch/retros/reports/03-ctx.md` |
| W4 | `retro/w-rsn` | RSN-1, RSN-2, DOC-4 | `.scratch/retros/reports/04-rsn.md` |
| W5 | `retro/w-doc` | DOC-1, DOC-2, DOC-3 | `.scratch/retros/reports/05-doc.md` |

Merge order is irrelevant (disjoint files). Expect zero conflicts; if one occurs, a worker
exceeded its scope.

## Known defects in the retro — workers must not inherit these uncritically

The retro is a **first-pass artifact written from a transcript**, not a verified document.
At least one of its claims is already known to be wrong:

1. **The ring-enchant causal claim is superseded by `d77cba5`.** The retro (in *"Friction
   that earned its keep"*) repeats the original session's explanation that the Phase-0
   two-character probe *"never happened to include an enchanted ring."* Commit `d77cba5`
   states plainly: **"That is not why it missed them."** The real cause is that the four
   Enchant Ring recipes are the only records in `db.json`'s 141-entry `enchants[]` table
   carrying `requiredProfession` (3 = Enchanting), so most players *cannot* have one and
   bare rings are the expected observation.

   This matters beyond the fact itself: it makes **RSN-2 a repeated pattern, not a single
   incident.** The original session asserted an untested cause about the protos
   (`c0acbfc`, "Linux/WSL run" — there was no Linux run), *and* asserted an untested cause
   about the ring probe (`119c0b7`), *and* the retro then repeated the second one. W4 owns
   this and should treat it as the central evidence, not a footnote.

2. **The retro's own severity ranking is unvalidated.** P0/P1/P2 were assigned by the
   author in one pass. Workers may re-rank with justification.

3. Any finding that depends on transcript reading rather than repo state must be
   re-verified against the repo. Where the retro says "Verified", it was checked; where it
   says "Evidence", it may be transcript-only.

## Claims requiring independent verification at fan-in

Per CTX-3's recommendation that a merger brief must list claims it cannot see for itself:

| Claim | Who asserts | How to check |
|---|---|---|
| Proto regen drift is platform-related | retro RSN-2 (says likely wrong), commit `c0acbfc` (asserts it) | `pnpm proto:generate` twice on one machine after `.gitattributes` lands |
| `.claude/worktrees/` unexcluded in 4 tools | retro ENV-1 (verified) | re-grep configs |
| `adapters/claude.md` injects as CLAUDE.md | retro ENV-3 (observed once) | filesystem case check + a fresh Read |
| AGENTS.md vs PLAN.md §5 testing conflict | retro DOC-1 | read both, quote both |
| Reports are prettier-clean | each worker | `npx prettier --check <file>` |

## Rules given to every worker

1. Assert base SHA `94debea` first; correct and report if wrong (ORCH-1).
2. Report only — do not apply fixes to shared files (ORCH-3).
3. Verify before restating. The retro is input, not gospel.
4. Every finding gets a **general vs project-specific** verdict.
5. Recommend "do nothing" where that is the right answer. A finding that is real but not
   worth fixing is a valid, useful conclusion.
6. `vendor/` is gitignored and absent in a fresh worktree; `pnpm verify` will fail on
   `cli-sim-runner` for that reason alone. These are documentation tasks — do not run the
   full suite unless a finding requires it (ENV-4).
7. Tail-limit command output (CTX-2).
8. `npx prettier --write` your report before committing, or fan-in `format:check` fails.
9. Do not merge, do not `pnpm land`.

## Fan-in checklist (for delegator or a fresh merger)

- [ ] All 5 branches exist with one commit each
- [ ] `git merge --no-ff` each into `feat/fan-out-retro` (expect no conflicts)
- [ ] Remove worktrees **before** verifying (ORCH-4, ENV-1)
- [ ] `pnpm verify` — markdown-only change, so `format:check` is the meaningful gate
- [ ] Disposition every `Notes / concerns` item in every handoff (ORCH-6)
- [ ] Do **not** write `docs/reviews/feat-fan-out-retro.md` unless a real `pre-merge-review`
      has actually run — that path satisfies the `pnpm land` gate by existence alone
