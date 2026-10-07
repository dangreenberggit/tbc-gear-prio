Status: open
Type: task
Origin: docs/reviews/feat-upstream-react-port.md (pre-merge review round 1, S8 and the bulk half of A5)
Blocks: none
Blocked by: none
Related: 406, 411, 558, 559

# Delete the dead bulk sim path from the Upgrades tab and its core tests

## What is there today

The React port carried the old tab's bulk adapters into the fork at `feat/upgrades-tab-react` `43e3963d`: `ui/features/upgrades/model/adapters/bulk_wasm_sim_runner.ts`, `bulk_http_sim_runner.ts`, `bulk_screen_driver.ts` and `bulk_request_builder.ts` (549 lines together, `wc -l`). The tab never runs them. Its only runner factory is `makeSimRunner(env)` with `bulk = false` (`model/run.ts:68`), and nothing in the fork imports `bulk_http_sim_runner.ts` (`git -C vendor/tbc-new-fork grep -ln "bulk_http_sim_runner'" 43e3963d -- ui` prints nothing). `RunnerEnv`, which live code uses, is declared in one of these dead modules, so `run.ts:10` and `run_session.ts:11` import from it.

In this repo, six suites still test that code: `packages/core/test/bulk-boundary.test.ts`, `bulk-partition.test.ts`, `bulk-screen-branch.test.ts`, `bulk-screen-driver.test.ts`, `bulk-screen-fallback.test.ts`, `bulk-screen-http-fixture.test.ts` (`git grep -ln "bulk_http_sim_runner\|bulk_wasm_sim_runner\|bulk_screen_driver\|bulk_request_builder" -- packages`).

## Why delete

Ticket 406 recorded "keep" (recommended by an agent, not ruled on by the owner). Ticket 411 then measured desktop bulk against the per-candidate loop and its verdict is "DELETE" (411 line 12), but the delete was never done and no ticket carried it. 406's measured-clean delete exists as throwaway shas (fork `5c2b1d7f9`, core `ca5c7040`, cited in 411) and may be a starting point; they predate the React port, so expect conflicts.

## Scope

- Move `RunnerEnv` (and anything else live) out of the bulk modules first.
- Delete the four fork adapters and, if nothing else uses them, `model/engine/bulk/partition.ts` and the engine's bulk branch; a ported engine edit runs the PROVENANCE cycle (`docs/agents/known-traps.md`, "Before editing a ported engine file") and the parity twin in `packages/core/src`.
- Delete or rewrite the six core suites above.
- Fork commit, re-pin `data/wowsims-fork.lock.json`, `pnpm sim-implemented-effects:generate`, `pnpm verify`.

## Done when

`git -C vendor/tbc-new-fork grep -ln "bulk_" -- ui/features/upgrades/model/adapters` prints nothing, the six suites are gone or test live code, the fork's `lint:js` and unit tests pass, and `pnpm verify` is rc=0 at the new pin.
