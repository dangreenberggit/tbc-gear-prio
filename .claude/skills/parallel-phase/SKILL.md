---
name: parallel-phase
description: Parallel independent slices on a feature branch. Use when a phase or branch has tasks that can run independently (different kinds of work, mostly disjoint files), when the user asks to fan out / delegate / orchestrate workers, or when another skill needs worktree-isolated parallel coding.
---

# Parallel phase

Fan out independent slices to isolated workers, merge them back onto the **feature branch**, then keep the normal land loop. Harness-agnostic: the contract is git + handoffs; Cursor / Claude / Codex are adapters.

## When to fan out

Fan out only when slices are **mostly independent**: different kinds of work, and mostly different files or clear regions of a file. If two slices would thrash the same module, keep them sequential.

Cap concurrency around **3–5** unless a scripted cloud orchestrator is driving the tree. Prefer fewer, broader workers over many tiny ones.

## Roles

| Role | Job |
| --- | --- |
| **Delegator** | Partitions work, writes worker prompts / handoff expectations, waits for handoffs, **prefers to merge** (it already knows how the pieces fit) |
| **Worker** | One isolated checkout + branch; implements one slice; returns one handoff; never merges to `dev` / `main` |
| **Merger** (optional) | Same merge job when the delegator’s context is full, the session died, or merges are queued separately |

**Default:** the delegator merges. **Fallback:** spawn a merger with the partition plan, every worker handoff, path ownership, and conflict policy.

## Steps

1. **Partition** — On `feat/<slug>` or `phase-N/<slug>`, list slices. For each: goal, `pathsAllowed` / `pathsForbidden`, acceptance, verify recipe. Minimize path overlap.
2. **Pick adapter** — Detect the harness; load only that file under [adapters/](adapters/). Unknown harness → [adapters/agnostic.md](adapters/agnostic.md).
3. **Spawn workers** — One isolated worktree or clone per slice, branched from the **feature-branch HEAD** (not `main`/`dev` alone). Give each worker the handoff template and its path scope.
4. **Collect handoffs** — Each worker ends with [handoff-template.md](handoff-template.md). No sibling chat for implementation; the delegator relays upstream context via `dependsOn` when a later slice needs an earlier result.
5. **Merge onto the feature branch** — Delegator (preferred) or merger: merge each worker branch into the feature branch with an explicit conflict policy. Run `pnpm verify` on the **integrated** tip. Per-worker green is not enough.
6. **Land once** — `pre-merge-review` → `pnpm land`. Workers and mergers do not land to `dev`.

### Completion criteria

- Every accepted slice has a handoff with `Status` and `Branch`.
- Feature branch contains the merged result; worker branches are optional leftovers.
- `pnpm verify` passed on the feature-branch tip after fan-in.
- No worker merged to `dev` or `main`.

## Do not

- Run parallel coding workers on one shared dirty checkout.
- Let workers `pnpm land` or merge into `dev`/`main`.
- Skip post-merge `pnpm verify`.
- Use peer “agent teams” as the default for parallel *file edits* unless path ownership is strict and the harness isolates checkouts.

## Adapters

| Harness | File |
| --- | --- |
| Plain git / unknown | [adapters/agnostic.md](adapters/agnostic.md) |
| Cursor | [adapters/cursor.md](adapters/cursor.md) |
| Claude Code | [adapters/claude.md](adapters/claude.md) |
| Codex | [adapters/codex.md](adapters/codex.md) |
