Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent)
Type: bug
Origin: docs/reviews/feat-bis-rows.md (finding D2)
Blocks: none
Blocked by: none
Related: 614, 528

# Under BiS only, a slot whose BiS-list item is worn tells the player to widen the filter

With "BiS only" ticked, a slot whose only BiS-list row is an item the player
already wears shows an empty pane with "No upgrades found" and "Every
candidate simmed at or below your current gear. Widen the phase or content
filter to consider more items." For a player who already wears the BiS item,
that advice does not fit.

Seen in the build's capture `ret-p3-p2-bis-on-neck.png` (ret, phase-3 list,
phase-2 preset gear; the Neck pane). The domain axis of the `feat/bis-rows`
review compared `ui/specs/paladin/retribution/gear_sets/p2.gear.json` with the
BiS tags in the ret phase-3 universe: the phase-2 preset already wears the
phase-3 BiS item in neck, shoulders, hands, waist, ring 2, both trinkets and
ranged, so most ret slots show this text under BiS only.

Where: fork `ui/features/upgrades/model/results_view.ts`, `paneRows`. An owned
row that misses the cutoff is dropped from both the main table and the
below-cutoff group, and `noBisListRow` is false because the slot has a row,
so `ResultsPane` falls back to the no-upgrades text. The code comment on
`paneRows` records that this case keeps the old text on purpose.

Predates `feat/bis-rows`: at fork `c4696b091` the BiS-only view kept the
owned BiS-list row in `view.rows`, so the slot kept its tab and showed the
same text (`git -C vendor/tbc-new-fork show c4696b091:ui/features/upgrades/model/results_view.ts`,
`slotTabs` and `paneRows`).

Done when: under BiS only, a slot whose BiS-list rows are all owned shows a
text that says so (for example "You already have this slot's BiS-list
item."), with a test in `results_view.test.ts` or `ResultsPanes.test.tsx`,
and the locale key has its property in `schemas/upgrades.schema.json`.
