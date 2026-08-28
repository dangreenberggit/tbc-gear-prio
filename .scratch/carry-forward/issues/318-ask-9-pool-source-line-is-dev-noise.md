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

## Decided 2026-08-27

**Owner: demote the whole assumptions block to a console log.** Not just the
pool-source line -- the entire block leaves the UI and is logged instead.

The block's five rows, read off the running page:

| Row | Value | What it is |
| --- | --- | --- |
| Seeds | 11, 22, 33, 44, 55 | developer detail |
| Iterations | 3000 | **echoes a control the user just set** |
| Max phase | Phase 2 (2.1 - T5) | **echoes a control the user just set** |
| Candidate pool | every eligible item | **echoes the BiS-prune toggle** |
| Pool source | `ret-p2.universe.json (288 entries)` | developer detail; the row that prompted ask 9 |

That is the sharper version of the owner's "almost useless for a user": three of
the five rows are not new information at all, they restate settings visible in
the card above; the other two are internal detail no player can act on. So
nothing here is lost to a user by moving it to the console -- which is what makes
the demotion safe rather than merely expedient.

Keep it a real log line, not a deleted feature: the values stay diagnostic for
anyone debugging a ranking, which is the audience that was always reading them.

Whether anything the UI *already* knows deserves to be surfaced in its place is
a separate question -- ticket 324, filed at the owner's request. This ticket does
not wait on it; the demotion stands on its own.
