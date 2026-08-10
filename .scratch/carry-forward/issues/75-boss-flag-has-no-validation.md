Status: closed
Type: task
Origin: docs/reviews/phase-2-trust.md (adversarial axis)
Blocks: phase-3
Blocked by: none
Resolution: added `bossesInPool` (pool.ts) and the matching validate-and-list
  block in cli.ts, scoped to --raid when given. 2026-08-09.

# `--boss` has no validation, so a typo silently returns an empty shortlist

`cli.ts` validates `--raid` against `zonesInPool(pool)` (around line 280) and
prints "known zones" plus exits 2 on a miss. `--boss` gets no equivalent —
it's parsed straight into `out.view.boss` and compared exactly by
`matchesBoss` in `view.ts`.

Trigger: `--raid Karazhan --boss "Prince Malchezar"` (the real spelling is
`Prince Malchezaar`). `applyView` filters every row out; the CLI prints the
baseline and hit banner, then no rows, exit 0 — indistinguishable from "this
boss genuinely drops no upgrades for you."

## What to do

Add the same membership-check-and-list-known-values pattern `--raid` already
has, scoped to bosses within the selected raid (or all bosses in the pool if
`--raid` wasn't given). Reuse whatever enumerates boss names for
`zonesInPool` if one exists, or add the equivalent.


## What was done (2026-08-09)

Added `bossesInPool(pool, zone?)` to `pool.ts`, mirroring `zonesInPool`, and
the same validate-then-list-known-values block in `cli.ts` immediately after
the `--raid` check, so a bad raid still reports first.

Two details the ticket did not specify, decided here:

- **Scoping.** When `--raid` is given the suggestion list is that raid's
  bosses only; without it, every boss in the pool. An unscoped list is too
  long to work as a "did you mean" for a typo made inside one raid.
- **Enumerate under the same condition the filter uses.** `matchesBoss`
  requires the zone to match too when one is given, so `bossesInPool` applies
  the identical zone condition. Enumerating unscoped while filtering scoped
  would list names as known that filter to nothing -- the exact defect this
  ticket is about, one level down. A test asserts every name the enumerator
  returns actually matches at least one row.

Tests in `pool.test.ts` cover a boss on a secondary `sources` entry, a
zoneless kind (badge), a bossless raid source, and one boss name shared by two
zones. No CLI-level test: `main()` shells out to `wowsimcli`, which is why
`cli-shortlist.test.ts` already tests through `applyView` rather than `main`.
The validation runs before any sim call, so it is reachable on the offline
path.

`pnpm verify`: 469 tests pass, typecheck/lint/format clean. `sim-defaults:check`
reports DRIFT on `data/presets/feral/buff-defaults.json`, but that reproduces
on clean `HEAD` with these changes stashed and is a local `vendor/` sync
condition (`vendor/` is gitignored); the committed artifact is unmodified here.
