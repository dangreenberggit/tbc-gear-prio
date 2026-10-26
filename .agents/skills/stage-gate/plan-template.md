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

`K1` is the only chunk with steps when this plan is first written: the
first piece that is worth building on its own, up to about five steps that
share files. The Steps, Claims register and Paths manifest above then cover
`K1` alone. After `K1` runs, a `gate-planner` with `next:` adds each later
chunk's steps, claims and paths (`.claude/agents/gate-planner.md`
§ Next chunk). A step
whose result later steps must reason about goes in the same chunk as those
steps; when this conflicts with the size limit, keep the steps together and
name the dependency on the chunk line. List it as `K1: steps 1–4`.

## Backburner

Every later chunk, one line each, to be planned from `K1`'s execution
report: `K2: <goal in one sentence> — needs from K1: <result or file> —
open: <what must be learned or ruled first, or none>`. A line here is not a
step. The reviewer checks that no `K1` step depends on a Backburner line
and that the lines together still solve the brief. Write "none" when the
brief fits in `K1`.

## Verify recipe

The exact commands that prove the whole plan landed (at minimum
`pnpm verify`), plus any plan-specific checks.

## Out of scope

What this plan deliberately does not do, so the executor does not
helpfully do it.
