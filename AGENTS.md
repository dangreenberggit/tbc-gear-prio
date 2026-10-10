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

Subagents receive the root `CLAUDE.md` / `AGENTS.md` text from when the parent session started, so an edit to those files reaches subagents only in a new session. An uncommitted token audit reported this, and on 2026-09-26 a review subagent received an `AGENTS.md` older than the file on disk. A `CLAUDE.md` in another directory, such as a worktree, was loaded from disk when a subagent read a file there; this was seen once.

## Interacting with the user

How to hand work back — applies to every session, not only orchestration. Message format: global "Chat responses" (staged in `docs/agents/home/AGENTS.md`). When overseeing the plan-review-execute pipeline, the `stage-gate` skill's `## Orchestrator conduct` adds pipeline-specific rules (standing instructions, scoped stops, routing detail outward, gating on open tickets).

### Present a decision with the reasoning done, in prose

When a real decision is due, do the analysis first (or delegate it), then write it in the decision format of the global "Chat responses" rule. A picklist of one-line summaries is the wrong form for a decision that needs thought: a bad summary corrupts the choice it is asking for. Structured questions are for genuine forks in intent, not for offloading analysis onto the user.

### Find out before you ask

Default to resolving the question yourself — from what the user already said, from what is derivable, or by sending an agent to investigate. Spend a clarifying question only on a true fork in what the user wants, one no investigation settles because it is a preference. This is the complement of the `dont-be-stupid` guardrail (ask when the question is cheap and being wrong is expensive): together they bound when to ask and when to find out.

## Engineering workflow

Full process detail is in [`docs/workflow.md`](docs/workflow.md). This section is the summary every session should internalize before touching code.

### Comment policy

Comments explain **why**, never **what**. If a comment restates the code, delete it. If the code needs a comment to be readable, rename something first. Load-bearing comments only: a non-obvious constraint, an external-system quirk, why a slower or uglier path was deliberately chosen, or a pointer to the finding/ADR that forced the shape. Nothing lints this — it's a pre-merge review item.

### Durable claims

In **committed or dispatched** artifacts (commit messages, tickets, ADRs, tracked docs/skills, retros, worker prompts), a causal claim must either point at a command a reader can re-run or say **hypothesis** / **untested** in the same sentence. Chat may speculate freely. Do not state as fact that an artifact was produced on an environment you did not observe. Never assert that a gitignored or untracked generated input is present for a fresh worktree — give the regen/sync command and how to verify.

When changing committed **generated** artifacts: regenerate from the committed sources with the pinned toolchain; the working tree must match `HEAD` (or you must document which side is wrong) before commit. For CI byte-compare gates, read a real CI run — do not predict from a local story about another OS.

Prefer absolute paths or tool `working_directory` over `cd` in shells whose cwd persists across commands. Bound scaling command output (`--stat`, `head`/`tail`, exit codes) before dumping unbounded diffs or logs — but to test whether one thing exists, name it (`ls <path>`, `grep -c <pattern>`); a truncated listing cannot show absence.

**An exit code is not evidence that work happened.** A stopped background task reports exit 0, and a command that ran in the wrong directory succeeds at nothing. A pipe is worse — it reports the **last** command's status, so `make ... 2>&1 | tail` returns `tail`'s 0 and hides `make: command not found`. To bound output and keep the status, append `; echo "rc=${PIPESTATUS[0]}"` to the same command (a later tool call is a new shell and has lost it), or redirect to a file and `tail` it separately. Confirm the artifact — `ls node_modules`, read the file, check the row count — before reporting an install, build or regen as done.

**A property measured against one option is not a comparison.** Before ruling an option in or out — a version, a branch, a library, an approach — name the alternatives and say what the same measurement gives for each. "Our pin is an ancestor of that branch" and "we do not have that feature" are both claims about one ref; neither is evidence until the other candidates are measured the same way. When the claim is that something is _absent_, resolve the refs that could contain it — `watchedRefs` in `data/wowsims.lock.json` is tracked precisely because a feature was twice called missing while live on a branch this repo already watched.

