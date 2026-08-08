Status: open
Type: task
Origin: docs/reviews/fix-carry-forward-backlog.md (standards S4)
Blocks: none
Blocked by: none

# `buildOfflineRecordings` takes seven positional params, four of them a clump

`packages/core/src/fixtures/report-events-offline.ts:99`. Ticket 38 correctly
deduplicated the two offline recording builders; the shared function it
extracted carries the union of both call sites' knobs positionally:

```ts
export function buildOfflineRecordings(
  raw: OfflineRawFixture,
  character: CharacterRef,
  spec: SpecId,
  route: FightSummary["route"],
  confidence: number,
  notFoundMessage: (character: CharacterRef, raw: OfflineRawFixture) => string,
  killedAt?: string
)
```

Call sites read as
`(raw, SLAMALTMAN_REF, "ret", "ranked", 1, () => "…", "2026-07-01…")` — the
types are not apparent at a glance, and `route`/`confidence`/`notFoundMessage`/
`killedAt` always travel together as one "which route is this" decision.

Judgement call, not a correctness risk — the dedup itself was the right move
and is not in question here.

## Also: `notFoundMessage` is a callback for two constant strings

Mild Speculative Generality. Both call sites barely use its
`(character, raw)` arguments; the ranked one is
`() => "slamaltman not found in raw fixture"`. A `routeLabel: string` plus one
shared template would cover both.

## Done when

- The four route-shaped params travel as one options object (or equivalent),
  so call sites name what they are passing.
- `notFoundMessage` is either a plain label or genuinely uses its arguments.
- `pnpm verify` stays green; no behaviour change intended.
