Status: resolved
Type: docs
Origin: docs/reviews/feat-ret-p3-data.md (spec axis)
Blocks: none
Blocked by: none

# PLAN.md §16 item 3 and the slice-6 handoff assert things that are no longer true

Two stale assertions found by the spec axis of the `feat/ret-p3-data`
pre-merge review. Both are documentation-only; no shipped behaviour is wrong.

## 1. PLAN.md §16 item 3 describes a defect that was fixed

`PLAN.md:975-977` says `data/presets/ret/p2.ep-weights.json` "is missing its
largest term" (`PseudoStatMainHandDps: 5.34`). It is not missing:

```bash
python -c "import json;print(json.load(open('data/presets/ret/p2.ep-weights.json'))['pseudoWeights'])"
# {'0': 5.34}
```

Fixed 2026-08-02 by `2fdad02` ("Score weapon damage, the term ret cares about
most"), which also regenerated ret-p2/p3. `docs/plans/wowsims-tab/plan.md:322`
inherited the stale claim as "fix while here", and the slice-6 handoff
correctly reported it was already done — but PLAN.md itself was never updated.

## 2. The slice-6 handoff contradicts the filed SME verdict

`.scratch/handoffs/wowsims-tab/slice-6/HANDOFF.md:664-665` says
`sme-rank-review` "still has not been run". The verdict was filed in the same
branch at `859eab5`
(`.scratch/handoffs/sme-rank-judgment-ret-p3-refresh.md`, verdict
trust-with-caveats). The handoff line predates the review commit but ships
alongside it, so the two documents disagree about whether the review ran.

Related but deliberately not folded in: the SME verdict's own gate says "Not
yet", and plan §9.6 asks for the review on a **ranking** while the artifacts
reviewed were a universe plus tags plus an EP preset. That scope gap is a real
open question for the slice's done-when, recorded in the review's Disposition
rather than here.

## Done when

PLAN.md §16 item 3 records that `2fdad02` fixed it (or the item is removed),
and the slice-6 handoff line is corrected to point at the filed verdict.

## Comments

2026-08-14: Resolved at (this commit) on `w/b3-sync-docs`. PLAN.md:975-977
now records the `2fdad02` fix and its verify command; the slice-6 handoff
line at `.scratch/handoffs/wowsims-tab/slice-6/HANDOFF.md:664-665` now
points at the filed verdict (`859eab5`,
`.scratch/handoffs/sme-rank-judgment-ret-p3-refresh.md`, trust-with-caveats).
`docs/plans/wowsims-tab/plan.md:322`'s copy of the same stale claim was
**not** touched — that file belongs to worker A3 this round, on a different
branch; see this round's orchestrator notes. Re-run:

```bash
python -c "import json;print(json.load(open('data/presets/ret/p2.ep-weights.json'))['pseudoWeights'])"
# {'0': 5.34}
git log -1 --format=%H 859eab5
```