Do not run interactive `pnpm approve-builds` — declare builds via `pnpm.onlyBuiltDependencies`. A permission denial is evidence about that call, not a capability model — if a fan-out or merge precondition cannot be established, stop and report the exact blocked command rather than silently dropping or rewriting the plan.

**A bounded question is a subagent, not a detour.** When answering something takes many reads whose _content_ you will not reuse — measuring a filter, probing what upstream actually does, confirming a spec claim — send it out and keep the paragraph, not the thirty tool calls. This is not the `parallel-phase` fan-out: no worktree, no merge, nothing to sequence, so its disjointness rule does not apply. Match the agent type to the judgment, not the token count: only an extremely simple job goes to `simple-task`, a question with one named target that takes more than one lookup may go to the trial type `discrete-task` (model-policy § Trial types), and a question that needs judgment (does this measurement support this conclusion?) goes to `general-task`. The tell that you got this wrong is retrospective — you are deep in a file you only opened to answer one question.

### CLI environment

Two shells with different syntax — **Bash** (Git Bash, POSIX) and **PowerShell** — and each tool call picks one. They share no state.

**Backgrounded Bash does not inherit `cd`.** A `cd X && cmd` that works in the foreground runs in the session cwd when backgrounded, so it succeeds while doing the work somewhere else entirely. Reach for the command's own directory flag: `npm --prefix`, `git -C`, `pnpm -C`.

Windows-native binaries — `node`, `python` — read `C:/Users/...`, not Git Bash's `/c/Users/...`. Passing the Bash form yields paths like `C:\c\Users\...` and an ENOENT that looks like a missing file.

Read a command's error text before forming a theory about it. Tool-manager errors in particular usually name their own fix, and pattern-matching past them costs more than reading them.

**Before** a ported-engine-file edit, a scripted/generated file edit, moving the wowsims engine pin, filing a ticket, writing a review Disposition table, or starting the dev servers — or when a node/pnpm command fails strangely — read [`docs/agents/known-traps.md`](docs/agents/known-traps.md): the trap each of those actions arms, and the move that disarms it.

### The forked tab repo

The Upgrades tab's real code lives in `vendor/tbc-new-fork`, a git repo with its own branch and remote. `vendor/` is gitignored, so this clone is invisible to `git status` in the main repo and is not part of any checkout's tracked tree — fork work happens wherever that clone exists. A fork change is always a two-step re-pin: commit inside the fork (`git -C vendor/tbc-new-fork ...`), then in the main repo bump `data/wowsims-fork.lock.json`'s `commit` to the new fork SHA, run `pnpm sim-implemented-effects:generate` (it refuses until the lock names the fork's HEAD, so bump the lock first), and `pnpm verify`. Read the lock file's `_comment` history before touching it — it is the log of what each fork commit changed and why. Full sequence, including the PROVENANCE cycle for ported engine files: [`docs/agents/known-traps.md`](docs/agents/known-traps.md) (`Before editing a ported engine file`, `Before moving the wowsims engine pin`). Every fork commit is a separate `git -C vendor/tbc-new-fork ...` call, so the fnm/shell footguns in CLI environment above (the shell losing its Node pin mid-session and silently breaking `&&` chains) can hit on any one of them.

**Two fork branches at once need a pair.** A session that needs a fork branch other than the one the main checkout's clone has checked out, or works on the fork while another session does, runs `pnpm wt:pair <name> <main-branch> <fork-branch>`: a main worktree with its own fork worktree, where every gate reads that pair's fork and lock. Merges into `dev` run from the main folder, after `pnpm wt:unpair`. See [`docs/agents/paired-worktrees.md`](docs/agents/paired-worktrees.md).

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

When you will have **two writers running at once** (independent slices — different kinds of work, mostly disjoint files), fan out with the `parallel-phase` skill: one isolated worktree/clone per slice, structured handoffs, merge back onto the **feature branch** (delegator merges editorial fan-ins; a merger worker is fine for mechanical ones). The session spawns a subagent to act as Delegator (§ The session delegates); on Claude Code that is a `general-task` agent. The Delegator tears down worktrees and runs `pnpm verify` on the integrated tip. The session then has `pre-merge-review` run and **asks before** `pnpm merge-to-dev`. Never merge each worker into `dev`. Harness-agnostic (git contract + Claude Code/Codex/Cursor adapters).

