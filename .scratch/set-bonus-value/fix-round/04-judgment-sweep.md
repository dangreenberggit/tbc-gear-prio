# Worker log — judgment sweep (tickets 119, 122, 116)

Branch: `feat/set-bonus-value`. Date: 2026-08-11. `pnpm verify` green before
each commit (Node 22 via Git Bash; PowerShell's Node 20.18 lacks
`node:sqlite` and fails the store suites regardless of the change).

## Ticket 116 — uncapped gem-fill entry point (commit `ff55700`) — resolved

Re-checked the call graph first, as instructed, and the situation had indeed
changed: after ticket 117 moved meta repair onto the capped list,
`fillCandidateGems` had **no production caller at all** — `rank.ts` fills
sockets only through `fillEmptyCandidateGems` with the capped `fillPalette`.
So the smallest honest fix was none of the ticket's three options: delete the
dead function (plus its `fillSockets` helper and the `index.ts` export).

Its four tests were consciously rewritten (stated in the commit) against
`fillEmptyCandidateGems` with an all-empty layout and the capped palette —
including the two that deliberately ran the uncapped fill. Both intents
survive the cap: Relentless still beats Swift Skyfire (both metas are
quality 3, so the cap removes neither), and the belt reds-over-hit-orange
preference lands on rare 24027 where the epic run picked 32193 (old value
recorded in the test comment). Tests live in
`packages/core/test/candidate-gems.test.ts`, describe
"fillEmptyCandidateGems filling from scratch".

## Ticket 122 — cross-class items with Go-only class locks (commit `55c6299`) — resolved

Took option 2: drop-and-disclose is the accepted, durable behaviour. New
end-to-end pin "rankUpgrades — cross-class candidate whose sim crashes
(ticket 122)" (`packages/core/test/rank.test.ts`): the real ret-p3 pool
entry for 30892 with a sim that crashes exactly when it is equipped — the
item never ranks, a healthy candidate still does, and the substitution names
the item and carries the crash message. Documented as "Known limit of this
filter" under ticket 25 (which owns class eligibility), so the substitutions
entry is not re-discovered as a bug. Option 1 (hand-maintained denylist
against the Go source) turned down in the ticket: upkeep against a moving
upstream for a failure mode that cannot produce a wrong number. Still
untested whether 30892 has siblings; the ticket says what a sweep would be
for if it ever matters.

## Ticket 119 — self-set 2pc at threshold−1 worn (commit `0fbcc67`) — B done, A planned, ticket stays open

Option B implemented (TDD, red first): any completion package needing
exactly **one** piece is reported as
`unmeasured: "unmeasurable-at-this-worn-count"` with no sim spent — the
"package" sim would be the completing piece's own single-swap sim, so the
figure is zero by construction, and the old 0.00 ± se printed a fabricated
measurement. The completing piece is still named in `packageItemIds`.
Changes: `UnmeasuredReason` (`set-value.ts`), the skip in `buildSetBonuses`
(`rank.ts`, also swaps the hand-copied union on `SetBonusValue.unmeasured`
for the shared type), reason text (`rank-report-rules.ts` — the typed record
forces every new reason to get one at compile time).

Tests (describe "rankUpgrades — set bonus at one piece short of a threshold
(ticket 119)", Crystalforge at 1 worn piece):

- "reports the 2pc as unmeasurable at this worn count, not as a measured
  0.00" — red before the fix (2pc came back measured with bonusDps 0).
- "keeps the 4pc measured, with the self-set 2pc confound intact and
  documented" — pins the 4pc − 2·2pc arithmetic (anomaly A) as *current*
  behaviour, so the eventual fix must change a test deliberately.

ADR-0023 amended: the self-set case is in the context section and decision 6
records the rule, including that the 4pc-at-1-worn figure stays measured and
confounded until option A is decided.

Option A is **not** done — it changes what a shown figure means (suppress or
qualify the 4pc at threshold−1), which is the same class of owner call as
ticket 90. The plan is written into the ticket: count same-set
lower-threshold crossings among the added singles, then suppress-and-
disclose per ADR-0023 decision 3, with the open choice being whether to
reuse `breaks` or add a sibling field. Cost once decided is small.

## Note for the next regeneration

The committed report artifacts predate ticket 119's change; a ret re-run at
1 worn Crystalforge piece will now show the 2pc as unmeasurable instead of
"0.00 DPS" (re-run commands recorded in tickets 112/118/119).
