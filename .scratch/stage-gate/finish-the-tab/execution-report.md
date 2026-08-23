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

## Part 2 — Steps 9–11 and reworks (2026-08-23), final report

Saved from the executor's final message. Intermediate part reports (2–9) are
summarised in `decision-log.md`; full readings are in `measurements.md`.

### Commits

**This repo** (`feat/finish-the-tab`, base `b64256e`):

| SHA | Subject |
| --- | --- |
| `eaaae45` | Retire the fork screening parity case |
| `a381482` | Drop the fork's fullPool parity input |
| `b5fe81d` | Point the fork lockfile at the de-raced engine |
| `ff23b75` | Re-pin the fork after splitting out its reformat |
| `828c39a` | Re-pin the fork after the BIS-filter fix |
| `0b4741c` | Re-pin the fork to the teardown fix |
| `8d5eeae` | Close the tickets the tab measurements settle |
| `6136d67` | Record the tab measurements and hand tranche 1 over |

**Fork** (`vendor/tbc-new-fork`, `feat/upgrades-tab`, base `f359239` → tip `8bb02b0283664244f9cc8ce32bf0fa735cf6a0c7`): `a2ddf2a42` elapsed status · `41e226019` full sweep · `44c73690b` set-bonus toggle · `caf36cf68` LF normalisation · `9f327af9a` BIS filter · `70a38b51e` pre-sim prune · `f70378155` racing removed · `e79916172` PROVENANCE · `118f708d8` filter fix 1 · `8bb02b028` filter fix 2.

### Verify recipe — all green

Repo: `pnpm verify` exit 0 · drift `ok: 32 ported files` · E-W3 passed, not skipped · `fullPool` in parity test 0 · lockfile-matches · status empty · 156/199 off the open list · exactly 1 STATUS file · log entry present.

Fork: status empty · tsc 0 errors · lint:css and locales ok · 3 toggles · `applyView(` 1 · `rankUpgrades(` 1 · `screened` 0 · racing 0 in both `rank.ts` and `view.ts` · `promotion.ts` absent · frozen literal 1 · `promoteTopJ` 0 in code (3 doc mentions all saying it is deliberately absent — C37 honoured).

### Results

Goal line met on both specs: ret 307 s, feral 61 s with the prune on, against the proposed 600 s. Prune-off recorded: ret 1017 s (missed), feral 395 s. All four runs 0% hidden. All three controls observed working.

### Deviation ledger (complete)

| Step | Plan said | Found | Action | Why |
| --- | --- | --- | --- | --- |
| all fork | type-check/lint/format green per commit | `type-check` unrunnable (TS7 win32 binary absent from lockfile); `format` is a writer over a non-clean tree | adapt | Installed binaries `--no-save`; substituted per-file checks. Ticket 272. |
| 1b | fork is buildable | 6 deps missing; 6 win32 native binaries absent; TS and Go protos stale | adapt | Repaired with `npm ci`, one combined install, makefile protoc recipes. No tracked file touched. |
| 1b/8 | build with root as argument | fails — `vite.config.mts:128` resolves against cwd | adapt | Ran with fork as cwd; `cd` is safe after `fnm use`. |
| 6 | get core commit via `git log -1 -- docs/adr/0026-*` | yields a ticket-renumber commit; real one is `28b00f9` | adapt | Nested planner caught it; verified independently. |
| 6 | sub-brief's `rank.ts` scope | 5 further racing touchpoints unlisted | adapt | Removing only the listed set would not compile. |
| 6 | `make -C <fork> test` | `make` absent — exit 0 was the pipeline's | adapt | Ran the target's own command. 21 packages pass; `sim/web` fails on a missing generated file, pre-existing. |
| 7 | bump lockfile, verify | verify failed — `sim-implemented-effects.json` keys on the commit | adapt | Regenerated; only `forkCommit` moved. Recurred twice more. |
| 5 | G2: tagged counts drop at higher phases | universes are already phase-scoped; no drop | flag | Different measurements; budget cell unaffected. Recorded. |
| 4 (rework) | edits in existing style | Python rewrite flipped CRLF→LF, inflating the diff | adapt | Split into `caf36cf68` + `9f327af9a`; tree hash identical. |
| 9 | preset picker / gear load | all three symptoms were one stale `lib.wasm` | adapt | C22 refuted — rebuilt wasm; glue change obsoletes it even with no Go change. |
| 9 | grep bundle for `makePresetGear` | false negative — minification renames identifiers | adapt | Corrected probe (item ids); retracted the "presets missing" claim. |
| 4 (rework 2) | one fix | first fix real but wrong cause; actual was `parentElement.remove()` | adapt | Both committed; wrong call recorded rather than hidden. |
| 9 cell 3 | racing timings | archive persists settings but never applies gear; undiagnosed | stop | Q1 falls to (c) by the pre-stated rule. Ticket 273. |

Nothing pushed, no PR, `"pushed": false` untouched, nothing merged to `dev`, no `--no-verify`. Server stopped, browser tab closed.
