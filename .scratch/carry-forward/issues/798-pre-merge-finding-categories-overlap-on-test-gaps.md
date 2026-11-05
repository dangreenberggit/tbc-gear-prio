Status: open
Type: process
Origin: .scratch/round-limits-r16/r18-review/2026-11-04-review-round-limits-r18.md (Note 9, PMR reader T4; gitignored, main checkout)
Blocks: none
Blocked by: none

# Pre-merge review: a test gap fits two finding categories with different outcomes

## What happens

The `pre-merge-review` skill sorts findings by effect
(`docs/agents/home/skills/pre-merge-review/SKILL.md:270-302` on `dev` at
`cf8e37a1`). Two of its categories overlap:

- `:274-276` **Fixed before merge**: "a silent wrong result: a check or
  test that passes when it should fail". This category has no exception
  for a problem from before the branch.
- `:299-302` **Any other finding**, "a missing test", which "from before
  this branch" is a `defer` row with a ticket.

A gap in a test gate can be described either way: the gate passes
although a test it should run is skipped, or a test is missing. The text
gives no rule for choosing, and the choice decides whether the finding
blocks the merge or becomes a deferred ticket. Real case: R2-1 in
`docs/reviews/feat-tab-wowsims-items.md` at `7c35e76a`, "the
`fork-tests:check` gate skips one of the tab's three tab-body tests"; the
R18 dry-run reader could not settle which category it was (R18 review,
PMR reader T4). Two agents can therefore give the same finding opposite
outcomes.

The pending round-limits change (`.scratch/round-limits-r16/r18-page/change-main.patch`)
does not touch these lines.

## What would fix it

Hypothesis, untested: say how the two relate, for example that a check
that skips or omits a case it is meant to cover is a missing test, and
"passes when it should fail" means a check that runs and gives the wrong
answer, or the reverse. Which one is the owner's call. A skill edit
needs the owner's approval of the exact text (global rule "Changing
agent instructions").

## Done when

- The skill's categories give one outcome for a gate that skips a test,
  and a cold reader given R2-1 picks the category the author means.
