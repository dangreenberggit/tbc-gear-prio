Status: open
Type: task
Origin: owner decision, 2026-09-25 (follow-up named by tickets 406 and 411)
Blocks: none
Blocked by: feat/tab-signoff-followups merged to dev
Related: 406, 411

# Delete the dead bulk-screening code

## Why

The owner decided on 2026-09-25 to delete it. Ticket 406 kept the code
only as the test bed for ticket 411's measurement. Ticket 411 closed on
2026-09-17 with "Verdict: DELETE" and said the delete itself was a
follow-up that it did not do. The reason to keep the code is gone.

## Scope

In the fork, under
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/`:

- `adapters/bulk_http_sim_runner.ts`
- `adapters/bulk_request_builder.ts`
- `adapters/bulk_screen_driver.ts`
- the bulk part of `adapters/bulk_wasm_sim_runner.ts`, including the
  `bulk` parameter of `makeSimRunner`
- `engine/bulk/partition.ts`
- the bulk tools

406 notes that `upgrades_tab.tsx` still names `BulkHttpSimRunner` (the
`data-runner` `instanceof` test and two type positions), so that file
changes too.

In core: the six `packages/core/test/bulk-*.test.ts` files, their
"Dead code cover" comments, and the helper
`packages/core/test/bulk-screen-fixture.ts` if nothing else imports it.
The tests are in core, not in the fork path that 406's body gives.

## Start here

411 recorded throwaway delete commits: fork `5c2b1d7f9`, core
`ca5c7040`. Both still resolve as commits (`git cat-file -t`,
2026-09-25). Check them against the current tip before reusing them; do
not assume they still apply.

## Blocked by

feat/tab-signoff-followups merging to dev. The bulk code is in the same
fork as that held work, so deleting it first would tangle the two.