"Mostly disjoint" is a claim to verify, not eyeball: list each slice's files and confirm none appears twice **before** spawning — two slices editing one file is a sequencing problem, and without isolation they share one index, so one worker's `git add` sweeps in the other's work. Readers share that index too: a read-only agent sees your uncommitted edits and cannot tell them from a stray worker's.

### Stage-gate features

When a wrong plan would be expensive, run the `stage-gate` skill: the
session orchestrates Planner (Fable, effort low) → adversarial
Plan-Reviewer (Opus, effort high) → fresh-context Executor (Opus,
effort high — it holds the adapt-vs-flag-vs-stop call on every
underspecified step), with judged gates between stages and a bounded
loop-back.
The plan is reviewed before any code exists; `pre-merge-review` still runs
after, unchanged. Seats are agent definitions under `.claude/agents/`.
New agent files can register mid-session: `simple-task`, `general-task` and
`design-task` (added in 1d86fd48 on 2026-09-25) appeared in the coordinator
session's harness notices without a restart. Whether an edit to an existing
seat is picked up the same way is untested.

### Parking WIP

When you stash WIP, say what you parked and what tip is missing because of it. Name the important pieces (files or jobs), not a vibe. If tip still needs any of that to be correct or complete, write that down before you start the next work. “Restore later if needed” is not enough.

### The session delegates

On every harness the interactive session is the orchestrator. It routes work, judges results, and relays conclusions to the owner. It hands every task to a subagent, so its own tool use stays low and its context stays small.

The session makes only these tool calls itself:

- spawning and messaging agents
- loading a skill
- writing `brief.md`, `decision-log.md`, and any stage artifact copied verbatim from a seat's final message
- the short gate checks: `git status --porcelain`, `git rev-parse HEAD`, `git diff --stat`, and `date -u +%Y-%m-%dT%H:%MZ` for `decision-log.md` times
- reading the stage-gate artifacts under `.scratch/stage-gate/<slug>/` and `.claude/skills/stage-gate/plan-template.md`

Everything else goes to a subagent: reading code or docs, running `pnpm` or any other `git` command, editing files, and committing. To run `pre-merge-review`, spawn one subagent to run the whole skill. Allow it to write `docs/reviews/` and `.scratch/carry-forward/` and to commit them, and have it return the review file's path and its summary.

Pick each subagent's model from your harness section of [`docs/agents/model-policy.md`](docs/agents/model-policy.md), and name the model on every spawn:

- **Claude Code:** pick `simple-task`, `general-task`, `design-task` or a trial type (`modest-task`, `discrete-task`) from the agent-type table in model-policy § Claude Code, and run `pre-merge-review` on a `general-task`. When unsure, pick `general-task`. If the harness does not recognize one of these types, restart the session rather than falling back to a built-in type.
- **Codex:** everything that is not review or design goes to subagents at the workhorse fill, mid tier at a lower reasoning effort. The owner wants these used freely. Review and design jobs go to subagents at the review and design fills.
- **Cursor:** everything that is not review or design goes to subagents on the workhorse pin, Composer. Review and design jobs go to subagents at the review and design fills.

This rule binds the interactive session only. A subagent that orchestrates — the stage-gate Executor, or a subagent spawned to run `parallel-phase` as Delegator — does its own work, merge and fan-in.

Any agent that splits a research question across subagents, whether the session or a subagent, splits it until each piece is narrow enough for one agent to answer with its own reads, and puts this sentence in every subagent's prompt: "Your job is one narrow investigation: do it yourself and spawn no subagents."

### Models and walls

