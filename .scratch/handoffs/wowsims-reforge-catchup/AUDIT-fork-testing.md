# Audit — did the plan call for testing that the fork actually works, and did those tests pass?

Scope: read-only. Branch `feat/wowsims-reforge-catchup`. Sources: `PLAN-catchup.md`
(slice C, §7, §11), `EXEC-status-slices-1-B.md`, `EXEC-status-slices-C-D-E.md`,
`REVIEW-plan.md`, commits `313d470` (this repo) and `ab59127d9faad30cdd4190b5f7e6780e34405822`
(`vendor/tbc-new-fork`, `feat/upgrades-tab`), `vendor/tbc-new-fork/package.json`,
`vendor/tbc-new-fork/makefile`.

## Table

| Check | Required by plan? | Ran? | Passed? | Evidence |
| --- | --- | --- | --- | --- |
| Fork TypeScript type-check (`node_modules/typescript/bin/tsc --noEmit`, `package.json` script `type-check`) | Yes — PLAN-catchup.md:208, "at minimum a `vite build` or `tsc --noEmit` must pass" | Yes | Yes | Commit `ab59127d` body: "the fork's own type-check (`node node_modules/typescript/bin/tsc --noEmit`) exits 0." EXEC-status-C-D-E.md:52-53 repeats this, after fixing a real TS2307 failure caused by a stale `make go-to-ts` run (deviation ledger, EXEC-status-C-D-E.md:126). |
| Fork **build** (`npm run build` → `make host`, which chains `tsc --noEmit` then `npx tsx vite.build-workers.mts` then `npx vite build`) | Ambiguous in the plan's own wording — see Gap 1 below | **No** | N/A | Neither exec-status file, nor either commit body, mentions `vite build`, `vite.build-workers.mts`, `make host`, `make wowsimtbc`, or `make binary_dist`. Grepped both files for `vite build`/`make host` — zero hits. |
| `make proto` / `make go-to-ts` regeneration after merge | Yes — PLAN-catchup.md:205, explicit command | Yes | Yes | Commit `ab59127d` body: "Regenerated the gitignored outputs afterwards: `make proto` and `make go-to-ts`"; EXEC-status-C-D-E.md:112 records the `SHELL=/bin/bash` requirement discovered while running it. |
| `npm ci` in the fork | Yes — PLAN-catchup.md:204 | Yes | Yes | EXEC-status-C-D-E.md:111, "`npm ci` installs 374 packages and `make proto` succeeds." |
| Six fork-reading gates (`engine-port-drift`, `equip-eligibility`, `ep-presets`, `meta-conditions`, `sim-implemented-effects`, `fork-universes`) | Yes — PLAN-catchup.md:215-223, §7 | Yes | Yes | EXEC-status-C-D-E.md:64-72 (predicted-vs-actual table) and :143-150 (`pnpm verify` gate table), all six exit 0 with reported counts (33 ported files, 218/451 effects, 17 specs, 18 meta gems, 20 ep-preset files, 63 bundled universes). |
| Go test suite (`make test` → `GOARCH=amd64 go test --tags=with_db ./sim/...`) | **Not named anywhere in the plan** | **No** | N/A | `makefile` line ~90-92 defines `test: $(OUT_DIR)/lib.wasm.gz binary_dist/dist.go` running `go test --tags=with_db ./sim/...`. Zero mentions of `go test`, `GOARCH=amd64`, or the makefile `test` target in either exec-status file or either commit body. The plan itself never names this target — see Gap 2. |
| Any runtime check — tab loaded in a browser, or the fork's dev server (`make devserver` / `npm start` → `make devmode`) run | **Not required by this plan for slice C** (out of scope — see below) | **No** | N/A | No `npx vite`, `air`, `devserver`, `localhost`, or screenshot/browser mention anywhere in either exec-status file. Slice D's two CLI-side live sims (`npx tsx packages/core/src/cli.ts …`) exercised the **engine binary** via this repo's CLI, not the fork's web UI. |
| Layout gate (`pnpm run test:layout` inside the fork, or this repo's `check_layout_gate.py`) | Plan says explicitly **not** re-armed and **not worth measuring** — PLAN-catchup.md:236, "Do **not** spend a measurement on this" | Partially — the repo-side file-list check ran; the fork's own `npm run test:layout` (`test-layout.mjs`) did not | Repo-side check: yes (no SHELL_FILE touched) | EXEC-status-C-D-E.md:55-58, "The merge touched **no** file in `check_layout_gate.py`'s `SHELL_FILES` … so the layout gate is not re-armed." This is a claim about this repo's committed-hash gate (`docs/plans/wowsims-tab/plan.md`'s layout baseline), not the fork's own `npm run test:layout` script, which the plan never asks for and the executor never ran. |

