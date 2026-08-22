# SME input — three shortlists, regenerated 2026-08-21

Judge whether each character's shortlist is believable TBC gear advice for the
engineering team (gate and bugs), not player loot advice.

## Reports

| character | spec / tier | report | machine-readable |
| --- | --- | --- | --- |
| slamaltman | ret, maxPhase 3 | `.scratch/rank-reports/stage2-close-slamaltman.html` | `…-slamaltman.json` |
| shredzepelin | feral cat, maxPhase 2 | `.scratch/rank-reports/stage2-close-shredzepelin.html` | `…-shredzepelin.json` |
| nexess | feral cat, maxPhase 2 | `.scratch/rank-reports/stage2-close-nexess.html` | `…-nexess.json` |

The `.json` carries `ranking.items[]` with `deltaDps`, `deltaPct`, `se`,
`belowCutoff`, `owned`, `sources`, plus `ranking.baseline`, `ranking.cutoff`
and `ranking.fight`.

`ranking.plausibilityWarnings` is **optional and omitted when empty** — the
renderer reads it as `?? []` (`rank-report.ts:302`). slamaltman has no dead
slots and so has no such key; shredzepelin and nexess both do. An earlier
revision of this note implied the key is always present, which is wrong.

## Regeneration commands

```
pnpm rank --region US --realm dreamscythe --character slamaltman   --offline --spec ret   --max-phase 3 --report .scratch/rank-reports/stage2-close-slamaltman.html
pnpm rank --region US --realm dreamscythe --character shredzepelin --offline --spec feral --max-phase 2 --report .scratch/rank-reports/stage2-close-shredzepelin.html
pnpm rank --region US --realm dreamscythe --character nexess       --offline --spec feral --max-phase 2 --report .scratch/rank-reports/stage2-close-nexess.html
```

These live-sim against the pinned binary (wowsims tag v0.0.119, commit
`3267f8d`, sha256 `4b60235dcbb0088c9644ba464223fc9f65fcb3fccb2710cfc37fa3c752db97b1`).
`vendor/` is gitignored; regenerate with `pnpm fetch:wowsimcli && pnpm sync:wowsims`
and verify the digest before trusting a re-run.

## What changed since these were last judged, and what did not

**No ranking number changed.** The only change was to disclosure text and report
styling — commit `486f977`, four files, no scoring logic.

Previously the report told the reader, for a slot whose worn item is absent from
the candidate pool:

> "every row shown for neck was scored against an empty slot, not against Amulet
> of Bitter Hatred. Do not read any of them as an upgrade or a loss"

**That was false.** The baseline is composed from the character's full logged
equipment (`rank.ts:652`, `equipmentFromLoggedGear`, no pool filter), so those
rows were measured against the worn item like any other slot's. The report also
desaturated their deltas, visually withdrawing valid numbers. Both are corrected:
the message now states only that the worn item has no row of its own, and the
`unmeasured` styling is limited to causes where no worn item is comparable
(`unique-effect`, `set-break-toll`, `thin-pool`).

Read the shortlists **on their own merits**. A prior verdict on this output was
formed while the false retraction was in front of the reader.

## What to return

Per character: a verdict of `trust`, `trust-with-caveats`, or `do-not-trust`,
with a findings table. Complete each character's section before opening the next
report, in the order slamaltman → shredzepelin → nexess. For each, name what
evidence would have flipped your verdict.

For any finding that turns on a row near the cutoff, state whether the row sits
inside the report's disclosed replicate spread — the seed machinery has a known
open issue (ticket 236) and a finding traced to it is a different kind of problem
from a gear-judgment one.

Say plainly if a shortlist reads as believable. That judgement is the whole point
of this pass.
