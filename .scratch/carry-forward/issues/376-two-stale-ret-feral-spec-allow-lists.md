# 376 — Two stale ret/feral allow-lists still gate specs

Status: open
Filed: 2026-09-11
Found by: read-only investigation during the `spec-registry` stage-gate
Formerly: 371 on feat/spec-registry, renumbered 2026-09-12 to clear a
collision with `fix/sim-header-null-assertion`'s own 371. Commit messages
on this branch still name the old number; see
`.scratch/stage-gate/ledger-consolidation-and-merge-train/merge-order.md`
§ Ticket renumber map.

## What

Two allow-lists still name only `ret` and `feral`, though the engine's
`SpecId` union covers 11 specs and both item universes and EP weights exist
for all 11:

- `apps/web/server/routes.ts` — `const SPECS: readonly SpecId[] = ["ret", "feral"]`
- `packages/core/src/cli.ts` — the rejection message `unknown spec: … (known: ret, feral)`

Locate by grep, not by line number — line citations in this repo rot
(ticket 368).

## Why it matters

Both predate the all-DPS-specs pass, so they are stale rather than
deliberate. They are additional per-spec touch points nobody has been
counting: each new spec silently needs them edited too.

The CLI one may be **correct by accident** — the CLI can only rank specs it
has a raid-sim skeleton for, and only ret and feral have one on disk
(ticket 367). So the message may state a real limit while naming the wrong
reason. Establish which before changing it.

The web-server one is unexamined.

## Not claimed

Nobody has measured what breaks if either list is widened. Whether
`routes.ts` should list all 11, or derive from the same source the registry
uses, is an open design question.

## Suggested route

Fold into whatever registry lands from the `spec-registry` stage
(`.scratch/stage-gate/spec-registry/`) if that registry gives both a single
source to derive from. Deliberately out of scope for that branch.
