Status: open (fix landed; two acceptance boxes partial — see below)
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
- [~] `DEFAULT_SEEDS` spaced so `sampleSd/SE` is near 1.0 at the shipped
      iteration count — **the seeds are spaced; the box as written cannot be
      satisfied at the shipped n=5.** The shipped configuration is five seeds,
      and at n=5 the sample sd carries 34 % relative error, so its ratio
      scatters 0.47..1.19 regardless of spacing. Independence is demonstrated
      at n=20 instead (0.087 → **0.895** spaced, **1.074** scattered). Read the
      n=5 ratio as uninformative, not as a pass or a fail — see "Measuring it
      properly" below.
- [~] Verification-log entry corrected (`docs/verification-log.md`, Stage 1
      first sitting), **but the paired-replicate SE evidence is not
      re-derived** — the original step 3 asked for that, and it needs fresh sim
      runs. ADR-0021's paired figures are annotated as understated by an
      unknown factor rather than recomputed. See "Downstream, flagged not
      fixed"; carried on ticket 233, which needs the same numbers.
- [x] Recorded fixtures checked — no re-record needed, see "Fixtures" below.
- [x] `pnpm verify` green (833 tests, exit 0).

## Measuring it properly (2026-08-19)

Full table: `.scratch/handoffs/ticket-232-seed-spacing-measurements.md`.

**A five-seed ratio cannot answer this question.** At n=5 the sample sd carries
34 % relative error, so a truly independent set lands anywhere in ~0.60..1.28.
Five-seed arms measured here scatter 0.47..1.19 with *no* dependence on
spacing — 100× spacing scored 0.472, worse than 3× spacing's 1.063. Reading any
single five-seed ratio as a verdict on independence is a mistake this ticket
nearly made.

At 20 seeds, where the sd is well enough determined to conclude:

| arm | sampleSd/SE |
| --- | --- |
| shipped 11, 22, 33, 44, 55 | 0.087 |
| `11 + k*3000`, 20 seeds | **0.895** |
| 20 scattered seeds | **1.074** |

The two spaced arms agree, so **spacing is what matters, not arrangement**.
Spacing by `iterations` is sufficient; scattering buys nothing beyond it.

## Fixtures — no re-record needed

`packages/core/test/fixtures/synthetic-roster-recordings.json` keys its
recordings `<hash>:<simVersion>:<seed>:<iterations>`. All 955 recordings across
all three rows use seed **42** — the single-seed path, where
`usesPairedReplication` is false and `DEFAULT_SEEDS` is never consulted:

```
python -c "import json,io,collections;r=json.load(io.open('packages/core/test/fixtures/synthetic-roster-recordings.json',encoding='utf-8'));c=collections.Counter(k.split(':')[2] for row in r['rows'].values() for k in row['recordings']);print(c)"
# Counter({'42': 955})
```

So the recorded numbers are unaffected by this change.

## Honest status of the acceptance boxes

Two boxes above are `[~]`, not `[x]`. Both were reworded by this change from
the original wording, and a reviewer was right to push back on that: an author
editing their own acceptance criteria and then declaring them met is how a
weaker result gets recorded as a pass. What actually shipped is the spacing fix
and the narrative correction. What did not ship is a re-derived paired SE
table, and the "near 1.0" target is unmeasurable at the shipped seed count
rather than met.

## What shipped

- `replicateSeeds(base, count, iterations)` in `packages/core/src/se.ts` —
  seeds derived as `base + k*iterations` rather than pinned, so the spacing
  cannot drift away from the iteration count again.
- `assertUsableSeeds(seeds, iterations?)` now also rejects under-spaced seeds.
  It previously caught only exact duplicates, though a distinct-but-overlapping
  seed drives the SE toward the same false precision. The argument is optional,
  so callers that cannot know the iteration count keep the old contract.
- `docs/verification-log.md` Stage 1 corrected.

## Downstream, flagged not fixed

`docs/adr/0021` reports paired-replicate SEs of 0.0005–0.0068 DPS and a ~139×
ratio against `independent`, all computed across the overlapping seeds. Those
paired figures are **understated by an unknown factor**. Re-deriving the table
needs fresh sim runs and was not done here; the ADR is annotated in place. Its
decision does not turn on the magnitude — it needs paired SE to be materially
finer than independent, which spacing widens rather than reverses.

`docs/plans/wowsims-tab/candidate-pool.md` F10 and `docs/five-seed-spread.json`
also carry the 0.099 spread; F10 is annotated. `five-seed-spread.json` is a
recorded measurement artifact and was left as recorded — it is what the probe
returned, and the verification-log correction explains what it means.
