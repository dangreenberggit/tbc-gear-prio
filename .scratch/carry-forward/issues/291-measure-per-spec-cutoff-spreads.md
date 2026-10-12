Status: wontfix
Type: measurement
Origin: stage-gate feature upgrades-all-dps-specs, step 4, 2026-08-25
Blocks: none
Blocked by: none

# Measure a five-seed spread for each of the nine new DPS specs

`CUTOFF_BY_SPEC` (`packages/core/src/cutoff.ts`) is now total over
`SpecId`, and the nine specs added by the all-DPS-specs pass — balance,
hunter, mage, shadow, rogue, ele, enh, warlock, warrior — all carry ret's
derived numbers (`absDps: 3.4, pct: 0.15`) with an `untested` comment.

That is the same value they would have received from the old
`Partial` + `?? CUTOFF` fallback, so nothing regressed. What changed is
that the debt is now written at the point of definition instead of hiding
in a coalescing operator, which is why this ticket exists at all.

## Why it matters

The cutoff is a noise floor: it decides which rows are called
distinguishable from zero. Ret and feral each have their own, derived by
the same method from their own five-seed spread, and they differ — feral's
is 3.6 against ret's 3.4, because feral's rotation is measurably noisier
at the same 5,000 iterations
(`docs/five-seed-spread.json`, `docs/five-seed-spread-feral.json`).

A spec noisier than ret is therefore **under-filtered** today: rows inside
its real noise band are being presented as ordered when they are not
distinguishable. A spec quieter than ret is over-filtered and loses real
upgrades below the bar. Neither failure announces itself.

## What to do

For each of the nine, follow the method ret and feral already used:

1. Build the spec's fixture the way
   `scripts/five_seed_spread_feral.py` does for feral (it needs
   `pnpm fetch:wowsimcli` and a composed raid-sim request).
2. Run five seeds at 5,000 iterations and take
   `max(3.0, 2 x mean reported SE)`.
3. Write the result to `docs/five-seed-spread-<spec>.json` and give the
   spec its own constant in `cutoff.ts`, next to `CUTOFF_FERAL`.

## Done when

Every `SpecId` in `CUTOFF_BY_SPEC` names a constant derived from its own
spread, and no entry carries the `untested` comment.

## Closed 2026-10-11: wontfix, superseded by ADR-0037

The owner ruled on 2026-10-11 that the cutoff is one flat 3 DPS bar for
every spec ("Just do 3 DPS then fuck it"; "It was more about simming noise
anyway probably, the methods of getting rid of it were arbitrary"), recorded
in `docs/adr/0037-the-cutoff-is-one-flat-3-dps-bar.md`. No spec has a
measured bar any more, so a per-spec spread has nothing to feed:
`CUTOFF_BY_SPEC`, `CUTOFF_FERAL` and the `untested` comments are gone
(tbc-gear-prio branch `feat/flat-cutoff`, fork commit be3d703a1). Sim noise
itself stays with ticket 105.
