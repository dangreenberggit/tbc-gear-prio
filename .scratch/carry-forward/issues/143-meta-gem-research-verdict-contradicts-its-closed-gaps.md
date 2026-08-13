Status: closed
Closed: 016b019
Type: task
Origin: docs/reviews/feat-set-bonus-value.md round 5 (domain 5-D3)
Blocks: none
Blocked by: none

# `meta-gem-research.md`'s Verdict restates provisos its own body closed

`.scratch/handoffs/issue-1-upstream-gem-cleanup/meta-gem-research.md` ends with
its two provisos stated in the present tense: that Chaotic Skyfire Diamond's
TBC-Classic-phase availability is unconfirmed, and that wowsims `presets.ts`
could not be inspected so a claim "remains UNVERIFIED".

Both were discharged by the doc's own Local verification pass, and line 117
says so. Commit `23df60f` claims to "Close both meta-gem research gaps against
committed data" — the body does; the tail does not.

A reader who scrolls to the Verdict (the natural landing spot) gets the stale
conclusion. Under the writing-for-agents rule `.scratch/**` specs are
agent-facing, so a superseded conclusion left in the summary position is a
live hazard, not just untidiness.

## Fix

Strike the superseded provisos or mark them closed in place, citing the Local
verification pass that closed each.

## CLOSED, 2026-08-13

Commit `016b019` on `feat/set-bonus-value`. Struck both stale provisos from
the Verdict section of
`.scratch/handoffs/issue-1-upstream-gem-cleanup/meta-gem-research.md` and
replaced them with a short paragraph pointing at the "Local verification
pass" section and commit `23df60f`, which is what actually closed each gap.
No new findings were added.

Verify: `git show 016b019 -- .scratch/handoffs/issue-1-upstream-gem-cleanup/meta-gem-research.md`
