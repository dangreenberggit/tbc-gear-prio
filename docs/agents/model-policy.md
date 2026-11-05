# Agent model policy: this repo's values

The policy is global: `~/.claude/model-policy.md`, staged in
`docs/agents/home/model-policy.md`. This file holds only this repo's
values, under the global file's section names. For anything a pointer
names that this file does not hold, read the same section of the global
file.

## Budget the round at the phase boundary

Estimate: implementation workers on this repo have run roughly 100k–240k
tokens each (five measured workers, 2026-08-11, fix-round worker table in
`.scratch/set-bonus-value/orchestration-observations-2026-08-12.html`).
Multiply by slice count, add fan-in. Those five workers ran Fable
(§ Lane is per job, not per parent). No Opus-at-`high` worker has been
measured, so on Claude Code the estimate is a hypothesis, untested.

## Trial types

That `pnpm verify` writes no tracked file was checked on 2026-10-03: every
step in `package.json`'s `verify:steps` is a check or a test run, and
`git status --porcelain --untracked-files=no` printed nothing after a run.
Check again when verify gains a step.

This repo adds to the "Always `general-task`" list: any action
`docs/agents/known-traps.md` names a trap for, except that `modest-task`,
`glm-task` and `glm-flash-task` may run a `node` / `pnpm` / test command
that writes no tracked file, and `discrete-task` may run a named check
command that writes no tracked file, each with `node --version` run in the
same shell command and its v22 output confirmed before the result is used;
any edit under `data/`; any edit under `vendor/tbc-new-fork` (reads there
are workhorse jobs like any other); `.githooks/` and `scripts/`.

## GLM worker types

- **Card limits.** GLM workers install no packages (owner, 2026-10-23), so
  give them a checkout whose packages are installed. No agent in a
  session on this card can run `gh`, Sonnet included, and `git push` to
  GitHub is expected to fail too (untested), because
  `~/.claude_router/settings.json` denies reads of `~/.config/gh` for the
  whole session (`grep -n config/gh ~/.claude_router/settings.json`). So
  `gh` is no reason to pick a Sonnet type there. Push from the "Claude"
  card. The card's sandbox allows writes only under `~/.npm` and
  `~/.cache`, so `pnpm wt:pair` probably fails there too (hypothesis,
  untested;
  `docs/reviews/feat-glm-worker-policy.md`, "Not a defect").

## Stage-gate seats

The `stage-gate` skill fills its seats from these lanes: Planner = design
(Fable at effort `low`), Executor = lead (Opus at effort `high`), and
Reviewer and SME = review (Opus at effort `high`). Each seat's agent definition sets its model and
its effort in frontmatter.

The Executor runs on Opus at effort `high` because of the kind of work
it does. It decides adapt-vs-flag-vs-stop wherever the plan
and reality disagree, and a plan is underspecified by construction. The
failure mode there is a silent paper-over, which is a judgment failure and
not a throughput one. The Executor's `parallel-phase` workers run
`simple-task` for an extremely simple slice and `general-task` for every
other slice. Every seat hands its workhorse jobs to the workhorse types in
blocks (§ Workhorse jobs).

The orchestrator is the interactive session. The owner picks its model and
effort per session. The skill names every seat's model at
the call site, and each seat self-checks
(`WRONG_MODEL: <name>` → respawn with the model the skill's seat table
names, never continue).
