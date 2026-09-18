# Execution report — rename-misleading-sim-runner

Base (core): `5f1bfbaf85ca781a6ccc319eec5ea656faab9bf5` on `feat/406-keep-bulk-dead-note` (shared checkout).
Fork base: `993320fab0d4dc57b1fb9742f0aa7b0b6095bc9c` on `feat/upgrades-tab`.

**FORK_SHA (new): `693a3f3c369dfe68aa7f029b928e2d6d9545c07b`**
**Core commit (new): `417676b5`**

## Step-by-step status

| Step | Status | Note |
| --- | --- | --- |
| 1 Preconditions | done (adapted) | Both trees clean, fork HEAD matched, drift rc 0, seam sha `03310d93…0291` matched. E-W3 run via `pnpm exec vitest` instead of bare `npx` (fnm footgun — bare npx picks Node 20, fails on `node:sqlite`). |
| 2 Rename file + class | done (adapted) | `git mv`, header rewrapped to 2 lines keeping `(plan §2.4)`, class at line 85. |
| 3 Two subclass files | done | 9 `WorkerPoolSimRunner` refs total; siblings `BulkWasmSimRunner`/`BulkHttpSimRunner` preserved. |
| 4 Tab | done | Lines 23/454/1130/1231/1233 + the gate literal at 1212 → `'WorkerPoolSimRunner'`. |
| 5 Remaining fork refs | done (flagged) | skeleton, bulk_request_builder, engine_provenance, equiv-campaign, bulk-spike, README. `ui/core/index.ts` is a gitignored generated file — see ledger F-INDEX. |
| 6 Seam comment + PROVENANCE | done | Comment renamed; sha recomputed `03310d93…0291` → `8e118154…dbcc`, row 164 updated via Edit; drift rc 0, E-W3 green. |
| 7 Fork type check | done (caught + fixed) | tsc initially rc 1 — see ledger F-BULKSUB; after fix rc 0. Resolves C12: `.mts` tools ARE in the fork tsconfig include set. |
| 8 Fork lint | done | rc 0, oxlint clean (no resort needed — confirms F2). |
| 9 Fork commit | done (adapted) | `693a3f3c`, 12 tracked files (not 14 — see ledger F-INDEX / F-COUNT). |
| 10 Core edits | done (flagged) | All done; line 67 reframed as history per 10(c) — see ledger F-HIST. |
| 11 Re-pin | done | Lock `commit` → FORK_SHA, `_comment` appended, branchedFrom merge-base confirmed `17a8fb28…`, `pushed` stays false. Regen: sim-implemented-effects.json diff = 1 ins/1 del (forkCommit only), 221/451. |
| 12 Verify + desktop gate | done | `pnpm verify` rc 0; desktop gate PASS (a)-(h), no `--update-golden`, no `data/desktop-gate/` diff. |
| 13 Core commit | done | `417676b5`, 7 files, both trees clean. |

## Deviation ledger