Three lanes, every harness, sorted by **kind of work, not model height**: **workhorse** for implementation / parallel workers, **review** for pre-merge review axes and adversarial judgment, **design** for planning and architecture. Go slower or serial on walls; never invent a weaker substitute for a _review_ job — if waiting and serialising both fail, stop and say so rather than downgrading; and never promote a job to a taller lane it does not belong in. Managers must not background workers and end the turn without a disk handoff for fan-in (see model-policy § Manager / multi-step fan-out). Filling the lanes: on **Claude Code**, **Opus at effort `high`** for workhorse and review, **Fable at effort `low`** for design (`gate-planner`, `design-task`), and **Sonnet at effort `high`** for an extremely simple job; two trial types, `discrete-task` on Sonnet and `modest-task` on Opus at effort `medium`, take the small jobs model-policy § Trial types names. The spawn cannot set effort, so spawn the agent type whose frontmatter sets it (model-policy § Claude Code). Name the model on every spawn: a session on Fable makes an unnamed built-in subagent inherit Fable, the top price tier; on **Codex**, mid tier for workers and `codex exec` / top tier for review; on **Cursor**, workhorse = **Composer** (pinned, not merely preferred, because on Pro the Other-pool Terra/Sol models often die at spawn) and review = **Grok high** (prefer non-fast; high-fast if that’s the only high slug) — do **not** probe Sol/Opus first, and do not burn Grok on every trivial worker. See [`docs/agents/model-policy.md`](docs/agents/model-policy.md).

### The loop

1. Branch off `dev`: `feat/<slug>` (or `phase-N/<slug>` for a PLAN.md phase).
2. Red → green, one slice at a time. **Commit regularly as you accomplish work — a commit per green slice, not one commit at the end, and not only when asked.** Merging to `dev` is the gated step, not this one.
   - **`git add <paths>` does not scope the commit** — pre-commit runs `lint-staged` against `*` with `--no-stash --no-hide-partially-staged`, so every dirty file rides along, and staging part of a file commits the rest of it too. Before each commit `git status` must be clean of work you did not do (commit it separately or ask), and after `git reset`, re-read `git log -1` before recommitting — another session may have merged in between.
3. `pnpm verify` before every push — typecheck, lint, format, test (also on pre-push).
4. When the branch looks done: run the `pre-merge-review` skill → `docs/reviews/<branch>.md` (commit it on the feature branch). Deferred findings become tickets under `.scratch/carry-forward/issues/` (linked from Disposition). `pnpm issues:open` lists them anytime. **Do not skip this** — `pnpm merge-to-dev` only checks that the review file exists; it does not run the review.
5. Launch mini-loops for associated new tickets unless there's a valid reason to be defer them: delegate to a planner, then delegate the plan to an executor/orchestrator, then delegate to an independent reviewer.
6. **Ask before merging to `dev` but only when the task and associated tickets are done.** Never `pnpm merge-to-dev`, never `git merge` into `dev`, and never set `TBC_ALLOW_DEV_MERGE=1`, unless the user has explicitly asked to merge **after** the review file is written and they have had a chance to see the summary (a combined “review and merge” request is **not** enough — finish the review, stop, wait for a separate merge ask). When they ask: `pnpm merge-to-dev` is the only supported door — verify → review/ticket check → `git merge --no-ff` into `dev`. On `phase-N/*`, open `Blocks: phase-N` tickets require `--ack-open-blockers` (or close/re-block them first).
7. `main` only receives a merge from `dev` when a PLAN.md §14 phase gate is fully checked off in `docs/verification-log.md`.

### Gates

`pnpm verify` is required before every push (`.githooks/pre-push`) and direct commits to `main` are refused (`.githooks/pre-commit`) — merges only. Merging to `dev` goes through `pnpm merge-to-dev`; merge commits on `dev` without `TBC_ALLOW_DEV_MERGE=1` are refused by pre-commit. `git push --no-verify` / `git commit --no-verify` / `pnpm merge-to-dev --no-verify` / `TBC_ALLOW_DEV_MERGE=1` exist for spikes; never use them on `dev` or `main` for real work. CI (`.github/workflows/verify.yml`) runs the same `pnpm verify` on every push and can't be bypassed the same way, so it's the backstop if a local hook is skipped.
