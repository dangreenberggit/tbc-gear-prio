Status: open
Type: bug
Origin: combined 103/106 diagnostic loop, 2026-08-10 (`.scratch/set-bonus-value/loop-103-106/05-meta-tax.md`)
Blocks: none
Blocked by: none

# Candidate arms silently recolour gems the report declares it made no substitutions for

`.scratch/rank-reports/shredzepelin-p3.json` stores `substitutions: []`, while
8 of its 407 candidate rows each silently recolour **four** gems on other slots.

When a candidate helm carrying a meta socket is swapped in, `repairMeta`
(`packages/core/src/meta-repair.ts`, reached from `equipmentForCandidateSwap`,
`packages/core/src/rank.ts:1424`) satisfies the new meta's colour condition by
rewriting gems on shoulder 29100 and chest 29096 — trading four 8-agility
`24028` gems for 5-agility `32220 / 32220 / 30549 / 32212`. The player is being
told what a helm is worth *given four changes to two other items*, and the
report does not say so.

**PLAN.md §9 policy item 5 already requires this disclosure**, so this is a bug
against the existing spec, not a request to amend it. No number needs to move —
the substitutions themselves are correct (the loop measured meta activation as a
net +22.40 DPS gain here; see `05-meta-tax.md`). What is missing is the
reporting.

## Reproduce

```
python .scratch/set-bonus-value/loop-103-106/sim_meta_arms.py
```

and read `substitutions` out of `.scratch/rank-reports/shredzepelin-p3.json`.
The blast radius (8 rows, all head, all currently below cutoff) is enumerated in
`05-meta-tax.md`, with baseline Wolfshead Helm 8345 having `sockets: []` so
every one of them genuinely introduces a meta socket.

## Note

All 8 affected rows are below the cutoff today, so nothing user-visible is
currently wrong on the default view — which is exactly why this is easy to leave
broken until a meta-socketed helm ranks above the cutoff and the omission starts
mattering.

## Update (2026-08-12)

Finding 3-D2 closed the *wording* half on `feat/set-bonus-value` (commit
`102b425`): `GEM_POLICY_QUALIFIER` now discloses that meta repair may
recolour worn coloured gems, drawing from the same rare-capped fill pool as
the candidate auto-fill this qualifier already described. That is a
sentence-level fix to the standing caveat text, not the per-row
`substitutions` reporting this ticket is actually about — the 8 affected
rows in `shredzepelin-p3.json` still carry `substitutions: []` with no
mention of the four recoloured gems. This ticket's data work remains open.

## Update (2026-08-12, issue-1 fan-in)

The issue-1 gem cleanup added `minimizeRegems` (restore the player's original
gems wherever the repaired layout allows), which should shrink the recolour
set these rows would need to disclose — possibly to zero for some of the 8
rows (**untested**; re-run the Reproduce command to re-measure). The
per-candidate disclosure gap itself is unchanged: `rank.ts` folds only the
*baseline* repair's `metaSwaps` into `substitutions`; swaps made inside
`equipmentForCandidateSwap` for candidate/package arms are still discarded.
Still open.
