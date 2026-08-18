Status: resolved
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

- [x] `npx tsx packages/core/test/measure-racing-ratio.ts` runs to completion
      and prints a ratio.
- [x] The fix routes screening lookups through the same derivation
      `DerivedNoiseSimRunner` uses, rather than re-recording the ret fixture
      at 1000 iterations — the fixture is a full-sweep truth by design.
- [x] Any doc comment citing this script as a re-run command is checked to
      still be accurate once it runs (`rank.ts` `promoteTopJ`, and the
      `promoteTopK` table's ratio figures).
- [x] Consider whether a measurement script cited by a doc comment should be
      reachable from `pnpm verify` in some smoke form, given this one was
      broken silently for long enough that nobody noticed.

## Measured (repaired script)

Date 2026-08-18. Command, from the repo root:

```
npx tsx packages/core/test/measure-racing-ratio.ts
```

```
eligible: 240
full-iteration sims issued: 233
screening sims issued: 264
promoted rows: 210
screened-out rows: 30
above-cutoff rows: 48
ratio: 0.9708
```

Checks: 233 / 240 = 0.970833..., which is the printed 0.9708 to 4 dp; the
script did not throw, so 233 >= 210 + 1 and 233 < 240 both hold; two runs
redirected to files diff empty.

`above-cutoff rows` counts 48, not the 78 first recorded here. See "The
above-cutoff count was wrong" below; the ratio is unaffected.

This is the **ret** P2 tuning pool at the shipped `DEFAULT_PROMOTE_TOP_K = 210`.
It corroborates rather than contradicts the feral figures the `promoteTopJ`
comment records: feral P2 is 0.9837 at the same K, and 0.9708 sits 1.3 points
from it. Both are **P2 pre-raid** pools, and the agreement is scoped to that
tier: a pre-raid pool is shallow and flat, the character owns few good items,
so K=210 admits nearly every eligible candidate. The one P3 figure on record
(feral P3, 0.6457) is materially lower, where racing does real work. Do not
read "racing barely beats a full sweep" as a claim about P3.

The earlier 0.7042 in candidate-pool.md was measured at K=150 and is not
comparable to either; the script as shipped takes no K override, so it cannot
reproduce that figure without an edit.

### SME notes carried forward

From `.scratch/handoffs/sme-rank-judgment-ticket-223-ret-p2.md`
(verdict: trust-with-caveats; the 30 screened-out rows are all genuine deep
losses, -44.9 to -81.3 DPS, wrong armour class or healer/caster plate):

- **Furious Gizmatic Goggles at rank 7 (+23.3)** assumes the fixture ret has
  engineering. Goggles are profession-locked; if the fixture character is not
  an engineer the row is unwearable and should not rank. **Unverified** — nobody
  has checked the fixture's professions.
- **`ranged`: 4 eligible, 0 above cutoff.** A ret's ranged slot is a libram and
  a libram's value is its effect, not its stat line. Plausible if the character
  already holds a good libram, but it is the one slot where zero could instead
  mean the effect is not being valued at all. Flagged **unsure**, not as a
  defect.

Neither is in scope for this ticket; both are recorded so they are not lost.

### The above-cutoff count was wrong

First recorded here as 78. The SME dumped the rows: 48 genuine upgrades plus
all 30 screened-out rows, which the script was counting as above cutoff.

The cause is the **script**, not shipped ranking behaviour. `rank.ts` sets
`belowCutoff: false` on screened rows deliberately — the `screened` field's
doc comment calls a screened row "a third view state, distinct from
`belowCutoff` ('measured and small') because a screened row was never measured
at full precision at all". The game-facing rule lives in `view.ts`
`belowCutoffUnderView`, whose first line is `if (item.screened !== undefined)
return true;`. The presentation layer has always been right; the script read
the raw field and skipped the rule. `rank.ts` was not touched, and no new
ticket was needed.

Fixed by filtering on `!i.belowCutoff && i.screened === undefined`, with a
comment at the call site pointing at the reason. The corrected count is 48,
matching the SME's independent dump. `eligible`, `full-iteration sims`,
`promoted`, `screened-out` and the ratio 0.9708 are all unchanged — the bug
was in reporting only.

## Smoke gate recommendation

**Do not add this script to `pnpm verify`.** Three reasons:

- `pnpm verify` already typechecks and lints it. `packages/core/tsconfig.test.json`
  includes `test/**/*.ts` and `pnpm lint` is `eslint .`, so the file is covered
  by two of the four gates today. What escaped was a *runtime* path: vitest's
  default include only matches `*.test.ts` / `*.spec.ts`, and this file is
  deliberately named outside that pattern.
- It needs a gitignored input. `vendor/wowsims/ret_preraid.gear.json` is
  ignored by `.gitignore:13` (`vendor/`), so a fresh CI checkout does not have
  it and the gate would fail on clone rather than on a defect.
- It costs a full recorded ranking of wall time — `time npx tsx
  packages/core/test/measure-racing-ratio.ts` reports about 3.7 s real on this
  machine, added to every `pnpm verify`.

Residual risk: the script can drift away from the support code it borrows from
and rot again unnoticed. Step 1 of this ticket mitigates that by making the
script import `CountingSimRunner` and `DerivedNoiseSimRunner` from
`packages/core/test/racing-support.ts` instead of keeping private copies, so a
breaking change to either runner now breaks the script at typecheck time.

Alternative considered and not built: extract a `measureRatio()` helper from
the script and wrap a `.test.ts` smoke around it that asserts only "runs and
returns a ratio in (0, 1)". That would close the runtime gap without the wall
time, but it still needs the gitignored gear file, so it would have to skip
when the file is absent. Worth a follow-up ticket only if the user wants it.
