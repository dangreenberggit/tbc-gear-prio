# Slice 2 — engine port: handoff

Plan: [`docs/plans/wowsims-tab/plan.md`](../../../../docs/plans/wowsims-tab/plan.md)
§2.1, §8, §9 slice 2.

Status: **done.** E-W3 passes, `pnpm verify` is green in this repo, `npx tsc
--noEmit` is exit 0 in the fork.

## Commits

- This repo, `feat/shopping-list-wowsims-tab`: `d8e915b` "Add fixture-parity
  gate for the fork's ported engine" — `packages/core/test/
  wowsims-fork-parity.test.ts`, `scripts/check_engine_port_drift.py`,
  `package.json` (`engine-port-drift:check` wired into `verify`).
- Fork, `vendor/tbc-new-fork` on `feat/upgrades-tab`: `e49dcf23c` "Port the
  ranking engine into the Upgrades tab" — 30 files under `ui/core/components/
  individual_sim_ui/upgrades/engine/`. **Not pushed** (plan §1 lock).

Source commit ported from: `12ce58414ad0f8f1e34c581d7583e6998e05e8bb` (this
repo, `git rev-parse HEAD` on `feat/shopping-list-wowsims-tab` at the start of
this slice).

## Every file ported

Full table with sha256 hashes is in
[`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/PROVENANCE.md`](../../../../vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/PROVENANCE.md)
(gitignored path in this repo — read it directly in the fork clone). Summary
by adaptation kind:

**Unchanged apart from import paths** (13 files): `cutoff.ts`, `se.ts`,
`kael-temp.ts`, `migrate-gems.ts`, `candidate-gems.ts`, `meta-repair.ts`,
`set-bonus.ts`, `set-value.ts`, `dead-slots.ts`, `logged-gear.ts`, `caps.ts`,
`compose.ts`, `disclosure.ts`, `plausibility.ts`, `seams/gear-source.ts`,
`fixtures/slamaltman-offline.ts`.

**Adapted, reason in each file's own doc comment**:

- `items.ts`, `gems.ts` — Database-backed (`Database.getSync()`), not
  JSON-snapshot-backed. `items.ts`'s `ItemEntry` is a narrowed projection of
  the fork's `UIItem` proto.
- `enchants.ts` — bridges to the fork's own `ui/core/proto_utils/utils.ts`
  `enchantAppliesToItem` rather than re-deriving from a JSON snapshot. This
  was a deliberate call, not forced: the fork already has this exact logic,
  upstream-maintained, against the live Database. Re-deriving a second copy
  would itself be the kind of drift plan §3 warns about.
- `meta.ts` — reuses the fork's own `ui/core/proto_utils/gems.ts`
  (`MetaGemCondition`, `gemColorMatchesSocket`) instead of re-deriving the
  eighteen meta-gem conditions from a JSON snapshot. Same reasoning as
  `enchants.ts`.
- `stats.ts`, `migrate-gems.ts`, `candidate-gems.ts`, `meta-repair.ts` —
  `Stat`/`GemColor` imported from the fork's own generated
  `ui/core/proto/common.ts` instead of packages/core's `proto/common_pb.ts`.
  Both are code-generated from the same wowsims `common.proto`, so the enum
  values agree; verified by typecheck, not merely assumed.
- `pool.ts` — `ItemSlot`/`ITEM_SOURCE_KINDS` are hand-written literal unions.
  packages/core generates these via `pnpm codegen:json-types`; the fork has
  no such generator. Kept in sync with `packages/core/src/items.ts`'s
  `ItemSlot` and `item-source-kinds.generated.ts` **by inspection**, which is
  the untested part of this port — see "What could not be ported" below.
- `slots.ts` — only `SIM_ORDER` (hand-written literal, same reasoning as
  `pool.ts`). `WCL_ORDER`/`mapWclGearToSim` are the explicitly-not-ported
  half (§2.1: the page's `Gear` is already sim-native).
- `content-hash.ts` — `canonicalJson` only. `sha256Hex`/`contentHashOf` and
  the `node:crypto` import are dropped per D4: cache keys need uniqueness,
  not a digest, and the browser has no `node:crypto`.
- `seams/sim-runner.ts` — `simCacheKey` returns the canonical-JSON string
  itself as the cache key, not its sha256 hash. Same D4 reasoning.
- `seams/store.ts` — `MemoryStore` only. `SqliteStore` is not ported (no
  `node:sqlite` in the browser); the `Store` interface is unchanged.
- `view.ts` — inlines `setPotentialIsConfounded` (one pure predicate) rather
  than importing `rank-report-rules.ts`, which is packages/core's CLI/HTML
  report renderer and out of scope per §2.1 — the fork's tab is its own
  renderer, built in a later slice.
- `rank.ts` — two real behavioural changes from packages/core, both required
  by the port surface:
  1. **No spec-mismatch check.** `spec.ts` is not ported (§2.1: "the page
     *is* a spec"). `PlayerGearSource` (slice 3) will read the page's own
     current gear under the page's own selected spec, so there is no
     talent-classification step to disagree with `input.spec`, and the
     `carry-forward 61` refusal branch has nothing to check. `logged
     .className`/`specIdHint` stay on `LoggedGear` for seam-interface parity
     but are unread here.
  2. **Cache key is `canonicalJson(...)`, not `contentHashOf(...)`** — D4,
     same as the sim-runner change.
  Also: `PRESET_ID_BY_SPEC` values are renamed to
  `ret/current-page-settings` / `feral/current-page-settings` — there is no
  on-disk skeleton file in the fork to name, since D5 makes the skeleton the
  page's own current settings.
- `fixtures/report-events-offline.ts` — inlines `WCL_ORDER`/
  `mapWclGearToSim` locally (the non-ported half of `slots.ts`), because the
  *raw fixture* is still WCL-shaped even though production code never sees
  WCL. Scoped to the fixture loader, not exported from the engine surface.

## What could not be ported, and why

Everything in plan §2.1's "not ported" list stayed unported: `spec.ts`,
`slots.ts`'s WCL half, `cli.ts`, `CliSimRunner`, `SqliteStore`,
`content-hash.ts`'s digest half, `items.ts`'s JSON index. One more, found
during the port and not named in §2.1 by file: `rank-report.ts`,
`rank-report-rules.ts`, `rank-report-css.ts` (the CLI/HTML report renderer) —
out of scope because the fork's tab renders itself (slice 4), never
packages/core's HTML report. One function, `setPotentialIsConfounded`, was
inlined into `view.ts` rather than pulling in the whole module.

**Untested / hand-verified only:** `pool.ts`'s `ItemSlot`/
`ITEM_SOURCE_KINDS` and `slots.ts`'s `SIM_ORDER` are hand-copied literals
kept in sync with the generated files in `packages/core` by reading both
side by side, not by a generator or a cross-repo check. If either union grows
in this repo, the fork's copy will not know until someone edits it by hand.
The drift gate (below) would catch an *edit* to the fork's copy but not a
*divergence from packages/core's source* — that is a real gap, not covered
by anything in this slice.

**No changes made to `packages/core/`.** Confirmed by `git status` in this
repo before every commit; plan §3 says "none" is required and that held.

## E-W3 — passes

`packages/core/test/wowsims-fork-parity.test.ts`. Drives `rankUpgrades` from
both this repo and the fork (dynamically imported by file path) against the
same slamaltman fixture gear, one candidate item (Fel-Steel Warhelm, 29983 —
chosen because it has no sockets, keeping gem-migration/meta-repair trivial
so the test's hand-written recorded-observation map stays small and
auditable), and the same two hand-picked DPS observations (baseline 2000,
candidate 2050 — not real sim output; E-W3 tests ranking arithmetic, not
whether the sim agrees with anything, which is E-W1's job).

**Actual assertion output** (captured via a temporary debug probe, then
removed):

```
DEBUG thisRepo: [{"id":29983,"deltaDps":50,"rank":1}]
DEBUG fork:     [{"id":29983,"deltaDps":50,"rank":1}]
```

Both sides also matched on `baseline.dps`, `deltaPct`, `se`, `seMethod`, and
`belowCutoff` (full field list in the test's `.toEqual` call) — not shown
above for brevity, but part of the passing assertion. **Deltas match
exactly, same rank.** This is a finding, not a foregone conclusion — if they
had differed at all it would have been reported as a defect and the test
left failing, per the task's instruction not to tune a test until it passes.

### Design points solved

- **Fork-absent skip.** `forkPresent` (does `ui/core/components/
  individual_sim_ui/upgrades/engine` exist) and `forkProtosGenerated` (does
  `ui/core/proto/common.ts` exist) are checked independently and gate the
  same skip path. Confirmed both matter: `vendor/` is gitignored in this
  repo (D1), and — separately — `ui/core/proto/*.ts` is gitignored **inside
  the fork's own repo** (`git check-ignore -v ui/core/proto/common.ts` →
  `ui/core/proto/.gitignore:2:*.ts`), so a present-but-unbuilt clone is a
  distinct, equally-ordinary state. `describe.skipIf`/`runIf` split the
  suite so the skip reason renders as its own named (skipped) test rather
  than a silent pass.
- **Importing the fork's real `Database` class is not tractable under plain
  vitest**, discovered empirically by iterating: `proto_utils/database.ts`
  → `ui/core/launched_sims.tsx` → `constants/other.ts` reads
  `window.location.pathname` at **module scope**; `proto_utils/utils.ts`
  (which `enchants.ts`'s bridge also imports directly) reaches
  `player_specs/druid.ts`'s module-scope `new URL(window.location...)`
  static initializers; and separately `ui/i18n/config.ts` imports a
  `virtual:i18next-loader` specifier that only resolves inside the fork's
  own `vite.config.mts` plugin chain — no `window` stub fixes that one.
  None of these are defects in the port; they are facts about how deep the
  rest of the fork's UI bootstrap sits behind one import. The test mocks
  `proto_utils/database.ts` and `proto_utils/utils.ts` via `vi.doMock`
  instead, seeded from this repo's own committed `data/items/index.json` /
  `data/gems/palette.json` for exactly the item/gem ids the fixture and the
  one test candidate touch — not invented data.
- The mocked `enchantAppliesToItem` answers from one pinned fact
  (`ENCHANT_APPLIES` in the test file): slamaltman's worn head enchant
  (effect 3003, "Glyph of Ferocity") applies to both the worn head and the
  candidate head, both `itemType: 1`. This repo's own (real, unmocked)
  `enchantAppliesToItem` independently confirms the same verdict on its side
  of the comparison, which is a cross-check, not an assumption duplicated
  twice.

## The drift gate

`scripts/check_engine_port_drift.py`, wired into `pnpm verify` as
`engine-port-drift:check` (package.json). What it does: parses
`PROVENANCE.md`'s ported-files table, re-hashes each listed file with
sha256, and fails (exit 1) on any mismatch or any listed file missing from
disk. What it explicitly does **not** do, stated in its own docstring and
worth repeating here per the task's instruction: **a hash match proves
nothing about behaviour, only that the file's bytes have not changed since
the table was written.** Only E-W3 proves behaviour. Someone could edit
`rank.ts` and this repo's `packages/core/src/rank.ts` identically, forget to
regenerate the hash, and the gate would correctly flag it as drifted even
though behaviour is fine — that is by design (it forces a human to re-run
E-W3 and update the hash deliberately, not silently). Symmetrically, if
someone recomputes and commits a new hash without re-running E-W3, the gate
would pass on a genuinely broken port — the docstring says this explicitly
and the check has no way to prevent it.

Skip behaviour mirrors E-W3's: absent `vendor/tbc-new-fork` or missing
`PROVENANCE.md` → exit 0 with an explanatory message, not a failure.
Verified by running it against the current (present, complete) state (exit
0, "30 ported files match") and by transiently corrupting one hash in
`PROVENANCE.md` and confirming exit 1 with a clear diff, then restoring it —
did not leave the corrupted state committed.

## Exact `pnpm verify` tail (this repo)

```
> tbc-gear-prio@0.1.0 engine-port-drift:check C:\Users\dgree\Code\lulz\tbc-gear-prio
> python scripts/check_engine_port_drift.py

engine port drift check ok: 30 ported files match PROVENANCE.md
```

Full run: 40 test files, 760 tests passed, 1 skipped (E-W3's own
fork-absent branch, which does not apply since the fork is present),
2 todo — plus every existing check script (codegen types, typecheck, lint,
format, sim-defaults, skeleton, boss-aliases, atlasloot, rep-tables,
wowhead-prose, curated-set-phase, mirrors, lock-merge, sync-wowsims,
feral-skeleton-apl). **Exit status: 0.**

## Fork's `tsc --noEmit`

```
Using Node v22.17.1
```
(no errors printed; exit 0.) Run via the fnm recipe from slice 1's handoff:

```bash
eval "$(fnm env --shell bash)"
cd vendor/tbc-new-fork
export PATH="$PWD/node_modules/.bin:/c/Program Files/Go/bin:/c/Users/dgree/go/bin:$PATH"
npx tsc --noEmit
```

## Untested / hypothesis, stated plainly

- **The fork's Vite dev build has not been exercised against the ported
  engine.** `npx tsc --noEmit` is a typecheck only; nothing in this slice
  ran `npx vite serve` and imported `engine/` from a real browser page. That
  is slice 3's job (the adapters that actually wire `engine/` into
  `upgrades_tab.tsx`). **Untested.**
- **E-W3's scope is one candidate item, not a real pool.** It proves the
  port preserves the ranking *arithmetic* for the code paths that one
  socketless candidate exercises (compose, cache key, cutoff, rank
  assignment, baseline/candidate delta). It does not exercise meta repair,
  gem migration onto a socketed candidate, set-bonus completion packages, or
  paired replication — those code paths are ported unchanged (see table
  above) but E-W3 as written does not independently confirm them behave
  identically fork-side. **Untested by E-W3; a finding for whoever
  broadens the test, not asserted as covered here.**
- **`pool.ts`/`slots.ts`'s hand-copied literals drifting from
  `packages/core`'s generated source is a real, uncaught gap** — see "What
  could not be ported" above. **Hypothesis: low risk in the near term**
  (both unions are small and stable — 14 slots, 9 source kinds — and have
  not changed in this repo's history to date), but nothing enforces it.
- **E-W1** (WASM vs native numeric agreement) is unrelated to this slice and
  remains unrun, per slice 1's handoff.

## Orchestrator verification, 2026-08-14 — mutation-tested, both gates

The handoff's claims were checked by **breaking the fork's engine on purpose**
and watching what fired. Accepting "E-W3 passes" without this would prove only
that the test runs.

| Perturbation (in the fork's `engine/`)            | E-W3            | Drift gate       |
| -------------------------------------------------- | --------------- | ---------------- |
| `cutoff.ts` — `meetsCutoff` thresholds ×1000       | **FAILS** ✓     | (not run)        |
| `se.ts` — `pairedReplicateSe` returns `+ 0.001`    | **PASSES** ✗    | **FAILS** ✓      |

**E-W3 genuinely detects behaviour changes** on the paths it exercises. The
cutoff break produced a precise diff — `belowCutoff: true` vs `false` on item
`29983` — so the test is not tuned-until-green.

**And it is genuinely blind elsewhere, exactly as the section above says.** The
`se.ts` break slipped through because the test runs with a **single seed**
(`seeds: [RUN_OPTS.seed]`), and `pairedReplicateSe` requires ≥2 deltas, so that
function never executes. That confirms the worker's own "does not exercise …
paired replication" caveat as **measured, not merely suspected**.

**The two gates compose the way the design intended.** The one break E-W3 missed
is caught by `engine-port-drift:check`, which named `se.ts`, printed both
hashes, and told the reader not to update a hash without re-running E-W3. That
is precisely the silent-drift scenario the gate was added for, working.

Restored afterwards: the fork's `git status` is clean, E-W3 passes, and the
drift gate reports 30/30. Reproduce any row above by making the same one-line
edit and re-running `npx vitest run packages/core/test/wowsims-fork-parity.test.ts`
or `pnpm engine-port-drift:check`.

**What this does not establish:** the hash gate cannot tell a behaviour-changing
edit from a comment change — it only proves bytes moved. Widening E-W3 to a
multi-seed, socketed, set-bonus-bearing case is the way to close the coverage
gap; the drift gate is a tripwire, not a substitute.

## Blockers

None. Slice 2's "done when" (plan §9.2: "E-W3 passes fork-side — the ported
engine reproduces the slamaltman fixture ranking from recorded
observations") is met.
