Status: closed
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

## Closed 2026-08-06

`packages/core/tsconfig.test.json` (a `noEmit` project over `test/**/*.ts`,
added to root `tsconfig.json` references) now makes `npx tsc --build` /
`pnpm typecheck` cover the test suite. That wiring, plus 3 of the 4 fixture
fixes below, was already on disk from a prior unfinished pass on this ticket;
this pass measured the remaining state and finished it.

The ticket's "18 errors in 3 files" figure was stale by the time this ticket
was picked up — re-measured via `npx tsc --build` (after the partial wiring
above) at **9 errors in 3 files**:

- `packages/core/test/pool-hardening.test.ts` (7 errors) — two distinct
  causes, not one:
  - The test-local `TwoHopEntry` type (line 43) was missing a `boss: string`
    field that `data/two-hop/ret-tokens.json` actually carries and the test
    reads (`map!.boss`, line ~696). Added the field — an incomplete hand
    -written type, not a union-narrowing issue.
  - Five reads of `.zone` / `.boss` / `.token` off the `ItemSource` union
    (`PoolEntry.source` / `UniverseEntry.sources[]`) without narrowing which
    variant was in hand. Added a local `hasZone` type guard
    (`source.kind === "raid" || source.kind === "token"`) for the zone/boss
    reads, and a `kind !== "token"` narrow before the `.token` read. No casts.
- `packages/core/test/rank.test.ts:841` — `{ kind: "rep" }` was missing the
  required `faction` / `standing` fields. Filled in real values
  (`"The Sha'tar"` / `"Exalted"`) rather than reaching for shoehorn — two
  required fields on a small union member didn't meet the "large object, few
  relevant fields" bar the `migrate-to-shoehorn` skill sets for that tool.
- `packages/core/test/view-gate.test.ts:72` — same `exactOptionalPropertyTypes`
  problem already fixed in `rank.test.ts` and originally solved in
  `packages/core/src/fixtures/report-events-offline.ts:93`: an object literal
  assigned `enchant: spec.enchant` where `spec.enchant` is
  `number | undefined` but `LoggedItem.enchant` is optional-but-not-undefined.
  Replaced with the same conditional-assignment idiom (`if (spec.enchant)
  item.enchant = spec.enchant;`).

One more failure surfaced only after the above typechecked clean and
`pnpm verify` ran end to end: `rank-report.test.ts`'s byte-identical golden
test (`renders a byte-identical document for a fixed ranking`) failed on
content, not types. Cause: the handoff's new `ranking(items)` helper builds
its `Ranking` with `cutoff: CUTOFF` (`{ absDps: 3.4, pct: 0.15 }`, the real
literal-typed constant), where the fixture it replaced had hardcoded
`cutoff: { absDps: 5, pct: 0.5 }` — a value `Cutoff`'s literal type can never
actually hold (confirmed: assigning that literal to a `Cutoff`-typed binding
fails `tsc`). `rank-report.ts` renders `Cutoff ${absDps} DPS / ${pct}%` into
the document, so the correct cutoff text is longer, moving the pinned
digest/length. Repinned to the newly measured values (digest
`34d6896269904120abced85d1b9591d07be2a63324451f59fdd3d2689afe0546`, length
`10785`), with a comment explaining the delta.

Acceptance check performed as specified: temporarily set
`packages/core/test/caps.test.ts`'s `assumedRace: "RaceBloodElf"` to
`assumedRace: "BloodElf"` and ran `npx tsc --build --force`, which failed with
`error TS2322: Type '"BloodElf"' is not assignable to type 'Race | undefined'`
at that line — confirming the gate now catches this class of tautology. The
literal was reverted immediately after; `npx tsc --build --force` was
re-run and returned clean (exit 0) before continuing.

Verified: `pnpm verify` green end to end (codegen check, `tsc --build`,
`eslint .`, `prettier --check .`, `vitest run` — 371 passed / 2 todo across
32 files, `skeleton:check`, `mirrors:check`).
