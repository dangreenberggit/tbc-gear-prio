Status: resolved
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

- [x] A direct caller can no longer auto-fill above the cap without writing
      code that visibly says so.
- [x] The two tests exercising the uncapped behaviour are either preserved with
      their intent intact or consciously rewritten, stated in the commit.
- [x] `pnpm verify` green.

## Resolution (2026-08-11)

Deleted `fillCandidateGems` outright, plus its `fillSockets` helper and the
`packages/core/src/index.ts` export. The call graph made this the smallest
honest fix: after ticket 117 moved meta repair onto the capped list, the
function had **no production caller at all** — `rank.ts` fills sockets only
through `fillEmptyCandidateGems`, fed the capped `fillPalette` from
`gemContext`. Keeping a dead uncapped entry point alive just to guard it with
a parameter or a warning comment would have been protecting code nobody runs.

The four tests that exercised it (including the two the ticket names as
deliberately uncapped) were consciously rewritten against
`fillEmptyCandidateGems` with an all-empty starting layout and the capped
palette — the shape production actually uses. Their intents survive:

- Relentless-over-Swift-Skyfire meta preference: both metas are quality 3, so
  the cap removes neither and the preference still has a real choice to make.
- Belt of One-Hundred Deaths reds-over-hit-orange: same preference, now
  landing on rare Bold Living Ruby 24027 instead of epic Bold Crimson Spinel
  32193. The old epic expectation is recorded in the test comment.

With the uncapped function gone, "a direct caller can no longer auto-fill
above the cap" holds by construction: the only fill entry point left is the
one whose production call sites pass the capped palette, and a caller who
hands it the full list has to write that palette out at the call site where a
reviewer can see it.
