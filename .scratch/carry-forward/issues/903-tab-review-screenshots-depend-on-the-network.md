Status: open
Type: bug (tooling)
Origin: ticket 902, branch `fix/902-layout-gate-outside-resources` (report in the delegated 902 session, 2026-11-26)
Blocks: none
Blocked by: none
Related: 902

# Tab-review screenshots show or lack icons depending on the network

## What happens

`scripts/tab-harness/test-review.mjs` (the per-ticket visual capture) loads
the tab page as it is, so the page's outside resources load on a desktop run
and fail inside the agent sandbox. Ticket 902 found that Font Awesome is the
one outside resource that moves the tab's geometry: the favorite and batch
toggles in each result row use wowsims' `Icon`, and without Font Awesome's
CSS they are 0 px tall. So a screenshot taken in the sandbox lacks those
icons, and one taken on a desktop shows them.

Ticket 902 fixed this for the layout gate only: the gate blocks every outside
request and serves Font Awesome from the pinned
`@fortawesome/fontawesome-free` package (`scripts/tab-harness/outside-requests.mjs`,
on that branch).

## Suggested fix

Serve Font Awesome locally in `test-review.mjs` with the same module, but do
not block the other outside requests, so desktop screenshots keep their item
icons. (The 902 session's recommendation; untested.)

## Done when

A tab-review capture taken in the sandbox shows the row toggles' icons, with
the same box sizes as a desktop capture.
