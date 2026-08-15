# Worker handoff — B1 (tickets 159, 158, 154)

## Status
success

## Branch
w/b1-ep-weights

## Base
- spawned at `55b5a51db1516d349a209ea2831bb5b1f8a28265` (this worktree's
  default checkout — NOT the required base) · expected
  `cffaee096da40275e0026a1f52bc71db9ace8aed` · corrected: yes, via
  `git checkout -b w/b1-ep-weights cffaee096da40275e0026a1f52bc71db9ace8aed`

## What I did

1. Corrected the branch base per the prompt's instruction (see Base above).
2. Read `AGENTS.md`, the `data-pipeline-work` skill, and all three named
   tickets.
3. **Ticket 159** — found already fully resolved on this base. The commit
   `23153d2` ("Resolve CLI EP weights by max phase, not hardcoded p2") and
   the supporting module `packages/core/src/ep-weights.ts` plus the shared
   JSON source `data/presets/ep-weights-by-phase.json` are already ancestors
   of `cffaee0`. `packages/core/src/cli.ts` already calls
   `resolveEpWeightsPath(...)` instead of the hardcoded p2 path. No further
   action needed. Ticket file's `Status: resolved` line already accurately
   describes this state — left unedited.
4. **Ticket 158** — also already fully resolved on this base. Commit
   `dade219` ("Stamp EP-weights provenance into universe artifacts") already
   stamps `"epWeights": {"path": ..., "pin": ...}` into every universe
   payload and report (`scripts/assemble_universe.py:1792,1815-1817`). No
   further action needed. Ticket file's `Status: resolved` line already
   accurate — left unedited.
5. **Ticket 154** — the ticket file named in the prompt
   (`.scratch/carry-forward/issues/154-feral-p2-universe-stale-against-generator.md`)
   **did not exist** in this worktree at the base commit — it was filed on a
   sibling branch (`ff4d03f`, not an ancestor of `cffaee0`). I filed a fresh
   copy at that path (bookkeeping path, allowed) and investigated on this
   base's actual code/data, not the sibling branch's numbers.
   - Reproduced: `python scripts/assemble_universe.py --spec feral
     --max-phase 2 --out <scratch> --report <scratch>` does not byte-match
     committed `data/universes/feral-p2.json` / `.report.json`. Membership
     is identical both sides (253 entries) — **not** the 256-vs-253 gap the
     prompt described; that number traces to the sibling branch's different
     code state and was not reproduced here.
   - Root cause, confirmed by reading git history: `curatedSets` is a
     deliberately **unscoped** full-provenance field
     (`entry["curatedSets"] = curated_sets_by_item[iid]`, not the
     phase-scoped `bis_sets_at_phase`), documented since commit `d1da985`.
     Commit `02f2f85` vendored feral's p3 gear-set files and added them to
     `SpecProfile.gear_sets`, which necessarily changes `curatedSets` for
     any item present in both a p2 and p3 curated set — but that commit's
     own regen note predicted `feral-p2.json` would stay byte-identical
     (true only for the phase-scoped `bisTags`/`bisSets` fields) and never
     regenerated it. `feral-p2.json` has been stale since `02f2f85`
     (2026-08-10) until this commit.
   - Regenerated `data/universes/feral-p2.json` and `.report.json` in place.
     `git diff --numstat` showed only those two paths moved — matching the
     hand-derived prediction made before running. Field-level diff: 5
     `curatedSets` entries gained `p3_6p`/`p3_9p` (items 29994, 8345, 30627,
     29383, 30106); report's `sourceRecordAdds.curated` 2→4 and
     `excludedNoSource` 1480→1478, consistent with the same two items now
     also registering a curated-source record at p2.
   - Checked `feral-p3.json` and all four `ret-p2..p5.json` the same way
     (fresh regen, field-level JSON compare) — already byte-identical in
     content, no drift.
   - Verdict recorded in the ticket: **253 is correct** for feral-p2; no
     entry-count gap exists on this base, so the ticket does not claim the
     (nonexistent, here) count gap and the `curatedSets` gap share a cause.
   - Reproducibility: ran the generator twice into scratch paths, both runs
     `cmp`-identical to each other and to the regenerated committed file.
     No cross-platform/CI claim made (Windows-local only).
   - Checked `packages/core/` for any assertion on these 5 item ids or on
     `feral-p2`/`curatedSets` counts — the `curatedSets` field's shape
     (array of strings) is unchanged, so nothing needed updating there; no
     source edit made under `packages/core/`.
6. `pnpm install --frozen-lockfile` was required first — `node_modules` was
   absent in this fresh worktree (no lockfile or package.json touched).
7. `pnpm verify` ran green (typecheck, lint, format, 767 tests passed / 2
   skipped / 2 todo, all data-pipeline gates including
   `curated-set-phase:check` and `feral-skeleton-apl:check`).
8. Committed as `c37b8e7` "Regenerate stale feral-p2 universe (ticket 154)".

