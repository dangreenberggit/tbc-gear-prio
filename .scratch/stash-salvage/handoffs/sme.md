# Handoff — salvage worker C (sme-rank-review)

**Branch:** `phase-1/w-salvage-sme`  
**Base:** `25de532f3a5001344494ed74e550d9ef3550c6cc`  
**pathsAllowed:** `.agents/skills/sme-rank-review/**`, `.claude/skills/sme-rank-review/**`, this handoff  
**pathsForbidden:** all `packages/**`, `docs/agents/model-policy.md`, other skills, stash drop

## Done

- [x] Branch `phase-1/w-salvage-sme` reset to base SHA (HEAD was already at base; prior checkout had landed on sibling branch).
- [x] Restored `sme-rank-review/SKILL.md` in both mirrors from `.scratch/stash-salvage/inbox/` (byte-identical to stash inbox copies; `cmp` clean).
- [x] `pnpm mirrors:check` — **pass** (exit 0, “skill mirrors match”).
- [x] Sanity read: skill is engineering-audience game-domain gate judgment; explicit forbidden player coaching and pipeline jargon. No junk to trim.

## AGENTS.md (for worker D — do not apply here)

Base SHA `AGENTS.md` does **not** yet reference `sme-rank-review` (PROCESS claim “tip already references” is wrong at `25de532`). C did not edit AGENTS.

Insert after the `### Domain docs` block (after line 11), before `## Engineering workflow`:

```markdown
### SME rank review

For domain judgment of a ranking / shortlist / pool output, use the `sme-rank-review` skill. Audience is the **engineering team** (gate and bugs), not player loot advice. Sharp lane.

### Editing skills

Before adding anything to a skill file, ask: does this belong to **this skill’s job and nature**? A skill has a personality (e.g. game-domain SME vs pipeline debugging vs TDD). Do not dump related-but-wrong material into it — put engineering rules in engineering skills/docs, game rules in game skills, and so on. If it does not fit, write it elsewhere or leave it out. See also `writing-great-skills` (relevance) and `dont-be-stupid`.
```

Source: `.scratch/stash-salvage/inbox-tracked/AGENTS.md` lines 13–19.

## Sanity notes (skill content)

- **Scope OK:** game facts only; engineers as audience; verdict labels are product gates.
- **Relevance OK:** aligns with `writing-great-skills` — no pipeline-debug or player-loot bleed.
- **No edits needed** to restored SKILL bodies.

## Fan-in notes for delegator

- **Conflict risk:** low with A/B/E; D may touch AGENTS + other skills — orthogonal.
- **Acceptance (PROCESS §C):** mirrored skill present; `pnpm mirrors:check` green — met on this branch.
- **Re-check at fan-in:** `pnpm mirrors:check`; confirm D applied AGENTS pointer above.

## Not done (by design)

- No `packages/**`, model-policy, or other skill changes.
- No stash apply/pop/drop.
