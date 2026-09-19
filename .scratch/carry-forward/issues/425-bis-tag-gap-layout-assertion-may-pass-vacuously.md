Status: open
Type: bug
Origin: pre-merge-review adversarial axis, feat/tab-signoff-followups, 2026-09-18
Blocks: none
Blocked by: none
Related: 423 (added the assertion), the layout gate test-layout.mjs

# The BiS-tag spacing layout assertion can pass without exercising anything

Adversarial finding (minor, test theatre) from the feat/tab-signoff-followups
pre-merge review. Ticket 423 added a narrow-width assertion to
`vendor/tbc-new-fork/test-layout.mjs` (~L100-107, L153-164) meant to guard that a
wrapped "★ BiS" badge sits >= 2px below the item name. But `badgeGaps` only
collects rows where the badge is actually below the name (`br.top >= nr.bottom`);
if no badge wraps at 375/653px in the test fixture, the collection is empty,
`tight` is undefined, and the assertion passes green having exercised nothing.

It never false-FAILS (so it is not blocking), but it may not actually guard the
BiS-tag crowding 423 was opened for — a green run is not evidence the spacing
holds when a badge does wrap.

## What would close this

- Confirm (by running the gate against the fixture) that at least one row's BiS
  badge actually wraps below the item name at 375 and/or 653px, so the assertion
  has a real subject. If none does at the fixture's row set, either seed a
  fixture row that wraps, or assert the spacing on the non-wrapped inline case
  too, so the assertion cannot pass vacuously.
- Document in the assertion which case it is guarding.

## Where

`vendor/tbc-new-fork/test-layout.mjs` (the `badgeGaps` collection and its
assertion), and the fixture/run the gate drives.

## Notes

Minor, deferred from the pre-merge review (not merge-blocking). The 423 alignment
assertions themselves read real computed values and are non-vacuous; this is only
the BiS-gap sub-assertion.
