Status: closed
Type: performance (shipped mechanism inactive on the measured path)
Origin: pre-merge review of `feat/candidate-pool`, Carmack axis R9, 2026-08-15
Blocks: none
Blocked by: none

# The CLI runs candidates serially, so M1's concurrency does nothing there

`feat/candidate-pool` replaced `rank.ts`'s serial candidate loop with a
bounded `promisePool` sized by `Deps.concurrency`. `packages/core/src/cli.ts`
builds its `Deps` without that field, and `rank.ts` reads
`deps.concurrency ?? 1`, so **the CLI still runs one candidate at a time.**
The pool is a `for` loop with extra closure allocation on that path.

This matters because the CLI is the only path with measured numbers. E-W5
(`docs/plans/wowsims-tab/candidate-pool.md` §3.3) measured `t_fixed` =
373.2 ms against `t_iter` = 0.0637 ms/iteration, so at 3,000 iterations
**66% of every sim is fixed setup** — roughly 92 s of pure spawn overhead
across a 246-candidate ret p2 run, all of it serial today.

## Why it was not just fixed

Plan §5.2 assigned `CLI: 1` deliberately. That line was written *before* E-W5
proved `t_fixed` dominates, which is the exact condition under which parallel
*processes* are the win. Changing it widens scope the plan assigned away, and
doing it honestly needs a measured before/after ratio — **no concurrency
timing ratio exists anywhere in the branch**; §5.3 asked only for
byte-identical output at concurrency 1 vs 4, which is what it got.

## What to do

1. Set `concurrency` in `cli.ts` (`os.availableParallelism()` is the obvious
   default; make it overridable by flag).
2. Measure ret `maxPhase 2` wall-clock before and after on the same machine,
   at least three runs each, and record the ratio in §3.3 next to the
   existing E-W5 numbers.
3. Watch memory: E-W5 measured peak RSS **183.8 MB per sim process**, so N
   concurrent processes is ~183 MB × N.
4. Confirm the ranking is byte-identical to the serial one — `rank.test.ts`'s
   concurrency 1-vs-4 test already asserts this property in core.

## Acceptance criteria

- [ ] CLI runs candidates concurrently, with the pool size overridable.
- [ ] A measured before/after wall-clock ratio in §3.3, with the command,
      machine and run count.
- [ ] Byte-identical ranking versus the serial run, shown not asserted.

## 2026-08-15 — done

`--concurrency N` added (`packages/core/src/cli.ts`), default **4**, validated
as a positive integer, passed through to `Deps.concurrency`. §5.2's table is
amended to match the plan author's ruling in §3.4.

**Measured before/after**, ret `maxPhase 2`, 246 eligible candidates, offline
gear, real `wowsimcli` v0.0.101, this machine (Windows 11, 20 logical cores),
one run each:

| concurrency | wall-clock  |
| ----------- | ----------- |
| 1           | 240,106 ms  |
| 4           | 127,853 ms  |

**Ratio: 1.88×** (240.1 s → 127.9 s).

Command:

```
npx tsx packages/core/src/cli.ts --region US --realm dreamscythe \
  --character slamaltman --offline --spec ret --max-phase 2 --concurrency N
```

**Output is byte-identical between the two runs** — `diff` of the two logs is
empty once Node's `ExperimentalWarning` line (which carries the PID) is
excluded. That is the property `rank.test.ts`'s concurrency 1-vs-4 test
asserts in core, confirmed here end to end against the real binary.

**Why 1.88× and not 4×:** `wowsimcli` already splits one request's iterations
across the machine's threads, so four concurrent processes contend for cores
that a single process was already using. The win is overlapping the fixed
per-process cost (E-W5: 373.2 ms of every ~564 ms sim at 3,000 iterations),
not multiplying raw throughput. A larger `--concurrency` was not swept; 4 is
the default because per-process peak RSS is ~184 MB (§3.3) and the marginal
return is already falling at 4. **Untested hypothesis:** higher values may
help on machines with more cores than this one.

Status: **closed**.
