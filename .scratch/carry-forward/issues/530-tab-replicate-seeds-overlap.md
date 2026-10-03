Status: closed
Type: defect
Origin: stage-gate 511-512-set-credit, 2026-09-28 (`.scratch/stage-gate/511-512-set-credit/decision-log.md` lines 20, 46 and 69; gitignored)
Blocks: none
Blocked by: none
Related: 236, 243, 511, 512, 526

# The Upgrades tab's replicate seeds overlap, so its paired SE is too small

This ticket is a record only. Do not start a fix from it. The owner was
told this finding would be recorded unless they objected, and gave no
answer.

## What is wrong

The tab's paired-replication seeds are 11, 22, 33, 44 and 55. The sim
seeds iteration i of a run with `RandomSeed + i`, so two runs whose seeds
differ by less than the iteration count share most of their iterations.
The five replicates are therefore not independent, and the standard error
computed from their spread understates the real noise.

Line numbers below are at fork commit
`bb9e925e0d404f4caf82f7a202bd5296e6f7cdb0` (`data/wowsims-fork.lock.json`
`commit` on 2026-10-01). Paths are inside `vendor/tbc-new-fork`. Each line
was read with `git -C vendor/tbc-new-fork show <sha>:<path>`.

## The seeds

- `ui/core/components/individual_sim_ui/upgrades/engine/rank.ts:568`:
  `const DEFAULT_SEEDS = [11, 22, 33, 44, 55];`
- `rank.ts:724`: `const seeds = input.seeds ?? DEFAULT_SEEDS;`
- The tab passes no seeds. Its `RankInput` at
  `ui/core/components/individual_sim_ui/upgrades_tab.tsx:1784-1793` sets
  `iterations` from the picker and no `seeds`. The picker's value starts
  at 3000 (`upgrades_tab.tsx:106` and `660`).
- `engine/se.ts:19-35` (`assertUsableSeeds`) rejects only repeated seeds.
  It does not check spacing.

## The sim's seeding rule

- `sim/core/sim.go:348` calls `sim.reseedRands(int64(i))` before each
  iteration.
- `sim/core/sim.go:249`, inside `reseedRands`:
  `rseed := sim.Options.RandomSeed + i`.
- `sim/core/sim_concurrent.go:38-39`: a split run offsets each part's
  start seed by the iterations before it, so a split run uses the same
  seeds as an unsplit one.

So a run of N iterations from seed S uses the per-iteration seeds S to
S+N-1. At the tab's default 3000 iterations, seeds 11 and 22 share 2,989
of 3,000 iterations, and seeds 11 and 55, the furthest apart, share
2,956. This is arithmetic from `sim.go:249` and `sim.go:348`, not a
measurement.

## What the replicates feed

- `rank.ts:1530` calls `replicateTopItems` after the main pass.
  `rank.ts:1635-1674`: for the top `PAIRED_REPLICATE_TOP_N` rows (8,
  `engine/se.ts:6`), it sims the baseline and the candidate at each of the
  five seeds and sets:
  - `item.se = pairedReplicateSe(deltas)` (`rank.ts:1667`), the sample
    standard deviation of the five deltas over √5 (`engine/se.ts:37-48`);
  - `item.seMethod = "paired-replicate"` (`rank.ts:1668`);
  - `item.deltaDps` to the mean of the five deltas (`rank.ts:1669`);
  - `item.belowCutoff` from that mean (`rank.ts:1672`).
- `engine/view.ts:153-157` (`tieWindow`): the tie window between two rows
  is 2 × se. `engine/view.ts:180` groups a row with the group leader when
  their gap is within that window.

Effects, none measured:

- The paired se of the top eight rows is too small. Hypothesis, untested,
  for the size at the tab's default 3000 iterations. For the same seeds
  in `packages/core` at 3000 iterations, the doc comment above
  `DEFAULT_SEED_BASE` in `packages/core/src/rank.ts` records a
  `sampleSd/SE` of 0.087 where independence gives about 0.9 (ticket 236,
  `.scratch/handoffs/ticket-236-seed-spacing-measurements.md`).
