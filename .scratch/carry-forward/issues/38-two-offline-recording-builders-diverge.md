Status: open
Type: task
Origin: `phase-2/resolution-and-fallback` pre-merge review (standards axis, Duplicated Code)
Blocks: none

# Two offline-recording builders that differ only in route and confidence

`packages/core/src/fixtures/slamaltman-offline.ts` and
`packages/core/src/fixtures/report-events-offline.ts` build the same thing from
the same shape of payload:

```bash
diff <(sed -n '/export function/,$p' packages/core/src/fixtures/slamaltman-offline.ts) \
     <(sed -n '/export function reportEvents/,$p' packages/core/src/fixtures/report-events-offline.ts)
```

Both walk `combatant_info_events`, match the character through `actors`, run
`mapWclGearToSim`, project to `{id, slot, gems, enchant?}`, attach `provenance`,
and return `{fights: Map([[characterFightKey…]]), gear: Map([[fightGearKey…]])}`.
They differ in three things: `route`, `confidence`, and where
`talentPointsByTree` comes from.

## Why it is filed rather than fixed

The two already disagreed once in a way that mattered. The report-events builder
hardcoded ret's `[5, 11, 45]` while the ranked one reads talents from the
payload, and the fixture it was applied to was a protection set — caught by the
domain axis, not by a test (`docs/verification-log.md`, 2026-08-05). That is the
failure mode duplication produces here: a fix or a guard lands in one builder
and not the other.

Merging them was out of scope for ticket 04, which was closing a gate box, and
the merge is not free: the ranked builder is referenced by
`packages/core/test/slamaltman-offline.test.ts` and by `cli.ts`, so the
parameterisation has to keep both call sites honest.

## Shape of the fix

One builder taking the route as a parameter, with `confidence` derived from it,
and `talentPointsByTree` always read from the capture. Then the guard that
ticket 04 added — the build must be the spec the preset scores — applies to
both rather than to one.

## Done when

- One builder serves both fixtures, and `route` / `confidence` are its
  parameters rather than duplicated bodies.
- `talentPointsByTree` is read from the payload on both paths, and neither can
  fall back to a hardcoded split.
- `pnpm verify` green, with `slamaltman-offline.test.ts` and
  `report-events-fallback.test.ts` both still exercising their own fixture.
