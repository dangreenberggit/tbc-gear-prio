## Status
success

## Branch
`w/candidate-pool-D`, merged into `feat/upgrades-tab` (both inside `vendor/tbc-new-fork` — a nested git repo, not this repo's branch namespace).

## Base
- fork spawned at `655b3c36fccadc740332e53da527ba3cfcaec68d` on `feat/upgrades-tab` · matched the SHA named in the prompt · corrected: no.
- this repo (main working tree, no worktree created): `cc78ea68ebda6f6d9b2cfcf29a8ef3718ee12ff6` on `feat/candidate-pool` · unchanged throughout — no commits made in this repo.

## Fork final SHA (orchestrator bumps `data/wowsims-fork.lock.json` to this)
```
f5469ae0d14c38d8b88cfc65451df66807b4f73f
```
on branch `feat/upgrades-tab`, working tree clean. Two commits from this round:
- `826ec65e7` — the M1 port (engine + adapter + UI), on `w/candidate-pool-D`, merged with `--no-ff`.
- `f5469ae0d` — PROVENANCE.md note recording the CRLF trap hitting freshly-created files too (see below).

## What I did

1. **Ported the M1 engine diff into `vendor/tbc-new-fork/.../upgrades/engine/`**, faithful to `packages/core/src/rank.ts`'s M1 shape:
   - Copied `promise-pool.ts` verbatim (no adaptation needed — pure, no imports into fork-specific modules).
   - Ported `candidate-order.ts` (import-paths-only adaptation, same pattern as the other "none" rows in PROVENANCE.md).
   - Restructured `rank.ts`'s candidate loop into a `runCandidate` task dispatched through `promisePool`, added `RankInput.candidateCap`, `Deps.concurrency`/`Deps.signal`, the `{ kind: 'row' }` `Progress` side channel, `RankedItem.simmed?: false`, `Ranking.complete: true` / new `PartialRanking` type, and the post-drain `signal.aborted` re-read the prompt flagged as the load-bearing bug fix (present in my port at the same place core has it — `if (signal?.aborted) aborted = true;` immediately after `promisePool` resolves, before replication/set-packages run).
   - `contentHash` now includes a normalized `candidateCap` (`input.candidateCap ?? candidates.length`), matching content-hash.ts's "undefined ≡ eligible.length" rule — done by hand since this file hashes via `canonicalJson` directly rather than `contentHashOf` (D4's pre-existing adaptation), so there is no `content-hash.ts` `ContentHashInput.candidateCap` field to reuse here.

2. **Adapter (`wasm_sim_runner.ts`):** `WasmSimRunner.concurrency = min(numWorkers, memoryCapFromDeviceMemory())`.
   - **memoryCap derivation:** E-W5 (§3.1) measured **183.8 MB peak RSS for one `wowsimcli` process** at 5,000 iterations — the Node/CLI binary, not this browser's WASM worker; no in-browser RSS-per-worker number exists (out of scope for E-W5). I used that figure as the best available proxy (same Go sim core, same fixed-duration encounter loop that dominates RSS) and flagged it explicitly as a **hypothesis, not a measured browser number** in the code comment. `memoryCapFromDeviceMemory()` reads `navigator.deviceMemory` (Device Memory API — Chrome/Chromium only; `undefined` on Firefox/Safari), reserves half of reported device RAM for everything else already running, divides the remainder by 183.8 MB, floors, and clamps to `≥1`. Falls back to `DEFAULT_WORKER_COUNT` (4, matching upstream's own hardcoded default) when the API is unavailable.
   - This is a formula, not a live measurement — I did not run this in an actual browser to observe real WASM worker RSS. Flagged as untested in the code comment per the durable-claims rule.

3. **Split fallback (candidates < concurrency): not implemented.** Plan §5.1.2 marks this optional ("may fall back"). I left `WasmSimRunner.run()` unsharded per-candidate (matching its existing doc comment's rationale against `runConcurrentSim`'s iteration-splitting), so there is no crossover point to record — every candidate dispatch goes through the unsplit `raidSimAsync` path regardless of pool size, same as before this round. If this becomes a problem (small candidate counts leaving workers idle), it's a follow-up, not something this round decided against for a stated reason beyond "optional, not built."

