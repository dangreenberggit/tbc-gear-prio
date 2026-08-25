Status: closed (2026-08-24, fork commit fe1e4ad42 — both heads render from
RESULTS_SORT_COLUMNS via the shared label helper; rendered output verified
unchanged.)
Type: refactor
Origin: pre-merge review feat/upgrades-ui-fit, standards axis, 2026-08-24
Blocks: none
Blocked by: none

# The two results-table heads duplicate the column list

Ticket 280 added `sortableResultsTableHead()` beside `resultsTableHead()`
in the fork's `upgrades_tab.tsx`. Both render the same five columns, but
from two places: the sortable head from `RESULTS_SORT_COLUMNS`, the plain
head from its own literals. The plain head's own comment records why
sharing existed: "the mid-run and done-state tables cannot drift into
different column sets, which is how the mid-run table ended up four
columns wide with no Rank (ticket 278)." The sortable variant reintroduces
exactly that drift risk — the columns coincide today only because the two
lists happen to agree.

## Done when

- Both heads render from one shared column list (labels and order), so a
  column added or removed in one table cannot silently miss the other.
