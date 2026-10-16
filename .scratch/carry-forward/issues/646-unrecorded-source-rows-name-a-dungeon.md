Status: open
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