## Gap 1 — the plan's build requirement is loose, and the executor read it as satisfied by the weaker half

PLAN-catchup.md:208 says, in full:

> Then the fork's own typecheck/build as its `package.json` defines them (executor reads `vendor/tbc-new-fork/package.json` scripts; at minimum a `vite build` or `tsc --noEmit` must pass — the merged `individual_sim_ui.tsx`/`sim.ts` lost raid-sim imports on their side and gained tab wiring on ours).

That sentence itself concedes the ambiguity by writing "or" between two checks of very different strength: `tsc --noEmit` (type-check only — no bundler runs, no module resolution beyond TS's own, no `vite-plugin-checker`, no asset pipeline, no dead-import detection at the bundle level) versus `vite build` (a real production build: resolves and bundles every import, runs the actual Vite/Rollup graph, would fail if the merge left an unreachable import, a circular reference Vite chokes on, an asset path Vite can't resolve, or a build-time-only plugin error). The plan sets "at minimum" one of the two as the bar, then the reasoning that follows ("the merged … lost raid-sim imports on their side and gained tab wiring on ours") is precisely the kind of import-graph change a bundler build would catch and a bare type-check might not (TS resolves types; it does not always fail the way a bundler does on a genuinely dead or newly-orphaned module edge, and it does not touch non-TS assets at all).

The executor satisfied the plan's letter — it ran `tsc --noEmit` and that is textually "at minimum" allowed — but not what the plan's own justifying clause was worried about. `npm run build` (`make host`) was never attempted, and nothing in either exec-status file or commit body says why the stronger option was skipped in favor of the weaker one. This is exactly the kind of plan looseness the owner asked me to flag.

## Gap 2 — the Go side has its own test suite, and the plan never names it

The fork is not TypeScript-only: `sim/` is a Go package tree, and the makefile's `test` target runs `GOARCH=amd64 go test --tags=with_db ./sim/...` — the fork's actual regression suite for simulation logic, item effects, spell mechanics, etc. This merge pulled in 121-127 upstream commits including, by the executor's own account, "class/spec sim fixes (rogue, enchant BasePoints+DieSides, incapacitate, Vampiric Touch, bear rage)" (PLAN-catchup.md:227) and a new item proc (Bonereaver's Edge, `ea112d982`, confirmed moved `data/sim-implemented-effects.json`). These are exactly the kind of change a Go unit/integration test suite exists to catch, and the plan's slice C never mentions `go test`, `make test`, or the `sim/...` package tree at all — not as a requirement, not as an explicit exclusion. It simply is not in the plan's vocabulary for this slice.

This is a real hole, not a documented deferral. Compare it to ticket 353, which explicitly defers re-baselining *committed DPS numbers and recorded fixtures in this repo* — that deferral is named and reasoned (§10 "Out of scope," §5 item 353). No equivalent sentence exists for the fork's own Go tests. Nobody decided to skip them; the plan simply never asked, and the executor — working strictly against the plan's checklist — never ran them either.

## Gap 3 — no runtime evidence that the tab itself loads

Slice D's two live CLI sims are real and valuable (they run the actual from-source `wowsimcli` binary against the new p3 universe, unmocked, and both produced plausible DPS/cutoff numbers with no `--max-phase` flag). But they exercise `packages/core/src/cli.ts`, which talks to the Go binary directly — not the fork's TypeScript/React/WASM web tab. Nothing in either exec-status file describes starting `make devserver` / `npm start`, opening the Upgrades tab in a browser, or even a headless render. The merge conflict that was resolved (`sim_header.tsx`, `customRootElement()`) is exactly the kind of change where a type-check can be green while the DOM is subtly wrong (wrapper div nesting, CSS class removal) — the executor's own reasoning for the resolution ("querySelector…! would throw at runtime without it") is itself an admission that this is a runtime-shaped risk, verified by static reasoning (grep for the class, read the SCSS) rather than by actually running the page.

