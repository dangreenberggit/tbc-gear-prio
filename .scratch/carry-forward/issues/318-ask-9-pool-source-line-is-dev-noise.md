Status: open
Type: enhancement
Origin: pre-merge review round 4, Spec axis (the owner's ask 9 has no disposition anywhere), 2026-08-27
Blocks: none
Blocked by: none

# Ask 9 — the pool-source line is developer noise, and nobody ruled on it

The owner's ninth original UI ask, verbatim from
`.scratch/carry-forward/notes/upgrades-ui-original-asks.md:36-40`:

> something like "Pool source ret-p3.universe.json (467 entries)" is kind of
> just for development anyway, wtf is a normal user supposed to do with this?
> look at what data is already presented to a user in the UI and think about
> it that way. maybe assumptions should just be a console log for now if these
> specific details are never presented to the user elsewhere.

Still rendered — `pool_universe` remains a displayed string in the fork's
`assets/locales/en/translation.json`.

## Why this is filed rather than silently deferred

The rebuild stage scoped itself to tickets 312, 313, 314 and 311's presentation
half, and ask 9 falls outside all four — so the stage did not skip an assigned
task. But the eleven asks are **the acceptance rubric, and they outrank the
plan**; the plan cannot narrow them by omission. Ask 9 was the one ask left with
no disposition in any ticket, plan or review, which is how it would have been
lost. Asks 2 and 8 are likewise untouched by this stage but are already covered
by their own tickets.

## The decision needed

The owner offered a direction ("maybe assumptions should just be a console log
for now"), but framed it as a question about what a normal user can act on. So
the call is theirs: drop the line, demote the whole assumptions block to a
console log, or rewrite it in terms of data the UI already shows elsewhere.
