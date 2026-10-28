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

A step of a kind that `docs/agents/stage-gate-project.md` § Planner
names includes the lines that section gives.

## Paths manifest

Every file this plan creates or modifies. If the executor should fan out,
add a **Partition** subsection: slices with `pathsAllowed` /
`pathsForbidden` per the parallel-phase rules — no path in two slices,
shared manifests get exactly one owner.

## Execution chunks

A chunk is a piece worth building on its own, which one `gate-executor`
builds after the chunks before it. List every chunk, in build order.
The first chunks have steps: `K1: steps 1–4`. Each later chunk is one
line: `K2: <goal in one sentence> — needs from K1: <result or file>`.
The Steps, Claims register and Paths manifest above cover the chunks
with steps. A step whose result later steps must reason about goes in
the same chunk as those steps. A new plan for a later chunk starts its
list at that chunk, and numbers its steps and claims after the last
ones of the plan before it.

## Verify recipe

The exact commands that prove the whole plan is complete (at minimum the
project's gate command, `docs/agents/stage-gate-project.md` § Planner),
plus any plan-specific checks.

## Out of scope

What this plan deliberately does not do, so the executor does not
helpfully do it.
