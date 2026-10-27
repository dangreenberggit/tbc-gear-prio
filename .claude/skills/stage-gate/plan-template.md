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

A step that changes what the Upgrades tab renders says how it is looked
at. The default is a `Visual check:` line: the fixture names to look at
(from `data/tab-fixtures/`) and the one sentence to judge against. The
executor opens the fixture's link in a browser pane where the harness has
one (the Claude desktop app's Browser pane; untested under T3 Code or WSL
mode), and otherwise looks at the PNGs from `pnpm tab-fixtures:smoke`.
Only the browser pane covers hover and widths other than 1280. No live
sim runs. Use a `Visual acceptance:` block instead only when the ticket
must close on recorded evidence (captures at fixed widths, axe results,
measured facts, a pre-run state, or an independent `gate-visual`
verdict), or when a step needs hover or another width and the harness has
no browser pane.
The block names the state (`pre-run` / `post-run`), widths, selectors to
capture, interactions, facts to record, and the sentence; the manifest
schema is in the header comment of `scripts/tab-harness/test-review.mjs`.

## Paths manifest

Every file this plan creates or modifies. If the executor should fan out,
add a **Partition** subsection: slices with `pathsAllowed` /
`pathsForbidden` per the parallel-phase rules — no path in two slices,
shared manifests get exactly one owner.

## Execution chunks

Each chunk is a piece worth building on its own, which one
`gate-executor` builds after the chunks before it. List each chunk that
has steps in this plan, as `K1: steps 1–4`. The planner decides from its
plan of the whole job which chunks get steps now
(`.claude/agents/gate-planner.md` § Inputs). The Steps, Claims register
and Paths manifest above cover those chunks only. A step whose result
later steps must reason about goes in the same chunk as those steps.

## Backburner

Every chunk without steps, one line each. After the chunks before it
run, a `gate-planner` with `next:` adds its steps, claims and paths from
their execution reports (`.claude/agents/gate-planner.md` § Next chunk):
`K3: <goal in one sentence> — needs from K2: <result or file> — open:
<what must be learned or ruled first, or none>`. A line here is not a
step. The reviewer checks that no step depends on a Backburner line and
that the chunks and lines together still solve the brief. Write "none"
when every chunk has steps.

## Verify recipe

The exact commands that prove the whole plan landed (at minimum
`pnpm verify`), plus any plan-specific checks.

## Out of scope

What this plan deliberately does not do, so the executor does not
helpfully do it.
