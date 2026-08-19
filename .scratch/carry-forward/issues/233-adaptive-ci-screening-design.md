Status: open
Type: design + measurement (build nothing until the validation below passes)
Origin: ticket 225's reopened-scope measurements, 2026-08-19 (claim C17c)
Blocks: none
Blocked by: 232

# Adaptive per-candidate sims until the CI clears — z=3 fixed, measured 0.591/0.764/0.760 wall under the noise model

Ticket 225 removed racing (ADR-0026) after six candidate mechanisms were
measured against a bar fixed before the measurement. Five failed. This one
cleared the cost term, and is the only reason "screening" is an open question
at all rather than a closed one.

## The mechanism

Not a re-parameterisation of racing. Racing screens everything at a low
iteration count, ranks the noisy deltas, promotes the top K, and re-sims the
promoted rows from scratch. This instead treats each candidate as its own
sequential test:

- Sim the candidate at 1,000 iterations.
- While the pooled estimate's confidence interval still straddles the cutoff
  decision — that is, `|pooled − boundary| <= z · SE_pair` — add another 1,000
  iterations, up to 3,000.
- Stop as soon as the interval clears the boundary on one side or the other.
- **Keep the pooled estimate.** There is no separate full sim on promote.

`z` is fixed at 3 in advance. That matters: choosing `z` per fixture on the
truth (2/2/3) buys a better number (0.536/0.672/0.760) but violates the
criterion, so the fixed-z row is the one that counts.

The "no separate full sim" part is where the saving comes from, and it is also
the part that carries the risk — see the precision term below. The variant
that *does* re-sim on promote (C17b) fails outright: 0.874/1.196/1.227.

## What is measured, and what is not

Reproduce with (needs `vendor/wowsims/*.gear.json`; ~10 min):

```
npx tsx packages/core/test/measure-screening-alternatives.ts
```

Section `[B/C]`, the `z=3` row, over 30 noise draws per fixture:

| Fixture | wall ratio | iteration ratio | rows ending < 3000 it | mean pooled err | recall misses |
| --- | --- | --- | --- | --- | --- |
| ret | 0.591 | 0.517 | 14.8 | 1.84 DPS | 0 |
| feral | 0.764 | 0.668 | 5.8 | 2.52 DPS | 0 |
| feral-p3 | 0.760 | 0.665 | 19.4 | 2.62 DPS | 0 |

Wall ratios are under candidate-pool.md §3.4.1's cost model
`cost(it) = 748.4 + 3.2446·it` ms. All three clear the criterion's 0.8 bar at
zero recall misses.

**Three things this evidence is not.**

1. **It is a noise-model simulation, not a real-binary run.** The "sims" are
   the committed full-iteration recordings plus `gaussian · stdev/√it`, the
   same `DerivedNoiseSimRunner` racing's own gates used. Whether real
   wowsimcli noise at 1,000 and 2,000 iterations behaves like that model is
   assumed, not shown.
2. **The precision term is scored but not judged.** The script now reports
   mean `|pooled − truth|` over promoted rows (the table above). Nothing has
   decided whether 1.8–2.6 DPS of error on rows the user actually sees is
   acceptable. For scale, the cutoff boundary itself is 2.752/2.929/2.929 DPS
   — the error on a coarse row is comparable to the bar it was measured
   against.
3. **It rests on seed independence, which is currently false.** Ticket 232
   shows `DEFAULT_SEEDS` are near-duplicate runs at 3,000 iterations. A
   mechanism whose entire decision rule is "has this CI cleared the boundary
   yet" cannot be validated on replicates that do not vary. **232 is a
   prerequisite, not a nicety.**

## Validation plan — do this before writing any engine code

Win condition, both terms required:

- **Cost:** wall ratio ≤ 0.8 against a full sweep at zero recall misses, with
  `z` fixed in advance, on every committed gating fixture.
- **Output precision:** every row the shortlist or top-N actually shows
  reaches ≥ 3,000 iterations, or is replicated there before display; and mean
  `|pooled − truth|` over promoted rows is reported against the full-sweep
  baseline in the table above.

Procedure:

1. **Land ticket 232 first.** Re-derive far-apart seeds.
2. **Pick one fixture** — `feral-p3` is the right one: largest pool (365
   eligible, 85 above cutoff), weakest EP correlation, and the most coarse
   rows (19.4).
3. **Drive the real binary, not the noise model.** The shape that works, and
   the one the anchor facts below were taken with: wrap the recorded runner in
   a capturing runner so every `RaidSimRequest` the ranker composed is kept,
   then replay chosen requests through `CliSimRunner` against the pinned
   binary at whatever iteration count you want. Do **not** hand-build
   character JSON — the ticket-106 style of hand-assembled requests can differ
   from what `rank.ts` actually sends in gems and buffs, which silently
   invalidates the comparison.

   A working draft of exactly this (`direct-sim-support.ts` +
   `measure-direct-sim-sanity.ts`, written for tickets 226/227) was produced
   on 2026-08-19 but is **not tracked** — it lives outside ticket 225's paths
   manifest, so it was left as an untracked artifact rather than committed
   here. If it cannot be recovered, rewriting it is perhaps an hour: the parts
   that matter are `CapturingSimRunner` around `RecordedSimRunner`, and a
   `simDirect(request, {iterations, seed})` helper over
   `packages/core/src/seams/cli-sim-runner.ts` that resolves the binary the
   way `scripts/five_seed_spread.py`'s `resolve_cli` does and throws with the
   `pnpm fetch:wowsimcli` hint when it is absent.
4. **Two anchor facts, measured 2026-08-19 with that scaffolding on feral-p3**
   (`npx tsx packages/core/test/measure-direct-sim-sanity.ts` from the main
   checkout, binary v0.0.101):
   - Replaying a captured request at the recorded seed and iteration count
     reproduces the recorded DPS **exactly** — baseline 1952.5249585538932 both
     ways, Δ 0.0000 DPS. So a direct sim is measuring the same thing the
     fixture recorded, and comparisons against truth can be exact rather than
     read against SE.
   - Wall cost is **654 ms at 3,000 iterations and 2,877 ms at 30,000** for one
     geared sim (SE 3.27 → 1.04 DPS). Budget the validation from these.
   - Note for whoever runs this: those wall figures are the *native CLI* with
     concurrency, and are far below what §3.4.1's WASM model
     (`748.4 + 3.2446·it`) predicts. The model is the browser-path budget and
     is the right yardstick for the cost term; do not accidentally validate
     the cost term against native timings.
5. **Establish truth** by full-sweeping the fixture at 3,000 iterations with
   the new seeds, then **run the adaptive rule** against the real binary at
   the same seeds and compare: recall misses, wall time, per-row iteration
   counts, and `|pooled − truth|` for every promoted row.
6. **Judge the precision term explicitly** and write the judgement down. If
   coarse rows are unacceptable at display time, the fallback is to keep the
   adaptive rule for the *cutoff decision only* and replicate anything shown
   to 3,000 — which costs back some of the saving, so re-measure the cost term
   under that variant before adopting it.

Only if both terms pass does this become an implementation ticket. It is a new
stage shape — pooled estimates, per-row iteration counts, a coarse-row state
that the view and report have to represent honestly — so it needs its own
design pass, not a patch to the removed racing code.

## Acceptance

- [ ] 232 landed; far-apart seeds in use.
- [ ] Adaptive rule measured against the real binary on feral-p3, cost and precision terms both reported.
- [ ] Explicit written judgement on whether the pooled-estimate error is acceptable at display time.
- [ ] Verdict recorded: adopt (with a design pass to follow), adopt-with-replication, or reject.
