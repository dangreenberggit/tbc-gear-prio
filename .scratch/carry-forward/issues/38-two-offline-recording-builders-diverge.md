Status: closed
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

## Closed 2026-08-06

The three named differences still held at reproduction time, but the
direction of the second bullet's cause was backwards. By the time this ticket
was picked up, commit f22b868 had already fixed
`report-events-offline.ts` to read `talentPointsByTree` from the payload
(via a local `talentPointsFrom`) — it was `slamaltman-offline.ts`, the
**ranked** builder, that still hardcoded ret's `[5, 11, 45]`. Confirmed with
`node -e` against `test/fixtures/slamaltman.raw.json`: slamaltman's own
`combatant_info_events` entry (sourceID 11) carries real
`talents: [{id:5},{id:11},{id:45}]`, so the hardcode happened to agree with
this fixture's data and produced no visible symptom — but it was still a
hardcode a re-capture could silently disagree with, the same failure class
D1/D2 in f22b868's message describes for the other builder.

Reproduced with a new RED test in `slamaltman-offline.test.ts` ("reads talent
points from the capture rather than assuming them"): mutated the raw
fixture's `talents` to `[9, 9, 43]` and asserted the builder's output
`talentPointsByTree` matched. Against pre-fix `slamaltman-offline.ts` this
failed with `expected [5, 11, 45] to deeply equal [9, 9, 43]` — i.e. the
ranked builder ignored the payload outright.

Fix: extracted the shared walk (actors → gear mapping → talent reading →
FightSummary/LoggedGear assembly) into `buildOfflineRecordings` in
`report-events-offline.ts`, parameterised by `character`, `spec`, `route`,
`confidence`, a `notFoundMessage` builder (the two builders' error strings
differ and both were kept), and an optional `killedAt` (the ranked fixture
sets a fixed literal; report-events deliberately omits it — a fourth
difference the ticket didn't name but that had to be preserved rather than
collapsed). `slamaltman-offline.ts` is now a thin wrapper calling
`buildOfflineRecordings` with `route: "ranked"`, `confidence: 1`, and the
fixed `killedAt`; `reportEventsOfflineRecordings` calls it with
`route: "report-events"`, `confidence: 0.5`, and no `killedAt`. Both paths
now always read `talentPointsByTree` from the payload via the same
`talentPointsFrom`, so a hardcoded split is no longer possible on either
route. `SlamaltmanRawFixture` is now an alias of `ReportEventsRawFixture`
since the two payload shapes were already the same JSON.

Verified: `pnpm exec vitest run test/slamaltman-offline.test.ts
test/report-events-fallback.test.ts` — 2 + 14 tests green, including the new
RED-then-GREEN test and all of report-events-fallback's existing coverage
(kill-not-ranked resolution, talent-payload reading and refusal,
character-not-found, `resolveFight` ordering). `tsc --build` reports no
errors in `packages/core/src/fixtures/*` or in `cli.ts`'s two call sites.
Full-repo `pnpm verify` was red at both start and end of this work
(`packages/core/src/view.ts:210` missing `meetsCutoff`, then
`packages/core/test/caps.test.ts` missing exports) — both in files this
ticket does not touch (`view.ts`, `caps.ts`), from other agents' in-progress
work in the same shared worktree per the delegation plan. No test outside
`slamaltman-offline.test.ts` and `report-events-fallback.test.ts` was edited
to accommodate this change.
