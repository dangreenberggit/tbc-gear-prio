## Status
success

## Branch
slice-c-m1-core

## Base
- spawned at `55b5a51db1516d349a209ea2831bb5b1f8a28265` (worktree HEAD at agent start) · expected `9ae92a324be891367398c8657b78b506903928ad` · corrected: yes — the worktree's own HEAD was the very early "minimal verify harness" commit, not the plan's base SHA (which is `feat/candidate-pool`'s tip). Ran `git checkout -b slice-c-m1-core 9ae92a324be891367398c8657b78b506903928ad` before doing anything else, per the prompt's own instruction for this case.

## What I did
- Added `packages/core/src/promise-pool.ts`: a small, pure, I/O-free `promisePool(tasks, n)` — bounded concurrency, results keyed by task index (not completion order), first rejection propagates and stops further dispatch. Unit-tested directly (test 7.9).
- Added `packages/core/src/candidate-order.ts`: `orderCandidatesByEp(candidates, equipment, weights, statsLookup)` — pre-sim total order by committed-EP delta vs the owned item in the candidate's slot, computed from raw stats via the existing `epScore` (no gem repair), ties by item id ascending, never throws (missing stats or an unresolvable slot both fall back to delta 0). Unit-tested directly (test 7.6).
- Extended `packages/core/src/content-hash.ts`: `ContentHashInput.candidateCap?: number`, normalized to `candidates.length` when `undefined` so the two spellings of "no cap" hash identically. `concurrency` was never added to the hash payload at all — confirmed inert by test (7.4a).
- Restructured `rankUpgrades` in `packages/core/src/rank.ts` (plan §5.1, all five):
  1. **Cap** — `RankInput.candidateCap?: number`; applied after `orderCandidatesByEp`, keeping the first N plus every owned row regardless of N.
  2. **Concurrency** — the serial `for (const entry of candidates)` loop became a `runCandidate(entry)` closure dispatched through `promisePool`, pool size `Deps.concurrency ?? 1`. The `SimRunner` port is untouched — no batch method, no fourth seam.
  3. **Ordering** — wired via `orderCandidatesByEp` before the cap is applied.
  4. **Stop** — `Deps.signal?: AbortSignal`; on abort, no further candidates dispatch, in-flight ones finish, unsimmed rows get `simmed: false` (excluded from cutoff/tie-groups/rank numbering), `Ranking` gained a required `complete: true` field with a sibling `PartialRanking` (`complete: false`) type — the ranking cache write (`rankingCacheKey`'s only call site) only ever receives `Ranking`, so a partial run cannot be cached by construction, not convention. Per-sim rows still land via the existing `cacheSimResult` calls inside `runCandidate`, so Stop is resumable.
  5. **Row-landed progress** — `Progress` gained a `{ kind: "row", row: RankedItem }` variant (no `stage` field — a side channel, not a stage), fired once per candidate as its row is built.
  - Determinism: `ranked` sorts unsimmed-last-then-by-delta before *and* after replication; `candidateSkips` sorts by item id before feeding `substitutions`. Both exist so concurrency 1 vs 4 produce byte-identical output (test 7.3) regardless of completion order.
  - Set-bonus package building and paired replication are both skipped once aborted — they dispatch *further* sims for refinement, not for coverage, so Stop's "finish in-flight and stop" contract would otherwise keep pulling in new work behind the caller's back.
- Fixed `packages/core/src/cli.ts`: narrowed the new `Ranking | PartialRanking` return with a runtime `if (!ranking.complete) throw` — the CLI never sets `Deps.signal` today so this can't actually fire, but the type doesn't know that until a `--stop` flag exists.
- Fixed five test fixture files that build a `Ranking` literal by hand (`cli-shortlist.test.ts`, `plausibility-report.test.ts`, `rank-report.test.ts`, `view.test.ts`) or call `rankUpgrades` directly without ever setting `signal` (`view-gate.test.ts`, `rank.test.ts`'s `rankWithSeeds`) — these only surfaced under the full `tsc --build` project-references check, not a single-package `tsc --noEmit`. Added `complete: true` to the literals and an `assertComplete()`-style runtime narrowing helper at the two direct-call sites.
- Added `packages/core/test/rank.test.ts` describe block `"rankUpgrades — M1 candidate pool controls"` (interface-level, through `rankUpgrades`) covering 7.1 (cap + owned-row exemption, cap-hash equivalence), 7.3 (concurrency bound, byte-identical output at concurrency 1 vs 4, same error regardless of pool size), 7.8 (Stop: `complete: false`, `simmed: false` rows excluded from cutoff/rank, no `ranking:` cache row, per-sim rows still written), 7.11 (row-landed progress event per candidate).

## Paths touched
- `packages/core/src/promise-pool.ts` (new)
- `packages/core/src/candidate-order.ts` (new)
- `packages/core/src/content-hash.ts`
- `packages/core/src/rank.ts`
- `packages/core/src/cli.ts`
- `packages/core/test/promise-pool.test.ts` (new)
- `packages/core/test/candidate-order.test.ts` (new)
- `packages/core/test/content-hash.test.ts`
- `packages/core/test/rank.test.ts`
- `packages/core/test/cli-shortlist.test.ts`
- `packages/core/test/plausibility-report.test.ts`
- `packages/core/test/rank-report.test.ts`
- `packages/core/test/view.test.ts`
- `packages/core/test/view-gate.test.ts`

No changes outside `packages/core/src/**` and `packages/core/test/**`. No `package.json` line was needed.

## Verification
- `pnpm --filter @tbc-gear-prio/core exec vitest run` → 791 passed, 4 skipped (unrelated: `wowsims-fork-parity.test.ts`, `cli-sim-runner.test.ts` — both intentionally skipped in this repo, unrelated to M1), 2 todo, 0 failed.
- `./node_modules/.bin/tsc --build --force` (repo-wide, project references) → clean.
- `./node_modules/.bin/eslint .` → clean.
- `./node_modules/.bin/prettier --check .` → clean.
- `pnpm run verify` (full chain: codegen check, typecheck, lint, format:check, test, sim-defaults, skeleton, boss-aliases, atlasloot, rep-tables, wowhead-prose, curated-set-phase, mirrors, lock-merge, sync-wowsims:unit, feral-skeleton-apl, sim-implemented-effects-classifier, sim-implemented-effects, engine-port-drift) → all green. The two `vendor/tbc-new-fork`-dependent checks report "skipped -- vendor/tbc-new-fork is absent (vendor/ is gitignored)" — expected, that fork is slice D's territory, not touched here.
- `git status --short` clean after every commit; five commits total, one per green slice (promisePool, EP ordering, content-hash candidateCap, the rank.ts restructure itself, and the downstream fixture fixes `tsc --build` surfaced).

## Notes / concerns

**Ordering function signature, for slice B′:**
```ts
// packages/core/src/candidate-order.ts
export type StatsLookup = (itemId: number) => readonly number[];

export function orderCandidatesByEp(
  candidates: readonly PoolEntry[],
  equipment: readonly SimItemSpec[],
  weights: EpWeights,       // from ./stats.js — sparse Record<string,number> or dense number[]
  stats: StatsLookup
): PoolEntry[]
```
Called from `rank.ts` as:
```ts
orderCandidatesByEp(eligible, equipment, deps.epWeights, (itemId) => getItem(itemId)?.stats ?? [])
```
Delta is `max over simSlotsForPoolSlot(entry.slot)` of `epScore(candidate) - epScore(worn-in-that-sim-slot)`, so a paired-slot candidate (ring/trinket) is judged against whichever worn piece it would actually be worth replacing. Ties by item id ascending. Never throws — missing stats or an unresolvable `SimOrderName` both resolve to delta 0, since this runs before any sim exists to blame a skip on.

**Nothing in §5.1 needed a forbidden path.** `promisePool` and `candidate-order` are both self-contained new modules under `packages/core/src`; `content-hash.ts` and `rank.ts` were the only existing files that needed edits, and both are inside `pathsAllowed`. `cli.ts` needed a two-line fix to keep `tsc --build` green (the CLI is a downstream consumer of `Ranking | PartialRanking`) — it's inside `packages/core/src/**`, so still in scope, but flagging it since the prompt's "notably" list didn't name it explicitly.

**One thing worth a second look at fan-in:** `tsc --build` (project references, what `pnpm run typecheck` actually calls) is stricter than a single-package `tsc --noEmit -p packages/core/tsconfig.json` — it caught five test-fixture files elsewhere in the tree that construct a `Ranking` by hand and needed `complete: true` added, which a narrower typecheck missed. If another parallel slice also touches `Ranking`/`rankUpgrades`'s shape, the same discovery gap will apply — worth running `tsc --build --force` (not just a per-package check) before declaring a slice's typecheck clean.

**Deliberate scope decision on Stop + refinement passes:** paired replication and set-bonus package building are both skipped entirely once a run aborts (not "run what's cheap, skip the rest") — they exist to *refine* already-simmed rows, not to cover new candidates, so continuing them after Stop would contradict "finish in-flight and stop." This wasn't explicitly specified in §5.1.4's wording beyond "finish in-flight sims," so flagging the interpretation in case slice E (M2) or the plan author wants it revisited.

**Did not touch:** M2/racing (screening, `screenIterations`, `promoteTopK`, `fullPool`), `vendor/tbc-new-fork`, `docs/plans/wowsims-tab/plan.md`, `experiments/`.

## Suggested follow-ups
- Slice D (fork port) needs a `min(workers, memoryCap)` concurrency adapter and the optional split-fallback the plan names in §5.1.2 — `Deps.concurrency` on the core side is a plain scalar, unopinionated about where that number comes from.
- Slice B′ (M1.5 EP-recall measurement) can call `orderCandidatesByEp` directly against committed full-sweep fixtures using the signature above.
- The CLI has no `--stop` flag yet, so `Deps.signal` is unreachable from it today — `cli.ts`'s narrowing throw is a placeholder until that lands.
