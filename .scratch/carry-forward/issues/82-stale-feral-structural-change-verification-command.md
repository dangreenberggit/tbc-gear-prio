Status: closed
Type: task
Origin: docs/reviews/phase-2-trust.md (spec axis)
Blocks: none
Blocked by: none
Resolution: command re-pinned to SHAs (42db95a...e841a67^2) at
  docs/verification-log.md. Root cause was not dead refs -- both resolve --
  but that feral is an ancestor of trust~1, making the three-dot diff empty
  by construction. 2026-08-09.

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


## What was done (2026-08-09)

The ticket's diagnosis is half right. Corrected:

- **Both refs still resolve.** `phase-2/trust~1` = c5ef1cc, `phase-2/feral` =
  ce5133b. The branch was not deleted and nothing "moved under four later
  merges" in a way that broke resolution.
- **The command was wrong from the start, not stale.** `git merge-base
  phase-2/trust~1 phase-2/feral` returns ce5133b -- feral *itself*. Feral is an
  ancestor of trust~1, so the three-dot diff asks "what changed on feral since
  the common ancestor", the common ancestor is feral, and the answer is
  necessarily empty. It would have printed nothing on the day it was written.

That distinction matters: re-pinning to fresh branch names would not have
fixed it. The replacement uses two-dot-safe SHAs.

Verified the replacement reproduces the documented figure:

```bash
git diff 42db95a...e841a67^2 --stat --   packages/core/src/rank.ts packages/core/src/seams/ packages/core/src/compose.ts
# => packages/core/src/rank.ts | 20 ++++++++++++++++----
```

`seams/` and `compose.ts` absent, so the underlying PLAN.md §14 claim (no
fourth port, no signature change) still holds.
