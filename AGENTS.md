# tbc gear prio

## Agent skills

### Issue tracker

Local markdown under `.scratch/`. Solo project — no external tracker, no triage workflow. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root, created lazily as needed. See `docs/agents/domain.md`.

### SME rank review

For domain judgment of a ranking / shortlist / pool output, use the `sme-rank-review` skill. Audience is the **engineering team** (gate and bugs), not player loot advice. Sharp lane.

### Editing skills

Before adding anything to a skill file, ask: does this belong to **this skill’s job and nature**? A skill has a personality (e.g. game-domain SME vs pipeline debugging vs TDD). Do not dump related-but-wrong material into it — put engineering rules in engineering skills/docs, game rules in game skills, and so on. If it does not fit, write it elsewhere or leave it out. See also `writing-great-skills` (relevance) and `dont-be-stupid`.

## Engineering workflow

Full process detail is in [`docs/workflow.md`](docs/workflow.md). This section is the summary every session should internalize before touching code.

### Comment policy

Comments explain **why**, never **what**. If a comment restates the code, delete it. If the code needs a comment to be readable, rename something first. Load-bearing comments only: a non-obvious constraint, an external-system quirk, why a slower or uglier path was deliberately chosen, or a pointer to the finding/ADR that forced the shape. Nothing lints this — it's a pre-merge review item.

### Durable claims

In **committed or dispatched** artifacts (commit messages, tickets, ADRs, tracked docs/skills, retros, worker prompts), a causal claim must either point at a command a reader can re-run or say **hypothesis** / **untested** in the same sentence. Chat may speculate freely. Do not state as fact that an artifact was produced on an environment you did not observe. Never assert that a gitignored or untracked generated input is present for a fresh worktree — give the regen/sync command and how to verify.

When changing committed **generated** artifacts: regenerate from the committed sources with the pinned toolchain; the working tree must match `HEAD` (or you must document which side is wrong) before commit. For CI byte-compare gates, read a real CI run — do not predict from a local story about another OS.

Prefer absolute paths or tool `working_directory` over `cd` in shells whose cwd persists across commands. Bound scaling command output (`--stat`, `head`/`tail`, exit codes) before dumping unbounded diffs or logs.

Do not run interactive `pnpm approve-builds` — declare builds via `pnpm.onlyBuiltDependencies`. A permission denial is evidence about that call, not a capability model — if a fan-out or land precondition cannot be established, stop and report the exact blocked command rather than silently dropping or rewriting the plan.

**A bounded question is a subagent, not a detour.** When answering something takes many reads whose _content_ you will not reuse — measuring a filter, probing what upstream actually does, confirming a spec claim — send it out and keep the paragraph, not the thirty tool calls. This is not the `parallel-phase` fan-out: no worktree, no merge, nothing to sequence, so its disjointness rule does not apply. Match the model to the judgement, not the token count: a sharp question (does this measurement support this conclusion?) still needs a sharp model. The tell that you got this wrong is retrospective — you are deep in a file you only opened to answer one question.

### Testing

Invoke the `tdd` skill for any red/green work. Note the word **seam** means two
different things across the docs you are about to read, so this section fixes
both.

**Architectural seams are three and only three** — `GearSource`, `SimRunner`,
`Store` (PLAN.md §5) — each with a recorded adapter, so the engine runs
deterministically offline from committed fixtures. Do not introduce a fourth
port without agreeing it first. That is a rule about **adapters, not about test
placement.**

**Where tests go.** The primary test is at the module interface (`rankUpgrades`)
through the recorded adapters — that is what `tdd`'s "test at the seam" means
here. **Pure functions are also unit-tested directly**, no agreement needed,
where the logic is intricate and independently valuable: the gem solver, the
ranking statistics, the 19→17 slot mapping, `applyView` (PLAN.md §6). They touch
no port and need no adapter. What is banned is asserting on **stage internals** —
the eight stages must stay reorganisable without touching a test.

### Parallel agents

