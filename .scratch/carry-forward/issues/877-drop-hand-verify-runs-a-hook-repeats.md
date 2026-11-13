Status: blocked
Type: task
Origin: .scratch/carry-forward/issues/876-skip-verify-when-same-inputs-passed.md
Blocks: none
Blocked by: none
Serves: none
Evidence: .scratch/agent-reports/2026-11-12-general-task-verify-run-cache.md

# Drop hand `pnpm verify` runs that a hook or merge-to-dev repeats

**Problem.** Docs, skills and briefs ask for a hand `pnpm verify` just
before a step that runs it again: the pre-push hook on every push, and
`pnpm merge-to-dev` in the pair. Ticket 876 added a pass cache, so a
repeat on the same inputs now costs seconds, but a hand run still costs a
full run when the tree changes between it and the hook's run. This was the
last item on 876's list ("Separate, needs the owner's OK of the text"),
which 876 left undone.

**Owner's words (2026-11-12, orchestrator session), from 876:**
- "that sounds like potentially too many repetitive tests am i crazy"
- "yeah there at least should be some kind of caching or pre-passing of
  tests that have already passed with all the same info"

**Proposals.** P1-P4 in § 4 of the evidence report:
- P1: `docs/workflow.md`, "`pnpm verify` before every push".
- P2: a verify on dev after `pnpm merge-to-dev`, in whichever brief or
  template asks for it (where that text lives is unverified).
- P3: `docs/agents/paired-worktrees.md`, the older route's step 3 and the
  re-pin steps.
- P4: `docs/workflow.md` and `docs/agents/orchestration.md` ("`pnpm verify`
  on that tip" before `pre-merge-review`), and the global `pre-merge-review`
  skill's fix-check run.
- Side note: briefs should stop prefixing verify with
  `GOFLAGS=-buildvcs=false`; it makes a hand run miss the hook's stamp.

Line numbers in the report were read on 2026-11-12 and may have moved.

**Blocked on the owner.** These are agent instruction texts. Changing them
needs the owner's approval of the exact wording in chat (global rule
"Agent instructions"). Show the owner short old -> new blocks first; do not
edit before that.

**Done when:** the owner has approved the text for each proposal they
accept, the approved edits are merged, and each rejected proposal is noted
here.
