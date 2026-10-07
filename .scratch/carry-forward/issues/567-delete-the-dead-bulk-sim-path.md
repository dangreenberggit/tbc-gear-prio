Status: open
Type: task
Origin: docs/reviews/feat-upstream-react-port.md (pre-merge review round 1, S8 and the bulk half of A5)
Blocks: none
Blocked by: none
Related: 406, 411, 518, 558, 559

# Delete the dead bulk sim path from the Upgrades tab and its core tests

## Done so far

- Fork `02cca7b70` (fix round A) deleted the four bulk adapters (`bulk_wasm_sim_runner.ts`, `bulk_http_sim_runner.ts`, `bulk_screen_driver.ts`, `bulk_request_builder.ts`) and moved `RunnerEnv` and `workerCountFor` into `worker_pool_sim_runner.ts`. `git -C vendor/tbc-new-fork grep -ln "bulk_" HEAD -- ui/features/upgrades/model/adapters` prints nothing.
- Main `c17aa49b` (re-pin round B2a) deleted `packages/core/test/bulk-boundary.test.ts` and `bulk-screen-driver.test.ts`, which tested only the deleted adapters, and the single-stage guard test in `bulk-screen-fallback.test.ts`, which called the deleted `assertSingleStageChunk`. The four suites left say in their headers that they cover the engine branch below.

## What is left

The engine's bulk branch is still in the fork. Nothing live calls it: the tab's only runner, `WorkerPoolSimRunner`, has no `runBulkScreen` (`git -C vendor/tbc-new-fork grep -n runBulkScreen -- ui ':!ui/features/upgrades/model/engine'` prints only a doc comment in `worker_pool_sim_runner.ts`), `engine/bulk/partition.ts` has no importer, and the `packages/core/src` twin has no bulk code (`grep -rni bulk packages/core/src --include=*.ts` prints nothing outside `proto/`). The branch is fork-only:

- `ui/features/upgrades/model/engine/bulk/partition.ts` (102 lines);
- in `engine/rank.ts`: `screenCandidates` (137 lines from its doc comment), `composeForBulk` (about 50), `Ranking.screeningFallbacks`, the screened-row baseline handling and the comments at `:731-736` and `:1403` that cite the deleted adapters and `bulk-boundary.test.ts`;
- in `engine/seams/sim-runner.ts`: `BulkScreenCandidate`, `BulkScreenRequest`, `BulkScreenResult`, the two error classes, `runBulkScreen?`, `bulkScreenCacheKey` and `RecordedSimRunner`'s bulk replay (about 100 lines);
- the `PROVENANCE.md` rows for `rank.ts` and `seams/sim-runner.ts`, which describe the branch;
- in this repo, the four suites that test it: `packages/core/test/bulk-partition.test.ts`, `bulk-screen-branch.test.ts`, `bulk-screen-fallback.test.ts`, `bulk-screen-http-fixture.test.ts`, and their helper `bulk-screen-fixture.ts` (1,576 lines together, `wc -l`).

## Why it was not done in the re-pin round

The re-pin round's limit for an engine edit was about 100 changed lines. The fork engine part alone is about 400, and each ported file it touches needs the PROVENANCE cycle. The owner decided on 2026-09-25 to delete the bulk-screening code (ticket 518), so this is the rest of that delete, not a new decision.

## Scope

- Remove the branch from `rank.ts` and `seams/sim-runner.ts` and delete `engine/bulk/partition.ts`, through the PROVENANCE cycle (`docs/agents/known-traps.md`, "Before editing a ported engine file"): E-W3 green before the hashes move, new sha256 rows, fork commit.
- Delete the four suites and `bulk-screen-fixture.ts`, after checking that no other suite imports the helper.
- Re-pin `data/wowsims-fork.lock.json`, `pnpm sim-implemented-effects:generate`, `pnpm verify`.

## Done when

`git -C vendor/tbc-new-fork grep -n "runBulkScreen\|BulkScreen\|engine/bulk" -- ui` prints nothing, `git ls-files 'packages/core/test/bulk-*'` prints nothing, E-W3 (`npx vitest run packages/core/test/wowsims-fork-parity.test.ts`) passes, the fork's `lint:js` and unit tests pass, and `pnpm verify` is rc=0 at the new pin.
