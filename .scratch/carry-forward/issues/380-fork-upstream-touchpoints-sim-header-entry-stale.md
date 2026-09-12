Status: open
Type: task
Origin: docs/reviews/fix-sim-header-null-assertion.md
Formerly: 373 on fix/sim-header-null-assertion, renumbered 2026-09-12 to clear
a collision with `feat/spec-registry`'s own 373. Commit messages on this branch
still name the old number; see
`.scratch/stage-gate/ledger-consolidation-and-merge-train/merge-order.md`
§ Ticket renumber map.
Blocks: none
Blocked by: branch `docs/fork-upstream-touchpoints` landing on dev

# fork-upstream-touchpoints §10 records the sim_header entry stale

`docs/fork-upstream-touchpoints.md` §10 records `sim_header.tsx` at
50/15 and tags the crash "(inferred from source, untested)".

Both halves are now out of date:

- the file measures **51/15** after fork commit `5e9013b78`, which added
  the early-return guard;
- the crash was **reproduced**, not merely inferred. The guarded method no
  longer throws when `.sim-header-container-wrap` is absent.

Read the evidence note in
`docs/reviews/fix-sim-header-null-assertion.md` (finding A3) before
copying the word "reproduced" across: the negative half of that
reproduction ran a hand-copied method body rather than the shipped
constructor. The conclusion stands on direct source reading — `wrap` is
null, `update()` runs unconditionally, `null.classList` throws — and the
positive half (built bundle constructs, seven tabs render, fade toggles
on both paths) is real end-to-end evidence.

## Why this is deferred rather than fixed

That document does not exist on `dev` or on
`fix/sim-header-null-assertion`. It lives only on branch
`docs/fork-upstream-touchpoints`, which the review that found this was
instructed not to touch.

## Status: the edits are made, on the branch that owns the file

The `ledger-consolidation-and-merge-train` stage made exactly these edits on
`docs/fork-upstream-touchpoints` while folding the two ticket-369 ledgers
together. On that branch the document now records `50/15 at bbad1b8a4; 51/15 at
5e9013b78` in both the table row and the item heading, drops "(inferred from
source, untested)", splits the behaviour by fork commit (throws at
`bbad1b8a4`, guarded and degrades to a lost scroll-fade at `5e9013b78`), and
carries finding A3's caveat about the hand-copied method body.

So this ticket is open only because that branch has not merged yet. It stays
open — `merge-ready` requires a `defer` row's ticket to be open, claimed or
blocked, and row D1 of `docs/reviews/fix-sim-header-null-assertion.md` defers to
this file.

## What to do

When `docs/fork-upstream-touchpoints` lands on `dev`, confirm §10 reads as
described above and close this ticket. No edit should be needed.
