Status: closed
Type: gap (report format)
Origin: `.scratch/stage-gate/558-p4-engine-move/sme-verdict.md` (gate-sme verdict on stage 558-p4-engine-move, 2026-10-06, section 3 "Findings for engineering", fourth row; gitignored, owner's checkout)
Blocks: none
Blocked by: none

# The ret report has no `plausibilityWarnings` field

## What the source says

The SME rated this **low, pre-existing**: the ret report for slamaltman
(ret p3) has no `plausibilityWarnings` field, on both the old engine
(`17a8fb28`) and the new engine (`42c75dc9`). The SME's evidence was
`Object.keys(ranking)` on both slamaltman JSONs, and it listed the gap
among the caveats on the slamaltman verdict as a "report-format gap".

Measured. Re-run on the committed new-engine report:

```
python -c "import json;print('plausibilityWarnings' in json.load(open('.scratch/rank-reports/stage2-close-slamaltman.json'))['ranking'])"
```

→ `False`. Both feral reports from the same stage do carry the field
(`sme-verdict.md` section 2 lists their warnings).

## Checked while filing

The field is optional by design in the current code. The `Ranking` type
documents it as "Present only when non-empty"
(`packages/core/src/rank.ts:470-473`), and `rankUpgrades` adds it only when
`warnings.length > 0` (`packages/core/src/rank.ts:1361`). Re-run:
`grep -n "plausibilityWarnings" packages/core/src/rank.ts`. So on this
report the missing field means that no warning fired. The source does not
say whether the gap it names is the omission itself (a reader cannot tell
"no warnings" from "warnings not computed") or something else.

## What would close this

A decision, recorded here, on whether the report should always carry the
field (an empty list when no warning fires), with the change made if so.

## Comments

2026-10-06: closed as intended behaviour, on the coordinator's ruling. The
`Ranking` type documents `plausibilityWarnings` as "Present only when
non-empty" (`packages/core/src/rank.ts:470-473`), and `rankUpgrades` adds
it only when `warnings.length > 0` (`packages/core/src/rank.ts:1361`). The
ret report's missing field therefore means that no warning fired. No code
change.
