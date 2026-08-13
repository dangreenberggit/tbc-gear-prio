Status: open
Type: bug
Origin: docs/reviews/feat-set-bonus-value.md round 5 (adversarial 5-A2, spec 5-S2)
Blocks: none
Blocked by: none

# `ENGINE_VERSION` not bumped though round 5 changed what gems get seated

`packages/core/src/content-hash.ts:52` is `5` at both ends of the round-5
range. `git diff c7e57c4..5d5dffa -- packages/core/src/content-hash.ts` is
empty.

Round 5 changed ranking behaviour: `ec56939` threads `input.spec` into
`gemContext`, and `SPEC_PREFERRED_METAS` has only a `ret` entry, so
`bestGemForSocket` now returns `undefined` for feral meta sockets where the
default previously seated Relentless 32409.

`spec` **is** a hashed input, but that only separates feral from ret. It does
not separate old-feral from new-feral. A feral ranking cached before this
round is served verbatim with the old meta-seated numbers, and the new
`emptyMetaSocket` disclosure never renders on it.

The constant's own docstring states the rule this breaks:

> Bump when a ranking-logic change should invalidate every cached result.
> Without it a bug fix serves stale rankings forever.

This is the same defect class as round-4's **4-A4**, fixed there by bumping
4 -> 5 (`c7e57c4`). Recurring, not duplicate.

Note also that no round-5 artifact mentions `ENGINE_VERSION` at all; the docs
correctly claim ret is byte-identical, but nothing records that feral's
numbers moved — which is the half that needs the bump.

## Fix

Bump `ENGINE_VERSION` to 6, or record in a committed artifact why feral cache
staleness is acceptable here. Do this together with ticket 139, since that fix
also changes feral output.