- Because the tie window is 2 × se, the tab may split rows into different
  tie groups when their difference is within the real noise. Hypothesis,
  untested.
- The mean of five near-copies is close to the single-seed delta, so the
  mean `deltaDps` and the `belowCutoff` decision get little benefit from
  the extra sims. Hypothesis, untested.
- Other readers of `item.se` were not traced.

## Prior evidence

From `.scratch/stage-gate/511-512-set-credit/decision-log.md`
(gitignored, so a fresh checkout does not have it):

- Line 20, 2026-09-28: a verifier found that K1's seed replicates 11, 12
  and 13 shared 9,999 of 10,000 iterations, and recorded the lesson that
  any seed-replicate test must use seeds at least the iteration count
  apart.
- Line 46, 2026-09-28: the planner flagged that the tab's `DEFAULT_SEEDS`
  (11 to 55) overlap, as an out-of-scope finding.
- Line 69, 2026-09-28: K2's re-measure with independent seeds gave a
  spread that suggests real noise is about half of K1's upper-bound se.

## This was already fixed in `packages/core`

Ticket 236 found the same defect in `packages/core/src/rank.ts` and fixed
the seeds there (commits `70e634d2` and `c7ecba7c`, 2026-08-19). Ticket
236 is still `open`, for two acceptance boxes it marks as partial.
`packages/core/src/rank.ts` now uses `defaultSeedsFor(iterations)`, which
spaces seeds by the iteration count (`replicateSeeds`,
`packages/core/src/se.ts:114-120`). Its `assertUsableSeeds(seeds,
iterations)` (`packages/core/src/se.ts:74-95`) rejects seeds closer than
the iteration count.

The fork's engine was ported from core commit `12ce5841` (2026-08-14),
named in `engine/PROVENANCE.md` at the fork commit above. That commit is
an ancestor of `70e634d2`: `git merge-base --is-ancestor 12ce5841 70e634d2`
returns 0. The fork's `engine/se.ts` says it is "PORTED verbatim" from
core's `se.ts`, but it lacks the spacing check, so the port predates the
fix.

## What would close this

- The tab's default seeds are spaced by at least the run's iteration
  count, for every iteration count the picker allows.
- The fork's `assertUsableSeeds` rejects under-spaced seeds, as core's
  does.
- A test pins both, and `engine/PROVENANCE.md` and the parity test are
  updated for the changed files.
- The paired se on one tab ranking is compared before and after, with a
  command a reader can re-run.

## Closed 2026-10-02

Plan: `.scratch/stage-gate/530-replicate-seed-overlap/plan.md` (gitignored).
An independent reviewer passed it with inline fixes, made in this close.

**The owner's go.** This ticket said "Do not start a fix from it". The
owner's go, verbatim, on 2026-10-02: "id rather wait and handle the issues
generated in the handoff", and then "Otherwise tickets now. Use our
orchestration system". The handoff they answered,
`.scratch/handoffs/511-512-merge-ask-HANDOFF.md` (untracked), lists 530.

Fork commit (`dangreenberggit/tbc-new`, branch `feat/upgrades-tab`):

- `b1eb1de85` Space the tab's replicate seeds (530). `engine/se.ts` is
  now a byte copy of core `packages/core/src/se.ts`, which adds
  `replicateSeeds` and the two-argument `assertUsableSeeds(seeds,
  iterations)`. `engine/rank.ts` replaces `DEFAULT_SEEDS` with core's
  `defaultSeedsFor(iterations)` = `replicateSeeds(11, 5, iterations)` and
  passes `iterations` to the guard. The PROVENANCE rows move for both
  files.

Main re-pin: `00119171` Re-pin fork to b1eb1de85 for ticket 530. It moves
the lock, regenerates `data/sim-implemented-effects.json` (`forkCommit`
only), and changes the tests.

Tests, in `packages/core/test/fork-set-net.test.ts`:

- **530-D:** with no seeds, the five replicates run at
  11 + k × iterations. At 3000 iterations the sims use exactly the seeds
  11, 3011, 6011, 9011 and 12011, and `assumptions.seeds` says the same.
