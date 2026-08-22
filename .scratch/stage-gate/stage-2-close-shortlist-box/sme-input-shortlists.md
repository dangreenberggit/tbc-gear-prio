# SME input — three-character shortlist read

Three gear shortlists, freshly generated at this tip. Judge whether each is
believable for the character it describes.

## What produced these

All three come from one command shape against one pinned engine build. The
engine is wowsims-tbc v0.0.119 (commit `3267f8d`); the binary's digest and the
commands to reproduce it are in `binary-provenance.md` in this directory. Read
that file rather than assuming the binary is present — `vendor/` is not checked in.

Each run is a live sim of every pool candidate against that binary. The `--offline`
flag gates only where the character's *gear* was read from (a committed capture of
a real raid night); it does not stub the sim.

| character | spec | maxPhase | pool | above cutoff | baseline DPS |
| --- | --- | --- | --- | --- | --- |
| slamaltman | ret | 3 | 391 | 44 | 2003.0 |
| shredzepelin | feral | 2 | 228 | 14 | 2266.9 |
| nexess | feral | 2 | 228 | 12 | 2302.5 |

## Artifacts, per character

| character | report | machine-readable | transcript |
| --- | --- | --- | --- |
| slamaltman | `.scratch/rank-reports/stage2-close-slamaltman.html` | `…-slamaltman.json` | `…-slamaltman.stdout.txt` |
| shredzepelin | `.scratch/rank-reports/stage2-close-shredzepelin.html` | `…-shredzepelin.json` | `…-shredzepelin.stdout.txt` |
| nexess | `.scratch/rank-reports/stage2-close-nexess.html` | `…-nexess.json` | `…-nexess.stdout.txt` |

**Note added 2026-08-21, after the seat had read this.** The `.html` column is
what seat 1 actually opened, but those three files were untracked in `1139926`
because nothing cites them — so a later reader cannot obtain that exact input.
Regenerate with the commands recorded in the verification-log entry, or read the
`.json`, which carries the same ranking. Flagged by the pre-merge adversarial axis.

The `.json` carries `ranking.items[]` with `deltaDps`, `deltaPct`, `se`, `seMethod`,
`belowCutoff`, `slot`, `sources`, `bisTags`, plus `ranking.baseline`, `ranking.cutoff`,
`ranking.caps`, `ranking.substitutions`, `ranking.setBonuses` and
`ranking.plausibilityWarnings`. The transcript carries the invocation, the resolved
source capture, the binary digest and the engine's own provenance line naming which
raid encounter the gear was read from.

Each character's gear comes from one kill on one raid night:

```
slamaltman    gear read from Hydross the Unstable (VGjFb3mtX9xHgyav fight 8, ranked route)
shredzepelin  gear read from Void Reaver (YwahQLgv2jBrZGn6 fight 63, ranked route)
nexess        gear read from Fathom-Lord Karathress (4C2fJrMvcjaXL3KN fight 32, ranked route)
```

Regenerate any of them with:

```
pnpm rank --region US --realm dreamscythe --character <name> --offline \
  --spec <ret|feral> --max-phase <3|2> --report .scratch/rank-reports/<out>.html
```

## What we are asking

For **each** character, in this order — **slamaltman, then shredzepelin, then nexess**:

1. A findings table: what in this shortlist is wrong, suspicious, or unexplained.
2. A verdict string, exactly one of `trust`, `trust-with-caveats`, `do-not-trust`.
3. A note saying what evidence would have flipped that verdict.

Complete each character's table and verdict **before opening the next character's
report**. We know one seat reading all three will calibrate them against each other;
the fixed order and the flip-evidence notes are how we make that visible rather than
invisible.

For any finding about a row near the cutoff, say whether the row's delta sits inside
the spread the report itself discloses (`se` / `seMethod` per item, and the replicate
machinery behind it). We have a known open issue about replicate seeds overlapping
their RNG streams, and a cutoff-adjacent complaint means something different
depending on whether the row is inside or outside the disclosed spread.

Judge the shortlists on their own terms. Do not go looking for a particular class of
problem — report what you actually find, including "nothing here is wrong".

Audience is the engineering team: we want gate and bug findings, not loot advice for
a player.
