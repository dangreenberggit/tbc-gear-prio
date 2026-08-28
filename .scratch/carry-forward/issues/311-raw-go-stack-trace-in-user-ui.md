Status: open
Type: investigation
Origin: Chrome visual pass of the Upgrades tab, 2026-08-27 (branch `feat/upgrades-dedup-wowsims`, fork `342f6a74`)
Blocks: none
Blocked by: none

# A raw Go panic and stack trace are rendered in the end-user UI

**Investigative ticket.** The rendering is confirmed; the underlying sim failure
is not diagnosed and may be the more important half.

## Observed

During an ordinary Retribution Paladin run, one candidate was dropped and the
tab rendered the reason as plain wrapped text in the page:

```
Beast-tamer's Shoulders was dropped from the ranking: the sim failed on this
swap -- sim error (0): interface conversion:
*retribution.RetributionPaladin is not hunter.HunterAgent...
```

followed by a full raw Go stack trace.

It **wraps cleanly inside its container and does not break the page layout** —
this is not a layout defect. It is a content and error-handling question.

## Two separate questions, and the second may matter more

**1. Presentation.** A raw Go panic with a stack trace is not an end-user
message. A player reading it learns nothing actionable. What should a dropped
candidate show, and where should the underlying detail go instead (console, a
collapsed drawer, a diagnostics view)? Note the surrounding machinery is
deliberate and worth preserving: the tab already has a "dropped candidates and
substitutions" concept that correctly kept the run going rather than failing it.

**2. The failure itself — do not skip this.** The error is
`*retribution.RetributionPaladin is not hunter.HunterAgent`. A paladin sim
attempting a hunter interface conversion suggests the swap sent the backend a
request it mapped to the wrong spec, which is a correctness question about the
candidate-swap path, not a cosmetic one. It is not known whether:

- this item is mis-slotted or mis-tagged in the pool data,
- the swap built a malformed request,
- or the backend mis-dispatches for this item class generally.

**Beast-tamer's Shoulders** is the one observed trigger. Whether other items hit
it is unknown — only one occurrence was seen in one run.

## What would close this ticket

- How many pool entries trigger this, not just the one observed. Run wider and
  count.
- Whether the trigger is item-specific, slot-specific, or spec-specific.
- Whether the backend request for the failing swap is malformed on our side, or
  the backend mis-dispatches a well-formed request. That decides which side owns
  the fix.
- Then, separately, a decision on what the UI should show in place of a stack
  trace.

## Limits of the observation

- Seen **once**, in one run, on one spec (Retribution Paladin), at 200
  iterations.
- The full stack trace was not captured verbatim beyond the leading lines quoted
  above.
- No check was made of whether the same item fails outside the Upgrades tab.

## Comments
