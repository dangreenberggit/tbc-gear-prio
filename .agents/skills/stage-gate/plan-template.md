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

## Paths manifest

Every file this plan creates or modifies. If the executor should fan out,
add a **Partition** subsection: slices with `pathsAllowed` /
`pathsForbidden` per the parallel-phase rules — no path in two slices,
shared manifests get exactly one owner.

## Verify recipe

The exact commands that prove the whole plan landed (at minimum
`pnpm verify`), plus any plan-specific checks.

## Out of scope

What this plan deliberately does not do, so the executor does not
helpfully do it.
