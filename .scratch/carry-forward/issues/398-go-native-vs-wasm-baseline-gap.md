# 398 — Go-native and WASM builds compute a 159 DPS baseline gap for identical gear

Status: open (re-scoped 2026-09-15 — the engine question is answered; the harness gap is what remains)
Origin: pre-merge review of feat/desktop-transport-gate (2026-09-14), domain-axis material finding
Blocks: —

## What

The desktop-transport gate measured the packaged Go-native `wowsimtbc` binary
compute a **baseline of 2231.5 DPS** for the same ret P5 gear where the WASM
build computes **2072.2 DPS** — a **159.3 DPS (~7.7%) gap** on the baseline
(current-gear) sim, which uses the per-candidate **loop route with no screening
involved**. So the gap is not a screening artifact; it is two compilations of one
Go simulator source disagreeing numerically for identical input.

## What is already known (so this is scoped, not open-ended)

- **Not seed choice.** Both runs used `DEFAULT_SEEDS = [11,22,33,44,55]`; a
  single-seed swing on one route is ~65 DPS (C12), smaller than 159 and
  orthogonal — the two routes agree to 0.3 DPS at a shared seed.
- **The desktop engine is internally reproducible.** Old-sha vs tip desktop
  baselines were 2229.7 vs 2231.5 (`baselineDpsDiff 1.8`, explained by ADR-0033
  Consequence 5), so the 2231.5 figure is stable, not a fluke.
- **The WASM figure is independently corroborated.** Chunk-1's committed readback
  recorded `baselineDps 2071.9` for the same WASM ret-P5 run; the gate's 2072.2
  matches to 0.3 DPS. So WASM is the corroborated value and the Go-native 2231.5
  is the outlier.

The gate's own screened-path check was correctly re-scoped to **same-transport**
(screened vs loop on the one Go binary, `baselineDpsDiff 0.0`), so this gap does
**not** invalidate the gate. The gate asserts the desktop engine agrees with
itself; it does not assert the two compilations agree with each other, and the
plan explicitly downgraded that cross-transport comparison to recorded-only.

## Why it is still worth a ticket

The brief's definition-of-done item 4 ("the same ranking within noise on both
transports") was written expecting the two compilations to agree, and they do not
at the baseline. "Two numerically distinct engines" is a reasonable *hypothesis*
but is currently untested — it could instead be a real configuration difference
(a different iteration count, a `GOAMD64`/float path, or a divergent code path
between the Go-native and `GOOS=js GOARCH=wasm` builds).

## How to settle

The direct observable the brief itself recommends: **one fixed-gear, fixed-seed
sim of identical gear through `wowsimcli` (native) vs the WASM build**, comparing
one DPS scalar. If they diverge by ~159 DPS at a fixed seed, it is a genuine
compilation-level engine difference (and worth understanding which side is
right); if they agree, the gap came from a config difference in the tab runs and
that config is the bug. ~25 s of simulation, per the engine-delta pattern in
`.scratch/stage-gate/upstream-catchup-chunk1/engine-delta.md`.

---

## Pre-registration, written 2026-09-15 before any number was produced

Everything below was written before the measurement ran. The point of writing it
first is that a result cannot then be rounded toward whichever story is most
convenient. `desktop-gate.md` § Q2 is the model — its three written candidates
were all wrong, which is how that finding got caught instead of rationalised.

### Corrections to this ticket's own "What is already known"

Two claims above are weaker than they read, and both were established by opening
the artifact rather than by argument.

**"Both runs used `DEFAULT_SEEDS`" is not a measurement.** Neither
`readback-3333-tip.json` nor `readback-wasm-tip.json` records a seed or an
iteration count; `seed`, `randomSeed` and `iterations` are all absent from both
files. The claim is an inference from reading `rank.ts:410-411,566-577`, and the
harness (`run-tab-cdp.mjs`) has no flag to override either value. The inference
is sound but it is a code-reading argument. A configuration difference between
the two tab runs is therefore **not** ruled out, and is a live candidate cause of
the 159.3 DPS gap.

**The engine-difference hypothesis has strong prior evidence against it.**
Experiment E-W1 (`docs/plans/wowsims-tab/plan.md` §8, run 2026-08-14) compared
WASM against native and recorded `2042.3926145882178` vs `2042.3926145882197` —
a delta of **1.8e-12 DPS**, smaller than native's own 20-thread/4-thread spread
of 6.8e-13. It was reproduced independently with a separately-written harness,
and §10 of that plan closes the risk "WASM != native numerically" on its
strength. Two limits keep this from settling the present ticket: E-W1 used the
**slamaltman fixture**, not ret gear, and ran **before** the `17a8fb28` engine
pin. So it is evidence about a different input at an earlier pin.

