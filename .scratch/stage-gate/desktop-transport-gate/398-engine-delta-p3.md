# 398 — native vs WASM on P3 ret gear

Measured 2026-09-15. Outcome **A** of the four pre-registered in
`.scratch/carry-forward/issues/398-go-native-vs-wasm-baseline-gap.md`, which was
committed in `558e80d2` **before** this run produced a number.

## Result

| | native | WASM |
| --- | --- | --- |
| `dps.avg` | `2224.6201817086526` | `2224.6201817086467` |
| `dps.stdev` | `128.0634683699089` | `128.06346836999978` |
| `iterationsDone` | 25000 | 25000 |
| wall clock | 1.8 s | 70.3 s |

**Delta 5.91e-12 DPS** — 12 ulps at this magnitude, relative 2.66e-15.

Recomputed 3-sigma band from this run's own stdev values:
`3 * sqrt(128.0634683699089^2 + 128.06346836999978^2) / sqrt(25000)` =
**3.436 DPS**. The delta is under it by twelve orders of magnitude, and also
under the 1e-9 signal threshold the pre-registration set as the real decision
line (the band assumes independent noise samples, which two builds of one
deterministic simulator are not).

For scale: the tab gap this ticket exists to explain is **159.3 DPS**, which is
2.7e13 times larger than what the two builds actually disagree by.

## What this establishes

The Go-native and `GOOS=js GOARCH=wasm` builds are the same computation on ret
gear at the current pin, differing only in float evaluation order. The ticket's
hypothesis — "two compilations of one Go simulator disagreeing numerically" — is
**refuted for P3 ret gear at pin `17a8fb28`**.

This extends experiment E-W1 (`docs/plans/wowsims-tab/plan.md` §8, 1.8e-12 DPS
on 2026-08-14), which measured a different input at an earlier pin. Both of
E-W1's limits are now closed: ret gear rather than the slamaltman fixture, and
the current engine pin rather than a pre-`17a8fb28` build. The agreement holds
at the same order of magnitude across both.

So the 159.3 DPS tab gap comes from **configuration, not compilation**.

## Method

Input: `data/presets/ret/p2.raid-sim-skeleton.json` with equipment replaced by
`vendor/tbc-new-fork/ui/paladin/retribution/gear_sets/p3.gear.json` (17 slots,
main hand 32332 Apolyon, two-handed). Nothing else altered — `simOptions` keeps
the committed `iterations: 25000` and `randomSeed: "443754031"`. An assertion
enforces that exactly one player in the request carries equipment.

Native: `wowsimcli-windows.exe sim --infile --outfile` at the pinned
`17a8fb28` build. That binary differs from the fork HEAD (`e94d927af`) by one
file under `sim/`, `sim/hunter/item_sets.go` — irrelevant to a paladin, verified
by `git diff --name-only 17a8fb28 HEAD -- sim/`.

WASM: `dist/tbc/lib.wasm` built at the fork HEAD, driven under Node by
`398-wasm-harness.mjs` (adapted from `scripts/ew5_overhead_wasm.mjs`). No
browser and no CDP. `SimDatabase` attached to the single real player, per that
harness's documented correction — `database` is a field on `Player`, not on
`RaidSimRequest`.

A 1000-iteration smoke run preceded the real one (pre-registered outcome D): a
missing or garbled database yields a plausible wrong number rather than an
error. It returned 2216.00, within 9 DPS of the native figure, so the injection
was sound before the 25000-iteration run was paid for.

Reproduce with `398-repro.sh <output-dir>`.

## What this does not establish

**A null on P3 gear does not clear P5 gear.** P3 is the highest ret gear preset
that exists in the fork — there is no P4 or P5 ret set, and no "3% hit" ret
variant (that convention exists only for hunter). The 159.3 DPS gap was observed
on P5 gear, which lives only as live page state and is committed nowhere. A
gear-conditional divergence that appears only above P3 is not excluded by this
measurement, though a two-handed main hand was deliberately chosen because
ADR-0033 Consequence 5 documents a weapon-type-conditional talent change, making
a two-hander where such an effect would most likely surface.

It also says nothing about the tab's own configuration, which remains
unrecorded: neither `readback-3333-tip.json` nor `readback-wasm-tip.json`
records a seed or an iteration count. That is now the open question, and it is
unanswerable from the committed artifacts.
