Status: closed
Closed: 2026-10-16, stage tab-source-labels
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent)
Type: bug
Origin: docs/reviews/feat-tab-view-filter.md, D2
Blocks: none
Blocked by: none
Related: 293, 619

# Some "Source not recorded" rows name a dungeon in their Source cell

Some items file under the "Source not recorded" bucket (pool source
`unknown`), while their Source cell names a dungeon through upstream's
`ItemSource` block (fork `ui/features/upgrades/components/ResultsTable/SourceCell.tsx`,
which shows upstream's source when `db.json` has one). Ret P3 has 4 such
items: 28288 Abacus of Violent Odds (The Mechanar), 28034 Hourglass of the
Unraveller (The Black Morass), 27484 (The Blood Furnace), 22401 (Dire
Maul). Whether any of them is a row of the settled Ret P3 run was not
checked.

So in "Filter by source" (ticket 527) and in the pre-run Sources dialog, a
player who sees "The Mechanar" in the cell finds no option of that name:
the row hides with "Source not recorded". The pool keying is older than
ticket 527; the review of `feat/tab-view-filter` found it.

Re-run: compare each universe row's pool source with the first `sources`
entry of the same item in the fork's `assets/database/db.json` (the review
agent's scratch script did this for `ret-p3`; it is not in the repo).

Done when: items whose `db.json` entry names a drop file under that drop
in the pool (or the cell and the dialog name the same bucket), for every
spec's universe, with a test on one of the four items above.

## Closed 2026-10-16 (stage tab-source-labels)

The four items now carry their db.json source in every universe that holds
them (ticket 174's fix): 28288 `raid` The Mechanar, 28034 `raid` The Black
Morass, 22401 `raid` Dire Maul, 27484 `heroic` The Blood Furnace. Both
dialogs key a zoned source by its zone and a zoneless one by its kind label,
with no zone list of their own, so The Mechanar, The Black Morass and Dire
Maul are now entries under "Raids and dungeons", and 27484 files under
"Heroic dungeon".

Verified by:

- `python -c "import json;print([(e['itemId'],e['sources']) for e in json.load(open('data/universes/ret-p3.json',encoding='utf-8-sig'))['entries'] if e['itemId'] in (27484,31033,22401,31856,28034,28288)])"`
  (output in ticket 174).
- `grep -n "SOURCE_LABELS\|bucketKeyOf\|zoneKeyOf" vendor/tbc-new-fork/ui/features/upgrades/model/settings_pool.ts vendor/tbc-new-fork/ui/features/upgrades/model/engine/view.ts`
  → `settings_pool.ts:44` (`bucketKeyOf`), `view.ts:150-164` (`SOURCE_LABELS`,
  `zoneKeyOf`): first zone, else the kind label.
- Dialog capture on fixture `ret-p3-p2`, fork `f28f40769` (ignored path, in
  the pair `tbc-wt/tab-source-labels`):
  `.scratch/tab-fixtures-smoke/ret-p3-p2-k5-step15-pre-run-sources-dialog.png`
  and `-unticked-TheMechanar.png`, `-unticked-TheBlackMorass.png`,
  `-unticked-DireMaul.png`, readback `ret-p3-p2-k5-step15.json`. Unticking
  The Mechanar moves the count from 794 to 793 eligible items.
- Test: `packages/core/test/pool-hardening.test.ts` "reserves kind:unknown for
  items no input mentions at all" now runs over 28034 in `feral-p3.json`
  (the ticket 174 exclusion is gone), so 28034 shipping `unknown` again fails
  `pnpm test`.

## Saved settings

A saved exclusion or hide of "Source not recorded" stays saved and offered
(the bucket still has rows in every spec), and it no longer removes these
four items, which now file under their zones. Accepted in plan
tab-source-labels (review F6).