4. **`makeRaidSimRequest` iterations override (F7):** `Sim.makeRaidSimRequest(debug: boolean, iterations?: number)` in `ui/core/sim.ts` — one added optional parameter, `iterations ?? this.getIterations()` inside the existing `SimOptions.create` call. No parallel request builder. Every existing call site (`runRaidSim`, debug runs) is unaffected since the parameter is optional and unused by them.

5. **UI controls in `upgrades_tab.tsx`:**
   - **Candidates** control beside Iterations: `type="number" min="1"`, no default *value* (per the plan's "default = all eligible" — a value would misrepresent the cap as a fixed number rather than "no cap"). Placeholder shows `"{{count}} / {{count}}"` (e.g. "246 / 246"), computed from `eligibleCount()` — the same phase + Kael-legendary filter `rank.ts` itself applies — and refreshed at each Run click since it depends on the page's current spec/maxPhase. Empty field → `candidateCap: undefined` (no cap); non-positive/non-finite → also `undefined` (no error channel exists before the run starts, so "no cap" is the fail-safe default rather than silently ranking fewer candidates than intended).
   - **Stop** button: disabled except while `state.kind === 'running'`; calls `abortController.abort()`. A fresh `AbortController` is created per run (`abort()` is one-shot).
   - **Progress text** reflects rows landing: the `{ kind: 'row' }` events accumulate into `this.landedRows`, and the running-state status line appends `"(N rows landed)"` to the existing stage label. `resultsContent()` renders a skeleton table from `landedRows` while running, using the same row shape as the finished table (no rank/BiS badges yet, since those come from post-run sorting/cutoff classification).
   - **Stop result rendering:** added a `'stopped'` `RunState` branch (distinct from `'done'`) carrying a `PartialRanking`. `applyView` (view.ts) requires a `complete: true` `Ranking` by its type signature — a `PartialRanking` does not structurally satisfy that (`complete: false` vs the literal `true`) — so the `'stopped'` state renders its own plain row list (`landedRowsTable`) directly from `ranking.items`, filtering out `simmed: false` rows, rather than forcing it through `applyView`'s slot-tab machinery. No slot sub-tabs are built for a stopped run.
   - **Assumptions drawer:** added a `candidate_cap` / `candidate_cap_note` row, shown whenever the Candidates field currently holds a value, with the exact required text **"top N by EP order — a preselection, not a ranking"** (i18n key `upgrades_tab.assumptions.candidate_cap_note`, `{{cap}}` interpolated).
   - Added i18n strings: `stop`, `candidates_label`, `candidates_placeholder`, `status.stopped`, `assumptions.candidate_cap`, `assumptions.candidate_cap_note` — all in `assets/locales/en/translation.json`, verified with the fork's own `node test-locales.mjs` (exit 0).
   - No M2/screening/racing UI — confirmed nothing in `upgrades_tab.tsx` or the engine references `screenIterations`, `promoteTopK`, or `fullPool`; none were added.

## Paths touched
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts` (M1 port)
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/candidate-order.ts` (new, ported)
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/promise-pool.ts` (new, ported)
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/PROVENANCE.md`
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/adapters/wasm_sim_runner.ts`
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
- `vendor/tbc-new-fork/ui/core/sim.ts`
- `vendor/tbc-new-fork/assets/locales/en/translation.json`
- This handoff file, in this repo (`.scratch/handoffs/wowsims-tab/candidate-pool/D-fork-port/HANDOFF.md`) — left uncommitted per instructions, this repo is otherwise untouched.

## Verification
- `git -C vendor/tbc-new-fork rev-parse HEAD` → `f5469ae0d14c38d8b88cfc65451df66807b4f73f` on `feat/upgrades-tab`, `git status --short` clean.
- `cd vendor/tbc-new-fork && npx tsc --noEmit -p .` → clean (no errors), run twice: once before the merge (on `w/candidate-pool-D`), once after (on `feat/upgrades-tab` at the tip above).
- `npx vitest run packages/core/test/wowsims-fork-parity.test.ts` (from this repo) → **1 passed, 1 skipped** (the skip is the pre-existing "protos not generated" branch's sibling test, N/A here since protos are generated in this clone). Run twice, same result: before and after the merge commit.
- `python scripts/check_engine_port_drift.py` (from this repo) → **fails**, but only on files I did not change plus two files I added that were flipped to CRLF by the merge/checkout cycle itself (see below) — see "PROVENANCE/CRLF outcome."
- `cd vendor/tbc-new-fork && node ./test-locales.mjs` → exit 0.
- **Not run:** `make host` (the fork's actual build target) — it needs the Go toolchain + `air` + the WASM sim binary, none of which I invoked. `tsc --noEmit -p .` passing clean across the whole fork tree (which includes my four changed/added TS files plus every file that imports them) is the verification I actually performed; I am not claiming `make host` succeeded, only that it was not attempted.

## PROVENANCE / CRLF outcome

Confirmed the orchestrator's diagnosed trap, and found a second instance of it live during this round:

1. **Pre-existing, untouched by me:** `disclosure.ts` and `set-value.ts` report as drifted. Verified with `tr -d '\r' < <file> | sha256sum` — both reproduce PROVENANCE.md's recorded hash exactly once `\r` is stripped. Content-identical; drift is CRLF-only. Neither file is in `git status --short`'s changed-file list for either of my two commits. Documented in PROVENANCE.md's new "A CRLF trap in this clone" section rather than "fixed" by rewriting their hashes (a hash rewrite without re-running E-W3 first is exactly the silent-drift scenario the check exists to prevent, per the check script's own reminder text).

2. **New finding this round: the trap also hits freshly-created files.** I wrote `candidate-order.ts` and `promise-pool.ts` with LF line endings (the tool that created them writes as-is) and recorded their correct LF-based hashes in PROVENANCE.md, confirmed clean against the drift check at that point. After `git commit` + `git checkout feat/upgrades-tab` + `git merge` — no editing, ordinary git operations — `core.autocrlf=true` silently rewrote both files to CRLF on disk. The drift check then reported them as drifted too. `tr -d '\r'` on each reproduces the exact hash I recorded at creation time — confirmed content-identical, drift is again CRLF-only.
3. **Conclusion, stated plainly per the prompt's instruction:** the drift gate as currently specified (raw on-disk bytes, `scripts/check_engine_port_drift.py`'s `sha256_of`) **is unpassable across an ordinary checkout/merge cycle on this clone**, independent of what any porting round does, because `core.autocrlf=true` here rewrites LF→CRLF on checkout while the git blob stores LF. I did not force the gate to pass by hashing the CRLF-on-disk bytes (that just repeats the same fragile pattern at the next checkout) or by disabling `core.autocrlf` myself (a clone-wide config change outside this slice's scope and explicitly the kind of decision the earlier round already deferred to whoever owns the clone's line-ending policy). Recorded as measured fact in PROVENANCE.md's second commit (`f5469ae0d`).
4. **Current drift-check output at the final SHA** (four "drifted" entries: `candidate-order.ts`, `disclosure.ts`, `promise-pool.ts`, `set-value.ts` — all four confirmed CRLF-only via `tr -d '\r'`) is expected given the above, not evidence of a behavioral regression. `pnpm engine-port-drift:check` will report exit 1 until the clone's line-ending policy is fixed at the config level.

## Notes / concerns

- **`memoryCapFromDeviceMemory` is untested against a real browser.** It's a formula derived from the CLI-side 183.8 MB figure and `navigator.deviceMemory`, not something I ran in Chrome to observe actual WASM worker RSS. If a future round gets in-browser RSS numbers, this function's constant and its Firefox/Safari fallback (`DEFAULT_WORKER_COUNT`) should be revisited.
- **Split fallback not built** (optional per §5.1.2) — no crossover value to report since the code path it would apply to doesn't exist yet.
- **`make host` not run** — see Verification above. If the orchestrator or a later review needs actual browser confirmation (not just typecheck + E-W3 parity), that's outstanding.
- The drift-check failure at the tip is real and will show up if the orchestrator or CI runs `pnpm engine-port-drift:check` against this fork SHA. It is not a regression from this round specifically (two of the four entries predate it), but it does mean the check currently always fails on this clone — worth flagging to whoever reviews the fan-in.

## Suggested follow-ups
- Fix the clone's line-ending policy (`core.autocrlf=false` in `vendor/tbc-new-fork/.git/config`, or a `.gitattributes` pinning `engine/**/*.ts text eol=lf`) so the drift gate can ever pass on this clone. Outside this slice's scope per the prompt ("do not clean it yourself" / "report your final fork SHA... I will bump the pin").
- A real in-browser RSS measurement for one WASM sim worker, to replace the CLI-proxy hypothesis in `memoryCapFromDeviceMemory`'s derivation.
