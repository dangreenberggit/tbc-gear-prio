Status: open
Type: measurement precision (verdict unaffected)
Origin: fix-round review of `feat/candidate-pool`, perf axis, 2026-08-15
Blocks: none
Blocked by: none

# WASM `t_fixed` is published to four figures but is an unstable intercept

`experiments/e-w5-overhead-wasm.md` and candidate-pool §3.3 publish
`t_fixed` = **748.4 ms** and floor = **0.0441**. The fit reproduces exactly,
but it is a poor fit where it matters. Residuals against the five medians:
+182.9, +133.5, +71.3, **−904.3**, +516.6 ms. RMSE is 477.7 ms — **64% of the
`t_fixed` being extracted from it** — and the sign pattern is structured, not
noise (marginal cost swings 2.76 → 3.96 ms/iter, so the curve is not linear
over this range). `t_fixed` is an intercept extrapolated below the sampled
region; the nearest point is 100 iterations, where the fit is already 183 ms off.

Sensitivity, each a defensible choice: median 748.4 / mean 716.3 / min 612.1 /
drop-3000 846.7 / two-point 924.4, giving floors 0.0441 / 0.0420 / 0.0366 /
0.0485 / 0.0529. A 20,000-draw bootstrap gives a floor 95% interval of
**[0.0294, 0.0501]**.

**The M2 go decision is unaffected and should not be reopened**: every
estimator and the whole bootstrap tail sits below 0.053, clearing the 0.25
gate by ~5×. What is unsupported is treating 748.4 ms as a measured quantity
downstream — §3.4.1 hands it forward as a cost-model input, and a consumer
treating it as ±small will build a wrong budget.

Related: the harness docstring promises a boot-vs-call split "recorded in the
output" that does not exist, and `runOnce` starts its timer *after*
`bootInstance()` returns — so `wallMs` **excludes** instance boot, while
`e-w5-overhead-wasm.md` and §3.3 both say it includes it as an upper bound.
Three artifacts describe the same number three ways. The framing is wrong in
the safe direction (boot excluded means `t_fixed` is not inflated), but the
justification a reader is given for trusting the number describes code that is
not there.

## Done when

- [ ] `t_fixed` is published as a range or explicitly labelled an
      extrapolated intercept, wherever it is handed downstream.
- [ ] The harness docstring matches what the harness measures, or the split it
      promises is implemented and reported.
