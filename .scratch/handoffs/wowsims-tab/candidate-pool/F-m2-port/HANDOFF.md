## Status
success

## Branch
`w/candidate-pool-F`, merged into `feat/upgrades-tab` (both inside `vendor/tbc-new-fork` — a nested git repo, not this repo's branch namespace).

## Base
- fork spawned at `6a192eb2a378a3d3e0f21dca52d40de84420b72c` on `feat/upgrades-tab` · matched the SHA named in the prompt · corrected: no. `git -C vendor/tbc-new-fork status --short` was empty before I started.
- this repo (main working tree, no worktree created): `1ad556878c4f680d4a04b982ca7b955b45be91fa` on `feat/candidate-pool` · unchanged throughout — no commits made in this repo, working tree still clean at the same SHA as I finish.

## Fork final SHA (orchestrator bumps `data/wowsims-fork.lock.json` to this)
```
79cbe04b6b42a85c234904ba435c92ff2a57ae31
```
on branch `feat/upgrades-tab`, working tree clean. Two commits from this round:
- `227577ab0` — the M2 port, on `w/candidate-pool-F`.
- `79cbe04b6` — merge commit onto `feat/upgrades-tab` (`--no-ff`).

## What I did

1. **Ported `promotion.ts`** (new file) unchanged (import paths only) from `packages/core/src/promotion.ts` — `DEFAULT_SCREEN_ITERATIONS = 1000`, `DEFAULT_PROMOTE_TOP_K = 150`, `promotionRule`. Kept the doc comment explaining these corrected defaults (the 42-above-cutoff-rows fixture that forced them, per this task's own briefing) rather than the earlier 300/35 pair.

2. **`content-hash.ts`**: no structural change needed — this file's `canonicalJson`/`ENGINE_VERSION` were already untouched by M2 in `packages/core`, since core bakes the racing knobs into `hashPayload` inside `content-hash.ts` itself, while the fork's D4 adaptation inlines the whole hash payload at `rank.ts`'s call site instead. Added a doc-comment note explaining why this file has nothing to change, so a reader diffing PROVENANCE.md hashes doesn't wonder why M2 skipped it.

3. **`rank.ts`** — the real port, matching `packages/core/src/rank.ts`'s M2 shape at this repo's tip line-for-line in structure:
   - `RankInput` gains `screenIterations?`, `promoteTopK?`, `fullPool?`, with the same doc comments core carries (the 42-row held-out-fixture correction story), marked "PORTED unchanged" where core's comment already says everything needed.
   - `RankedItem` gains `screened?: { iterations: number; promoted: false }`.
   - `ordered`/`racing`/`screenIterations`/`promoteTopK` computed before the content hash; the hash's `candidates` field now sources from `ordered` (every eligible candidate) rather than `candidates` (the old pre-M2 cap), matching core's "hash on eligible, cap narrows what actually sims" rule. `candidateCap`/`fullPool`/`screenIterations`/`promoteTopK` are added to the inlined `canonicalJson(...)` payload, normalized the same way `content-hash.ts` normalizes them for `contentHashOf` in the core copy (omitted-value ≡ explicit-default must hash identically).
   - Added `screenCandidate(entry)`: same per-slot-attempt shape as `runCandidate`, but calls `deps.sim.run(candReq, { seed, iterations: screenIterations })` and returns a bare number (`-Infinity` on every-attempt failure) rather than building a `RankedItem`.
   - Inserted the racing block between `runCandidate`'s definition and the Stop/dispatch section: screen all `ordered` via `promisePool`, build `setPackageItemIds` from `getItem(...).setId`, call `promotionRule`, cap the *promoted* set (not the full `ordered` set) the same way the pre-M2 cap worked, and build `screenedRows` for every candidate that didn't make the promoted+capped set. Renamed the local `candidates` binding to `simCandidates` throughout the rest of the function (fork's M1 code used `candidates`; core uses `simCandidates` since M2 needed a name for "what actually gets a full sim" distinct from "the full eligible set"). Moved `totalSims`/`replicaSims` computation from before the candidate loop to after the racing block, since it now depends on `simCandidates.length`, which isn't known until screening/promotion decide it — matches core's structure.
   - `buildSetBonuses` now receives `simCandidates` (was `candidates`).
   - `ranked.push(...screenedRows)` after `applySetContext`, before `onProgress?.({ stage: "ranking" })`.
   - `bySimmedThenDelta` comparator and the final `rank` assignment loop both gained the screened-rows-first branch (screened sorts after every full-iteration row, ranked only against other screened rows; `rank: null` for any screened row, same treatment as a Stop-unsimmed row).

4. **`view.ts`** — ported the third-view-state changes unchanged in shape:
   - `assignTieGroups` split into `assignTieGroupsWithinPartition` (the old body, parameterized by a shared `groupIdRef` counter) + a new `assignTieGroups` that partitions `rows` into full-iteration vs. screened before calling it — so a screening delta and a full-iteration delta never land in the same tie group.
   - `belowCutoffUnderView` returns `true` immediately for a screened row (never measured at full precision → no cutoff verdict to give it), before the `withSetPotential` branch.
   - `compareRows` sorts screened rows after every full-iteration row, ahead of the `pinBis`/sort-key comparison, so pinning and the sort key both apply only within whichever group a row belongs to.

5. **`upgrades_tab.tsx`** — screened rows render behind their own expand, per §6.1's "renders behind its own expand", "hidden, never deleted":
   - `rowsTable` now splits `allRows` into `belowCutoffRows` (below cutoff, not screened) and `screenedRows` (screened, which `view.ts` already routes through `belowCutoffInView: true`) and renders each behind its own `expandableRowGroup` toggle — two separate expands, not one merged below-cutoff bucket, because "never measured at full precision" and "measured and small" are different claims about a row and collapsing them would misrepresent the screened rows' status.
   - Factored the shared expand-toggle machinery (button + hidden table + show/hide label swap) out of the old inline below-cutoff-only code into `expandableRowGroup(rows, kind)`, parameterized by `'below-cutoff' | 'screened'` so both share one implementation and two independent i18n key pairs.
   - `resultRow` labels a screened row's delta with `upgrades_tab.results.screened_delta_dps` (`"~{{value}} (screened)"`) instead of the plain `+N.N` a full-iteration row gets, so a reader can't read a screening delta as directly comparable to a full-iteration one in the same column.
   - Dropped the now-redundant `belowCutoffCount` parameter from `rowsTable`/`slotPaneContent` — both callers only ever used it to recompute a value `rowsTable` now derives from `allRows` itself.
   - Added three i18n keys to `assets/locales/en/translation.json`: `results.screened_toggle_show`, `results.screened_toggle_hide`, `results.screened_delta_dps`.

6. **`sim.ts`'s `makeRaidSimRequest` comment — corrected, not "wired up" as the prompt's §6.3 line implied.** I verified `WasmSimRunner.run` (`adapters/wasm_sim_runner.ts:112`) builds its own `RaidSimRequestProto` directly from `req`/`opts.iterations` — it never calls `simUI.sim.makeRaidSimRequest` at all. The only call site of `makeRaidSimRequest` in the whole upgrades surface is `adapters/skeleton.ts`, which calls it once with no `iterations` argument, to capture the golden request skeleton — not per-candidate. So the screening pass's actual mechanism is `SimRunOpts.iterations` flowing through the existing `SimRunner.run(req, opts)` seam, which needed **no engine-level change** to carry a screening iteration count (the seam already took iterations per-call). I updated `sim.ts`'s doc comment to say this precisely — that the parameter still has no real caller passing a value, and that M2 racing did not turn out to be its consumer — rather than leaving the stale "no-go, still unused" wording (which was equally wrong once M2 shipped) or writing a false "now wired up" claim. This is a correction against the task's own §6.3 framing; I verified it by reading `wasm_sim_runner.ts:112-125` before writing it.

## Paths touched
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/promotion.ts` (new, ported)
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/content-hash.ts` (doc comment only)
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts`
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/view.ts`
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/PROVENANCE.md`
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
- `vendor/tbc-new-fork/ui/core/sim.ts` (comment correction only, no code change)
- `vendor/tbc-new-fork/assets/locales/en/translation.json`
- This handoff file, in this repo (`.scratch/handoffs/wowsims-tab/candidate-pool/F-m2-port/HANDOFF.md`) — left uncommitted per instructions, this repo is otherwise untouched.

## Verification
- `git -C vendor/tbc-new-fork rev-parse HEAD` → `79cbe04b6b42a85c234904ba435c92ff2a57ae31` on `feat/upgrades-tab`; `git -C vendor/tbc-new-fork status --short` → empty.
- **Order followed as instructed** (port → parity → hashes, not hashes-then-parity):
  1. `npx vitest run packages/core/test/wowsims-fork-parity.test.ts` (from this repo, on `w/candidate-pool-F` before the merge) → **1 passed, 1 skipped**. This exercises the racing path for real: `RankInput` in that test never sets `fullPool`, so `racing = true` by default and the fork's screening/promotion/cap-promoted-set code actually ran, not just the `fullPool: true` escape hatch.
  2. Computed sha256 for the four ported/changed engine files, wrote them into `PROVENANCE.md`.
  3. `python scripts/check_engine_port_drift.py` (from this repo) → **`engine port drift check ok: 33 ported files match PROVENANCE.md`** — clean, no CRLF-drift entries at all (the clone's `core.autocrlf=false` fix, confirmed still in effect before I started, held for this round; no line-ending trap hit this time).
  4. Re-ran both `wowsims-fork-parity.test.ts` and `check_engine_port_drift.py` again **after** the merge onto `feat/upgrades-tab` — both still pass at the merged tip (`79cbe04b6`).
- `npx tsc --noEmit -p vendor/tbc-new-fork/tsconfig.json` (from this repo, via `-p`, never `cd`) → the only error under `upgrades/` or `upgrades_tab.tsx` is `upgrades_tab.tsx(123,4): TS2879: Using JSX fragments requires fragment factory 'fragment' to be in scope` — a pre-existing, repo-wide issue (identical error appears in ~40 unrelated files across the fork, including files I never touched: `bulk_tab.tsx`, `gear_picker.tsx`, `raid_sim_action.tsx`, etc.), not introduced by this port. My four ported/edited engine files (`rank.ts`, `view.ts`, `content-hash.ts`, `promotion.ts`) and `sim.ts` produce **zero** typecheck errors.
- `pnpm verify` (from this repo, exit code captured directly, not backgrounded): **exit 1**, but the failure is `sim-implemented-effects:check` — `data/sim-implemented-effects.json is stale against the fork's Go tree (fields differ: ['forkCommit'])`. That check reads the fork's *live* `HEAD` commit and compares it against the `forkCommit` baked into a committed artifact in this repo; moving `feat/upgrades-tab`'s HEAD (this slice's whole job) necessarily makes it stale until whoever regenerates that artifact does so against the new SHA — expected fallout from bumping the fork tip, not a defect in the port, and outside this slice's `pathsAllowed`. Every unit test passed, including the new `racing.test.ts` (3 tests, all green, one is the 7.2 recall test at ~18.8s) and `synthetic-fixtures.test.ts` — **817 passed, 1 skipped, 2 todo, 46 test files, 0 failures**. Every other `pnpm verify` check before `sim-implemented-effects:check` in the pipeline passed (typecheck, lint, format, test, sim-defaults, skeleton, boss-aliases, atlasloot, rep-tables, wowhead-prose, curated-set-phase, mirrors, lock-merge, sync-wowsims, feral-skeleton-apl, sim-implemented-effects-classifier).

## PROVENANCE / CRLF outcome
No CRLF trap hit this round. `git -C vendor/tbc-new-fork config core.autocrlf` read `false` before I started (per this task's briefing that it had already been fixed and the tree renormalized), and `check_engine_port_drift.py` reported all 33 ported files matching cleanly both before and after the merge — no drifted entries, CRLF or otherwise, unlike slice D's fan-in state.

## Notes / concerns
- **§6.3's "wire it up" instruction for `makeRaidSimRequest` was based on a wrong premise** — see item 6 above. The mechanism the plan anticipated (a per-request iterations override on `makeRaidSimRequest`) isn't what the screening pass actually needed or uses; `SimRunOpts.iterations` through the existing `SimRunner` seam already did the job with zero engine-level change. I corrected `sim.ts`'s comment to reflect this rather than fabricate a "now wired up" claim. If a future round wants `makeRaidSimRequest`'s `iterations?` parameter to actually gain a caller, that's still open — nothing in the upgrades tab surface calls it with a value.
- **`data/sim-implemented-effects.json` regen is now needed** (see Verification) — out of this slice's `pathsAllowed` (`packages/core/src/**`/fork port only), flagging for the orchestrator or a follow-up ticket. Command per the check's own error text: `python scripts/generate_sim_implemented_effects.py`, then `python scripts/assemble_universe.py` for every committed universe, then commit.
- I did not run `make host` or any real browser check — same limitation slice D noted. `tsc --noEmit` + E-W3 parity + the full `racing.test.ts`/`synthetic-fixtures.test.ts` suite (run through the fork's real ported engine via dynamic import, per E-W3's own mechanism) is the verification I actually performed.

## Suggested follow-ups
- Regenerate `data/sim-implemented-effects.json` against fork SHA `79cbe04b6b42a85c234904ba435c92ff2a57ae31` (or whatever SHA the orchestrator ultimately pins in the lockfile) before the next `pnpm verify` is expected to pass clean.
- Consider giving `makeRaidSimRequest`'s `iterations?` parameter a real caller, or removing it if nothing in this tab's design ever needs it — currently dead weight carried forward from a plan expectation that didn't match the implementation.
