# tbc gear prio

## Agent skills

### Issue tracker

Local markdown under `.scratch/`. Solo project — no external tracker, no triage workflow. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root, created lazily as needed. See `docs/agents/domain.md`.

### SME rank review

For domain judgment of a ranking / shortlist / pool output, use the `sme-rank-review` skill. Audience is the **engineering team** (gate and bugs), not player loot advice. Review lane.

### Data pipeline work

For pinning a vendored input, editing a parser, or regenerating a committed artifact under `data/`, use the `data-pipeline-work` skill. Three of its rules are gated by `pnpm verify` on the AtlasLoot path only; the rest are by hand.

### Editing skills

Before adding anything to a skill file, ask: does this belong to **this skill’s job and nature**? A skill has a personality (e.g. game-domain SME vs pipeline debugging vs TDD). Do not dump related-but-wrong material into it — put engineering rules in engineering skills/docs, game rules in game skills, and so on. If it does not fit, write it elsewhere or leave it out. See also `writing-great-skills` (relevance) and `dont-be-stupid`.

### Don't be stupid

Before reporting a nontrivial task done — especially a review, research, or "use X to check Y" request — run the `dont-be-stupid` checklist of previously-caught failure modes (missing named artifacts, unsourced claims stated as fact, skipped clarifying questions).

### Writing for agents

Review with the `writing-for-agents` skill before calling any agent-facing document done: a **plan** (PLAN.md, `.scratch/**` specs and tickets), a **skill** file, `AGENTS.md` / `CLAUDE.md`, or a tracked doc an agent is pointed at. A plan counts because an agent executes it.

Review means a second pass over your finished draft, revising it against the skill — the skill is the rubric, and citing it is not the same as having applied it.

Propose changes to `AGENTS.md`, `CLAUDE.md`, and skill files in chat and wait for approval before editing them. These files steer every future session, so a bad line costs more than a bad commit and nothing catches it.

## Engineering workflow

Full process detail is in [`docs/workflow.md`](docs/workflow.md). This section is the summary every session should internalize before touching code.

### Comment policy

Comments explain **why**, never **what**. If a comment restates the code, delete it. If the code needs a comment to be readable, rename something first. Load-bearing comments only: a non-obvious constraint, an external-system quirk, why a slower or uglier path was deliberately chosen, or a pointer to the finding/ADR that forced the shape. Nothing lints this — it's a pre-merge review item.

### Durable claims

In **committed or dispatched** artifacts (commit messages, tickets, ADRs, tracked docs/skills, retros, worker prompts), a causal claim must either point at a command a reader can re-run or say **hypothesis** / **untested** in the same sentence. Chat may speculate freely. Do not state as fact that an artifact was produced on an environment you did not observe. Never assert that a gitignored or untracked generated input is present for a fresh worktree — give the regen/sync command and how to verify.

When changing committed **generated** artifacts: regenerate from the committed sources with the pinned toolchain; the working tree must match `HEAD` (or you must document which side is wrong) before commit. For CI byte-compare gates, read a real CI run — do not predict from a local story about another OS.

Prefer absolute paths or tool `working_directory` over `cd` in shells whose cwd persists across commands. Bound scaling command output (`--stat`, `head`/`tail`, exit codes) before dumping unbounded diffs or logs.

**An exit code is not evidence that work happened.** A stopped background task reports exit 0, and a command that ran in the wrong directory succeeds at nothing. Confirm the artifact — `ls node_modules`, read the file, check the row count — before reporting an install, build or regen as done.

Do not run interactive `pnpm approve-builds` — declare builds via `pnpm.onlyBuiltDependencies`. A permission denial is evidence about that call, not a capability model — if a fan-out or merge precondition cannot be established, stop and report the exact blocked command rather than silently dropping or rewriting the plan.

**A bounded question is a subagent, not a detour.** When answering something takes many reads whose _content_ you will not reuse — measuring a filter, probing what upstream actually does, confirming a spec claim — send it out and keep the paragraph, not the thirty tool calls. This is not the `parallel-phase` fan-out: no worktree, no merge, nothing to sequence, so its disjointness rule does not apply. Match the model to the judgement, not the token count: a question that needs judgment (does this measurement support this conclusion?) still needs a review-lane model. The tell that you got this wrong is retrospective — you are deep in a file you only opened to answer one question.

### CLI environment

Two shells with different syntax — **Bash** (Git Bash, POSIX) and **PowerShell** — and each tool call picks one. They share no state.

**Backgrounded Bash does not inherit `cd`.** A `cd X && cmd` that works in the foreground runs in the session cwd when backgrounded, so it succeeds while doing the work somewhere else entirely. Reach for the command's own directory flag: `npm --prefix`, `git -C`, `pnpm -C`.

Windows-native binaries — `node`, `python` — read `C:/Users/...`, not Git Bash's `/c/Users/...`. Passing the Bash form yields paths like `C:\c\Users\...` and an ENOENT that looks like a missing file.

Read a command's error text before forming a theory about it. Tool-manager errors in particular usually name their own fix, and pattern-matching past them costs more than reading them.

### Types from JSON

