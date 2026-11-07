Status: closed
Type: process
Origin: merge of `chore/808-one-routing-source` into `dev` on 2026-11-07; owner 2026-11-07: "i agree with those. have a session take care of them"
Blocks: none
Blocked by: none
Related: 832

Verified by: `python scripts/check_merge_ready.py --self-test` (the
`check_ticket_number_*` checks), on branch `chore/merge-hurdles`.

# The merge gate lets a branch bring a ticket number dev already has

## What a reader sees

Two branches that each allocate from their own copy of `NEXT` file
tickets with the same number under different file names. Git merges
them with no conflict on the files. It happened twice on 2026-11-06:
796-798 (renumbered by hand in the 729 merge) and 799-804, 810 and 811
(still two files each on `dev`, ticket 832). The `NEXT` conflict did show
up, but the 452 handoffs told agents to keep the higher value, which
lands both sides' tickets.

## Done when

`pnpm merge-ready` and `pnpm merge-to-dev` fail when a ticket the branch
adds has the number of another ticket in the merge result, and pass for
a branch that adds none, although `dev` already holds the 832
duplicates. `docs/agents/issue-tracker.md` says what to do on a `NEXT`
conflict.

## Closed

`ticket_number_problems` in `scripts/check_merge_ready.py` builds the
merge result's ticket names (dev's, less the ones the branch deleted,
plus the branch's) and judges only the tickets the branch added since
its merge base. It does not renumber 832's duplicates: renumbering the
452 side needs a fork commit, a re-pin and a push (ticket 832, "What
renumbering costs"), and this branch's worktree has no fork. 832 stays
open.

`docs/agents/issue-tracker.md` now says that a `NEXT` conflict means both
sides used the same numbers, and that the branch renumbers its own new
tickets. The same wrong advice was corrected in the gitignored handoffs
`2026-11-06-452-chain-D.md` and `-E.md` in the
`feat-452-meta-repair-hit-cap` and `feat-452-spec-page-scans` T3
worktrees. `2026-11-06-452-chain-A.md` in the main checkout still says
"keeps the highest value": this session could not write the main
checkout.
