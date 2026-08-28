Status: open
Type: investigation
Origin: owner request, 2026-08-27, alongside the ticket 318 decision
Blocks: none
Blocked by: none

# Is there anything the UI already knows that is worth showing a player?

Filed at the owner's request when they ruled the assumptions block down to a
console log (ticket 318). Their framing, verbatim:

> put in another ticket instead to have an agent first check to see if theres any
> data the UI already knows but it all look like almost useless for a user shit
> to me

So this is a **check, not a build**. The expected outcome is a short answer, and
"nothing worth surfacing" is a perfectly good one — the owner's prior is that
there is nothing, and the investigation exists to test that rather than to
justify adding something.

## Why it is worth asking at all

The owner's own ask 9 said the way to judge this is to "look at what data is
already presented to a user in the UI and think about it that way". The
assumptions block failed that test twice over: three of its five rows merely
restated controls the user had just set, and the other two were internal detail
(see ticket 318 for the row-by-row). The open question is whether the engine
computes anything that is genuinely *new* to the reader and *actionable* — as
opposed to more of the same.

## What to check

Enumerate what the ranking path already computes and hands to the view, then for
each value ask three questions in order, stopping at the first "no":

1. **Is it new?** Does it tell the user something not already visible in a
   control they set or a column they can read? (This is what killed three of the
   five assumptions rows.)
2. **Is it actionable?** Would a player make a different decision — about gear,
   about a run — knowing it?
3. **Is it trustworthy enough to show?** Note ticket 315: `setContext` is
   populated so rarely that its display states were never once observed. A value
   that is usually absent is not a candidate.

Good places to look: `engine/view.ts` (what the view already receives),
`packages/core/src/rank.ts`'s per-item outputs, and the disclosure/assumptions
payload that ticket 318 is moving to the console.

## Deliverable

A list of candidate values with a verdict against those three questions, and a
recommendation. **Do not implement anything** — if something survives all three,
it becomes its own ticket with the owner's sign-off. If nothing does, close this
and the answer is on record, which is worth as much.
