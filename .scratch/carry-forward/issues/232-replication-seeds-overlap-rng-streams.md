Status: open
Type: defect
Origin: ticket 225's reopened-scope measurements, 2026-08-19 (claims C20/C21)
Blocks: 233
Blocked by: none

# Replication seeds overlap RNG streams — DEFAULT_SEEDS 11..55 are near-duplicate runs at 3000 iterations

`DEFAULT_SEEDS = [11, 22, 33, 44, 55]` (`packages/core/src/rank.ts`, the
`grep -n "DEFAULT_SEEDS" packages/core/src/rank.ts` line) are the five seeds
every replicated ranking uses, and the shipped paired-replicate SE is computed
from the spread across them. At 3,000 iterations those five runs are not
independent samples: they share most of their RNG streams, so their spread
measures almost nothing and the SE derived from it is far too small.

## The measurement

`scripts/seed_overlap_probe.py` runs one fixture request at a chosen iteration
count across a list of seeds and reports the sample sd of the run means
against the sim's own reported SE. Needs the pinned binary
(`vendor/wowsimcli-v0.0.101-win32-x64/`, gitignored — `pnpm fetch:wowsimcli`,
must report v0.0.101). Exits 2 with that hint when it is absent.

Two arms, both re-run on 2026-08-19 from the worktree with vendor present:

```
python scripts/seed_overlap_probe.py <outdir> 3000 11 22 33 44 55
  spread max-min=0.4463  sampleSd=0.1880  meanReportedSE=2.1726  sampleSd/SE=0.087

python scripts/seed_overlap_probe.py <outdir> 3000 11 3011 6011 9011 12011
  spread max-min=2.7563  sampleSd=1.1140  meanReportedSE=2.1410  sampleSd/SE=0.520
```

The shipped seeds give a sd 11× smaller than the reported SE. Seeds spaced
3,000 apart — one full iteration count — give a sd 6× larger than the shipped
seeds do. The ratio is what matters: near 1.0 means independent runs, far
below means shared streams.

The same pattern at 5,000 iterations (recorded in ticket 225's C20): seeds
11/12/13 give sd 0.024, seeds 11/100011/2000011/3000011 give sd 1.489 against
a mean reported SE of 1.673.

**Mechanism — CONFIRMED in source, 2026-08-19.** Iteration `i` seeds from
`RandomSeed + i`, exactly as hypothesised:

```go
// vendor/tbc-new-fork/sim/core/sim.go:248-251
func (sim *Simulation) reseedRands(i int64) {
	rseed := sim.Options.RandomSeed + i
	sim.currentSeed = rseed
	sim.rand.Seed(rseed)
```

and that is called once per iteration inside the run loop:

```go
// vendor/tbc-new-fork/sim/core/sim.go:347-348
		// Before each iteration, reset state to seed+iterations
		sim.reseedRands(int64(i))
```

So a run of `N` iterations from seed `S` consumes the per-iteration streams
`S .. S+N-1`. Two seeds `a < b` overlap on `N - (b - a)` of them. For the
shipped `DEFAULT_SEEDS` at 3,000 iterations, seeds 11 and 22 share 2,989 of
3,000 streams — **99.6 % overlap** — which is why their spread measures almost
nothing.

**Upstream independently applies the fix this ticket proposes.** Its concurrent
split path spaces sub-run seeds by exactly the iteration count, for exactly
this reason:

```go
// vendor/tbc-new-fork/sim/core/sim_concurrent.go:39-40
	// Sims increment their seed each iteration. Offset starting seed of each split to emulate that.
	nextStartSeed := split[0].SimOptions.RandomSeed + int64(split[0].SimOptions.Iterations)
```

That is upstream treating "spaced by `iterations`" as the condition for two
runs to behave like independent continuations. The proposed fix below is the
same rule applied to replicate seeds.

Note `vendor/` is gitignored and absent from a fresh worktree; the citations
above were read from a checkout where `pnpm sync:wowsims` had already
populated `vendor/tbc-new-fork/`.

## Why it matters beyond the SE number

`docs/verification-log.md` "Stage 1, first sitting" read the 0.099 spread
across these seeds as evidence that "seeds barely move the mean" — a
substantive conclusion about sim stability. It is an artifact of seed overlap.
Any other conclusion drawn from the spread of `DEFAULT_SEEDS` is suspect the
same way and should be re-checked.

## Proposed fix

1. Confirm the mechanism in the upstream RNG source, or refute it.
2. Space `DEFAULT_SEEDS` at least `iterations` apart (e.g. 11, 3011, 6011,
   9011, 12011 at 3,000 iterations) — or derive the spacing from the
   iteration count rather than pinning constants, since the current constants
   are only wrong *relative to* 3,000.
3. Re-derive the paired-replicate SE evidence with the new seeds, and correct
   the `docs/verification-log.md` Stage 1 entry with what the spread actually
   shows.
4. Re-record any committed fixture whose recordings are keyed by these seeds,
   or document why the recorded numbers are unaffected.

## Acceptance

- [x] Mechanism confirmed against upstream source, cited by file and line
      (`sim/core/sim.go:248-251` and `:347-348`; corroborated by
      `sim/core/sim_concurrent.go:39-40`).
- [ ] `DEFAULT_SEEDS` spaced so `sampleSd/SE` from `seed_overlap_probe.py` is near 1.0 at the shipped iteration count.
- [ ] Paired-replicate SE evidence re-derived and the verification-log entry corrected.
- [ ] `pnpm verify` green.
