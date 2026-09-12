Status: open
Type: task
Origin: docs/reviews/fix-sim-header-null-assertion.md
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
`docs/fork-upstream-touchpoints` at commit `66b6d1c`, which the review
that found this was instructed not to touch.

## What to do

When `docs/fork-upstream-touchpoints` lands, update §10 to 51/15, replace
the "inferred from source, untested" tag with the accurate evidence
description above, then close this ticket.
