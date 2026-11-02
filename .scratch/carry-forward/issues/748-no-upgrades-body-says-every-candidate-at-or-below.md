Status: closed
Type: bug
Origin: docs/reviews/fix-wrong-advice-text.md (round 3, R3-1)
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent)
Blocks: none
Blocked by: none
Related: 625, 528, 614

# "No upgrades found" says every candidate simmed at or below your gear when some simmed above it

## What is wrong

The body under "No upgrades found" starts "Every candidate simmed at or
below your current gear." (fork `assets/locales/en/upgrades.json:148`, key
`upgrades_tab.results.empty_no_upgrades_body`). It shows in a slot pane or
the Shopping list whose main table is empty (fork
`ui/features/upgrades/components/ResultsPane/ResultsPane.tsx:41-45`), and in
the whole-results empty state (`components/UpgradesResults/UpgradesResults.tsx:96-101`).
The sentence is false in these cases:

1. The pane's below-cutoff group lists a row that gained DPS but less than
   the cutoff, for example +2.9 under a 3 DPS cutoff. The fork test
   `ResultsPane.test.tsx`, "says no row cleared the cutoff in place of an
   empty table" (`:96-107`), renders exactly this: its only row is
   `fixtureRow(5)`, `deltaDps` 2.91 (`testing/ranking_fixture.ts:146`), in the
   group "1 item(s) below the cutoff", and the test asserts the sentence.
   In the committed recording `packages/core/test/fixtures/tab-recordings/ret-p3-p2.json`
   (main repo), 9 of 894 rows have `belowCutoff` set and `deltaDps > 0`; the
   neck has 2, the highest +1.25.
2. Under BiS only, the view drops every row not on the BiS list
   (`model/results_view.ts`, `bisOnlyView`). In the same recording the neck
   pane under BiS only shows "No upgrades found" with this sentence (ticket
   625's case), while two neck candidates off the BiS list simmed above the
   worn neck.
3. Under BiS only with no BiS-list row in the whole run, `view.rows` is empty,
   so the whole-results empty state shows the sentence
   (`UpgradesResults.tsx:56`, `:90-91`), although candidates off the list may
   have simmed above the worn gear. Read from the code; not run in the tab
   (hypothesis, untested).

Counts in case 1 and 2 come from a Python read of the recording's
`ranking.items` (`deltaDps`, `belowCutoff`, `slot`).

The sentence predates branch `fix/wrong-advice-text`: it is in the locale at
fork `05da8b9ab` (the `dev` pin when the branch started) and came in with
fork `2c88a1192` (2026-10-08). That branch changed only the second sentence
(ticket 625).

## Done when

The body under "No upgrades found" is true in each case above, the owner has
approved the words (player-facing text, one plain sentence in player words),
and a test pins the body for a pane with a below-cutoff row that gained DPS.

## Resolution

Closed on branch `fix/wrong-advice-text`, 2026-11-02.

Verified by: `tbc-new-fork@4fd85ca4a`, re-pinned in `tbc-gear-prio@7718f078`;
`npx vitest run ui/features/upgrades ui/app` in the pair's fork (85 files,
844 tests passed) and `pnpm verify` in the pair (exit 0, its fork tests at
4fd85ca4a: 68 files, 761 tests passed).

The owner's rulings, 2026-11-02, word for word as the coordinator passed them on:

- "q5: the recommednation is fine. correct the line that precedes this branch so it's accurate"
  (the recommendation was "Nothing beat your current gear by the cutoff.";
  that sentence is false under BiS only, so it was not used)
- "neither. a generic one that can be used regardless of filters. it doesnt need tobe so long."
- "i dont like the term "the cutoff". they dont know a cutoff exists and we shouldnt have to explain it either. the wrods should just be better"
- "there could be upgrades but below the cutoff. so it's now lying. that's not a solutjuon either"
  (the owner then approved the design below)
- "the gorup shouldnt start open"

What changed (fork `assets/locales/en/upgrades.json`, `ResultsPane.tsx`):

- A pane whose main table is empty but whose below-cutoff group has rows
  shows no empty-state message, only the group, closed, under its label.
- A pane with no row at all, and the whole-results empty state, show
  "No items to show" / "Try widening your filters." (was "No upgrades found" /
  "Every candidate simmed at or below your current gear. Widen your filters to
  consider more items.").
- The group label is "1 item that gains less than {{abs}} DPS" /
  "{{count}} items that gain less than {{abs}} DPS" (was "{{count}} item(s)
  below the {{abs}} DPS cutoff"), and "1 more item" / "{{count}} more items"
  when no ranking is known (was "{{count}} item(s) below the cutoff"); the
  tab always has the ranking, so that second form shows only in tests.

The test `ResultsPane.test.tsx`, "shows only the closed group, with no
empty-state message, when the only row gained DPS below the bar", pins case 1
(`fixtureRow(5)`, +2.91 under 3 DPS). Case 3 cannot happen: BiS only is
offered only when some row is on a BiS list (`results_view.ts` `offeredToggles`,
`appliedToggles`).
