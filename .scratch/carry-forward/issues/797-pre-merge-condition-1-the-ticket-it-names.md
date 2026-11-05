Status: open
Type: process
Origin: .scratch/round-limits-r16/r18-review/2026-11-04-review-round-limits-r18-fix.md (row U1; gitignored, main checkout)
Blocks: none
Blocked by: none

# Pre-merge focused check: "the ticket it names" has two readings

## What happens

Condition 1 of the focused check admits "a fix for findings that an
earlier round in this file raised, named by ID in the commit message or
in the ticket it names, whatever the finding's label"
(`docs/agents/home/skills/pre-merge-review/SKILL.md:164-166` on `dev` at
`cf8e37a1`).

"it" can be the commit message (a ticket the message names) or the
commit (a ticket named anywhere in its diff, such as a code comment or a
ticket file it edits). Two agents can therefore take opposite actions on
the same commit:

- reading "the message": a fix commit whose message names no finding and
  no ticket fails condition 1. The agent does not run the focused check,
  stops, spawns the assessor and asks the user.
- reading "the commit": the same commit passes because its diff cites a
  ticket that names the finding, and the focused check runs.

Real case, from the R18 dry run on `feat/tab-wowsims-items` round 3:
`485f217f` and `2f0666ed` name no finding in their messages; their diffs
cite ticket 692 and ticket 688 / finding D1 (fix review, row U1). The
pending round-limits change (`.scratch/round-limits-r16/r18-page/change-main.patch`)
does not change this sentence.

## What would fix it

Hypothesis, untested: say which, for example "named by ID in the commit
message, or in a ticket that the commit message names". A skill edit
needs the owner's approval of the exact text (global rule "Changing
agent instructions").

## Done when

- The sentence at `SKILL.md:164-166` has one reading, and a cold reader
  given `485f217f` decides condition 1 the same way the author means.
