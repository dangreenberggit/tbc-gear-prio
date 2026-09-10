Status: open
Type: task
Origin: docs/reviews/feat-wowsims-reforge-catchup.md (Spec axis, S7)
Blocks: none
Blocked by: none

# `AGENTS.md`'s known-traps trigger list omits the new engine-pin trap

Relates to: ADR-0030; branch `feat/wowsims-reforge-catchup`

## What

That branch added a "Before moving the wowsims engine pin" section to
`docs/agents/known-traps.md` — the trap that arms `pnpm fetch:wowsimcli` 404s, a
nested `vendor/wowsimcli-feature/backend-reforge-.../` directory, three fork
gates exiting 2, and unpredicted regen paths being committed as expected.

`AGENTS.md:87` lists the actions that should send a reader to that file:

> **Before** a ported-engine-file edit, a scripted/generated file edit, filing a
> ticket, writing a review Disposition table, or starting the dev servers — or
> when a node/pnpm command fails strangely — read `docs/agents/known-traps.md`

Moving the engine pin is not in that list, so the new section is only reachable
by someone already reading the traps file for another reason. The trigger index
and the file it indexes have drifted apart on their first addition.

## Why it was not done on that branch

`AGENTS.md` is not in the branch's paths manifest, and the project rule is
explicit: propose changes to `AGENTS.md`, `CLAUDE.md` and skill files in chat
and wait for approval before editing, because those files steer every future
session. The executor flagged it and left it, which was the correct call.

## Suggested fix

Add "moving the wowsims engine pin" to the trigger list at `AGENTS.md:87`.

Proposed wording, for approval:

> **Before** a ported-engine-file edit, a scripted/generated file edit, moving
> the wowsims engine pin, filing a ticket, writing a review Disposition table,
> or starting the dev servers — or when a node/pnpm command fails strangely —
> read [`docs/agents/known-traps.md`](docs/agents/known-traps.md): the trap each
> of those actions arms, and the move that disarms it.

## Acceptance

- [ ] Wording approved in chat, per `AGENTS.md`.
- [ ] `AGENTS.md:87` names the engine-pin action, so every section of
      `known-traps.md` is reachable from the trigger list.