The plan's own §10 "Out of scope" does not list "load the tab" as excluded — it lists pushing the fork, re-recording fixtures, the layout-gate baseline (explicitly deferred to Stage 4 / `pnpm merge-to-dev`), Linux builds, and max-phase 4/5 work. A runtime check of the merged tab isn't on that exclusion list either; it's simply absent from the plan's design for slice C in the first place — same shape of gap as Go tests, just a different subsystem.

## What ran and was genuinely rigorous

To be fair to the executor: the work that *was* done was not perfunctory. It caught and fixed two real bugs found only by actually running commands (`--commit` not forcing the from-source build path; protoc invoked with an absolute path against a relative `-I`, in slice 1 — EXEC-status-1-B.md:46-48), diagnosed a genuine upstream inconsistency in `gen_bulksim_constants.ts.go` that broke the merged tree's type-check until `make go-to-ts` ran (EXEC-status-C-D-E.md:126), and reported a legitimately un-green `pnpm verify` (11 failing tests) rather than papering over it — with an explicit recommendation that Stage 4 treat ticket 353 as a merge blocker. The six fork-reading gates are real checks with concrete evidence (counts, file lists), not rubber stamps, and the plan's own §7 is candid that these six "skip in CI... only this machine's run is the evidence" — that caveat was honored, not glossed over, in both commit bodies.

The type-check itself is real evidence, not nothing: it is stronger than "nobody checked" and it did catch one build-blocking regression (the TS2307s). It is just weaker than the plan's own justifying sentence implies is needed, and strictly weaker than "the fork builds" or "the fork runs."

## VERDICT

**Partial evidence exists that the fork's TypeScript compiles against the merged engine. There is no evidence the fork actually builds, and no evidence it runs.**

Specifically, answering the owner's question directly:

- The plan **did** call for fork verification in slice C, and phrased it loosely enough ("`tsc --noEmit` *or* `vite build`... at minimum") that the executor could satisfy the letter of it with the weaker check.
- What ran: `npm ci`, `make proto`, `make go-to-ts`, `node_modules/typescript/bin/tsc --noEmit` (green, after one real fix), and the six fork-reading data gates (all green, with substantive counts). These are real, evidenced passes — not assumed.
- What did **not** run, and is not evidenced anywhere: `npm run build` (`make host` → `vite build`), the fork's Go test suite (`make test` → `go test --tags=with_db ./sim/...`), the fork's own `npm run test:layout`, and any load of the tab in a browser or dev server. None of these are "the plan assumed it would be fine" — the build/`vite build` half is a plan looseness the executor resolved in the cheaper direction without saying so; the Go tests and the runtime/browser check are flatly **absent from the plan's design**, so for those, the honest description is "nobody checked," not "assumed fine" and not "failed."
- The 11 currently-red `pnpm test` failures in *this* repo (recorded-adapter sim-key misses, all feral) are the closest thing to an automated signal that the new engine changed sim behavior, and they are red, unresolved, and explicitly flagged by the executor as "exactly the tests that would detect an engine problem... this branch has no automated evidence that the new engine produces correct feral numbers."

**To close the gap**, in increasing cost:

1. `npm --prefix vendor/tbc-new-fork run build` (≈ `make host`, minus the Go binary/`air` pieces `host` also wants — may need `GOEXE`/`go env` sorted first). Cheapest, closest to what the plan's sentence already asked for. Cost: likely 1-3 minutes once dependencies are already installed (`npm ci` already ran).
2. `make -C vendor/tbc-new-fork test` (needs `GOARCH=amd64`, `--tags=with_db`, and the `lib.wasm.gz`/`binary_dist/dist.go` prerequisites built first, which pulls in a chunk of `make host`'s work). Cost: unmeasured by this audit — likely minutes, gated on Go toolchain being wired the same way slice 1 used it for `wowsimcli`.
3. `make -C vendor/tbc-new-fork devserver` (or `npm start`) and load the Upgrades tab in a browser, click through to a sim run. Cost: manual, ~10-15 minutes, but the only check that would catch the DOM-nesting/CSS class risk the `sim_header.tsx` conflict resolution was reasoned about rather than observed.

None of these three has run yet on this branch. The owner's concern — that the fork may have been merged and re-pinned without real evidence it still builds and runs — is **justified for "builds" and "runs"**, and **not justified** for "the TypeScript is internally consistent," which the type-check and the six data gates do genuinely establish.
