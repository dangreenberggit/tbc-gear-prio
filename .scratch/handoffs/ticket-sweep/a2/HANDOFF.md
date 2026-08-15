# Worker handoff

## Status
success

Scope was exactly "v1 half only" per the prompt: drawer disclosure data +
one pinning test. Both are done and tested. v2 was correctly not built.
One known gap noted below (last-mile render wiring, out of this worker's
path scope) and one pre-existing, unrelated `pnpm verify` flake also noted.

## Branch
- Main repo: `feat/sweep-tab-tickets` (no new branch created, as instructed)
- Fork (`vendor/tbc-new-fork`): `w/a2-162-v1`

## Base
- Fork: spawned at `adb0d135336a26eab613215fa85b1265d7ce2e5d` · confirmed via
  `git -C vendor/tbc-new-fork rev-parse HEAD` before branching · corrected: no
- Main repo: confirmed on `feat/sweep-tab-tickets` via
  `git -C . rev-parse --abbrev-ref HEAD` · corrected: no (did not create or
  switch main-repo branches, per instructions)

## What I did
- Fork: added `epWeightsSourceFor(spec)` to `data/data.ts`, exposing the
  `source`/`pin` fields already present in each `*.ep-weights.json` (were
  previously discarded — `epWeightsFor` only read `.weights`).
- Fork: extended `buildStandingAssumptions` in `engine/disclosure.ts` with
  an optional `EpWeightsSourceDisclosure` param; when given, emits a new
  `"ep-weights-source"` standing-assumption line naming the file and pin.
  Optional so the function stays a byte-for-byte port when the param is
  omitted (matches the file's own "PORTED, unchanged" provenance note as
  closely as an intentional new behaviour can).
- Fork: added optional `Deps.epWeightsSource` to `engine/rank.ts`, threaded
  into the `buildStandingAssumptions` call inside `rankUpgrades` so every
  `Ranking.assumptions.standing` carries the line when the caller supplies a
  source.
- Fork: wrote `engine/ep-weights-v1.test.ts` — 3 tests pinning: (1)
  `epWeightsFor` returns the committed vector independent of a differing
  page-set vector; (2) the drawer line names both file and pin when a
  source is passed; (3) the line is omitted, not synthesized wrong, when no
  source is passed.
- Fork: wrote `engine/test-ts-loader.mjs`, a small Node ESM loader so the
  test file runs under plain `node --test` — the fork has **no test runner
  at all** (checked: no `vitest`/`jest` in `package.json`, no test binary in
  `node_modules/.bin`, no config file). Adding one means editing
  `package.json`/`package-lock.json`, both explicitly out of this worker's
  scope, so the loader is the workaround, not a request to add tooling.
- Main repo: appended a dated `## Comments` section to ticket 162 (see
  below) recording what landed, the fork SHA, the exact re-run command, and
  the render-wiring gap.

## Paths touched

**Fork (`vendor/tbc-new-fork`, commit `57a84f1e4ecce1ef3e11da675bf623964caea907`):**
- `ui/core/components/individual_sim_ui/upgrades/data/data.ts` (modified)
- `ui/core/components/individual_sim_ui/upgrades/engine/disclosure.ts` (modified)
- `ui/core/components/individual_sim_ui/upgrades/engine/rank.ts` (modified)
- `ui/core/components/individual_sim_ui/upgrades/engine/ep-weights-v1.test.ts` (new)
- `ui/core/components/individual_sim_ui/upgrades/engine/test-ts-loader.mjs` (new)

**Main repo (branch `feat/sweep-tab-tickets`):**
- `.scratch/carry-forward/issues/162-upgrades-tab-ignores-user-set-ep-weights.md` (modified — Comments section only; `Status: open` unchanged)
- `.scratch/handoffs/ticket-sweep/a2/HANDOFF.md` (this file)

