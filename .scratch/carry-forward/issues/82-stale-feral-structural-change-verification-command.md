Status: open
Type: task
Origin: docs/reviews/phase-2-trust.md (spec axis)
Blocks: none
Blocked by: none

# The feral "no structural change" claim's cited command no longer resolves

`docs/verification-log.md:1286` gives
`git diff phase-2/trust~1...phase-2/feral --stat` as the evidence for
PLAN.md §14's headline claim (feral needed only a preset + confidence
field, no seam/signature change). That command returns empty output today
— `phase-2/trust~1` moved under four later merges and the `phase-2/feral`
branch no longer exists.

The underlying claim still holds — re-measured against the real merge-base:

```bash
git diff 42db95a...e841a67^2 --stat -- packages/core/src/
```

shows `rank.ts | 20 ++`, `spec.ts | 95 ++`, `types.ts | 9 ++`, `pool.ts | 13
++`, no `seams/` file touched. `rank.ts`'s 20 lines are exactly `PRESET_ID`
becoming `PRESET_ID_BY_SPEC` plus two call sites — no `Deps`/`RankInput`/
`Ranking` signature change.

## What to do

Replace the dead command at verification-log.md:1286 with the merge-base
form above (or re-pin it to whatever refs are stable), so the claim stays
re-runnable per AGENTS.md's durable-claims rule.