| Step | Plan said | Found | Action | Why |
| --- | --- | --- | --- | --- |
| 1, 6 | Run E-W3 via `npx vitest run …` | bare `npx` runs under Node 20 (fnm footgun) → `No such built-in module: node:sqlite`, rc 1 | adapt | Ran via `pnpm -C … exec vitest` which uses the pinned Node 22. Same test file, correct toolchain; both runs green. |
| 2 | Replace "line 2 header" | Header wraps lines 2-3 (`(plan §2.4)` on line 3) | adapt | Rewrapped to 2 lines, preserved the `(plan §2.4)` reference; name-only change, content intact. |
| 5, 9 (F-INDEX) | `ui/core/index.ts` is a tracked upstream file with fork-added imports (C13); manifest lists it; edit line 55 | `.gitignore:4` ignores it — **generated** by Makefile rule `ui/core/index.ts: $(TS_CORE_SRC)` (a `find\|awk\|sed` over `*.ts` filenames), never tracked, no git history | flag | Not in the tracked commit; the desktop-gate build regenerates it from filenames, correctly emitting `worker_pool_sim_runner` after the rename (observed in the gate build log). My hand-edit matched the generator output but is moot. C13's premise (tracked fork-modified file) does not hold for this clone. No effect on the commit, re-pin, or any gate. |
| 5/7 (F-BULKSUB) | equiv-campaign.mts: rename the 5 base-class refs (64,145,238,288,449) | My `replace_all` on `WasmSimRunner \| BulkHttpSimRunner` also matched **inside** `BulkWasmSimRunner \| BulkHttpSimRunner` at lines 246/468, corrupting the sibling name to `BulkWorkerPoolSimRunner` | adapt | Fork tsc (Step 7) caught it: `Cannot find name 'BulkWorkerPoolSimRunner'`. Reverted 246/468 to `BulkWasmSimRunner` (they were never in C4's list — sibling refs). Post-fix diff shows exactly the 5 intended lines; tsc rc 0. |
| 9 (F-COUNT) | Step 9 acceptance: "14 changed paths" | 12 tracked staged entries (rename counts as one R097; index.ts gitignored) | flag | The plan's 14 counted index.ts and the rename source+dest separately. The real committable set is 12 tracked entries. Fork commit shows "12 files changed, rename … (97%)". |
| 10 (F-HIST) | Step 10(c): reframe line 67 to read as history naming the old class; **and** acceptance "C5's grep → no output" | The two conflict: a historical mention of `WasmSimRunner` cannot both exist and produce zero grep output | flag | Kept the deliberate history ("was once called `WasmSimRunner` … so it is now `WorkerPoolSimRunner`"), matching the shape 10(c) prescribes and the repo's no-falsifying-history policy. Did NOT delete it to satisfy the grep, nor loosen the grep. The core completeness grep therefore returns one intended hit at line 67 and nothing else. Left for Gate C to confirm the intent. |

No SME step in this plan, so no `contested` verdict.

## Required confirmations

- **Fork completeness grep** (fixed-string, F1 method): `grep -rn 'WasmSimRunner\|wasm_sim_runner' vendor/tbc-new-fork/ui | grep -v 'BulkWasmSimRunner\|bulk_wasm_sim_runner'` → **rc 1, no output**. No remaining bare refs in the fork.
- **Core completeness grep** (same method over `scripts packages docs/{why-desktop-bulk-is-slow,fork-tab-batch-sim-architecture,fork-upstream-touchpoints}.md`) → rc 0 with the **single deliberate historical mention** at `docs/why-desktop-bulk-is-slow.md:67` (F-HIST). No other refs.
- `pnpm engine-port-drift:check` → **rc 0** (recomputed sha `8e118154…dbcc` matches). E-W3 (`wowsims-fork-parity.test.ts`) → **passed** (with fork protos present).
- `pnpm verify` → **rc 0** (`gates: 1342 ran, 1 skipped` — the skip is E-W3 inside verify, which needs generated fork protos that verify does not build; ran E-W3 directly with protos present, green).
- **Desktop gate** (`pnpm desktop-gate:check`, **no `--update-golden`**) → **PASS, exit 0**, all (a)-(h):
  - (a) served worker wasmRefs=0 readyFalse=1
  - **(b) runner=WorkerPoolSimRunner**
  - (c) bulkSimAsync 200s=0, raidSimAsync 200s=87, workerSessions=5
  - (d) done=True runTimedOut=False
  - (e) rowCount=40 expected=40
  - (f) panicHit=False
  - (g) screeningFallbackWarnings=0
  - **(h) pass: rows, aboveCutoffItems, baselineDps match `data/desktop-gate/golden-ret-p5-cap40.json`**
  - No diff under `data/desktop-gate/`.

## Final tree state

- `git -C <core> status --porcelain` → **empty**
- `git -C <fork> status --porcelain` → **empty**; fork HEAD `693a3f3c369dfe68aa7f029b928e2d6d9545c07b`
- `git -C <core> log --oneline -3`:
  ```
  417676b5 Re-pin fork after the WorkerPoolSimRunner rename
  5f1bfbaf Explain the desktop bulk-vs-loop cost and file 412
  bdda7bec Log Gate C and record the 411 execution report
  ```
- `git -C <core> diff --stat 5f1bfbaf..HEAD`:
  ```
   data/sim-implemented-effects.json                   |  2 +-
   data/wowsims-fork.lock.json                         |  4 ++--
   docs/fork-tab-batch-sim-architecture.md             | 12 ++++++------
   docs/fork-upstream-touchpoints.md                   |  2 +-
   docs/why-desktop-bulk-is-slow.md                    | 17 +++++++++--------
   packages/core/test/bulk-screen-http-fixture.test.ts |  4 ++--
   scripts/check_desktop_tab.py                        |  4 ++--
   7 files changed, 23 insertions(+), 22 deletions(-)
  ```

Neither repo pushed; `pushed` stays false in the lock; no merge to dev.
