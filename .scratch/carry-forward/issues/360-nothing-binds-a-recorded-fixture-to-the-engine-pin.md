Status: open
Type: defect
Origin: docs/reviews/feat-wowsims-reforge-catchup.md (Adversarial axis A4; Spec axis S1-S3)
Blocks: none
Blocked by: none

# Nothing binds a recorded fixture to the engine pin, and ticket 353 records that gap only in prose

Relates to: tickets 244, 353; ADR-0030; branch `feat/wowsims-reforge-catchup`

## (a) No gate compares a fixture's `simVersion` to the lock

`packages/core/test/synthetic-fixtures.test.ts:145` and
`full-sweep-recall.test.ts:192` construct `RecordedSimRunner(recorded.simVersion, ...)`
from the fixture file's own field. Nothing compares that field to
`data/wowsims.lock.json`'s `commit`.

So a fixture recorded on an old binary replays green forever: the tests are
self-consistent by construction, and an engine pin move that *should* invalidate
them cannot be detected by the suite that reads them.

Ticket 353 states this outright — "a fresh recording makes them green **by
construction**" — so it is disclosed, not hidden. But disclosure in a ticket body
is not a gate, and this branch is the second pin move to rely on a human
remembering.

A cheap fix exists: assert `recorded.simVersion === lock.commit` at fixture load,
failing with a message naming `scripts/record_synthetic_fixtures.mjs`. That turns
the next stale-fixture case from silent green into a named red.

## (b) Ticket 353's inventory is incomplete and its §1 was never corrected in place

353 exists to be the durable **inventory** of what a pin move made suspect. Three
gaps against that job:

1. **The `data/items/index.json` phase corrections are missing from it.** Slice
   B's ledger says five items' `phase` field moved and that this was "recorded
   for ticket 353's blast-radius inventory". It was not — grep finds no `32649`,
   no `35317`, no `items/index` in the ticket.
2. **§1 still states two things the ticket's own later section calls wrong**: that
   the preset fixture is "hand-authored, never-regenerated" (it is a `decodelink`
   capture, and no regeneration moves its `apiVersion`), and that the Expose
   Weakness value reaches the request from `buff-defaults.json` at runtime (it
   flows through the committed skeleton; `packages/core` never reads that file).
   The corrections are appended under "What was done", so a reader meets the
   wrong claims first.
3. **The SME acceptance box is unticked though the verdict exists.** Line 83's
   box asks for an `sme-rank-review` verdict on the feral rotation and the
   above-cutoff row count. That verdict was produced — seat `gate-sme`, tip
   `ad7f2d7`, verdict `trust-with-caveats`, nothing blocking — but it lives only
   in an untracked handoff file, the box is not ticked, and the ticket does not
   cite it. The ticket is the durable artifact; the verdict is not.

## Suggested fix

- (a) Assert the recorded `simVersion` against `lock.commit` where the fixtures
      are loaded.
- (b) Add the `items/index.json` phase moves to 353's §2. Correct §1 in place,
      leaving the appended section as history. Tick the SME box with a one-line
      summary of the verdict, and either commit the verdict file or restate its
      four findings in the ticket so the reasoning survives without it.

## Acceptance

- [ ] A fixture whose `simVersion` does not match `lock.commit` fails a test with
      a message naming the recorder script.
- [ ] 353's §1 no longer states the two claims its own later section refutes.
- [ ] 353's inventory names the `data/items/index.json` phase corrections.
- [ ] 353's SME box is ticked and cites the verdict, or the verdict's substance
      is carried in the ticket.
