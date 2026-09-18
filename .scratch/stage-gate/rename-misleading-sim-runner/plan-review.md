VERDICT: sound

The plan is a correct, complete behaviour-preserving rename. Both genuine traps are fully handled: the gate string (C1) is updated in lockstep with the tab literal (C2), and the PROVENANCE sha (C8) is recomputed for the one ported comment. The reference list is complete and correct. The one finding below is a portability defect in the plan's own verify commands, not in the rename — it does not change the verdict but the executor must know about it.

## Findings

| ID | Severity | Where | What breaks | Evidence |
|----|----------|-------|-------------|----------|
| F1 | material | Verify recipe (lines 118-119), C4/C5 `Verified by` | The `grep -rnP` PCRE lookbehind the plan uses to prove "no output" cannot run in this Git Bash locale — it errors out with rc 2, not the "no matches" rc 1 the executor will read as success. A failed grep printing nothing looks identical to a clean grep printing nothing. | `grep -rnP '(?<!Bulk)WasmSimRunner...' vendor/tbc-new-fork/ui` → `grep: -P supports only unibyte and UTF-8 locales`, `rc=2`. The equivalent `grep -rn 'WasmSimRunner\|wasm_sim_runner' ... \| grep -v 'BulkWasmSimRunner\|bulk_wasm_sim_runner'` works and returns rc 0. Fix: the executor must use the fixed-string two-stage grep (or set `LC_ALL=C.UTF-8`) and read the exit code, not trust empty output. |
| F2 | minor | Step 3 parenthetical; Step 5 sort claim | The plan says `worker_pool_sim_runner.js` "sorts after `./skeleton.js`-style siblings" and treats the rename as possibly resorting imports. In fact `worker_pool_` sorts into the exact slot `wasm_` vacated in all four import sites (still last in each `./`/`../adapters/` subgroup, still before `data`/`engine`), so no manual resort is needed. Loose wording, right outcome; fork-lint (Step 8) is the backstop. | `sed -n` of the import blocks in bulk_wasm_sim_runner.ts:14-22, bulk_http_sim_runner.ts:38-44, equiv-campaign.mts:60-66, upgrades_tab.tsx:20-26 and index.ts:45-58: `wo` > `bu`/`sk`/`pl`/`si` and `adapters` < `data`/`engine`, so position is unchanged. |

## Register verdicts

| Claim | Verdict | Evidence |
|-------|---------|----------|
| C1 gate asserts `"WasmSimRunner"` at :543, docstring :11 | stands | `grep -n WasmSimRunner scripts/check_desktop_tab.py` → `11:`, `543: mark("b", rb.get("runner") == "WasmSimRunner",` |
| C2 tab writes literal at :1212 (not `constructor.name`) | stands | `upgrades_tab.tsx:1212: ...'data-runner', sim instanceof BulkHttpSimRunner ? 'BulkHttpSimRunner' : 'WasmSimRunner'` |
| C3 golden has no runner string; GOLDEN_FIELDS excludes it | stands | `GOLDEN_FIELDS = ("rows", "aboveCutoffItems", "baselineDps")` (:76); `grep -c WasmSimRunner data/desktop-gate/golden-ret-p5-cap40.json` → 0 |
| C4 fork reference list (14 files) | stands | Fixed-string grep over `vendor/tbc-new-fork/ui` reproduces every listed hit incl. tab :1233, bulk_wasm internal refs 5/18/117/141/178/192, and finds no additional refs in `.json/.html/.mjs/.js`. `run-tab-cdp.mjs` reads `data-runner` but contains 0 target strings, correctly excluded. |
| C5 core reference list | stands | `grep -rn ... scripts packages docs data` (all extensions, history/fork excluded) returns exactly the listed hits; `why-desktop-bulk-is-slow.md` lines 67/259/265/273 all present (259 confirmed = `.../wasm_sim_runner.ts:48`). No extension-filter miss. |
| C6 no `adapters/` PROVENANCE row; only :164 + :175 note | stands | `grep -n` of engine/PROVENANCE.md → 164 (`seams/sim-runner.ts` row) and 175 (cli "not ported" note); data/PROVENANCE.md → no output |
| C7 E-W3 and drift check see only `engine/`, not `adapters/` | stands | parity test `PORTED_ENGINE_DIR = ...upgrades/engine`; drift ROW regex matches only PROVENANCE `.ts` paths, `sha256_of` hashes raw bytes — neither reaches `adapters/` |
| C8 seam-comment edit needs sha recompute; current sha matches | stands | `hashlib.sha256` of the seam file = `03310d939b95d38c...0291`, equal to row 164 and the plan |
| C9 fork commit touching nothing ported still needs re-pin | stands | known-traps.md:66-78 lists commit→re-pin→`sim-implemented-effects:generate`→verify; plan Steps 9/11/12 follow it |
| C10 regen moves only `forkCommit` | stands (by construction) | generator embeds lock pin as `forkCommit` (:249); manifest touches only `ui/`, nothing under `sim/`/`proto/`, so counts are unchanged. Actual diff is untested pre-execution; Step 11 acceptance re-checks it — correctly marked not load-bearing. |
| C13 index.ts alphabetical insert after `wcl_gear_import` | stands | index.ts:45-58 shows `...wcl_gear_import` after `...wasm_sim_runner`; `worker_pool` (`wo`) sorts after `wcl_gear_import` (`wc`), so Step 5's "after wcl_gear_import" is correct |
| C16 both trees clean, fork HEAD `993320fab`, gates green pre-edit | stands | `git status --porcelain` empty (both); `git -C vendor/tbc-new-fork rev-parse HEAD` → `993320fab0d4dc57...` |
| C17 `require_pinned_fork` gates red between commit and re-pin | stands | upstream-catch-up.md:218-225 "exit 2 ... red by design"; plan runs fork-only checks (Steps 6-8) before commit and full verify (Step 12) after re-pin |
| Name choice: `WorkerPoolSimRunner` accurate, non-colliding, family coherent | stands | `grep -rn WorkerPoolSimRunner\|worker_pool_sim_runner` → rc 1 (no pre-existing use); `WorkerPool` is a real upstream class (`ui/core/worker_pool.ts:85`); `Bulk*` subclasses' transport names stay accurate (bulk paths are transport-specific) — judgment, and it holds |
| C18 desktop gate passes at new pin with `(b) WorkerPoolSimRunner` | untestable | `hypothesis, untested` — measured only when Step 12 runs; the gate run is the measurement, correctly deferred |
| C11, C12, C14, C15, C19 | stands | Supporting/non-load-bearing; spot-checked consistent (fork-lint covers `.mts`; `engine_provenance.ts` has no PROVENANCE row and only a comment changes; `packages/core/src` has no `WasmSimRunner`). No refutation found. |

Both trees left clean; all commands were read-only.
