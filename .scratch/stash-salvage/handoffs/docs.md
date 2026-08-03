# Handoff — salvage worker D (docs archaeology)

**Branch:** `phase-1/w-salvage-docs`  
**Base:** `25de532f3a5001344494ed74e550d9ef3550c6cc`  
**Status:** done  
**Worktree used:** `C:/Users/dgree/Code/lulz/tbc-gear-prio-wt-salvage-docs` (shared main checkout was contested by sibling workers)

## Deliverables

- Full report: `.scratch/stash-salvage/docs-archaeology.md`
- Applied stash hunks (justified): see report “Applied edits”
- Left unresolved (do not auto-merge): Session focus restore; parallel-phase Step 0

## Fan-in notes

- **AGENTS.md** owned by D — already includes SME rank review pointer + Editing skills + Composer/manager Models wording. Worker C: if you need an extra AGENTS line, state it verbatim here for the delegator; do not race-edit AGENTS.
- **model-policy.md** taken from stash wholesale (Composer workhorse + manager fan-out). Tip had no later superseding commit on this file after `9f6c496`.
- **parallel-phase/SKILL.md** deliberately **not** changed (Step 0 unresolved).
- **cursor adapter**, **dont-be-stupid**, **writing-great-skills**: stash taken; `.agents` / `.claude` mirrors synced (`pnpm mirrors:check` green).

## Verify

```bash
pnpm mirrors:check
rg -n "sme-rank-review|Editing skills|Composer" AGENTS.md
rg -n "run_in_background|Composer" docs/agents/model-policy.md
```

## Concerns

1. Tip `dont-be-stupid` still references missing `AGENTS.md` § Session focus — owner should restore from `698a79b`.
2. PROCESS.md incorrectly claimed tip AGENTS already referenced `sme-rank-review`; fixed on this branch.
3. Stash still present — do not drop (`stash0-refs.txt`).