- **530-G:** seeds closer than the iteration count are refused. `[11, 22]`
  at 3000 rejects with a `RankError` of kind `internal` whose message
  says "at least 3000 apart". `[11, 3011]`, the spacing E-W3 uses,
  completes.
- **533-R** moves from seeds `[11, 22, 33]` to `[11, 5011, 10011]`,
  because the guard refuses the old seeds at the suite's 5000 iterations.

Red outputs, before each fix
(`npx vitest run packages/core/test/fork-set-net.test.ts -t "530"`, rc=1
each time):

- 530-D: "expected [ 11, 22, 33, 44, 55 ] to deeply equal [ 11, 3011,
  6011, 9011, 12011 ]".
- 530-G: "expected undefined to match object { name: 'RankError', kind:
  'internal' }". `[11, 22]` resolved.

Checks, Node v22.17.1:

- `npx vitest run packages/core/test/wowsims-fork-parity.test.ts`: rc=0
  (E-W3) before the hashes moved.
- The fork-gated suites (the ten files
  `grep -l forkPresent packages/core/test/*.test.ts` lists): rc=0, 135
  passed, 1 skipped, both before the fork commit and at the re-pin.
- `cmp packages/core/src/se.ts vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/se.ts`:
  rc=0.
- `python scripts/check_engine_port_drift.py`: rc=0.
- `python scripts/check_fork_lint.py`: rc=0 at the re-pin.
- `pnpm verify`: rc=0.

**Before and after, live.** Both recordings ran on one backend binary,
built at fork `55c705173` and left running between them, since this
ticket changes no Go code. "Before" was at fork `55c705173`, "after" at
`b1eb1de85`:

```
corepack pnpm tab-fixtures:record --spec feral --phase 3 --name p2bis --preset-tab "Phase 2" --preset "BiS 6%" --expect-gear-file ui/druid/feralcat/gear_sets/p2_6p.gear.json --out .scratch/stage-gate/530-replicate-seed-overlap/before
corepack pnpm tab-fixtures:record --spec feral --phase 3 --name p2bis --preset-tab "Phase 2" --preset "BiS 6%" --expect-gear-file ui/druid/feralcat/gear_sets/p2_6p.gear.json --out .scratch/stage-gate/530-replicate-seed-overlap/after
python .scratch/stage-gate/530-replicate-seed-overlap/compare.py .scratch/stage-gate/530-replicate-seed-overlap/before/feral-p3-p2bis.json .scratch/stage-gate/530-replicate-seed-overlap/after/feral-p3-p2bis.json
```

Its output, verbatim:

```
seeds [11, 22, 33, 44, 55] -> [11, 3011, 6011, 9011, 12011]
replicated rows 8 same in both: True
Band of the Eternal Champion       delta     4.75 ->     6.09   se 0.044 -> 0.636
Everbloom Idol                     delta    43.33 ->    43.44   se 0.036 -> 0.382
Shady Dealer's Pantaloons          delta     8.72 ->     7.70   se 0.028 -> 0.575
Idol of the White Stag             delta    16.73 ->    16.84   se 0.036 -> 0.369
Insidious Bands                    delta     6.82 ->     7.29   se 0.036 -> 0.220
Shadowmaster's Boots               delta    10.83 ->    12.93   se 0.051 -> 0.925
Vengeful Gladiator's Staff         delta    47.74 ->    48.20   se 0.039 -> 0.186
Vindicator's Dragonhide Bracers    delta    14.72 ->    14.84   se 0.038 -> 0.402
geomean se ratio 10.73
other rows differing on ('deltaDps', 'se', 'seMethod', 'belowCutoff') : 0 []
rest of ranking equal: True
```

`compare.py`, because `.scratch/stage-gate/` is gitignored:

