Status: closed
Closed: 75d3f87 (test coverage completed in d114e91)
Type: bug
Origin: fresh-context review of tickets 111/112, 2026-08-11 (axis 1 finding A3)
Blocks: none
Blocked by: none

# A `quality: null` palette entry passes the fill cap while `undefined` silently drops

`gemsForQuality` (`packages/core/src/gems.ts:49`) compares `entry.quality <=
maxQuality`. For a well-formed `data/gems/palette.json` every entry carries a
number and the comparison is sound. For an injected palette (tests, or a direct
caller building its own `GemEntry[]`):

- `quality: null` → `null <= 3` is `true` → the entry **passes the cap**;
- `quality: undefined` → `undefined <= 3` is `false` → the entry **silently
  drops** from the fill palette.

Two malformed inputs, two opposite outcomes, neither reported. The committed
palette is regenerated with `quality` on every entry (ticket 111 slice 1), so
production is unaffected today; the hole is for palettes that bypass the
generator.

## The decision needed before the fix

Drop-vs-throw: should a malformed entry be excluded (quiet, matches the
`undefined` arm today) or should `gemsForQuality` throw on a non-number
`quality` (loud, matches the repo's "a net that fabricates a verdict is worse
than no net" lesson in `.scratch/handoffs/set-bonus-resolution-2026-08-10.md`)?
Pick one, make both arms do it, and pin it with a unit test in
`packages/core/test/items-gems.test.ts` covering `null`, `undefined`, and a
string.

## Acceptance criteria

- [x] `null` and `undefined` quality take the same documented path.
- [x] The chosen behaviour is asserted directly in a unit test.
- [ ] `pnpm verify` green. — not run in full on this worktree: three
      pre-existing failures (`vendor/wowsims/*` not synced in this worktree)
      are unrelated to this fix; typecheck, lint, and every gem-area test file
      pass. See the parallel-phase handoff for the exact `pnpm verify`
      command and its output.

## CLOSED, 2026-08-12

Commits `75d3f87` and `d114e91` on `wt/issue1-gem-fixes` (issue #1 cleanup).

Decision: **throw**, loud over quiet. `gemsForQuality` (`packages/core/src/gems.ts`)
now throws when an entry's `quality` is not a `number`, covering `null`,
`undefined`, and a string — one path for every malformed value, pinned in
`packages/core/test/items-gems.test.ts` ("treats null and undefined quality
alike, loudly, not as opposite outcomes (ticket 114)").

Folded into the same commit as the chokepoint fix (review-corrections.md
item 5): the rare-gem fill cap moved off call-site discipline into a new
`fillEligibleGems` accessor in `gems.ts`, so `candidate-gems.ts`'s
`gemContext` can no longer build a fill palette without the cap applied.
