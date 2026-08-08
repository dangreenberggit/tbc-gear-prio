Status: open
Type: task
Origin: docs/reviews/fix-carry-forward-backlog.md (adversarial A2)
Blocks: none
Blocked by: none

# The hit cap folds the *preset's* talent hit onto the *player's* gear

Ticket 33 taught `capStateFrom` to count talent-granted hit, reading
`talentsString` off the composed request. But `compose` never writes that
field from the logged character — `talentsStringFromRequest`
(`packages/core/src/rank.ts:872`) says so in its own docstring:

> `compose` copies race/name/equipment onto the skeleton's player slot but
> leaves `talentsString` untouched (compose.ts), so the composed request
> still carries whatever the pinned preset skeleton set

So every ret character is credited with the pinned preset's 3/3 Precision
(~47 rating), whether or not they took it.

## Why this matters now

Ticket 33 also removed the banner's hedge, correctly per its own "Done when"
(*"The banner's 'talents not counted' caveat is removed or narrowed"*). The
result is that the one user-facing sentence that would have flagged the
assumption is gone, in the same branch that made the assumption load-bearing:

    before: "~N rating under the hit cap counting gear alone — talents and
             raid buffs are not counted and only ever add hit …
             The real shortfall is smaller than this, likely much smaller."
    after:  "~N rating under the hit cap — Heroic Presence in your party
             would lower the cap by ~B. The real shortfall may be smaller."

A logged ret paladin who skipped Precision reads ~47 rating higher than
reality, `hit.gap` is ~47 too low, and `isHitDriven` / `hitRegression` price
every candidate against that number — a plausible figure with no error
anywhere, which is PLAN.md's stated worst case.

The direction of the error is now **two-sided**, which also undercuts the
docstring's argument for not rendering a ± band ("Heroic Presence … is the
only remaining uncounted source"). Preset-vs-player talents can run either
way.

## Reproduce

The assumption is visible without a live capture:

```bash
grep -n "talentsString" packages/core/src/compose.ts   # no write
sed -n '868,886p' packages/core/src/rank.ts            # the docstring above
```

WCL does carry the real points — `CombatantInfo.talents[].id` is points-spent
per tree ([R18], `docs/verification-log.md`), which is what `classifySpec`
already consumes. Untested whether threading them into the composed request
is cheap; that is the obvious fix but it crosses the compose stage.

## Done when

- Either the player's real talent points reach `capStateFrom`, or the banner
  states that talent hit is the preset's rather than the character's.
- A test pins a character whose talents differ from the preset and shows the
  cap figure does not silently inherit the preset's Precision.
- The `hitCapBanner` docstring's "only remaining uncounted source" claim is
  corrected if the gap stays two-sided.