### What is being measured

One `RaidSimRequest`, identical on both sides, run through:

- **native**: `vendor/wowsimcli-17a8fb28c5ad14b649acecdaacd488594048f467-win32-x64/wowsimcli-windows.exe sim --infile <req> --outfile <out>`
- **WASM**: `globalThis.raidSimJson()` against `vendor/tbc-new-fork/dist/tbc/lib.wasm`
  under Node, adapting `scripts/ew5_overhead_wasm.mjs`. No browser, no CDP.

Both read the same scalar, `raidMetrics.dps.avg`, with `raidMetrics.dps.stdev`
alongside. `iterationsDone` is asserted to equal the requested iteration count on
both sides — a WASM run missing its injected `SimDatabase` returns a
plausible-looking wrong number rather than an error, so this guard is not
optional.

**Gear: the P3 ret preset**, `vendor/tbc-new-fork/ui/paladin/retribution/gear_sets/p3.gear.json`,
ids `32235, 30022, 30055, 33122, 30905, 32574, 29947, 30106, 30900, 32366, 30834,
32526, 29383, 28830, 32332, (empty), 27484`. P3 is the **highest ret gear preset
that exists** — the fork defines preraid/P1/P2/P3/P3-Bulwark for ret and nothing
above (protection paladin does have P4 and P5; ret does not). There is no ret
"3% hit" variant anywhere in the fork; that naming convention exists only for
hunter. So this is two phases below the P5 gear on which the 159.3 DPS gap was
observed, and that limit is stated in the result rather than glossed.

Main hand 32332 (Apolyon) is two-handed. This is deliberate: the largest single
row delta in the gate evidence was -19.10 on Apolyon, and ADR-0033 Consequence 5
documents a weapon-type-conditional talent change worth -80.35 DPS on
one-handers. If a divergence is gear-conditional, a two-hander is where it would
show.

### Why measure at all, given E-W1

Because E-W1 measured one input at one pin, and a property measured against one
option is not a comparison (AGENTS.md). This run tests **both** of the things
E-W1 did not: ret gear rather than a fixture, and the current pin rather than a
pre-`17a8fb28` engine. The cost is one `go build` plus ~90 s of simulation, which
is too cheap to justify substituting an argument for a number — especially on a
branch that has already produced three errors of exactly that kind.

### The decision threshold, and why the 3-sigma band is the wrong one alone

`engine-delta.md` lines 113-118 give the band as
`3 * sqrt(stdev_a^2 + stdev_b^2) / sqrt(iterations)`, which came to **3.107 DPS**
at 25000 iterations in ADR-0033's case. It will be recomputed from this run's own
stdev values rather than reused as a constant.

But that band assumes two independent noise samples, and these two runs are not
that. `engine-delta.md` lines 103-106 proved the native binary is **exactly
deterministic** at a fixed seed — three runs produced a bit-identical `dps` dict.
If the two builds share an RNG stream, as E-W1's 1.8e-12 agreement indicates,
they are the same computation in two float-evaluation orders, not two samples.
Judging against 3.107 would then pass a real difference of a few DPS.

So the **raw delta and its order of magnitude are the primary readout**, with the
band reported alongside as a loose upper bound. Concretely: a delta near 1e-12 is
float-ordering noise; anything above roughly **1e-9** is a genuine signal worth
chasing even though it sits far below 3.107.

### Pre-registered outcomes

**A. Delta at ~1e-12 (float-ordering noise).** The two compilations are the same
computation on ret gear at the current pin. E-W1 extends to this input and this
pin. The "two numerically distinct engines" hypothesis is then refuted for P3 ret
gear, and the 159.3 DPS tab gap must come from **configuration**, not
compilation — most probably the seed or iteration count that neither readback
records. Next step becomes the harness gap: make the readbacks record seed and
iterations, so a future disagreement is answerable at all. That is a fork edit
and joins the fork queue.

**B. Delta near 159 DPS.** A genuine compilation-level engine difference,
confirmed on the gear that matters. The ticket's hypothesis stands. The follow-up
is which side is correct — which matters commercially, since the tab ships the
WASM number to users while the desktop path is advertised as the faster option.

**C. Delta real but neither ~1e-12 nor ~159.** Do not round it toward either
story. Something differs in the compilation *and* something differs in the tab
configuration: two effects, not one. Both get chased separately.

