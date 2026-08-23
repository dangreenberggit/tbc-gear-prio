# Execution report — finish-the-tab

Executor seat (Opus), saved verbatim by the orchestrator. Part 1 covers Steps
0–8 (stopped at the measurement milestone, as instructed); later parts are
appended as the seat resumes.

## Part 1 — Steps 0–8 (2026-08-22)

**Status: complete through Step 8. Stopped at the measurement milestone.** Step 9 needs the owner to front a Brave tab; nothing was timed from the Browser pane.

### Preflight

Base SHA matched (`b64256e`), fork at `f359239` on `feat/upgrades-tab`, both trees clean, drift gate `ok: 33 ported files`.

### Commits

**This repo** (`feat/finish-the-tab`, base `b64256e`):

| SHA | Subject |
| --- | --- |
| `eaaae45` | Retire the fork screening parity case |
| `a381482` | Drop the fork's fullPool parity input |
| `b5fe81d` | Point the fork lockfile at the de-raced engine |

**Fork** (`vendor/tbc-new-fork`, `feat/upgrades-tab`, base `f359239` → tip `0993f944b`):

| SHA | Subject |
| --- | --- |
| `a2ddf2a42` | Show the run's wall-clock when a ranking finishes |
| `41e226019` | Full-sweep every eligible candidate on the tab path |
| `44c73690b` | Let the user rank with set-bonus potential included |
| `1095e8a1a` | Filter a finished ranking down to BIS-list items |
| `e5d874192` | Let a run sim only the items on a BIS list |
| `8db275d7d` | Remove racing; full-sweep every eligible candidate |
| `0993f944b` | Record the racing removal in PROVENANCE.md |

### Gates on the tips

`pnpm verify` exit 0. `engine-port-drift:check` → `ok: 32 ported files` (33 − `promotion.ts`). Lockfile matches the fork tip. E-W3 green and **not skipped** against the de-raced engine — this measured C38/C14, which the plan filed as hypothesis. Fork `tsc` 0 errors; `lint:css`, `test:locales` exit 0. Go tests: 21 packages pass including `sim/core`, `paladin/retribution`, `druid/feralcat`. Every verify-recipe grep passes; no `promoteTopJ` anywhere (C37 honoured).

### Archived builds

- `C:/Users/dgree/AppData/Local/Temp/finish-the-tab-builds/full/` — fork tip `0993f944b`; prune and set-potential toggles present in the bundle.
- `C:/Users/dgree/AppData/Local/Temp/finish-the-tab-builds/racing/` — fork commit `a2ddf2a`; screening strings present, both new toggles absent, elapsed status present. Built in a detached worktree, since removed.

Feral's page is `/tbc/druid/feralcat/`, confirmed against a real build directory.

### Deviation ledger

| Step | Plan said | Found | Action | Why |
| --- | --- | --- | --- | --- |
| all fork | `npm run type-check` green per commit (C21) | The script's relative `node_modules/typescript/bin/tsc` breaks under `npm --prefix`; TypeScript 7's win32 binary is **absent from the fork's lockfile**, so `type-check` cannot run from a clean `npm ci` on any platform | adapt | Ran tsc directly and installed the binary with `--no-save`. Gate held as written afterwards: **0 errors**. The lockfile defect is unfixed and outside the manifest. |
| all fork | `npm run format` green per commit (C21) | `format` is a *writer* (`lint:fix && fmt:fix`), and the tree is not oxfmt-clean — 693 of 582 files, 1891 reflowed lines in `upgrades_tab.tsx` alone | adapt | Running it would rewrite the whole tree, far outside the Paths manifest. Substituted: touched files no worse than their own baseline, `lint:css` and `test:locales` exit 0. Edits written in the file's existing style. |
| 1b (preflight) | Fork is buildable | Six declared deps missing from `node_modules`; six win32 native binaries missing from a Linux-only lockfile; TS **and** Go generated protos stale (108 and ~all packages failing) | adapt | Repaired with `npm ci`, one combined `--no-save` install, and the makefile's own protoc recipes. No tracked fork file touched; tree clean throughout. |
| 1b / 8 | Build with `npx tsx vite.build-workers.mts && npx vite build`, root as argument | Fails: `Directory does not exist: .../assets/locales` — `vite.config.mts:128` resolves `assets/locales` against cwd | adapt | Ran with the fork as cwd. C23's no-`cd` rule holds only before `fnm env`; after `fnm use 22.17.1`, `cd` keeps Node 22.17.1 (verified either side). |
| 6 | Get the ported core commit with `git log -1 --format=%H -- docs/adr/0026-*.md` | That yields `ae32a92`, a ticket-renumbering commit. The removal is `28b00f9`; the ADR was written in `66dab19` | adapt | Nested planner caught it; verified independently. PROVENANCE names `28b00f9`. Unambiguous intent, local to one step. |
| 6 | Sub-brief lists the `rank.ts` scope | Five further racing touchpoints unlisted (`screeningSkips` sort and its `substitutions` spread, `ranked.push(...screenedRows)`, rank-loop early return, M2 doc paragraph); `disclosure.ts`/`types.ts` mention no screening | adapt | Removing the listed set alone would not compile. Intent unambiguous. |
| 6 | `make -C <fork> test` once | `make` is not installed — the command returns 127, and the pipeline's exit 0 masked it | adapt | Ran the target's own command (`GOARCH=amd64 go test --tags=with_db ./sim/...`). One failure: `sim/web` needs generated `binary_dist/dist.go`, absent here. Pre-existing — this run changed **0** Go/proto files. |
| 7 | Bump lockfile, run verify | Verify **failed**: `sim-implemented-effects.json` is keyed on the fork commit | adapt | Regenerated. Only `forkCommit` moved; all 217 implemented and 451 stub-only ids byte-identical, as a run touching no Go file must produce. Universes needed no regeneration. |
| 5 | G2: tagged counts drop to 9 (ret-p3+) / 5 (feral-p3) | Each universe file is already phase-scoped, so within-file measurement shows 16/16/17/17 — no drop | flag | My measurement and the reviewer's are of different things. The budget cell is maxPhase 2, where both agree on 16/17, so nothing here turns on it. Recorded in `measurements.md`, not resolved. |

### Files

- Nested plan (saved verbatim, uncommitted): `.scratch/stage-gate/finish-the-tab/nested/racing-removal/plan.md`
- Measurements (443 lines, uncommitted — Step 11 artifact, as allowed): `.scratch/stage-gate/finish-the-tab/measurements.md`

Both are the only untracked entries in the repo; the fork tree is empty. Nothing was pushed, no PR opened, `"pushed": false` untouched, nothing merged to `dev`, no `--no-verify`.

### For Step 9

The owner needs to front a Brave tab driven through Claude in Chrome. Serve one archive at a time (`npx http-server <dir> -p 8123 -c-1`); pages are `http://localhost:8123/tbc/paladin/retribution/` and `http://localhost:8123/tbc/druid/feralcat/`.

One caveat worth flagging before those runs: the fork's lockfile ships no Windows native binaries, so these builds depend on six `--no-save` packages installed into `node_modules` this session. They survive in the working clone but not a fresh `npm ci`, and that is a genuine fork defect this plan had no mandate to fix.