```python
import json, math, sys
b, a = (json.load(open(p, encoding="utf-8"))["ranking"] for p in sys.argv[1:3])
print("seeds", b["assumptions"]["seeds"], "->", a["assumptions"]["seeds"])
bi = {i["itemId"]: i for i in b["items"]}; ai = {i["itemId"]: i for i in a["items"]}
assert bi.keys() == ai.keys(), "row sets differ"
rep = sorted(k for k in bi if "paired-replicate" in (bi[k].get("seMethod"), ai[k].get("seMethod")))
same8 = all(bi[k].get("seMethod") == ai[k].get("seMethod") == "paired-replicate" for k in rep)
print("replicated rows", len(rep), "same in both:", same8)
logs = []
for k in rep:
    x, y = bi[k], ai[k]
    if x["se"] > 0: logs.append(math.log(y["se"] / x["se"]))
    print(f'{x["name"][:34]:34} delta {x["deltaDps"]:8.2f} -> {y["deltaDps"]:8.2f}   se {x["se"]:.3f} -> {y["se"]:.3f}')
print("geomean se ratio", round(math.exp(sum(logs) / len(logs)), 2))
F = ("deltaDps", "se", "seMethod", "belowCutoff")
other = [k for k in bi if k not in rep and any(bi[k].get(f) != ai[k].get(f) for f in F)]
print("other rows differing on", F, ":", len(other), other[:10])
skip = {"items", "contentHash", "assumptions", "plausibilityWarnings"}
rest = all(b.get(key) == a.get(key) for key in set(b) | set(a) if key not in skip)
ab = {k: v for k, v in b["assumptions"].items() if k != "seeds"}
aa = {k: v for k, v in a["assumptions"].items() if k != "seeds"}
print("rest of ranking equal:", rest and ab == aa)
```

What the comparison shows:

- The paired `se` of the top 8 rows grew by a geometric mean of 10.73×.
  A model predicted √(3000/22) ≈ 11.7× (plan claim C4; it assumes
  per-iteration values are independent given the seed). Each row's `se`
  comes from only five deltas, so the per-row ratios scatter, from 4.8
  (Vengeful Gladiator's Staff) to 20.7 (Shady Dealer's Pantaloons).
- **Correction to this ticket's premise: `deltaDps` also changes on those
  8 rows,** not only `se`. Replication overwrites each row's `deltaDps`
  with the mean of its five deltas. Taken from the unrounded values, the
  deltas moved by −1.02 to +2.09 DPS (the largest: Shadowmaster's Boots,
  10.834 → 12.926). No row changed position, `rank` or `belowCutoff` in
  this ranking.
- Every row outside the top 8 is identical before and after, and so is
  the rest of the ranking. So on this run the tab was deterministic at a
  fixed seed.

**Deviation: the visual check.** The plan asked for the assumptions
drawer to list the new seeds. Fork `141786023` ("Demote the assumptions
block to a console log", ticket 318) removed that drawer. Its seed list
now goes to `console.info` through `logAssumptions`
(`upgrades_tab.tsx:3566`, seeds line `:3577`), and only a real run calls
it, not a fixture load. So the seeds were checked from the "after"
recording's `ranking.assumptions.seeds`. That is the same object, because
`scripts/tab-fixtures/record.mjs:305-318` reads it from
`window.__upgradesRanking()` on the page after the run. On :5173 with
`?upgrades-dev`, the "after" recording loaded through **Load fixture**,
and its rows drew with the "after" deltas and no error text.

**A note on the plan's reviewer check R3.3.** Restoring the one-argument
`assertUsableSeeds(seeds)` call against the copied `se.ts` makes
`iterations` undefined, so the guard refuses every multi-seed list. 530-G
then fails on its `[11, 3011]` boundary half, which is not the defect it
pins. A mutation that disables only the spacing check is the real test of
530-G.

**Not done here:**

- The five committed fixtures under `data/tab-fixtures/` were not
  re-recorded. `pnpm tab-fixtures:check` only warns, and now lists
  `engine/se.ts` among each fixture's changed inputs. The layout gate
  draws a recorded fixture and runs no sim (plan claim C13).
- Two fork tool files still name `DEFAULT_SEEDS` in comments. They are
  recorded as an item on ticket 513.
- Ticket 236 stays open for its own two partial boxes. This close does
  not touch it.

**Review rows.** `grep -rn "530-tab-replicate" docs/reviews/` prints
nothing, so no Disposition row defers to this ticket.
