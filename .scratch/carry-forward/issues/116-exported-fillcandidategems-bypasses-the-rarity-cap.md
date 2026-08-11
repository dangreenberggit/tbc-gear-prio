Status: open
Type: design
Origin: fresh-context review of tickets 111/112, 2026-08-11 (axis 1/2, exported-surface note)
Blocks: none
Blocked by: none

# Exported `fillCandidateGems` lets a direct caller bypass the rarity cap

Ticket 111 capped auto-fill at rare by feeding `fillEmptyCandidateGems` a
restricted `fillPalette` on `GemContext` (`packages/core/src/rank.ts`). The cap
lives at the call site, not in the function: `fillCandidateGems`
(`packages/core/src/candidate-gems.ts:121`) is exported and any direct caller
passing the full palette silently reproduces the pre-111 epic-fill behaviour
the ticket measured as a +10.43 DPS overstatement.

Not a production bug — the one production path routes through `GemContext` —
but a foot-gun for the next caller. The review found that capping inside the
function is not a one-liner: two existing tests deliberately exercise the
uncapped function and their intent breaks.

Options to weigh (interface decision, see `codebase-design`):

- make the cap a required parameter so a caller must state a max quality;
- unexport and route everything through a capped wrapper;
- leave it and carry a load-bearing comment naming this ticket.

## Acceptance criteria

- [ ] A direct caller can no longer auto-fill above the cap without writing
      code that visibly says so.
- [ ] The two tests exercising the uncapped behaviour are either preserved with
      their intent intact or consciously rewritten, stated in the commit.
- [ ] `pnpm verify` green.
