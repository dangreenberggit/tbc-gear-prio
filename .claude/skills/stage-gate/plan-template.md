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
executor looks with `pnpm tab-fixtures:smoke` or the fixture's link in the
Browser pane, which also covers hover and widths other than 1280; no live
sim runs. Use a `Visual acceptance:` block instead only when the ticket
must close on recorded evidence: captures at fixed widths, axe results,
measured facts, a pre-run state, or an independent `gate-visual` verdict.
The block names the state (`pre-run` / `post-run`), widths, selectors to
capture, interactions, facts to record, and the sentence; the manifest
schema is in the header comment of `scripts/tab-harness/test-review.mjs`.

## Paths manifest

Every file this plan creates or modifies. If the executor should fan out,
add a **Partition** subsection: slices with `pathsAllowed` /
`pathsForbidden` per the parallel-phase rules — no path in two slices,
shared manifests get exactly one owner.

## Execution chunks

Group the numbered steps into chunks that one executor can finish in one
sitting: one ticket, or up to about five steps that share files. List each
chunk as `K1: steps 1–4` and so on. A step whose result later steps must
reason about goes in the same chunk as those steps; when this conflicts
with the size limit, keep the steps together and name the dependency on
the chunk line. One chunk is fine for a small plan.

## Verify recipe

The exact commands that prove the whole plan landed (at minimum
`pnpm verify`), plus any plan-specific checks.

## Out of scope

What this plan deliberately does not do, so the executor does not
helpfully do it.
