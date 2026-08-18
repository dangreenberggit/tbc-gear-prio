Status: open
Type: bug (measurement script; no shipped-code impact)
Origin: ticket 221 execution, 2026-08-18 — needed the cost ratio after raising
  `DEFAULT_PROMOTE_TOP_K` and found the script that reports it does not run
Blocks: none
Blocked by: none

# `measure-racing-ratio.ts` throws instead of reporting a ratio

`packages/core/test/measure-racing-ratio.ts` is the committed re-run command
for §6.4's cost ratio — the `rank.ts` `promoteTopJ` doc comment cites it, and
ticket 221 cited it too. It does not work.

```
npx tsx packages/core/test/measure-racing-ratio.ts
# RankError: every screening sim failed: 240 of 240 candidates lost every slot
#   attempt at 1000 iterations. First failure: no recording for sim key
#   6dd0c341ac2ae72058a45e91ac2b85e27bf9bce415a1fb833e44aab998ed456d:v0.0.101:42:1000
#   kind: 'sim-failed'
```

## Cause

The script replays the committed `ret` row through a plain
`RecordedSimRunner` (`packages/core/src/seams/sim-runner.ts`), whose `run()`
is an exact-key lookup that throws on a miss. The recorded fixture is a
**full sweep**: every observation is at 3000 iterations. Racing screens at
`DEFAULT_SCREEN_ITERATIONS = 1000`, so every screening lookup asks for a key
ending `:42:1000` that the fixture does not contain, and all 240 candidates
fail.

`racing.test.ts` does not hit this because it wraps the recordings in
`DerivedNoiseSimRunner` (`packages/core/test/racing-support.ts`), which looks
the observation up at the **recorded** seed/iterations regardless of the
caller's opts and derives the screening value. The measurement script never
got that treatment.

## Not a regression from ticket 221

Confirmed present at base SHA c6387fb57b9a4168443f21edcc1908e174466222 by
stashing that branch's changes and re-running — same error, same key. Ticket
221 worked around it by measuring the ratio through the same
`CountingSimRunner` the 7.0 gate uses, and recorded 0.6457 on the feral P3
pool and 0.9837 on feral P2 at K=210.

## Acceptance criteria

- [ ] `npx tsx packages/core/test/measure-racing-ratio.ts` runs to completion
      and prints a ratio.
- [ ] The fix routes screening lookups through the same derivation
      `DerivedNoiseSimRunner` uses, rather than re-recording the ret fixture
      at 1000 iterations — the fixture is a full-sweep truth by design.
- [ ] Any doc comment citing this script as a re-run command is checked to
      still be accurate once it runs (`rank.ts` `promoteTopJ`, and the
      `promoteTopK` table's ratio figures).
- [ ] Consider whether a measurement script cited by a doc comment should be
      reachable from `pnpm verify` in some smoke form, given this one was
      broken silently for long enough that nobody noticed.