**Never derive a TypeScript type from a JSON import.** `resolveJsonModule` widens every string to `string`, and `as const` cannot be applied to a JSON import (TS1355), so `(typeof json.list)[number]` is `string` and any `extends` assertion against it **passes vacuously** — a check that reads as rigour and proves nothing. This repo has hit it twice; both times the wrong conclusion ("impossible, needs codegen") was written down as fact. JSON is a **value** source of truth, never a **type** one. Shared lists go through `scripts/generate_json_literal_types.py`, which emits committed `as const` code gated by `pnpm verify`. See [`docs/workflow.md`](docs/workflow.md#never-derive-a-type-from-a-json-import).

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

When you will have **two writers running at once** (independent slices — different kinds of work, mostly disjoint files), fan out with the `parallel-phase` skill: one isolated worktree/clone per slice, structured handoffs, merge back onto the **feature branch** (delegator merges editorial fan-ins; a merger worker is fine for mechanical ones). Then tear down worktrees, `pnpm verify` on the integrated tip, run `pre-merge-review`, and **ask before** `pnpm merge-to-dev` — never merge each worker into `dev`. Harness-agnostic (git contract + Claude Code/Codex/Cursor adapters).

"Mostly disjoint" is a claim to verify, not eyeball: list each slice's files and confirm none appears twice **before** spawning — two slices editing one file is a sequencing problem, and without isolation they share one index, so one worker's `git add` sweeps in the other's work.

### Stage-gate features

When a wrong plan would be expensive, run the `stage-gate` skill: the
session orchestrates Planner (Fable, effort low) → adversarial
Plan-Reviewer (Opus, effort medium) → fresh-context Executor (Opus,
effort medium — it holds the adapt-vs-flag-vs-stop call on every
underspecified step), with judged gates between stages and a bounded
loop-back.
The plan is reviewed before any code exists; `pre-merge-review` still runs
after, unchanged. Seats are agent definitions under `.claude/agents/` —
files added there register at session start only, so a new or edited seat
needs a fresh session.

### Parking WIP

When you stash WIP, say what you parked and what tip is missing because of it. Name the important pieces (files or jobs), not a vibe. If tip still needs any of that to be correct or complete, write that down before you start the next work. “Restore later if needed” is not enough.

### Models and walls

Three lanes, every harness, sorted by **kind of work, not model height**: **workhorse** for implementation / parallel workers, **review** for pre-merge review axes and adversarial judgment, **design** for planning and architecture. Go slower or serial on walls; never invent a weaker substitute for a _review_ job — if waiting and serialising both fail, stop and say so rather than downgrading; and never promote a job to a taller lane it does not belong in. Managers must not background workers and end the turn without a disk handoff for fan-in (see model-policy § Manager / multi-step fan-out). Filling the lanes: on **Claude Code**, Sonnet-class workhorse, **Opus at effort `medium`** for review (not a model slug — set Opus and `/effort medium`, reserving effort `high`+ for a single narrow adversarial axis), and **Fable for design only** — Fable is the top price tier, so an unnamed subagent inherits it, and review axes run Opus, not Fable; on **Codex**, mid tier for workers and `codex exec` / top tier for review; on **Cursor**, workhorse = **Composer** (pinned, not merely preferred, because on Pro the Other-pool Terra/Sol models often die at spawn) and review = **Grok high** (prefer non-fast; high-fast if that’s the only high slug) — do **not** probe Sol/Opus first, and do not burn Grok on every trivial worker. See [`docs/agents/model-policy.md`](docs/agents/model-policy.md).

### The loop

1. Branch off `dev`: `feat/<slug>` (or `phase-N/<slug>` for a PLAN.md phase).
2. Red → green, one slice at a time. **Commit regularly as you accomplish work — a commit per green slice, not one commit at the end, and not only when asked.** Merging to `dev` is the gated step, not this one.
   - **`git add <paths>` does not scope the commit** — pre-commit runs `lint-staged` against `*`, so any dirty file rides along. Before each commit `git status` must be clean of work you did not do (commit it separately or ask), and after `git reset`, re-read `git log -1` before recommitting — another session may have merged in between.
3. `pnpm verify` before every push — typecheck, lint, format, test (also on pre-push).
4. When the branch looks done: run the `pre-merge-review` skill → `docs/reviews/<branch>.md` (commit it on the feature branch). Deferred findings become tickets under `.scratch/carry-forward/issues/` (linked from Disposition). `pnpm issues:open` lists them anytime. **Do not skip this** — `pnpm merge-to-dev` only checks that the review file exists; it does not run the review.
5. **Ask before merging to `dev`.** Never `pnpm merge-to-dev`, never `git merge` into `dev`, and never set `TBC_ALLOW_DEV_MERGE=1`, unless the user has explicitly asked to merge **after** the review file is written and they have had a chance to see the summary (a combined “review and merge” request is **not** enough — finish the review, stop, wait for a separate merge ask). When they ask: `pnpm merge-to-dev` is the only supported door — verify → review/ticket check → `git merge --no-ff` into `dev`. On `phase-N/*`, open `Blocks: phase-N` tickets require `--ack-open-blockers` (or close/re-block them first).
6. `main` only receives a merge from `dev` when a PLAN.md §14 phase gate is fully checked off in `docs/verification-log.md`.

### Gates

`pnpm verify` is required before every push (`.githooks/pre-push`) and direct commits to `main` are refused (`.githooks/pre-commit`) — merges only. Merging to `dev` goes through `pnpm merge-to-dev`; merge commits on `dev` without `TBC_ALLOW_DEV_MERGE=1` are refused by pre-commit. `git push --no-verify` / `git commit --no-verify` / `pnpm merge-to-dev --no-verify` / `TBC_ALLOW_DEV_MERGE=1` exist for spikes; never use them on `dev` or `main` for real work. CI (`.github/workflows/verify.yml`) runs the same `pnpm verify` on every push and can't be bypassed the same way, so it's the backstop if a local hook is skipped.
