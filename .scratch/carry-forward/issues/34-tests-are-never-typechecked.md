Status: open
Type: bug
Origin: `docs/reviews/phase-2-disclosure-and-caps.md` Adversarial finding A4
Blocks: none
Blocked by: none

# `pnpm verify` never typechecks the test suite

`packages/core/tsconfig.json` sets `"include": ["src/**/*.ts", "src/**/*.json"]`
and the root `tsconfig.json` only references that project. So `pnpm typecheck`
(`tsc --build`) never looks at `packages/core/test/**`. Every test file is
type-unchecked in CI and locally.

## How it surfaced

A test on `phase-2/disclosure-and-caps` passed `{ assumedRace: "BloodElf" }`
where the `Race` union (`packages/core/src/types.ts:21`) only admits the
`"RaceBloodElf"` prefixed form. It typechecked clean, ran green, and asserted
`toBe("BloodElf")` — confirming the same wrong string it passed in. A tautology
that no gate could catch. Fixed on that branch; the hole that let it through
is this ticket.

This is the same class of failure AGENTS.md § Types from JSON warns about — a
check that reads as rigour and proves nothing.

## Measured blast radius

Adding a test-inclusive project surfaces **18 errors in 3 files** that exist on
`dev` today, unrelated to any one branch:

```bash
# with a tsconfig including packages/*/test/**/*.ts
npx tsc -p tsconfig.tests.json --noEmit
```

- `packages/core/test/rank-report.test.ts` — builds `Ranking`/`Assumptions`
  literals missing required fields (`maxPhase`, `seeds`, `iterations`, `race`,
  `presetId`), and assigns `5` / `0.5` to the literal-typed `Cutoff` fields
  (`3.4` / `0.15`).
- `packages/core/test/pool-hardening.test.ts` — reads `.zone` / `.boss` off a
  bare `ItemSource` without narrowing the `badge` variant.
- `packages/core/test/rank.test.ts` — same `Cutoff`/partial-literal shape.

Most look like genuinely loose test fixtures rather than real defects, but that
is the point: nobody has ever been told.

## Why it was not fixed in place

18 errors across 3 files, all pre-existing, is its own change — folding it into
a caps/disclosure branch would bury an unrelated 3-file refactor inside a
ticket about hit caps.

## Done when

- Test files are typechecked by `pnpm verify` (a `tsconfig.test.json` project
  added to the root references, or the existing project widened).
- The 18 errors are fixed — preferring real types over `as` casts, and
  `@total-typescript/shoehorn` for genuinely partial fixtures.
- A deliberately wrong literal (e.g. `assumedRace: "BloodElf"`) fails `pnpm verify`.