When a phase or feature branch has **independent** slices (different kinds of work, mostly disjoint files), fan out with the `parallel-phase` skill: one isolated worktree/clone per slice, structured handoffs, merge back onto the **feature branch** (delegator merges editorial fan-ins; a merger worker is fine for mechanical ones). Then tear down worktrees, `pnpm verify` on the integrated tip, run `pre-merge-review`, and **ask before** `pnpm land` — never land each worker into `dev`. Harness-agnostic (git contract + Cursor/Claude/Codex adapters).

"Mostly disjoint" is a claim to verify, not eyeball: list each slice's files and confirm none appears twice **before** spawning — two slices editing one file is a sequencing problem, and without isolation they share one index, so one worker's `git add` sweeps in the other's work.

### Parking WIP

When you stash WIP, say what you parked and what tip is missing because of it. Name the important pieces (files or jobs), not a vibe. If tip still needs any of that to be correct or complete, write that down before you start the next work. “Restore later if needed” is not enough.

### Models and walls

**Workhorse** for implementation / parallel workers; **sharp** for pre-merge review — go slower or serial on walls; never invent a weaker substitute for a _sharp_ job. On **Cursor**: workhorse = **Composer** (simple/mechanical Task spawns; on Pro the Other-pool Terra/Sol models often die at spawn, which is why this is pinned rather than preferred); sharp = **Grok high** (prefer non-fast when available; high-fast if that’s the only high slug) — do **not** probe Sol/Opus first, and do not burn Grok on every trivial worker. Managers must not background workers and end the turn without a disk handoff for fan-in (see model-policy § Cursor manager fan-out). On **Claude Code**, sharp Opus work defaults to **effort `medium`** (not a model slug — set Opus and `/effort medium`); reserve effort `high`+ for niche cases like a single adversarial review axis. Prefer Sonnet/Terra workhorse and sol/`codex` sharp elsewhere when the harness allows. See [`docs/agents/model-policy.md`](docs/agents/model-policy.md).

### The loop

1. Branch off `dev`: `feat/<slug>` (or `phase-N/<slug>` for a PLAN.md phase).
2. Red → green, one slice at a time, with regular commits.
3. `pnpm verify` before every push — typecheck, lint, format, test (also on pre-push).
4. When the branch looks done: run the `pre-merge-review` skill → `docs/reviews/<branch>.md` (commit it on the feature branch). Deferred findings become tickets under `.scratch/carry-forward/issues/` (linked from Disposition). `pnpm issues:open` lists them anytime. **Do not skip this** — `pnpm land` only checks that the review file exists; it does not run the review.
5. **Ask before landing.** Never `pnpm land`, never `git merge` into `dev`, and never set `TBC_ALLOW_DEV_MERGE=1`, unless the user has explicitly asked to land/merge **after** the review file is written and they have had a chance to see the summary (a combined “review and land” request is **not** enough — finish the review, stop, wait for a separate land ask). When they ask: `pnpm land` is the only supported door — verify → review/ticket check → `git merge --no-ff` into `dev`. On `phase-N/*`, open `Blocks: phase-N` tickets require `--ack-open-blockers` (or close/re-block them first).
6. `main` only receives a merge from `dev` when a PLAN.md §14 phase gate is fully checked off in `docs/verification-log.md`.

### Gates

`pnpm verify` is required before every push (`.githooks/pre-push`) and direct commits to `main` are refused (`.githooks/pre-commit`) — merges only. Landing on `dev` goes through `pnpm land`; merge commits on `dev` without `TBC_ALLOW_DEV_MERGE=1` are refused by pre-commit. `git push --no-verify` / `git commit --no-verify` / `pnpm land --no-verify` / `TBC_ALLOW_DEV_MERGE=1` exist for spikes; never use them on `dev` or `main` for real work. CI (`.github/workflows/verify.yml`) runs the same `pnpm verify` on every push and can't be bypassed the same way, so it's the backstop if a local hook is skipped.
