# 398 — Go-native and WASM builds compute a 159 DPS baseline gap for identical gear

Status: open
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
