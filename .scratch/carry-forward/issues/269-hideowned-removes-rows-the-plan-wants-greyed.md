Status: open
Type: bug
Origin: Stage 3 web shell, S3 UI slice handoff, 2026-08-22
Blocks: none
Blocked by: none

# `hideOwned` removes owned rows where §12 and §8.3.3 want them greyed

## Problem

`ViewOptions.hideOwned` drops owned rows from the result:

```
packages/core/src/view.ts
  if (v.hideOwned === true && item.owned === true) return false;
```

PLAN.md §12 and §8.3.3 specify the opposite for the "Already have it" control:
an owned row is **greyed and kept**, never removed, so a player can still see
that the thing they are wearing is the best option for that slot. Removing it
makes the slot look empty and the worn item look unrated.

The name is the trap. `hideOwned` is the only owned-related option on
`ViewOptions`, so the obvious wiring for a control named "Already have it" is
the one that violates the requirement. The Stage 3 UI noticed and routed
around it: `apps/web/src/view-options.ts` carries its own `greyOwned` flag and
builds core's options field by field so `hideOwned` cannot leak in.

So this is not currently a user-visible bug — it is a loaded gun. Any future
caller that reaches for the natural-looking option gets behaviour the plan
forbids, and nothing fails to warn them.

## What to do

Pick one, no strong preference from here:

- Rename to `dropOwned` (or similar) so the name states that it removes, and
  document that the greying treatment is the caller's job. Cheapest, and keeps
  the CLI's existing use working.
- Add the greying variant to core as a first-class option, so both treatments
  live at the seam and `apps/web/src/view-options.ts` stops being the only
  place that knows the difference.

Either way, `view.ts`'s docstring for the option should say which of the two
§8.3.3 treatments it implements.

Check who relies on the current behaviour first:

```bash
grep -rn "hideOwned" packages/core/src packages/core/test apps
```