Did not touch `docs/plans/wowsims-tab/plan.md` (A3's), `package.json`,
`pnpm-lock.yaml`, `AGENTS.md`/`CLAUDE.md`/`.claude/skills/**`,
`packages/core/**`, `data/**`, `scripts/**`, `PLAN.md`, or anything in the
fork outside `upgrades/**` (in particular `player.tsx`, `stats.ts`,
`sim/**` are untouched — no fork shim was written, matching the v2 ban).

## Verification

Fork test (the one that actually exercises this slice's change):
```
cd vendor/tbc-new-fork
node --experimental-strip-types --import "data:text/javascript,import{register}from'node:module';import{pathToFileURL}from'node:url';register(pathToFileURL('ui/core/components/individual_sim_ui/upgrades/engine/test-ts-loader.mjs'));" --test ui/core/components/individual_sim_ui/upgrades/engine/ep-weights-v1.test.ts
```
→ `# tests 3`, `# pass 3`, `# fail 0` (observed 2026-08-14).

Fork typecheck (whole fork, not scoped to my files, but confirms no
collateral break):
```
cd vendor/tbc-new-fork && npx tsc --noEmit -p tsconfig.json
```
→ exit 0, zero output.

Main repo:
```
pnpm -C . verify
```
→ **1 failed / 759 passed / 1 skipped / 2 todo.** The failure is
`packages/core/test/wowsims-fork-parity.test.ts` timing out at its 5000ms
cap (~5064-5067ms observed, twice, under full-suite parallel load).
Isolated (`npx vitest run packages/core/test/wowsims-fork-parity.test.ts
--testTimeout=30000`) it passes in 4054ms — untested/hypothesis: this is a
pre-existing timing-margin issue on a loaded machine, not something my
change touched (I made no edit to anything that test measures, and
`packages/core/**` is outside my write scope regardless). Flagging rather
than asserting confidently, since I did not compare against a `pnpm verify`
run on `feat/sweep-tab-tickets` before my commits landed.

**Important:** `pnpm verify` does not cover fork sources for behaviour —
it picked up `ep-weights-v1.test.ts` as a file (shows `0 test` under
vitest, since it's a `node:test` file, not a vitest file) but does not run
its assertions. The fork test command above is what actually exercised my
test.

## Notes / concerns
- **Render-wiring gap, out of scope by path rule, not by choice.** The
  drawer's actual `<dl>` markup lives in `upgrades_tab.tsx`
  (`ui/core/components/individual_sim_ui/upgrades_tab.tsx`), one directory
  above `upgrades/`, outside this worker's write scope. That file also
  constructs `Deps` (line 274: `epWeights: epWeightsFor(specId)`, no
  `epWeightsSource:` key yet) and renders `assumptionsContent()`
  (lines 499-519) by hand-enumerating fields rather than iterating
  `standing`. So: the data plumbing and the test are real and green, but a
  user will not see the new line in the UI until a follow-up adds one line
  to the `Deps` literal (`epWeightsSource: epWeightsSourceFor(specId)`) and
  either a `<dt>/<dd>` pair or a `standing`-iterating render to
  `assumptionsContent()`. Recorded in the ticket's Comments section too.
- **Fork has zero test infrastructure.** No `vitest`/`jest` dependency, no
  config, no test script beyond `test:locales`. `test-ts-loader.mjs` is a
  workaround, not a decision to standardize on `node --test` for this
  project — if the delegator wants a real test runner in the fork, that's a
  `package.json`/`package-lock.json` change, which is explicitly out of my
  scope and belongs to whoever owns fork tooling decisions.
- `pnpm verify`'s one failure (`wowsims-fork-parity`) looks pre-existing and
  timing-related, not caused by this slice — see Verification above for the
  isolated-pass evidence. Flagging as **untested** whether it also fails
  the same way without my commits, since I didn't check out the fork's
  pre-change state to compare.

## Suggested follow-ups
- Add `epWeightsSource: epWeightsSourceFor(specId)` to the `Deps` literal at
  `upgrades_tab.tsx:274` and render it in `assumptionsContent()` — the
  path-scope-driven gap above. Small, mechanical, in the file I couldn't
  touch.
- If fork-side tests are wanted going forward, decide on a real runner
  (`vitest`/`node:test` officially adopted via `package.json`) rather than
  leaning on `test-ts-loader.mjs` indefinitely.
