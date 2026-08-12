Status: closed
Type: docs
Origin: pre-merge review of `feat/set-bonus-value`, round 3, 2026-08-12 (standards axis, 3-St2 / 3-St3 / 3-St4)
Blocks: none
Blocked by: none

# Ticket 117 changed the behaviour and left four descriptions asserting the old one

Ticket 117 made meta repair draw from the rare-capped palette: both `repairMeta`
call sites (`packages/core/src/rank.ts:467` and `:1483`) now pass
`gems.fillPalette`. The `fillPalette` docstring at
`packages/core/src/candidate-gems.ts:40-46` describes the new behaviour
correctly. Four other places still describe the old behaviour, and one comment
block was never about the line it sits on. Each is a comment or a name that now
states the opposite of what the code does, which is the specific failure the
comment policy exists to prevent.

**1. `packages/core/src/gems.ts:47`** — the `gemsForQuality` docstring reads
"(ticket 111 — the auto-fill path caps rarity; meta repair does not)". Meta
repair now does. Two files in the same change disagree on the one fact a reader
opens that docstring for.

**2. `packages/core/src/rank-report.ts:340-346`** — two comment blocks are
stacked above `packageLineText`. The first ("carries no figure, and the
contradiction it reconciles is visible by default (carry-forward 96)") describes
`curatedPointer`, declared twelve lines below, and is false about the line it
sits on: `formatPackageMembershipLine` carries several figures. The second says
the line is "Rendered whenever a measured, positive package claims this row", but
the code renders any non-empty `packages`, and ADR-0024's 2026-08-11 amendment
says so explicitly — "Negative figures render too: a package that measured badly
is a measurement, not a secret."

**3. `packages/core/test/candidate-gems.test.ts:143`** — the test is titled
"keeps the full palette for meta repair — only the fill palette narrows". Ticket
117 removed that behaviour. The test asserts only that `ctx.palette` is
unnarrowed, so it still passes while its name promises the opposite of the truth.

**4. A finding to resolve while fixing 3** — no gem-selection path reads
`ctx.palette` any more. Its only remaining consumer is `rank.ts:527`'s
`gemPaletteIds`, which feeds the content hash. So the cache key is derived from
the uncapped palette while selection uses the capped one: a change confined to
epic gems shifts the content hash without changing any output. Harmless
(over-invalidation, never under-), but decide whether the hash should key off
`fillPalette` instead, and rename or retitle the test to match whatever the field
is actually for.

## Acceptance

- [x] `gems.ts:47` describes the rarity cap as applying to both paths.
- [x] The two comment blocks at `rank-report.ts:340-346` each sit above the code
      they describe, and neither claims the line renders only for positive
      packages.
- [x] `candidate-gems.test.ts:143`'s name matches what it asserts.
- [ ] A decision is recorded on whether `gemPaletteIds` should hash the capped
      palette.

## Closing notes

Fixed in commit (this branch), items 1-3:

- `gems.ts:47` (`gemsForQuality` docstring): reworded to say ticket 117
  extended the rarity cap to both the auto-fill path and meta repair, both
  now routed through `GemContext.fillPalette` — matching the correct
  `fillPalette` docstring at `candidate-gems.ts:40-46`.
- `rank-report.ts:340-346`: removed the misplaced block that described
  `curatedPointer` (declared 12 lines below) while sitting above
  `packageLineText`; `curatedPointer`'s own doc comment already lives with
  `formatCuratedPackagePointer` in `rank-report-rules.ts`. Rewrote the
  remaining comment to say `formatPackageMembershipLine` renders for any
  non-empty `packages`, including negative ones, per ADR-0024's "negative
  figures render too" amendment — matches the function's actual guard
  (`pkgs.length === 0` only, no sign check).
- `candidate-gems.test.ts:143`: renamed from "keeps the full palette for meta
  repair — only the fill palette narrows" (the old, now-false claim) to
  "keeps ctx.palette uncapped for gemPaletteIds provenance — only fillPalette
  narrows", and added an inline comment pointing at `rank.ts`'s
  `gemPaletteIds` as the sole remaining consumer. Assertion left unchanged —
  still meaningful coverage of that provenance fact, not deleted.

Item 4 (the `gemPaletteIds`/content-hash question) is explicitly out of scope
for this pass per the assigning instructions — left open here, undecided, for
a separate ticket/decision.
