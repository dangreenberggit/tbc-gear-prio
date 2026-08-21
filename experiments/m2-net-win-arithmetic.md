# Is racing a net win? The arithmetic §6.4's ratio does not show

Computed by the orchestrator, 2026-08-15, during the fix-round review of
`feat/candidate-pool`. **No new measurement** — this combines numbers already
committed elsewhere, and every input is cited. Re-run: the `node -e` snippets
below.

## Why the ratio alone is not the answer

§6.4 measures **full-iteration sims issued ÷ eligible** = 169/240 = **0.7042**.
That is a count, not a cost. It omits the screening pass entirely: racing also
issues **240 screening sims** that the pre-M2 flow never ran. So a ratio below
1.0 does not by itself mean racing is cheaper — it means fewer _full_ sims were
issued, while a whole extra pass was added.

The question §6.4 cannot answer is whether the screens cost less than the full
sims they avoid.

## Inputs (all previously committed)

| quantity                    | value                | source                               |
| --------------------------- | -------------------- | ------------------------------------ |
| eligible candidates         | 240                  | §6.4 measurement, ret tuning fixture |
| promoted (full sims issued) | 169                  | §6.4, `measure-racing-ratio.ts`      |
| `screenIterations`          | 1000                 | slice E default, `promotion.ts`      |
| full iterations             | 5000                 | §3.2's reference point               |
| WASM `t_fixed` / `t_iter`   | 748.4 ms / 3.2446 ms | §3.3 WASM table (ticket 203)         |
| CLI `t_fixed` / `t_iter`    | 373.2 ms / 0.0637 ms | §3.3 CLI table (E-W5 §3.1)           |

`cost(I) = t_fixed + t_iter × I`. Pre-M2 flow = `240 × cost(5000)`. Racing =
`240 × cost(1000) + 169 × cost(5000)`.

## Result — racing at the shipped defaults

| runtime | pre-M2   | racing   | outcome         |
| ------- | -------- | -------- | --------------- |
| WASM    | 4073.1 s | 3826.5 s | **saves 6.1%**  |
| CLI     | 166.0 s  | 221.8 s  | **costs 33.6%** |

**On the CLI, racing is a net loss of a third.** That is consistent with §3.4's
own finding — the CLI floor is 0.609, so a screen is never cheap there — and it
is why `fullPool` matters as more than an escape hatch. **On WASM, the runtime
racing was resumed for, it saves 6.1%**, not the ~60% the ≤0.4 ratio target
implied.

The mechanism is both terms working against it: a 1000-iteration screen costs
**0.235** of a full sim (§3.4.1's own table), and `promoteTopK = 150` still
full-sims 70% of the pool. `0.235 + 0.70 ≈ 0.94` of the original work.

## What the prize actually is

Savings on WASM if `promoteTopK` could come down (percent saved vs 240 full
sims):

| `screenIterations` \ promoted | 60   | 100  | 120  | 150  |
| ----------------------------- | ---- | ---- | ---- | ---- |
| 300                           | 64.9 | 48.2 | 39.9 | 27.4 |
| 1000                          | 51.5 | 34.8 | 26.5 | 14.0 |
| 2000                          | 32.4 | 15.7 | 7.4  | -5.1 |

(The 150 column reads slightly higher than the 6.1% above because it uses the
top-K count rather than the measured 169, which includes best-in-slot,
set-package and owned promotions.)

Racing at `screenIterations = 300` with ~60 promoted would save **~65%** on
WASM. The shipped defaults capture almost none of that, and the reason is
`promoteTopK = 150`, which slice E measured as the smallest global K that
clears 7.2's recall gate on a fixture whose 42 above-cutoff rows occupy
contiguous ranks 1–42.

## What this says about per-slot top-_j_

§8.1 carries an unresolved disagreement — Dean for per-slot promotion, Fowler
and Beck for deferring until a measurement names a starved slot. Three
independent results now point the same way:

1. **M1.5**: above-cutoff misses cluster by slot (on ret, all six worst-ranked
   upgrades are cloaks; on feral, belts and necks). Per-slot top-10 recalled
   everything where a global cap needed ~114.
2. **§6.4**: the global-K rule cannot reach the ratio target at any K that
   passes recall.
3. **This table**: the savings live at small promoted counts, which is exactly
   what a per-slot rule buys — recall without a large global K.

That is not proof. _j_=10 was fit on the same two fixtures it was judged
against (§8.1 records that limit), and none of this is measured in a browser.
But the case is now quantified rather than argued: it is worth roughly the
difference between 6% and 65% on the runtime M2 exists for.

## Honest limits

- **Arithmetic over committed measurements, not a new measurement.** Nobody has
  run racing end to end and timed it.
- Both cost models are **Node-hosted** (native CLI, and WASM under Node). A
  browser adds `postMessage`, throttling and worker contention — ticket 156
  still owns that number.
- 169 promoted is one measurement on the **ret tuning fixture**. Feral's
  density differs, and a real user's gear differs from both.
- Set-completion and replication sims are excluded from both sides. They are
  roughly common to both flows, so they dilute the percentages rather than
  reverse the sign.

## Which criterion actually promotes? (orchestrator, fix-round review)

The Linus review axis raised a reasonable objection to everything above:
`setPackageItemIds` is built as `ordered.filter(e => getItem(e.itemId)?.setId != null)`
— **every item with a set id**, not the packages `selectPackage` actually sims.
If that clause were promoting most of the pool, then §6.4's "the ratio target
is unreachable" would be measuring an over-broad `.filter()` rather than a law
about recall.

Measured, by temporarily instrumenting `promotionRule` and re-running
`measure-racing-ratio.ts` on the ret tuning fixture (probe removed afterwards;
`git checkout -- packages/core/src/promotion.ts`):

| criterion                          | rows   |
| ---------------------------------- | ------ |
| promoted (total)                   | 160    |
| in global top-K                    | 150    |
| best-in-slot                       | 14     |
| set-package member                 | 13     |
| owned                              | 14     |
| **promoted by anything but top-K** | **10** |
| **promoted by set-package alone**  | **6**  |

**The objection does not hold, and the conclusion survives.** Top-K promotes
150 of 160; every other criterion combined adds 10 rows, and the over-broad
set clause is solely responsible for 6. Removing that clause entirely would
move the ratio from 0.704 to about 0.68 — nowhere near the 0.4 target.

So §6.4's tension is real: it is the global-K rule against this fixture's
above-cutoff density, exactly as recorded, and not an artifact of the set
filter. The set clause is still over-broad and worth tightening on its own
merits (it promotes set pieces no `selectPackage` would choose), but it is not
what makes the target unreachable.

(The 160 here versus §6.4's 169 full sims is the paired-slot effect: finger and
trinket candidates each sim twice, so a promoted-row count and a sim count are
not the same number.)
