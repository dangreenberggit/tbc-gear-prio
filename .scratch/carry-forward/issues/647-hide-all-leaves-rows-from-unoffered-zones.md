Status: closed
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent)
Type: bug
Origin: docs/reviews/feat-tab-view-filter.md, focused check (round 2), R1
Blocks: none
Blocked by: none
Related: 527, 648, 649

# "Filter by source" cannot hide a row whose other zone it does not list

After the review fix for D4 (fork `959c56d9a`), `sourcesView` in fork
`ui/features/upgrades/model/results_view.ts` keeps a row while any zone it
matches is not an offered hidden key. The dialog offers only zones that are
some row's first zone. So a row from zones Z1 and Z2, where no row has Z2
first, stays after Hide all, and the button reads "m of m sources hidden"
while that row's Source cell names Z2, which has no checkbox. Found by
reading the code; whether a real ranking has such a row is untested.

Done when: the dialog offers every zone a row matches (or the keep rule and
the offered keys agree some other way), with a test in which Hide all on a
view with such a row leaves no row.

## Resolution

Fork `c47012b0b` (2026-10-15): `validSourceKeysOf` in
`model/settings_pool.ts` now offers every key an entry or row matches
(`sourceKeysMatching`), each first zone in its old place and any other zone
after them, so the dialog lists the second zone and counts the row under
it. Test: `results_view.test.ts` "offers every zone a row matches, so Hide
all leaves no row" (red before the fix: the options lacked `Zul'Aman`).
No committed universe has an entry whose second zone is no entry's first,
so the pre-run box's list does not change for any spec; the results
dialog can still gain such a zone when a ranked row has it.

Verified by: tbc-new-fork@c47012b0b, pinned by tbc-gear-prio@3076b0dc (`pnpm verify` rc=0); from `vendor/tbc-new-fork`, `corepack pnpm exec vitest run ui/features/upgrades/model/results_view.test.ts ui/features/upgrades/model/settings_pool.test.ts`; review `docs/reviews/feat-tab-view-filter.md` (R1).
