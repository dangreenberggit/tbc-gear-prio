# Plan — rename-misleading-sim-runner

Base SHA (core): `5f1bfbaf85ca781a6ccc319eec5ea656faab9bf5` on `feat/406-keep-bulk-dead-note`. Fork tip: `993320fab0d4dc57b1fb9742f0aa7b0b6095bc9c` (`vendor/tbc-new-fork`, branch `feat/upgrades-tab`). Line numbers below are as of these shas.

## Goal

The upgrades tab's default per-candidate sim runner is the class `WorkerPoolSimRunner` in `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/adapters/worker_pool_sim_runner.ts`. No source, test, doc or gate script in either tree refers to `WasmSimRunner` or `wasm_sim_runner` except as part of the untouched sibling names `BulkWasmSimRunner` / `bulk_wasm_sim_runner.ts`, and except in historical records under `.scratch/`, `docs/reviews/`, `docs/plans/` and `data/wowsims-fork.lock.json`'s `_comment` history. The fork is committed and re-pinned, `pnpm verify` is green, and `pnpm desktop-gate:check` passes (a)-(h) with (b) reading `runner=WorkerPoolSimRunner` and (h) matching the existing golden with no `--update-golden`. Both trees are clean.

## Approach

**Chosen name: `WorkerPoolSimRunner`, file `worker_pool_sim_runner.ts`.**