**D. The WASM side fails to produce a trustworthy number** (`iterationsDone`
mismatch, or a DPS far from the native value on a low-iteration smoke run). Then
nothing is concluded about the engines. Fix the harness first; a wrong number
here is worse than no number, because it would look plausible.

### Limits stated in advance

A null result on P3 gear does **not** clear P5 gear, and the write-up will say
so. `engine-delta.md` § "What this test cannot detect" is the model. This
measurement also says nothing about the tab's own configuration, which remains
unrecorded and unmeasurable from the committed artifacts regardless of how this
run comes out.

---

## Result, 2026-09-15 — outcome A

Full write-up and method:
`.scratch/stage-gate/desktop-transport-gate/398-engine-delta-p3.md`.
Reproduce: `398-repro.sh` in the same directory.

| | native | WASM |
| --- | --- | --- |
| `dps.avg` | `2224.6201817086526` | `2224.6201817086467` |
| `dps.stdev` | `128.0634683699089` | `128.06346836999978` |
| `iterationsDone` | 25000 | 25000 |

**Delta 5.91e-12 DPS** (12 ulps). Recomputed 3-sigma band 3.436 DPS; the delta
is twelve orders of magnitude under it, and under the 1e-9 line the
pre-registration set as the genuine signal threshold. The gap this ticket exists
to explain is 159.3 DPS — 2.7e13 times larger.

**The two builds are the same computation.** The hypothesis that the Go-native
and WASM compilations disagree numerically is refuted for P3 ret gear at pin
`17a8fb28`, and this closes both of the limits on experiment E-W1 (different
input, earlier pin) by measuring ret gear at the current pin.

So the 159.3 DPS tab gap is a **configuration** difference, not a compilation
one — which lands on the thing this ticket could never check.

### What remains open, and it is the harness

Neither `readback-3333-tip.json` nor `readback-wasm-tip.json` records a seed or
an iteration count. With compilation ruled out, one of those is the most likely
cause of the gap, and **neither is recoverable from the committed artifacts**.
The evidence trail cannot answer the question the evidence raises.

The remaining work is therefore to make the tab harness record `seed` and
`iterations` in its readback JSON. That is a fork edit (`run-tab-cdp.mjs` and
whatever writes the readback) and joins the fork queue, which is strictly serial
on the single shared working tree.

Re-running the two full pool runs to re-measure the gap is **not** proposed here:
they cost 3419 s and 1668 s, and without the harness fix a repeat would produce
the same unanswerable pair of numbers.

### Limit on the above

A null on P3 gear does not clear P5 gear, on which the gap was seen. P3 is the
highest ret gear preset in the fork; there is no P4 or P5 ret set anywhere, and
no "3% hit" ret variant (that naming exists only for hunter). A gear-conditional
divergence appearing only above P3 remains possible, though the P3 main hand is
a two-hander (32332 Apolyon), chosen because ADR-0033 Consequence 5 documents a
weapon-type-conditional talent change and a two-hander is where such an effect
would show.

## Domain finding, 2026-09-16 (pre-merge review of feat/desktop-transport-gate)

The domain reviewer eliminated an entire family of hypotheses. Both readbacks
capture the rendered character sheet in their `sample` field, and the two runs
that differ by 159.3 DPS report **identical stats**: Attack Power 3895, Melee
Crit 286 (51.65%), Melee Hit 66 (10.19%), Expertise 73 (4.50%), Strength 632,
Agility 551, Stamina 766, Shadow Resistance 75, and "Melee Crit Cap: Under by
27.28%" on both.

Character stats are downstream of gear, gems, enchants, raid buffs and
consumables, so identical stats rule out that whole family as an explanation
for a 7.7% gap.

What remains, in the reviewer's order of likelihood — this is domain
judgment, not measurement:

- Fight length / encounter duration. Ret is cooldown- and mana-shaped, so
  duration moves DPS several percent and is invisible on the stat sheet. Most
  plausible single source of a clean 7-8%.
- Target count, or target armour/level.
- Iteration count or seed set — but note this **cannot be the whole
  explanation**: 159.3 DPS is far outside the ~3.3 DPS SE of a 3000-iteration
  run, so seed noise alone cannot produce it; it could only contribute
  alongside a different fight configuration.

Also record: both readbacks display the header "Phase 3 (2.2 - T6) - Alpha"
while `phaseSet` is `5`, so the runs' encounter defaults are worth reading
directly from the page's Settings tab rather than inferred.

This narrows the ticket's remaining scope; it does not resolve it, and the
ticket stays open.
