Status: resolved
Type: task (test/measurement hygiene; no shipped-code impact)
Origin: pre-merge review of feat/candidate-pool round 3, 2026-08-18 —
  standards axis (Duplicated Code) and adversarial axis (F2/F4)
Blocks: none
Blocked by: none

# The four measure-*.ts scripts copy one prologue and one constant

`packages/core/test/measure-feral-p3-recall.ts`, `measure-within-slot-ordering.ts`,
`measure-racing-ratio.ts` and `measure-cutoff-band.ts` each carry a
near-verbatim ~40-line prologue: `loadJson`, the full `RosterRecordingsFile`
type literal, and the fixture load. `racing-support.ts` already exists as the
shared home for harness code (`CountingSimRunner`, `DerivedNoiseSimRunner`).
The type is the sharpest case: it describes one committed fixture file, and
four copies can drift from it independently.

`measure-cutoff-band.ts` also hard-codes `SCREEN_SE = 5.128`, a figure
`rank.ts` documents as a measured mean from ticket 222; a re-measurement updates
the prose in one file and leaves the arithmetic in the other.


## Resolution (2026-08-19)

`loadJson`, `RosterRecordingsFile`, `SCREEN_ITERATIONS` and
`derivedScreeningSe` now live once in `packages/core/test/racing-support.ts`
and the four `measure-*.ts` scripts import them. `racing.test.ts` and
`synthetic-fixtures.test.ts` keep their own copies **by design** — they are
vitest-collected and deduplicating them was out of this ticket's scope.

### The screening SE is derived, not asserted

The criterion offered two options: derive at run time, or import one constant
and assert the ticket 222 figure against it. Deriving is what shipped, because
asserting would have thrown on the first run: the ticket 222 figure `5.128`
went stale when the feral P3 fixture was re-recorded in `57ec814`, and the tip
fixture derives **5.162194**. Keeping a number known to be wrong so a test can
check it against itself is the opposite of "drift is loud".

```
python -c "import json,math,statistics;r=json.load(open('packages/core/test/fixtures/synthetic-roster-recordings.json'))['rows']['feral-p3'];v=r['recordings'].values();print(statistics.mean(x['stdev'] for x in v)/math.sqrt(1000))"
# 5.162194348523637
```

The min/max and pairwise figures `rank.ts:294` quotes were re-derived the
same way, and the old fixture's min/max happen to survive the re-record:

```
python -c "import json,math,statistics; r=json.load(open('packages/core/test/fixtures/synthetic-roster-recordings.json'))['rows']['feral-p3']; v=[x['stdev']/math.sqrt(1000) for x in r['recordings'].values()]; print('n=%d mean=%.6f min=%.4f max=%.4f pairwise=%.4f' % (len(v), statistics.mean(v), min(v), max(v), math.sqrt(2)*statistics.mean(v)))"
# n=428 mean=5.162194 min=2.3641 max=6.0842 pairwise=7.3004
```

### Byte-identity, measured

Each script was captured before the change (at `57350d9`) and after, with
`npx tsx packages/core/test/measure-<name>.ts 2>/dev/null > <file>`, then
diffed. `measure-feral-p3-recall.ts`, `measure-racing-ratio.ts` and
`measure-within-slot-ordering.ts` are **byte-identical**. `measure-cutoff-band.ts`
differs in exactly two lines, both the documented `5.128` → `5.162194` move:

```diff
-  screening SE @1000 it    5.128 DPS (ticket 222)
-  band span                -2.199 .. 8.057 DPS
+  screening SE @1000 it    5.162 DPS (ticket 222; derived from 428 recordings)
+  band span                -2.233 .. 8.091 DPS
```

The band span is `boundary ± SE`, so both lines follow from the one figure;
no zone count, no row, and no boundary changed.

`packages/core/src/rank.ts:294`'s prose was updated from "5.128 over 461
candidates" (pre-`57ec814`) to 5.162 over 428, and now points at
`derivedScreeningSe` as the single source rather than restating a constant.

## Acceptance criteria

- [x] `RosterRecordingsFile` and `loadJson` live once (in `racing-support.ts`)
      and the four scripts import them. Three scripts are byte-identical
      before and after; `measure-cutoff-band.ts` differs only by the SE move
      documented above (diff attached).
- [x] The screening SE is derived at run time from the fixture
      (`derivedScreeningSe`, mean per-item `stdev/sqrt(1000)`), so a
      re-record moves the arithmetic with the data. Not asserted against the
      ticket 222 figure, which is stale — see above.
- [x] `pnpm verify` green.