The class is, in its own header's words, a `SimRunner` that "owns an independent `WorkerPool`" and calls `this.pool.raidSimAsync` once per candidate. `WorkerPool` is upstream's transport-neutral abstraction: on the web build it spawns `sim_worker.js` (WASM in the browser); on the desktop build the packaged app serves `net_worker.js`, which turns each `raidSimAsync` into an HTTP call to the local Go server. Naming the class for the pool it drives is therefore true on both transports, and it names the mechanism the class actually adds (a second pool, separate from `Sim`'s), not a transport it happens to sit on.

The sibling set after the rename:

- `WorkerPoolSimRunner` — base, per-candidate loop over its own `WorkerPool`.
- `BulkWasmSimRunner extends WorkerPoolSimRunner` — unchanged name. It adds bulk screening via upstream's in-browser TypeScript tournament, which only exists on the WASM transport, so "Wasm" is accurate there.
- `BulkHttpSimRunner extends WorkerPoolSimRunner` — unchanged name; its bulk path is the HTTP `bulkSimAsync` RPC.

The family reads: the base is named for what all three share (a worker pool), each bulk subclass for the transport its bulk path needs. The sibling files, `makeSimRunner`, and every `Bulk*` identifier are not touched.

**Rejected alternative: `PerCandidateSimRunner` (or `LoopSimRunner`).** It names the role the brief points at, but the role does not distinguish this class from its siblings: both bulk subclasses inherit `run()` unchanged and are also per-candidate runners for the accurate final pass (`bulk_http_sim_runner.ts:18`, `bulk_wasm_sim_runner.ts:5`). "Per-candidate" describes the base method, not the class. `RaidSimRunner` (named for the `raidSimAsync` RPC) was rejected for the same reason plus a collision with the game term "raid sim": every runner here issues raid sims.

**File rename: yes**, with `git mv` so history follows. Keeping the old filename under a new class name would leave the misnomer in every import path and in `ui/core/index.ts`. Five import sites change (C4).

**PROVENANCE handling.** Only one ported-engine file mentions the old name, and only in a comment: `upgrades/engine/seams/sim-runner.ts:16`. The runner file itself lives under `upgrades/adapters/`, which has no PROVENANCE row and is outside E-W3 (C6, C7). Updating that one comment changes the file's bytes, so its sha256 row in `upgrades/engine/PROVENANCE.md:164` must be recomputed (C8). Leaving the comment stale was considered and rejected: the goal is no dangling reference, and the fork commit plus re-pin cycle is required anyway (a fork commit touching nothing ported still needs the re-pin, C9), so the hash row is the only extra cost.

## Claims register

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | `scripts/check_desktop_tab.py` asserts the literal string `"WasmSimRunner"` for gate (b), and its docstring names it. Both are in scope. | yes | `grep -n 'WasmSimRunner' C:/Users/dgree/Code/lulz/tbc-gear-prio/scripts/check_desktop_tab.py` → lines 11, 543 |
| C2 | The tab writes that string from a literal in `upgrades_tab.tsx:1212` (`sim instanceof BulkHttpSimRunner ? 'BulkHttpSimRunner' : 'WasmSimRunner'`), not from `constructor.name`. | yes | `grep -n "data-runner" vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx` → 1160, 1162, 1212 |
| C3 | The desktop golden compares only `rows`, `aboveCutoffItems`, `baselineDps`; the golden file contains no `WasmSimRunner` string. So (h) is unaffected by the rename and no golden update is needed. | yes | `grep -n 'GOLDEN_FIELDS = ' scripts/check_desktop_tab.py` → line 76; `grep -c WasmSimRunner data/desktop-gate/golden-ret-p5-cap40.json` → 0 |
| C4 | Exhaustive fork-tree reference list for `WasmSimRunner` / `wasm_sim_runner` (excluding the `Bulk*`/`bulk_*` sibling names). 14 files; hits: `upgrades/adapters/wasm_sim_runner.ts` (2, 85), `adapters/bulk_wasm_sim_runner.ts` (5, 18, 117, 141, 178, 192), `adapters/bulk_http_sim_runner.ts` (18, 41, 43), `adapters/skeleton.ts` (18, 19), `adapters/bulk_request_builder.ts` (109), `upgrades_tab.tsx` (23, 454, 1130, 1212, 1231, 1233), `engine_provenance.ts` (7), `engine/seams/sim-runner.ts` (16), `tools/equiv-campaign.mts` (64, 145, 238, 288, 449), `tools/bulk-spike.mts` (106), `tools/README.md` (74), `ui/core/index.ts` (55). `engine/bulk/partition.ts` and `adapters/bulk_screen_driver.ts` match only the sibling names and are NOT touched. | yes | `grep -rnP '(?<!Bulk)WasmSimRunner|(?<!bulk_)wasm_sim_runner' C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork/ui` (Git Bash grep; 28 lines at base) |
| C5 | Core-tree tracked references outside historical records: `scripts/check_desktop_tab.py` (11, 543), `packages/core/test/bulk-screen-http-fixture.test.ts` (40, 41), `docs/why-desktop-bulk-is-slow.md` (67, 259, 265, 273), `docs/fork-tab-batch-sim-architecture.md` (44, 49, 50, 51, 88, 146), `docs/fork-upstream-touchpoints.md` (600). The six `packages/core/test/bulk-*.test.ts` headers name only `bulk_wasm_sim_runner.ts`. | no | `grep -rnP '(?<!Bulk)WasmSimRunner|(?<!bulk_)wasm_sim_runner' scripts packages docs --include=*.py --include=*.ts --include=*.md \| grep -v 'docs/plans\|docs/reviews'` from the repo root |
| C6 | `upgrades/engine/PROVENANCE.md` has no row for any `adapters/` file; its only rows mentioning a sim runner are `seams/sim-runner.ts` (164) and the "not ported" `cli-sim-runner.ts` note (175). `upgrades/data/PROVENANCE.md` has no sim-runner reference. | yes | `grep -n 'SimRunner\|sim-runner\|sim_runner' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/PROVENANCE.md` → 164, 175; same grep on `upgrades/data/PROVENANCE.md` → no output |
| C7 | E-W3 (`packages/core/test/wowsims-fork-parity.test.ts`) imports only `upgrades/engine/`; `scripts/check_engine_port_drift.py` hashes only the files listed in `engine/PROVENANCE.md`, as raw bytes (`hashlib.sha256(path.read_bytes())`). Neither sees `adapters/`. | yes | `grep -n 'upgrades/engine' packages/core/test/wowsims-fork-parity.test.ts`; `sed -n 69,71p scripts/check_engine_port_drift.py` |
| C8 | Editing the comment at `engine/seams/sim-runner.ts:16` changes its bytes, so row 164's sha (`03310d939b95d38c03e26c6a8af937ac882a20688c1b37b5e6fc5d7d2f430291`) must be recomputed or `pnpm engine-port-drift:check` goes red. Comment-only edits count. | yes | `sed -n 56,60p docs/agents/known-traps.md`; before the edit: `python -c "import hashlib,sys;print(hashlib.sha256(open(sys.argv[1],'rb').read()).hexdigest())" vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/seams/sim-runner.ts` → `03310d93…` |
| C9 | A fork commit that touches nothing ported still needs the re-pin: lock `commit` → new tip, `pnpm sim-implemented-effects:generate`, `pnpm verify`. | yes | `sed -n 66,78p docs/agents/known-traps.md` |
| C10 | `pnpm sim-implemented-effects:generate` reads the pin from `data/wowsims-fork.lock.json` and embeds it as `forkCommit`; since no file under `sim/` or `proto/` changes, only that field moves (counts stay 221/451). | no | `grep -n 'forkCommit' scripts/generate_sim_implemented_effects.py` → 249; after regen: `git diff --stat data/sim-implemented-effects.json` → 1 insertion, 1 deletion |
| C11 | `pnpm fork-lint:check` lints the whole `upgrades/` directory plus `upgrades_tab.tsx` with oxlint `--deny-warnings`, so the renamed file is picked up with no config change. | no | `sed -n 80,84p scripts/check_fork_lint.py` |
| C12 | The fork's type check is `node_modules/typescript/bin/tsc --noEmit` from the fork root (Makefile:35, `package.json` `type-check`). Whether `tsconfig.json` includes `upgrades/tools/*.mts` is `hypothesis, untested`; fork-lint covers those files regardless (C11). | no | `sed -n 35p vendor/tbc-new-fork/Makefile`; `grep -n '"type-check"' vendor/tbc-new-fork/package.json` |
| C13 | `ui/core/index.ts` is an upstream file with fork-added side-effect imports of every `upgrades/adapters/*` module, alphabetically sorted; line 55 imports `wasm_sim_runner`. | no | `git -C vendor/tbc-new-fork diff upstream/master -- ui/core/index.ts \| grep '^+import'`; `sed -n 45,56p vendor/tbc-new-fork/ui/core/index.ts` |
| C14 | `engine_provenance.ts` (under `upgrades/`, not `upgrades/engine/`) has no PROVENANCE row; its `ENGINE_FORK_COMMIT` literal is updated only when engine behaviour changes, which a rename does not. Only its comment (line 7) changes. | no | `grep -c engine_provenance vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/PROVENANCE.md` → 0; `sed -n 11,15p vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine_provenance.ts` |
| C15 | The core has no `WasmSimRunner` in `packages/core/src` (the seam comment in the fork copy is a fork-only adaptation), so no core source file changes. | no | `grep -rn WasmSimRunner packages/core/src` → no output |
| C16 | Both trees are clean at the base and the fork HEAD is `993320fab`; `pnpm engine-port-drift:check` and E-W3 are green before any edit. | yes | `git -C C:/Users/dgree/Code/lulz/tbc-gear-prio status --porcelain`; `git -C C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork status --porcelain`; `git -C .../vendor/tbc-new-fork rev-parse HEAD`; `pnpm engine-port-drift:check`; `npx vitest run packages/core/test/wowsims-fork-parity.test.ts` |
| C17 | The four `require_pinned_fork` gates exit 2 between the fork commit and the lock update, so core gates that read the fork must run either before the fork commit (working tree) or after the re-pin. | no | `sed -n 218,225p docs/agents/upstream-catch-up.md` |
| C18 | `pnpm desktop-gate:check` at the new pin passes (a)-(h) with (b) `runner=WorkerPoolSimRunner` and (h) unchanged. Behaviour is unchanged by construction (rename only), but the gate run is the measurement. | yes | `hypothesis, untested` until Step 12 runs it |
| C19 | No `.scratch/` file, `docs/plans/**`, or `docs/reviews/**` needs editing: they are dated records of runs and decisions, and rewriting them would falsify history. | no | listing under C5's grep; policy in this plan's Out of scope |

## Steps

All paths are absolute under `C:/Users/dgree/Code/lulz/tbc-gear-prio/` (core, "R") and `C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork/` (fork, "F"). `U` = `F/ui/core/components/individual_sim_ui`. Use `git -C`, never `cd X && git`. Bound every listing with `head`/`--stat`.

1. **Preconditions.** Run C16's five commands. Acceptance: both `status --porcelain` empty; fork HEAD `993320fab0d4dc57b1fb9742f0aa7b0b6095bc9c`; drift check rc 0; E-W3 green. Record the current sha256 of `U/upgrades/engine/seams/sim-runner.ts` with C8's python one-liner; it must equal `03310d939b95d38c03e26c6a8af937ac882a20688c1b37b5e6fc5d7d2f430291`. Any mismatch is a stop-and-report. Depends on C8, C16.

2. **Rename the file and class (fork).** `git -C F mv ui/core/components/individual_sim_ui/upgrades/adapters/wasm_sim_runner.ts ui/core/components/individual_sim_ui/upgrades/adapters/worker_pool_sim_runner.ts`. In the new file: line 2 header `WasmSimRunner — SimRunner over the site's own in-browser WASM simulator` → `WorkerPoolSimRunner — SimRunner over the site's own WorkerPool (WASM workers on the web build, HTTP net workers on the desktop build)`; line 85 `export class WasmSimRunner` → `export class WorkerPoolSimRunner`. Change nothing else in the file. Acceptance: `grep -n 'class WorkerPoolSimRunner' U/upgrades/adapters/worker_pool_sim_runner.ts` → 85; `git -C F status --porcelain` shows one `R` line. Depends on C4.

3. **Update the two subclass files (fork).** `U/upgrades/adapters/bulk_wasm_sim_runner.ts`: line 18 import path `./wasm_sim_runner.js` → `./worker_pool_sim_runner.js` and identifier; lines 5, 117 (`extends`), 141 (comment), 178 (return type), 192 (`new`). `U/upgrades/adapters/bulk_http_sim_runner.ts`: lines 18 (comment), 41 (import), 43 (`extends`). Keep the import lines sorted as oxlint's simple-import-sort expects (`./worker_pool_sim_runner.js` sorts after `./skeleton.js`-style siblings; check with fork-lint in Step 8). Acceptance: `grep -n 'WorkerPoolSimRunner' U/upgrades/adapters/bulk_wasm_sim_runner.ts U/upgrades/adapters/bulk_http_sim_runner.ts` → 9 lines total. Depends on C4.

4. **Update the tab (fork).** `U/upgrades_tab.tsx`: line 23 import (`'./upgrades/adapters/wasm_sim_runner'` → `'./upgrades/adapters/worker_pool_sim_runner'`, identifier); 454 and 1130 union types; **1212 string literal** `'WasmSimRunner'` → `'WorkerPoolSimRunner'`; 1231, 1233 comments (`wasm_sim_runner.ts` → `worker_pool_sim_runner.ts`). Acceptance: `sed -n 1212p U/upgrades_tab.tsx` contains `'WorkerPoolSimRunner'`; C4's grep over `U/upgrades_tab.tsx` → no output. Depends on C2, C4.

5. **Update the remaining fork references.** `U/upgrades/adapters/skeleton.ts` 18-19 (comment: name and filename); `U/upgrades/adapters/bulk_request_builder.ts` 109 (comment filename); `U/upgrades/engine_provenance.ts` 7 (comment); `U/upgrades/tools/equiv-campaign.mts` 64 (type import path + identifier), 145, 238, 288, 449; `U/upgrades/tools/bulk-spike.mts` 106 (comment); `U/upgrades/tools/README.md` 74; `F/ui/core/index.ts` 55: delete the `wasm_sim_runner` import and insert `import "./components/individual_sim_ui/upgrades/adapters/worker_pool_sim_runner";` after the `wcl_gear_import` line (alphabetical position). Acceptance: C4's grep over `F/ui` → no output. Depends on C4, C13, C14.

6. **Update the ported seam comment and its PROVENANCE row (fork).** `U/upgrades/engine/seams/sim-runner.ts:16`: `` `WasmSimRunner` (slice 3) `` → `` `WorkerPoolSimRunner` (slice 3) ``. Recompute with C8's python one-liner and replace the sha in `U/upgrades/engine/PROVENANCE.md:164` using the Edit tool (not sed). Acceptance: `pnpm engine-port-drift:check` from R → rc 0; `npx vitest run packages/core/test/wowsims-fork-parity.test.ts` green. Depends on C6, C7, C8.

7. **Fork type check.** `node F/node_modules/typescript/bin/tsc --noEmit -p F/tsconfig.json` (Windows path form for node). Acceptance: rc 0. If `.mts` tools are not in the tsconfig include set, that is expected (C12); fork-lint in Step 8 still covers them. Depends on C12.

8. **Fork lint, before the fork commit.** From R: `pnpm fork-lint:check`. Acceptance: rc 0. Depends on C11, C17.

9. **Fork commit.** `git -C F add -A ui/core` then commit with subject `Rename WasmSimRunner to WorkerPoolSimRunner` and a body: the old name was true on the web build and false on desktop, where `WorkerPool` serves `net_worker.js` and each `raidSimAsync` is an HTTP call; the new name is the pool the class owns, true on both; rename only, no behaviour change; the one ported file touched is a comment in `engine/seams/sim-runner.ts`, PROVENANCE row updated; `BulkWasmSimRunner`/`BulkHttpSimRunner` keep their names because their bulk paths are transport-specific. Acceptance: `git -C F status --porcelain` empty; `git -C F show --stat HEAD | head -30` lists 14 changed paths including the rename; record the new sha `<FORK_SHA>`. Depends on C4.

10. **Core edits.** (a) `R/scripts/check_desktop_tab.py` line 11 docstring and line 543 `== "WasmSimRunner"` → `== "WorkerPoolSimRunner"`. (b) `R/packages/core/test/bulk-screen-http-fixture.test.ts` lines 40-41 comment. (c) `R/docs/why-desktop-bulk-is-slow.md` lines 67, 259, 265, 273: replace the class name and file name; at line 67, change the sentence so it reads as history ("the loop's runner class was called `WasmSimRunner` … it is now `WorkerPoolSimRunner`") rather than asserting a misnomer that no longer exists. (d) `R/docs/fork-tab-batch-sim-architecture.md` lines 44, 49, 50, 51, 88, 146 and `R/docs/fork-upstream-touchpoints.md` line 600: mechanical name/filename replacement only. Acceptance: C5's grep → no output. Depends on C1, C5.

11. **Re-pin the fork.** Edit `R/data/wowsims-fork.lock.json`: `commit` → `<FORK_SHA>`; `branchedFrom` unchanged (`17a8fb28c5ad14b649acecdaacd488594048f467`; confirm with `git -C F merge-base HEAD 17a8fb28c5ad14b649acecdaacd488594048f467` returning that sha); `pushed` stays `false`; append to `_comment` a dated entry (2026-09-17) in the file's existing style: rename of `WasmSimRunner` → `WorkerPoolSimRunner` and its file, 14 fork files, one ported file (`engine/seams/sim-runner.ts`, comment only) with its PROVENANCE sha moved, nothing under `sim/` or `proto/`, counts unchanged 221/451, and that `pushed` is false with the remote still at `e94d927af` per ls-remote. Then `pnpm sim-implemented-effects:generate`. Acceptance: `git -C R diff --stat data/sim-implemented-effects.json` → 1 file, 1 insertion, 1 deletion (only `forkCommit`); `grep -c '"forkCommit": "<FORK_SHA>"' R/data/sim-implemented-effects.json` → 1. Depends on C9, C10.

12. **Full verify and desktop gate.** From R: `pnpm verify` (rc 0). Then `pnpm desktop-gate:check` with no `--update-golden`. Acceptance: exit 0; output includes `(b) pass: runner=WorkerPoolSimRunner`, `(c)` `bulkSimAsync 200s=0`, `(h) pass` against `data/desktop-gate/golden-ret-p5-cap40.json`. A red (h) or any diff in `data/desktop-gate/` is a stop-and-report: the rename must not change output. Depends on C3, C18.

13. **Core commit and clean-tree check.** Commit the core changes (subject e.g. `Re-pin fork after the WorkerPoolSimRunner rename`; body may cite the (a)-(h) lines). Acceptance: `git -C R status --porcelain` and `git -C F status --porcelain` both empty; `git -C R log -1 --stat | head -20` lists exactly the core paths in the manifest. Do not push either repo; do not merge. Depends on C16.

## Paths manifest

Fork (`C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork/`):

- `ui/core/components/individual_sim_ui/upgrades/adapters/wasm_sim_runner.ts` → renamed to `.../adapters/worker_pool_sim_runner.ts` (modified)
- `ui/core/components/individual_sim_ui/upgrades/adapters/bulk_wasm_sim_runner.ts`
- `ui/core/components/individual_sim_ui/upgrades/adapters/bulk_http_sim_runner.ts`
- `ui/core/components/individual_sim_ui/upgrades/adapters/skeleton.ts`
- `ui/core/components/individual_sim_ui/upgrades/adapters/bulk_request_builder.ts`
- `ui/core/components/individual_sim_ui/upgrades/engine_provenance.ts`
- `ui/core/components/individual_sim_ui/upgrades/engine/seams/sim-runner.ts`
- `ui/core/components/individual_sim_ui/upgrades/engine/PROVENANCE.md`
- `ui/core/components/individual_sim_ui/upgrades/tools/equiv-campaign.mts`
- `ui/core/components/individual_sim_ui/upgrades/tools/bulk-spike.mts`
- `ui/core/components/individual_sim_ui/upgrades/tools/README.md`
- `ui/core/components/individual_sim_ui/upgrades_tab.tsx`
- `ui/core/index.ts`

Core (`C:/Users/dgree/Code/lulz/tbc-gear-prio/`):

- `scripts/check_desktop_tab.py`
- `packages/core/test/bulk-screen-http-fixture.test.ts`
- `docs/why-desktop-bulk-is-slow.md`
- `docs/fork-tab-batch-sim-architecture.md`
- `docs/fork-upstream-touchpoints.md`
- `data/wowsims-fork.lock.json`
- `data/sim-implemented-effects.json` (regenerated, `forkCommit` only)

**Partition:** none. Serial fork queue, one executor.

## Verify recipe

From `C:/Users/dgree/Code/lulz/tbc-gear-prio`:

```
grep -rnP '(?<!Bulk)WasmSimRunner|(?<!bulk_)wasm_sim_runner' vendor/tbc-new-fork/ui          # expect no output
grep -rnP '(?<!Bulk)WasmSimRunner|(?<!bulk_)wasm_sim_runner' scripts packages docs/why-desktop-bulk-is-slow.md docs/fork-tab-batch-sim-architecture.md docs/fork-upstream-touchpoints.md   # expect no output
pnpm engine-port-drift:check
npx vitest run packages/core/test/wowsims-fork-parity.test.ts
pnpm fork-lint:check
pnpm verify
pnpm desktop-gate:check            # (b) runner=WorkerPoolSimRunner, (h) pass, no --update-golden
git -C vendor/tbc-new-fork status --porcelain   # empty
git status --porcelain                          # empty
git -C vendor/tbc-new-fork rev-parse HEAD       # equals data/wowsims-fork.lock.json commit
```

## Out of scope

- Renaming `BulkWasmSimRunner`, `BulkHttpSimRunner`, their files, or `makeSimRunner`; any change to `engine/bulk/partition.ts` or `adapters/bulk_screen_driver.ts` (they reference only the sibling names).
- Any logic, comment-content, or import change beyond the name and path substitutions listed; no header-comment rewrite of `worker_pool_sim_runner.ts` beyond line 2.
- Updating `ENGINE_FORK_COMMIT` in `engine_provenance.ts` (no engine behaviour change).
- Editing historical records: anything under `.scratch/`, `docs/plans/**`, `docs/reviews/**`, `PLAN.md`, or earlier entries of the lock file's `_comment`.
- `--update-golden`, regenerating universes, or any other `data/` artifact besides `sim-implemented-effects.json`'s `forkCommit`.
- Pushing the fork, flipping `pushed` to true, merging to `dev`, or running `pnpm merge-to-dev`.
- Ticket 406/410/412 work (deleting the dead bulk path).
