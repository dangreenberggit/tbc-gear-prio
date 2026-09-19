Status: open
Type: bug
Origin: pre-merge review round 4 adversarial axis (feat/tab-signoff-followups), 2026-09-19
Blocks: none
Blocked by: none
Related: the visual+a11y reviewer infra (test-review.mjs capture), 450 (sibling gate-honesty finding)

# test-review.mjs reports captured / exit 0 for a manifest entry with empty or missing widths

In `test-review.mjs`, the per-width capture loops (~:951, ~:996) iterate
`entry.widths || []`. A manifest entry that lacks `widths` (or has `widths: []`)
produces no capture, no error, no `index.json` row — yet `errorCount` stays 0 and the
script exits 0 with `outcome: "captured"`. A manifest author who omits `widths` for a
ticket gets a GREEN run with zero evidence for that ticket, pushing the catch onto the
`gate-visual` seat (which should then return `cannot-judge`, but only if it notices the
missing entry).

Low severity — it needs an authoring mistake to trigger, and the visual seat is a
second net — but a capture harness that reports success while capturing nothing for a
ticket is exactly the "gate theatre" the review lane exists to catch.

## What would close this

- Treat a manifest entry with no effective widths as an error row (non-zero
  `errorCount` → exit 1), so a ticket that produced no captures fails the harness
  rather than passing green.
- Verify with a manifest entry that omits `widths`: `pnpm tab-review` should exit 1
  and name the entry, not exit 0.

## Where

`vendor/tbc-new-fork/test-review.mjs` (`main()`, the per-width loops and the
`errorCount`/`outcome` computation).