## Paths touched
- `data/universes/feral-p2.json`
- `data/universes/feral-p2.report.json`
- `.scratch/carry-forward/issues/154-feral-p2-universe-stale-against-generator.md`
  (newly created — did not exist on this branch's base)

No other allowed path needed changes: `scripts/assemble_universe.py`,
`data/presets/**`, the EP-weights index and its generated TS, and
`packages/core/src/cli.ts` were already correct from tickets 158/159 landing
earlier in this base's history.

## Verification
- `python scripts/assemble_universe.py --spec feral --max-phase 2 --out ... --report ...`
  → matches committed output after regen; ran twice, `cmp`-identical both
  times.
- `python scripts/assemble_universe.py --spec feral --max-phase 3 ...` and
  `--spec ret --max-phase {2,3,4,5} ...` → all already byte-identical
  (content-level JSON compare) to committed files, no changes.
- `git diff --numstat -- data/universes/` → exactly the two feral-p2 files,
  matching the pre-regen prediction.
- `pnpm verify` → exit 0. 39 test files / 767 tests passed, 2 skipped, 2
  todo. All data-pipeline gates (`sim-defaults:check`, `skeleton:check`,
  `boss-aliases:check`, `rep-tables:check`, `wowhead-prose:check`,
  `curated-set-phase:check`, `mirrors:check`, `lock-merge:check`,
  `sync-wowsims:unit:check`, `feral-skeleton-apl:check`,
  `codegen:json-types:check`) passed. AtlasLoot-specific gates
  (`sync:atlasloot:verify-local`, `atlasloot:regen:check`) reported
  "vendor/atlasloot absent — skipping", which is expected: this slice never
  touched AtlasLoot inputs, and that gate is a no-op skip, not a pass on
  content it never examined.
- `git status --short` clean after commit (lint-staged/prettier ran on the
  three committed files during commit; no drift left behind).

## Notes / concerns
- Nothing needed in `package.json` / `pnpm-lock.yaml` / `packages/*/src/index.ts`
  — I only ran `pnpm install --frozen-lockfile` to populate `node_modules`
  (absent in this fresh worktree), which does not modify the lockfile.
- The ticket 154 prompt's reproduction numbers (256 vs 253 entries) do not
  match what this base's code and vendored pin actually produce (253 both
  sides, pure `curatedSets` field drift, no membership drift). I did not
  try to reconcile the two — the prompt itself said "untested" and warned
  not to assume the count gap and the `curatedSets` gap share a cause; on
  this base only the `curatedSets`/report-counter drift exists to explain.
  If the 256-vs-253 observation matters, it needs re-investigation on
  whichever branch actually produced it (not `cffaee0`).
- Ticket 154's `excludedNoSource`/pool-admission counters moved as a report
  side effect of the same root cause — I did not touch the
  `excludedNoSource` rule itself (`scripts/assemble_universe.py:1416-1424`),
  which the prompt correctly flagged as worker B2's territory, not mine.

## For worker B2 (next round) — dependency details

**New universe artifact format** (already landed on this base, not new from
me): every file under `data/universes/*.json` and `*.report.json` carries a
top-level `"epWeights"` object:

```json
"epWeights": {
  "path": "data/presets/ret/p3.ep-weights.json",
  "pin": "8aa378b3"
}
```

`path` is the repo-relative EP-weights file the generator resolved for that
spec/maxPhase combination (via `ep_weights_path_for` in
`scripts/assemble_universe.py`); `pin` is the short vendored-db pin
(`data/wowsims.lock.json`'s sha, truncated to 8 chars) the weights file's
underlying `db.json` was generated against. Universe payload top-level keys
are now: `spec, maxPhase, carryoverPolicy, generatedBy, d7Note, epWeights,
entries`. Report top-level carries the same `epWeights` key alongside its
existing counters (`excludedNoSource`, `sourceRecordAdds`, etc.).

**EP-weights index** (already landed): `data/presets/ep-weights-by-phase.json`
is the single JSON source of truth for "which weights file applies at spec S,
phase N". Its generated TypeScript counterpart lives at
`packages/core/src/ep-weights.ts`, which exports `resolveEpWeightsPath(mapping,
spec, maxPhase)` — pass it the loaded JSON (typed as `EpWeightsByPhaseFile`)
plus `spec`/`maxPhase` and it returns the resolved path string, using the same
"highest key <= maxPhase, else fallback" rule as the Python
`ep_weights_path_for`. `packages/core/src/cli.ts` already calls this at
`main()` before loading the pool.

**Exact command to regenerate a ret universe** (e.g. p3):

```
python scripts/assemble_universe.py --spec ret --max-phase 3 \
  --out data/universes/ret-p3.json --report data/universes/ret-p3.report.json
```

Swap `--spec feral` and the phase number for the other five committed
universes. Requires `vendor/wowsims/db.json` present — run
`pnpm sync:wowsims:restore` first if `node_modules`/`vendor` are missing in a
fresh worktree (this worktree needed `pnpm install --frozen-lockfile` too).

## Suggested follow-ups
- None spawned as tickets — both open items (159, 158) were already resolved
  before this slice started, and 154 is closed by this commit.
