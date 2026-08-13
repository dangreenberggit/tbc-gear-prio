Status: closed
Closed: 775ee46
Type: chore
Origin: pre-merge review of `feat/set-bonus-value`, round 3, 2026-08-12 (spec axis, 3-S3)
Blocks: none
Blocked by: none

# Tickets 111 and 112 are closed with every acceptance box unchecked

Both ticket files carry `Status: closed` with a `Closed:` commit list, but all 14
acceptance checkboxes between them are still unticked. The spec axis of the
round-3 review confirmed the work itself was done as asked — the gap is that the
files no longer record **which** criteria were verified, or by whom.

That matters more than bookkeeping here, because these two tickets are the ones a
future reader will consult to find out what the rare-gem cap was actually
required to do. Ticket 130 exists because the same round left four descriptions
of that cap stale; an unticked acceptance list is the same problem one level up.

Check the boxes that were genuinely verified, and for any that were not, either
verify them or say in the ticket why they were dropped.

## Acceptance

- [x] Ticket 111's acceptance list reflects what was verified.
- [x] Ticket 112's acceptance list reflects what was verified.
- [x] Any criterion left unmet has a written reason in its ticket.

## CLOSED, 2026-08-12

Commit `775ee46` on `feat/set-bonus-value`.

Ticket 111: 1 of 7 boxes checked. Only "re-running the arm shows the hands
socket carrying a rare gem" is checked — its closing section's "Post-fix
measurement" text records the concrete re-run (24028 in place of 32194,
delta +111.72, with runnable commands). The other 6 (palette quality field +
idempotent generate, the general quality-cap test assertion, `git diff`
scope on `migrate-gems.ts`, `meta-repair.test.ts` unedited, the
`GEM_POLICY_QUALIFIER` wording/grep, `pnpm verify` green) are left unchecked:
the closing section names the commits that plausibly did this work but never
states the verification itself (no idempotency re-run recorded, no grep
output quoted, no verify run mentioned), so ticking them would be asserting
more than the record shows.

Ticket 112: 6 of 8 boxes checked, each against a specific sentence quoted
from the closing section (the two-distinct-elements markup, the 31048
example, the four display states, the sort key still reading
`data-package`, the export path being untouched, and the repin comment's
named diff). The remaining 2 (a no-package chip staying byte-identical;
`pnpm verify` green) are left unchecked — the closing section only walks
through the package-member case and the four display states, never a
no-package chip comparison, and never mentions running `pnpm verify`.

No criterion was re-verified from scratch in this pass — the job was to
make each ticket's checkboxes match what its own closing text already
records, not to redo the review. Where that left a box unchecked, the ticket
now says so in place.
