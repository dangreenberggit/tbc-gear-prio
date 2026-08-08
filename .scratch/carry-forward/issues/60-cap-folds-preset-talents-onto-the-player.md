Status: closed
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

## The real points are already at the seam

Corrected 2026-08-07 — an earlier draft of this ticket said the fix "crosses
the compose stage" and left the data's reachability untested. It is already
reachable: `LoggedGear` (`packages/core/src/seams/gear-source.ts:31`) carries

```ts
talentPointsByTree: [number, number, number];
```

i.e. the player's real points-spent per tree ([R18]), which `classifySpec`
already consumes on the same object. So this is not a missing-data problem and
needs no new seam.

The mismatch is narrower than "we lack the player's talents": `caps.ts` decodes
a wowsims **talent string** (`TALENT_HIT_BY_SPEC` indexes a character position
within a tree segment), while `LoggedGear` offers **per-tree totals**. Per-tree
totals alone cannot tell you whether 3 of Protection's 11 points went into
Precision specifically, so the fix is not a one-line swap — it needs either the
per-talent detail from `CombatantInfo.talents[]` threaded through `LoggedGear`,
or the cap to state that it is using the preset's distribution.

That is a real design question, but it is a **local** one, and cheaper than the
compose-stage rewrite this ticket originally implied.

## Done when

- Either the player's real talent points reach `capStateFrom`, or the banner
  states that talent hit is the preset's rather than the character's.
- A test pins a character whose talents differ from the preset and shows the
  cap figure does not silently inherit the preset's Precision.
- The `hitCapBanner` docstring's "only remaining uncounted source" claim is
  corrected if the gap stays two-sided.

## Closed 2026-08-07 — the assumption is kept, and now says so

**User decision:** keep assuming 3/3 Precision rather than thread real talent
data. A raiding ret paladin almost always takes it, and wowsims defaults the
same way — hand the user a sane build and let them override it later. So this
closes on the *second* branch of the first "Done when" (the banner states the
talent hit is the preset's), not the first.

The number is therefore unchanged. What changed is that it no longer passes
itself off as read from the character:

- `HitCapEntry.talentHitAssumed?: {talent, points, maxPoints}` — same shape and
  spirit as the existing `assumedRace`. Absent means nothing was assumed, so
  feral (no mapped hit talent) is unaffected.
- The talent name and max points moved into `TALENT_HIT_BY_SPEC` instead of
  being hardcoded at the banner, and `points` is **decoded from the string**, so
  a preset carrying 2/3 discloses 2/3 (pinned by a test).
- `hitCapBanner` appends: *"Assumes 3/3 Precision — your logged build is not
  read for talents yet."*
- The `"You are over by at least this much"` floor now only applies when
  nothing was assumed. With an assumed talent the error runs **both** ways, so
  the old one-sided claim — and the docstring's "Heroic Presence is the only
  remaining uncounted source" — were no longer honest and are gone.
- `cli.ts` passes it through, so this reaches a user rather than only a type.

Also pinned carry-forward **33's** third criterion end to end, which 33 was
closed without: `ranking.caps.hit.rating` is **119.31** on the slamaltman
fixture (72 gear + 3 × 15.769233), asserted through `rankUpgrades` against the
real recording rather than 33's synthetic additivity set.

`pnpm verify` green: 32 files, 434 passed / 2 todo.

## Follow-up, not done here

Letting the user *change* the assumption (a settings surface, or importing a
wowsims talent string) needs somewhere to put it — there is no settings UI
until Phase 3. Not filed as its own ticket yet; fold it into the Phase 3 view
work, where the disclosure string is already the natural anchor.

## Bullet 2, read on the disclosure branch

*"A test pins a character whose talents differ from the preset and shows the
cap figure does not silently inherit the preset's Precision."*

Worth being precise, since the wording predates the decision to keep the
assumption. Bullet 1 closed on its *second* branch (disclose rather than
thread real data), so "does not **silently** inherit" is what bullet 2 can
mean here — the inheritance stays, the silence goes. Two tests cover that
reading:

- `caps.test.ts` "still assumes the preset's Precision for a character who
  skipped it" — a **characterisation** test: it pins the inheritance *and*
  asserts `talentHitAssumed` is set, i.e. not silent. Labelled in-place as
  shipped-not-desired, so it fails loudly if someone later threads real data.
- `caps.test.ts` "discloses the preset's actual Precision rank rather than
  always 3" — a genuinely differing build (`5-062201-…`, a legal 61-point
  string with Precision at 2/3) proving the disclosure is decoded, not
  hardcoded.

What is **not** covered, and cannot be until real talent data is threaded: a
*logged character* whose talents differ from the preset, because nothing reads
a logged character's talents into the cap. That is the first branch of bullet
1, and it is the follow-up recorded below.
