Status: open
Type: task
Origin: docs/reviews/fix-75-82-review-tickets.md (domain + spec + adversarial axes, review of 6fb9f1c)
Blocks: none
Blocked by: none
Relates to: 05, 83

# `pnpm verify` does not catch a stale or hand-edited `packages/core/src/proto/*.ts`, so proto drift is CI-only

Ticket 83 replaced hand-copied enum constants in `packages/core/src/enchants.ts`
with the generated enums from `packages/core/src/proto/common_pb.ts`, on the
argument that a generated source cannot silently drift. That argument holds,
but the gate enforcing it is narrower than the fix implies.

## What is actually gated

CI regenerates and byte-compares, in `.github/workflows/verify.yml`:

```yaml
- run: pnpm run proto:generate
- run: git diff --exit-code -- packages/core/src/proto data/proto
```

`pnpm verify` runs none of it. Its chain is `codegen:json-types:check`,
`typecheck`, `lint`, `format:check`, `test`, `sim-defaults:check`,
`skeleton:check`, `boss-aliases:check`, `sync:atlasloot:verify-local`,
`atlasloot:regen:check`, `rep-tables:check`, `wowhead-prose:check`,
`mirrors:check`, `lock-merge:check` — nothing proto-related. There is no
`proto:generate --check`; the only proto `--check` is `fetch:protos:check`,
which checks the *vendored .proto pin*, not the generated TypeScript.

Verify with:

```bash
python -c "import json;print(json.load(open('package.json'))['scripts']['verify'])"
```

## Consequence

Edit `data/proto/common.proto` without re-running `pnpm proto:generate`, or
hand-edit a file under `packages/core/src/proto/`, and every local gate passes.
The mismatch surfaces only on push, and only if CI runs. Since ticket 83 made
`enchants.ts` read its enum values from that generated file at runtime, a stale
`common_pb.ts` is now a silent wrong-answer path, not merely stale codegen —
the exact failure class ticket 83 set out to close.

Today the ticket-83 test would catch a `RangedWeaponType` shift specifically,
because it pins real item ids from `data/items/index.json` against the enum
(confirmed: shifting the whole enum so test and production stay self-consistent
still fails the test). No other enum in that file has such a backstop.

## What to do

Add a check to the `pnpm verify` chain that fails on a generated-proto
mismatch. Two options, in preference order:

1. A `proto:generate:check` script mirroring the CI two-liner (regenerate to a
   temp dir, byte-compare, do not touch the working tree), added to `verify`.
   Note this makes `buf` a hard local dependency for every verify run — check
   whether that is acceptable before choosing it.
2. If `buf` cannot be required locally, a cheaper staleness gate: hash
   `data/proto/*.proto` and compare against a committed hash recorded at last
   generate, so an edited `.proto` with un-regenerated output fails fast.

Either way, keep the CI byte-compare — it is the stronger check and the
backstop if a local hook is skipped.
