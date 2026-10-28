# Plan — <slug>

Fill every section; a section with nothing to say says "none". The
reviewer keys off the Claims register; the executor keys off Steps and the
Paths manifest.

## Goal

One paragraph: what exists when this plan is done, as observable behavior.

## Approach

The chosen approach and the strongest alternative you rejected, with the
real reason it lost. The reviewer will attack this choice.

## Claims register

Every causal or factual claim the plan relies on, one row each.
`Load-bearing: yes` when refuting the claim invalidates the approach, not
just one step.

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | <claim> | yes/no | `<command a reader can re-run>` or `hypothesis, untested` |

## Steps

Numbered. Each step: action, files touched, a checkable acceptance
criterion (a command or an observable), and the claims it depends on
(C-ids).

A step of a kind that `docs/agents/stage-gate-project.md` § Project seats
names carries the lines that section gives.

## Paths manifest

Every file this plan creates or modifies. If the executor should fan out,
add a **Partition** subsection: slices with `pathsAllowed` /
`pathsForbidden` per the parallel-phase rules — no path in two slices,
shared manifests get exactly one owner.

## Execution chunks

Each chunk is a piece worth building on its own, which one
`gate-executor` builds after the chunks before it. List each chunk that
has steps in this plan, as `K1: steps 1–4`. `K1` always has steps. The
planner decides from its plan of the whole job which later chunks get
steps now
(`.claude/agents/gate-planner.md` **Whole job first**). The Steps, Claims register
and Paths manifest above cover those chunks only. A step whose result
later steps must reason about goes in the same chunk as those steps.

## Backburner

Every chunk without steps, one line each. After the chunks before it
run, a `gate-planner` with `next:` adds its steps, claims and paths from
their execution reports (`.claude/agents/gate-planner.md` § Next chunk):
`K3: <goal in one sentence> — needs from K2: <result or file> — open:
<what must be learned or ruled first, or none>`. A line here is not a
step; the reviewer's check **The approach**
(`.claude/agents/gate-reviewer.md`) checks the steps against these
lines. Write "none" when every chunk has steps.

## Verify recipe

The exact commands that prove the whole plan is complete (at minimum the
project's gate command, `docs/agents/stage-gate-project.md` § Hand off),
plus any plan-specific checks.

## Out of scope

What this plan deliberately does not do, so the executor does not
helpfully do it.
